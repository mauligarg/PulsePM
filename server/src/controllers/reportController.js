/**
 * Aggregation Reports Controller (Burndown, Velocity, Workload)
 *
 * All queries run inside the active tenant context (enforced by tenantGuard).
 * Heavy report aggregations are cached in Redis (or in-memory fallback) with a 60s TTL
 * and invalidated whenever tasks, sprints, or time logs change.
 */

const mongoose = require('mongoose');
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const TimeLog = require('../models/TimeLog');
const Membership = require('../models/Membership');
const { getCache, setCache } = require('../config/redis');

/**
 * Sprint Burndown Report: ideal vs. actual remaining estimate per day
 * GET /api/reports/burndown?sprintId=...
 *
 * Plain English explanation for Viva - Burndown Math:
 * 1. Total scope = sum of `estimateHours` across all tasks assigned to the sprint.
 * 2. Ideal remaining on day `i` of `N` days = totalScope * (1 - i / N), sloping linearly to 0.
 * 3. Actual remaining on day `i` = totalScope minus the sum of `estimateHours` for tasks
 *    in the sprint whose status is 'done' and were completed (`updatedAt`) on or before day `i`.
 */
const getBurndown = async (req, res, next) => {
  try {
    let { sprintId } = req.query;

    let sprint = null;
    if (sprintId) {
      sprint = await Sprint.findById(sprintId);
    } else {
      sprint = await Sprint.findOne({ status: 'active' }).sort({ createdAt: -1 });
      if (!sprint) {
        sprint = await Sprint.findOne().sort({ createdAt: -1 });
      }
    }

    if (!sprint) {
      return res.json({
        success: true,
        data: { sprint: null, series: [], totalEstimate: 0 }
      });
    }

    const cacheKey = `reports:${req.workspaceId}:burndown:${sprint._id}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const tasks = await Task.find({ sprintId: sprint._id });
    const totalEstimate = tasks.reduce((sum, t) => sum + (t.estimateHours || 0), 0);

    const start = sprint.startDate ? new Date(sprint.startDate) : new Date(sprint.createdAt);
    const end = sprint.endDate ? new Date(sprint.endDate) : new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);

    const startDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    const totalDays = Math.max(1, Math.round((endDay - startDay) / (24 * 60 * 60 * 1000)));

    const series = [];
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    for (let i = 0; i <= totalDays; i++) {
      const currentDay = new Date(startDay.getTime() + i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(currentDay.getTime() + 24 * 60 * 60 * 1000 - 1);
      const label = currentDay.toISOString().split('T')[0];

      const ideal = Math.max(0, Math.round((totalEstimate * (1 - i / totalDays)) * 10) / 10);

      let actual = null;
      if (currentDay <= todayEnd) {
        const completedByDay = tasks
          .filter((t) => t.status === 'done' && new Date(t.updatedAt) <= dayEnd)
          .reduce((sum, t) => sum + (t.estimateHours || 0), 0);
        actual = Math.max(0, Math.round((totalEstimate - completedByDay) * 10) / 10);
      }

      series.push({ date: label, ideal, actual });
    }

    const result = {
      sprint: {
        _id: sprint._id,
        name: sprint.name,
        status: sprint.status,
        startDate: startDay.toISOString().split('T')[0],
        endDate: endDay.toISOString().split('T')[0]
      },
      totalEstimate,
      series
    };

    await setCache(cacheKey, result, 60);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Velocity Report: committed vs. completed estimate hours per sprint
 * GET /api/reports/velocity?limit=6
 */
const getVelocity = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 6, 12);
    const cacheKey = `reports:${req.workspaceId}:velocity:${limit}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const sprints = await Sprint.find({ status: { $in: ['completed', 'active'] } })
      .sort({ startDate: 1, createdAt: 1 })
      .limit(limit);

    const sprintIds = sprints.map((s) => s._id);

    const agg = await Task.aggregate([
      { $match: { sprintId: { $in: sprintIds } } },
      {
        $group: {
          _id: '$sprintId',
          committedHours: { $sum: { $ifNull: ['$estimateHours', 0] } },
          completedHours: {
            $sum: {
              $cond: [{ $eq: ['$status', 'done'] }, { $ifNull: ['$estimateHours', 0] }, 0]
            }
          },
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
          }
        }
      }
    ]);

    const aggMap = {};
    agg.forEach((row) => {
      aggMap[row._id.toString()] = row;
    });

    const result = sprints.map((s) => {
      const stats = aggMap[s._id.toString()] || {
        committedHours: 0,
        completedHours: 0,
        totalTasks: 0,
        completedTasks: 0
      };
      return {
        sprintId: s._id,
        name: s.name,
        status: s.status,
        committedHours: stats.committedHours,
        completedHours: stats.completedHours,
        totalTasks: stats.totalTasks,
        completedTasks: stats.completedTasks
      };
    });

    await setCache(cacheKey, result, 60);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Workload Report: open estimated hours vs. logged hours per assignee
 * GET /api/reports/workload
 */
const getWorkload = async (req, res, next) => {
  try {
    const cacheKey = `reports:${req.workspaceId}:workload`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const [memberships, openTasksAgg, timeLogsAgg] = await Promise.all([
      Membership.find({ workspaceId: req.workspaceId, status: 'active' }).populate(
        'userId',
        'name email avatar'
      ),
      Task.aggregate([
        { $match: { status: { $ne: 'done' } } },
        {
          $group: {
            _id: '$assigneeId',
            openTaskCount: { $sum: 1 },
            estimatedHours: { $sum: { $ifNull: ['$estimateHours', 0] } }
          }
        }
      ]),
      TimeLog.aggregate([
        {
          $group: {
            _id: '$userId',
            loggedHours: { $sum: { $ifNull: ['$hours', 0] } }
          }
        }
      ])
    ]);

    const openMap = {};
    openTasksAgg.forEach((r) => {
      const key = r._id ? r._id.toString() : 'unassigned';
      openMap[key] = r;
    });

    const loggedMap = {};
    timeLogsAgg.forEach((r) => {
      if (r._id) loggedMap[r._id.toString()] = r.loggedHours;
    });

    const workload = memberships
      .filter((m) => m.userId)
      .map((m) => {
        const uid = m.userId._id.toString();
        const open = openMap[uid] || { openTaskCount: 0, estimatedHours: 0 };
        const logged = loggedMap[uid] || 0;
        return {
          userId: uid,
          name: m.userId.name,
          role: m.role,
          avatar: m.userId.avatar,
          openTaskCount: open.openTaskCount,
          estimatedHours: Math.round(open.estimatedHours * 10) / 10,
          loggedHours: Math.round(logged * 10) / 10
        };
      });

    if (openMap.unassigned) {
      workload.push({
        userId: 'unassigned',
        name: 'Unassigned',
        role: 'none',
        openTaskCount: openMap.unassigned.openTaskCount,
        estimatedHours: Math.round(openMap.unassigned.estimatedHours * 10) / 10,
        loggedHours: 0
      });
    }

    await setCache(cacheKey, workload, 60);
    res.json({ success: true, data: workload });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBurndown,
  getVelocity,
  getWorkload
};
