const TimeLog = require('../models/TimeLog');
const Task = require('../models/Task');
const { recordActivity } = require('../services/activity');
const { hasPermission } = require('../utils/permissions');
const { invalidateWorkspaceReports } = require('../config/redis');

/**
 * List time logs for a specific task
 * GET /api/tasks/:id/timelogs
 */
const listTaskTimeLogs = async (req, res, next) => {
  try {
    const { id: taskId } = req.params;
    const logs = await TimeLog.find({ taskId })
      .populate('userId', 'name email avatar')
      .sort({ date: -1, createdAt: -1 });

    const totalHours = logs.reduce((sum, l) => sum + (l.hours || 0), 0);

    res.json({
      success: true,
      data: {
        logs,
        totalHours: Math.round(totalHours * 100) / 100
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a time log entry on a task
 * POST /api/tasks/:id/timelogs  (or POST /api/timelogs with taskId in body)
 */
const createTimeLog = async (req, res, next) => {
  try {
    const taskId = req.params.id || req.body.taskId;
    const { hours, date, note } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const log = await TimeLog.create({
      taskId: task._id,
      projectId: task.projectId,
      userId: req.user._id,
      hours: Number(hours),
      date: date ? new Date(date) : new Date(),
      note: note || ''
    });

    const populated = await TimeLog.findById(log._id).populate('userId', 'name email avatar');

    await recordActivity({
      actorId: req.user._id,
      entityType: 'timelog',
      entityId: log._id,
      action: 'logged',
      meta: {
        taskId: task._id,
        taskTitle: task.title,
        hours: log.hours,
        date: log.date
      }
    });

    await invalidateWorkspaceReports(req.workspaceId);

    res.status(201).json({
      success: true,
      message: 'Time logged successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a time log (member can edit own logs; owner/admin can edit any)
 * PATCH /api/timelogs/:id
 */
const updateTimeLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const log = await TimeLog.findById(id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Time log not found' });
    }

    const isOwner = log.userId.toString() === req.user._id.toString();
    const canManageAll = hasPermission(req.role, 'timelog:manageAll');
    if (!isOwner && !canManageAll) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own time logs'
      });
    }

    const diffs = [];
    if (req.body.hours !== undefined && Number(req.body.hours) !== log.hours) {
      diffs.push({ field: 'hours', from: log.hours, to: Number(req.body.hours) });
      log.hours = Number(req.body.hours);
    }
    if (req.body.date !== undefined) {
      const nextDate = new Date(req.body.date);
      if (nextDate.toISOString().split('T')[0] !== log.date.toISOString().split('T')[0]) {
        diffs.push({ field: 'date', from: log.date, to: nextDate });
      }
      log.date = nextDate;
    }
    if (req.body.note !== undefined && req.body.note !== log.note) {
      diffs.push({ field: 'note', from: log.note, to: req.body.note });
      log.note = req.body.note;
    }

    await log.save();
    const populated = await TimeLog.findById(log._id).populate('userId', 'name email avatar');

    if (diffs.length > 0) {
      await recordActivity({
        actorId: req.user._id,
        entityType: 'timelog',
        entityId: log._id,
        action: 'updated',
        meta: { taskId: log.taskId, diffs }
      });
    }

    res.json({ success: true, message: 'Time log updated', data: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a time log (member can delete own logs; owner/admin can delete any)
 * DELETE /api/timelogs/:id
 */
const deleteTimeLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const log = await TimeLog.findById(id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Time log not found' });
    }

    const isOwner = log.userId.toString() === req.user._id.toString();
    const canManageAll = hasPermission(req.role, 'timelog:manageAll');
    if (!isOwner && !canManageAll) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own time logs'
      });
    }

    await TimeLog.deleteOne({ _id: log._id });

    await recordActivity({
      actorId: req.user._id,
      entityType: 'timelog',
      entityId: log._id,
      action: 'deleted',
      meta: { taskId: log.taskId, hours: log.hours }
    });

    res.json({ success: true, message: 'Time log deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get weekly timesheet view per user (totals per day & per project)
 * GET /api/timelogs/timesheet?weekStart=YYYY-MM-DD&userId=...
 */
const getTimesheet = async (req, res, next) => {
  try {
    const requestedUserId = req.query.userId;
    const canViewOthers = hasPermission(req.role, 'timelog:manageAll');
    const targetUserId = requestedUserId && canViewOthers ? requestedUserId : req.user._id;

    // Determine Monday..Sunday of the requested week (UTC date boundaries)
    const refDate = req.query.weekStart ? new Date(req.query.weekStart) : new Date();
    const day = refDate.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate() + diffToMonday));
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const logs = await TimeLog.find({
      userId: targetUserId,
      date: { $gte: weekStart, $lt: weekEnd }
    })
      .populate('taskId', 'title status')
      .populate('projectId', 'name key')
      .sort({ date: 1, createdAt: 1 });

    // Build 7 day keys
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
      days.push(d.toISOString().split('T')[0]);
    }

    // Aggregate per project and per day
    const projectMap = {};
    const dailyTotals = {};
    days.forEach((d) => {
      dailyTotals[d] = 0;
    });

    let grandTotal = 0;
    logs.forEach((log) => {
      const dayKey = log.date.toISOString().split('T')[0];
      if (dailyTotals[dayKey] === undefined) return;

      const projId = log.projectId?._id?.toString() || 'unknown';
      const projName = log.projectId?.name || 'General';
      const projKey = log.projectId?.key || 'PRJ';

      if (!projectMap[projId]) {
        projectMap[projId] = {
          projectId: projId,
          projectName: projName,
          projectKey: projKey,
          days: {},
          total: 0
        };
        days.forEach((d) => {
          projectMap[projId].days[d] = 0;
        });
      }

      projectMap[projId].days[dayKey] += log.hours;
      projectMap[projId].total += log.hours;
      dailyTotals[dayKey] += log.hours;
      grandTotal += log.hours;
    });

    res.json({
      success: true,
      data: {
        weekStart: days[0],
        weekEnd: days[6],
        days,
        projects: Object.values(projectMap),
        dailyTotals,
        grandTotal: Math.round(grandTotal * 100) / 100,
        logs
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listTaskTimeLogs,
  createTimeLog,
  updateTimeLog,
  deleteTimeLog,
  getTimesheet
};
