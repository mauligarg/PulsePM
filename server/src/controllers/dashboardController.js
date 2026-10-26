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
    const overdueTasks = await Task.find({
      dueDate: { $lt: now },
      status: { $ne: 'done' }
    })
      .populate('projectId', 'name key')
      .populate('assigneeId', 'name email avatar')
      .sort({ dueDate: 1 })
      .limit(5);

    const overdueCount = await Task.countDocuments({
      dueDate: { $lt: now },
      status: { $ne: 'done' }
    });

    // My open tasks
    const myOpenTasks = await Task.find({
      assigneeId: userId,
      status: { $ne: 'done' }
    })
      .populate('projectId', 'name key')
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(6);

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
 * Get activity feed with pagination / limit
 * GET /api/activity?limit=&page=
 */
const getActivityFeed = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const activities = await Activity.find()
      .populate('actorId', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Activity.countDocuments();

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
