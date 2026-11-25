const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const { recordActivity } = require('../utils/activity');
const { invalidateWorkspaceReports } = require('../config/redis');

/**
 * List sprints for a project (with task counts and estimate totals)
 * GET /api/sprints?projectId=... or GET /api/projects/:id/sprints
 */
const listSprints = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.query.projectId;
    const query = projectId ? { projectId } : {};

    const sprints = await Sprint.find(query).sort({ createdAt: -1 });
    const sprintIds = sprints.map((s) => s._id);

    const taskStats = await Task.aggregate([
      { $match: { sprintId: { $in: sprintIds } } },
      {
        $group: {
          _id: '$sprintId',
          taskCount: { $sum: 1 },
          doneCount: {
            $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
          },
          totalEstimate: { $sum: { $ifNull: ['$estimateHours', 0] } },
          completedEstimate: {
            $sum: {
              $cond: [{ $eq: ['$status', 'done'] }, { $ifNull: ['$estimateHours', 0] }, 0]
            }
          }
        }
      }
    ]);

    const statsMap = {};
    taskStats.forEach((s) => {
      statsMap[s._id.toString()] = s;
    });

    const enriched = sprints.map((s) => {
      const st = statsMap[s._id.toString()] || {
        taskCount: 0,
        doneCount: 0,
        totalEstimate: 0,
        completedEstimate: 0
      };
      return {
        ...s.toObject(),
        taskCount: st.taskCount,
        doneCount: st.doneCount,
        totalEstimate: st.totalEstimate,
        completedEstimate: st.completedEstimate
      };
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new sprint
 * POST /api/sprints
 */
const createSprint = async (req, res, next) => {
  try {
    const { projectId, name, goal, startDate, endDate, status } = req.body;

    const sprint = await Sprint.create({
      projectId,
      name,
      goal: goal || '',
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: status || 'planned'
    });

    await recordActivity({
      actorId: req.user._id,
      entityType: 'sprint',
      entityId: sprint._id,
      action: 'created',
      meta: { name: sprint.name, projectId }
    });

    res.status(201).json({
      success: true,
      message: 'Sprint created successfully',
      data: sprint
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update sprint details
 * PATCH /api/sprints/:id
 */
const updateSprint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    const diffs = [];
    const allowed = ['name', 'goal', 'startDate', 'endDate', 'status'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined && String(req.body[field]) !== String(sprint[field] ?? '')) {
        diffs.push({ field, from: sprint[field] ?? null, to: req.body[field] });
        sprint[field] = req.body[field];
      }
    });

    await sprint.save();

    if (diffs.length > 0) {
      await recordActivity({
        actorId: req.user._id,
        entityType: 'sprint',
        entityId: sprint._id,
        action: 'updated',
        meta: { name: sprint.name, diffs }
      });
    }

    res.json({ success: true, message: 'Sprint updated', data: sprint });
  } catch (error) {
    next(error);
  }
};

/**
 * Start a planned sprint (sets status to active)
 * POST /api/sprints/:id/start
 */
const startSprint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    if (sprint.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Completed sprints cannot be restarted' });
    }

    // Ensure at most one active sprint per project by checking existing active sprint
    const existingActive = await Sprint.findOne({
      projectId: sprint.projectId,
      status: 'active',
      _id: { $ne: sprint._id }
    });
    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: `Sprint "${existingActive.name}" is already active in this project. Complete it before starting another.`
      });
    }

    const prevStatus = sprint.status;
    sprint.status = 'active';
    if (!sprint.startDate) sprint.startDate = new Date();
    if (!sprint.endDate) sprint.endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    if (req.body.startDate) sprint.startDate = req.body.startDate;
    if (req.body.endDate) sprint.endDate = req.body.endDate;

    await sprint.save();

    await recordActivity({
      actorId: req.user._id,
      entityType: 'sprint',
      entityId: sprint._id,
      action: 'started',
      meta: { name: sprint.name, diffs: [{ field: 'status', from: prevStatus, to: 'active' }] }
    });

    res.json({ success: true, message: `Sprint "${sprint.name}" started`, data: sprint });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete an active sprint; unfinished tasks move to backlog or a target sprint
 * POST /api/sprints/:id/complete
 */
