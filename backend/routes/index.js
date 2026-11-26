const express = require('express');
const authRoutes = require('./authRoutes');
const workspaceRoutes = require('./workspaceRoutes');
const inviteRoutes = require('./inviteRoutes');
const projectRoutes = require('./projectRoutes');
const taskRoutes = require('./taskRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const activityRoutes = require('./activityRoutes');
const sprintRoutes = require('./sprintRoutes');
const timeLogRoutes = require('./timeLogRoutes');
const notificationRoutes = require('./notificationRoutes');
const reportRoutes = require('./reportRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'Multi-Tenant Project Management SaaS API'
  });
});

router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/invites', inviteRoutes);
router.use('/projects', projectRoutes);
router.use('/sprints', sprintRoutes);
router.use('/tasks', taskRoutes);
router.use('/timelogs', timeLogRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/activity', activityRoutes);

module.exports = router;
