const express = require('express');
const { body } = require('express-validator');
const taskController = require('../controllers/taskController');
const timeLogController = require('../controllers/timeLogController');
const attachmentController = require('../controllers/attachmentController');
const authenticate = require('../middleware/authenticate');
const resolveTenant = require('../middleware/resolveTenant');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(authenticate, resolveTenant);

// My tasks across all projects of this workspace
router.get('/mine', authorize('task:read'), taskController.getMyTasks);

router.post(
  '/',
  authorize('task:create'),
  [
    body('projectId').notEmpty().withMessage('Project ID is required'),
    body('title').trim().notEmpty().withMessage('Task title is required')
  ],
  validate,
  taskController.createTask
);

router.get('/:id', authorize('task:read'), taskController.getTaskById);

router.patch('/:id', authorize('task:update'), taskController.updateTask);

router.delete('/:id', authorize('task:delete'), taskController.deleteTask);

router.patch(
  '/:id/move',
  authorize('task:move'),
  taskController.moveTask
);

// Comments endpoints
router.post(
  '/:id/comments',
  authorize('comment:create'),
  [
    body('content').trim().notEmpty().withMessage('Comment content cannot be empty')
  ],
  validate,
  taskController.addComment
);

router.get('/:id/comments', authorize('comment:read'), taskController.getComments);

// Time logs endpoints for a task
router.get('/:id/timelogs', authorize('timelog:read'), timeLogController.listTaskTimeLogs);
router.post(
  '/:id/timelogs',
  authorize('timelog:create'),
  [
    body('hours').isFloat({ min: 0.1, max: 24 }).withMessage('Hours must be between 0.1 and 24')
  ],
  validate,
  timeLogController.createTimeLog
);

// Attachments endpoints
router.post(
  '/:id/attachments',
  authorize('attachment:create'),
  attachmentController.uploadMiddleware,
  attachmentController.uploadAttachment
);
router.delete(
  '/:id/attachments/:attachmentId',
  authorize('attachment:delete'),
  attachmentController.deleteAttachment
);

module.exports = router;