const completeSprint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { moveUnfinishedTo = 'backlog' } = req.body;

    const sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    const prevStatus = sprint.status;
    sprint.status = 'completed';
    sprint.completedAt = new Date();
    await sprint.save();

    let movedCount = 0;
    if (moveUnfinishedTo === 'backlog' || !moveUnfinishedTo) {
      const result = await Task.updateMany(
        { sprintId: sprint._id, status: { $ne: 'done' } },
        { $set: { sprintId: null, status: 'backlog' } }
      );
      movedCount = result.modifiedCount || 0;
    } else {
      const targetSprint = await Sprint.findById(moveUnfinishedTo);
      if (!targetSprint) {
        return res.status(404).json({ success: false, message: 'Target sprint not found' });
      }
      const result = await Task.updateMany(
        { sprintId: sprint._id, status: { $ne: 'done' } },
        { $set: { sprintId: targetSprint._id } }
      );
      movedCount = result.modifiedCount || 0;
    }

    await recordActivity({
      actorId: req.user._id,
      entityType: 'sprint',
      entityId: sprint._id,
      action: 'completed',
      meta: {
        name: sprint.name,
        moveUnfinishedTo,
        movedUnfinishedCount: movedCount,
        diffs: [{ field: 'status', from: prevStatus, to: 'completed' }]
      }
    });

    await invalidateWorkspaceReports(req.workspaceId);

    res.json({
      success: true,
      message: `Sprint completed. ${movedCount} unfinished task(s) moved.`,
      data: { sprint, movedUnfinishedCount: movedCount }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Move tasks between backlog and a sprint
 * POST /api/sprints/:id/tasks (use id='backlog' to move tasks to backlog)
 */
const assignTasksToSprint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { taskIds } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ success: false, message: 'taskIds array is required' });
    }

    const isBacklog = id === 'backlog';
    let targetSprintId = null;

    if (!isBacklog) {
      const sprint = await Sprint.findById(id);
      if (!sprint) {
        return res.status(404).json({ success: false, message: 'Sprint not found' });
      }
      targetSprintId = sprint._id;
    }

    const updatePayload = isBacklog
      ? { $set: { sprintId: null, status: 'backlog' } }
      : { $set: { sprintId: targetSprintId } };

    const result = await Task.updateMany({ _id: { $in: taskIds } }, updatePayload);

    // If moving from backlog into a sprint, promote 'backlog' status tasks to 'todo'
    if (!isBacklog) {
      await Task.updateMany(
        { _id: { $in: taskIds }, status: 'backlog' },
        { $set: { status: 'todo' } }
      );
    }

    await recordActivity({
      actorId: req.user._id,
      entityType: 'sprint',
      entityId: isBacklog ? taskIds[0] : targetSprintId,
      action: isBacklog ? 'removed_tasks' : 'assigned_tasks',
      meta: { taskCount: result.modifiedCount, target: isBacklog ? 'backlog' : targetSprintId }
    });

    res.json({
      success: true,
      message: `${result.modifiedCount} task(s) updated`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a sprint (returns its tasks to backlog)
 * DELETE /api/sprints/:id
 */
const deleteSprint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    await Task.updateMany({ sprintId: sprint._id }, { $set: { sprintId: null } });
    await Sprint.deleteOne({ _id: sprint._id });

    await recordActivity({
      actorId: req.user._id,
      entityType: 'sprint',
      entityId: sprint._id,
      action: 'deleted',
      meta: { name: sprint.name }
    });

    res.json({ success: true, message: 'Sprint deleted and tasks moved to backlog' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listSprints,
  createSprint,
  updateSprint,
  startSprint,
  completeSprint,
  assignTasksToSprint,
  deleteSprint
};
