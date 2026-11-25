const Task = require('../models/Task');
const Project = require('../models/Project');
const Membership = require('../models/Membership');
const Activity = require('../models/Activity');

/**
 * Get comprehensive workspace dashboard summary
 * GET /api/dashboard/summary
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Counts by status
    const statusAggregation = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusCounts = {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
      total: 0
    };

    statusAggregation.forEach((item) => {
      if (statusCounts[item._id] !== undefined) {
        statusCounts[item._id] = item.count;
      }
      statusCounts.total += item.count;
    });

    // Counts by priority
    const priorityAggregation = await Task.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityCounts = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    };

    priorityAggregation.forEach((item) => {
      if (priorityCounts[item._id] !== undefined) {
        priorityCounts[item._id] = item.count;
      }
    });

    // Overdue tasks (due date in the past and status is not 'done')
    const now = new Date();
    const overdueTasksRaw = await Task.find({
      dueDate: { $lt: now },
      status: { $ne: 'done' }
    })
      .populate('projectId', 'name key')
      .populate('assigneeId', 'name email avatar')
      .sort({ dueDate: 1 })
      .limit(5);

    const overdueTasks = overdueTasksRaw.map((t) => {
      const obj = t.toObject ? t.toObject() : { ...t };
      if (!obj.projectId) {
        obj.projectId = { name: 'General', key: 'PRJ' };
      }
      return obj;
    });

    const overdueCount = await Task.countDocuments({
      dueDate: { $lt: now },
      status: { $ne: 'done' }
    });

    // My open tasks
    const myOpenTasksRaw = await Task.find({
      assigneeId: userId,
      status: { $ne: 'done' }
    })
      .populate('projectId', 'name key')
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(6);

    const myOpenTasks = myOpenTasksRaw.map((t) => {
      const obj = t.toObject ? t.toObject() : { ...t };
      if (!obj.projectId) {
        obj.projectId = { name: 'General', key: 'PRJ' };
      }
      return obj;
    });

    const myOpenTasksCount = await Task.countDocuments({
      assigneeId: userId,
      status: { $ne: 'done' }
    });

    // Recent activity
    const recentActivity = await Activity.find()
      .populate('actorId', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(10);

    // High level project count
    const projectCount = await Project.countDocuments({ status: 'active' });

    // High level member count
    const memberCount = await Membership.countDocuments({ status: 'active' });

    res.json({
      success: true,
      data: {
        statusCounts,
        priorityCounts,
        overdueCount,
        overdueTasks,
        myOpenTasksCount,
        myOpenTasks,
        recentActivity,
        projectCount,
        memberCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get activity feed / audit log with filters (actorId, entityType, entityId, from, to)
 * GET /api/activity?limit=&page=&actorId=&entityType=&entityId=&from=&to=
 * GET /api/activity/audit (owner/admin only)
 */
const getActivityFeed = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.actorId) filter.actorId = req.query.actorId;
    if (req.query.entityType) filter.entityType = req.query.entityType;
    if (req.query.entityId) {
      filter.$or = [
        { entityId: req.query.entityId },
        { 'meta.taskId': req.query.entityId }
      ];
    }
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) {
        const toDate = new Date(req.query.to);
        toDate.setUTCHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    const activities = await Activity.find(filter)
      .populate('actorId', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Activity.countDocuments(filter);

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummary,
  getActivityFeed
};
