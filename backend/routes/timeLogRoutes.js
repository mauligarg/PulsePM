const express = require('express');
const { body } = require('express-validator');
const timeLogController = require('../controllers/timeLogController');
const authenticate = require('../middleware/authenticate');
const resolveTenant = require('../middleware/resolveTenant');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(authenticate, resolveTenant);

router.get('/timesheet', authorize('timelog:read'), timeLogController.getTimesheet);

router.post(
  '/',
  authorize('timelog:create'),
  [
    body('taskId').notEmpty().withMessage('Task ID is required'),
    body('hours').isFloat({ min: 0.1, max: 24 }).withMessage('Hours must be between 0.1 and 24')
  ],
  validate,
  timeLogController.createTimeLog
);

router.patch('/:id', authorize('timelog:updateOwn'), timeLogController.updateTimeLog);
router.delete('/:id', authorize('timelog:deleteOwn'), timeLogController.deleteTimeLog);

module.exports = router;
