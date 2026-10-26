const mongoose = require('mongoose');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const { recordActivity } = require('../utils/activity');

/**
 * List tasks for a project with optional filters
 * GET /api/projects/:id/tasks?status=&assignee=&sprint=
 */
const listTasks = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const { status, assignee, sprint, search } = req.query;

    const query = { projectId };
    if (status) query.status = status;
    if (assignee) query.assigneeId = assignee;
    if (sprint) query.sprintId = sprint;
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // tenantGuard automatically injects { workspaceId: currentTenantId }
    const tasks = await Task.find(query)
      .populate('assigneeId', 'name email avatar')
      .sort({ order: 1, createdAt: 1 });

    // Fetch subtask count and comment count for each task
    const taskIds = tasks.map(t => t._id);
    const commentCounts = await Comment.aggregate([
      { $match: { taskId: { $in: taskIds } } },
      { $group: { _id: '$taskId', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    commentCounts.forEach(c => {
      countMap[c._id.toString()] = c.count;
    });

    const enriched = tasks.map(t => ({
      ...t.toObject(),
      commentCount: countMap[t._id.toString()] || 0
    }));

    res.json({
      success: true,
      data: enriched
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new task
 * POST /api/tasks
 */
const createTask = async (req, res, next) => {
  try {
    const {
      projectId,
      title,
      description,
      assigneeId,
      status = 'todo',
      priority = 'medium',
      labels,
      parentTaskId,
      dueDate,
      estimateHours,
      sprintId
    } = req.body;

    // Determine the highest order in this column to place the new task at the bottom
    const lastTask = await Task.findOne({ projectId, status }).sort({ order: -1 });
    const order = lastTask ? lastTask.order + 1000 : 1000;

    const task = await Task.create({
      projectId,
      title,
      description: description || '',
      assigneeId: assigneeId || null,
      status,
      priority,
      labels: labels || [],
      parentTaskId: parentTaskId || null,
      dueDate: dueDate || null,
      estimateHours: estimateHours || 0,
      sprintId: sprintId || null,
      order
    });

    const populated = await Task.findById(task._id).populate('assigneeId', 'name email avatar');

    await recordActivity({
      actorId: req.user._id,
      entityType: 'task',
      entityId: task._id,
      action: 'created',
      meta: { title: task.title, status: task.status }
    });

    // Real-time notification to workspace room
    const io = req.app.get('io');
    if (io) {
      io.to(`ws:${req.workspaceId}`).emit('task:created', populated);
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get task details with comments and subtasks
 * GET /api/tasks/:id
 */
const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate('assigneeId', 'name email avatar')
      .populate('projectId', 'name key leadId');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Get subtasks
    const subtasks = await Task.find({ parentTaskId: id }).populate('assigneeId', 'name email avatar');

    // Get comments
    const comments = await Comment.find({ taskId: id })
      .populate('authorId', 'name email avatar')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: {
        ...task.toObject(),
        subtasks,
        comments
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update task fields
 * PATCH /api/tasks/:id
 */
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const allowedFields = [
      'title',
      'description',
      'assigneeId',
      'status',
      'priority',
      'labels',
      'dueDate',
      'estimateHours',
      'sprintId',
      'parentTaskId'
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        task[field] = updates[field];
      }
    });

    await task.save();

    const populated = await Task.findById(task._id)
      .populate('assigneeId', 'name email avatar')
      .populate('projectId', 'name key');

    await recordActivity({
      actorId: req.user._id,
      entityType: 'task',
      entityId: task._id,
      action: 'updated',
      meta: { title: task.title, updates }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`ws:${req.workspaceId}`).emit('task:updated', populated);
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Move task (Kanban drag-and-drop: status change and/or order update)
 * PATCH /api/tasks/:id/move
 * 
 * Plain English explanation for Viva - Drag and Drop Ordering:
 * To support high-performance, concurrent card reordering:
 * 1. The client supplies the target status and neighboring cards (prevTaskId and/or nextTaskId).
 * 2. If dropped at the top: newOrder = nextTask.order / 2.
 * 3. If dropped at the bottom: newOrder = prevTask.order + 1000.
 * 4. If dropped between two cards: newOrder = (prevTask.order + nextTask.order) / 2.
 * 5. This allows arbitrary insertions in O(1) time without updating other rows.
 * 6. The socket broadcasts 'task:moved' so all other collaborators see the card position update instantly.
 */
const moveTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, newOrder, prevTaskId, nextTaskId } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const previousStatus = task.status;
    let computedOrder = typeof newOrder === 'number' ? newOrder : task.order;

    if (prevTaskId && nextTaskId) {
      const prevTask = await Task.findById(prevTaskId);
      const nextTask = await Task.findById(nextTaskId);
      if (prevTask && nextTask) {
        computedOrder = (prevTask.order + nextTask.order) / 2;
      }
    } else if (prevTaskId && !nextTaskId) {
      const prevTask = await Task.findById(prevTaskId);
      if (prevTask) {
        computedOrder = prevTask.order + 1000;
      }
    } else if (!prevTaskId && nextTaskId) {
      const nextTask = await Task.findById(nextTaskId);
      if (nextTask) {
        computedOrder = nextTask.order / 2;
      }
    }

    if (status) {
      task.status = status;
    }
    task.order = computedOrder;
    await task.save();

    const populated = await Task.findById(task._id).populate('assigneeId', 'name email avatar');

    await recordActivity({
      actorId: req.user._id,
      entityType: 'task',
      entityId: task._id,
      action: 'moved',
      meta: {
        title: task.title,
        fromStatus: previousStatus,
        toStatus: task.status,
        order: task.order
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`ws:${req.workspaceId}`).emit('task:moved', {
        task: populated,
        fromStatus: previousStatus,
        toStatus: task.status,
        order: task.order,
        actor: { _id: req.user._id, name: req.user.name }
      });
    }

    res.json({
      success: true,
      message: 'Task position updated',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a task
 * DELETE /api/tasks/:id
 */
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await Comment.deleteMany({ taskId: task._id });
    await Task.deleteMany({ parentTaskId: task._id });
    await Task.deleteOne({ _id: task._id });

    await recordActivity({
      actorId: req.user._id,
      entityType: 'task',
      entityId: task._id,
      action: 'deleted',
      meta: { title: task.title }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`ws:${req.workspaceId}`).emit('task:deleted', { taskId: id });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get tasks assigned to current user across all projects in the active workspace
 * GET /api/tasks/mine
 */
const getMyTasks = async (req, res, next) => {
  try {
    // tenantGuard automatically isolates by workspaceId
    const tasks = await Task.find({ assigneeId: req.user._id })
      .populate('projectId', 'name key')
      .sort({ dueDate: 1, createdAt: -1 });

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add comment to task
 * POST /api/tasks/:id/comments
 */
const addComment = async (req, res, next) => {
  try {
    const { id: taskId } = req.params;
    const { content } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const comment = await Comment.create({
      taskId,
      authorId: req.user._id,
      content
    });

    const populated = await Comment.findById(comment._id).populate('authorId', 'name email avatar');

    await recordActivity({
      actorId: req.user._id,
      entityType: 'comment',
      entityId: comment._id,
      action: 'commented',
      meta: { taskId, taskTitle: task.title, snippet: content.substring(0, 40) }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`ws:${req.workspaceId}`).emit('comment:new', {
        taskId,
        comment: populated
      });
    }

    res.status(201).json({
      success: true,
      message: 'Comment added',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get comments for a task
 * GET /api/tasks/:id/comments
 */
const getComments = async (req, res, next) => {
  try {
    const { id: taskId } = req.params;

    const comments = await Comment.find({ taskId })
      .populate('authorId', 'name email avatar')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listTasks,
  createTask,
  getTaskById,
  updateTask,
  moveTask,
  deleteTask,
  getMyTasks,
  addComment,
  getComments
};
