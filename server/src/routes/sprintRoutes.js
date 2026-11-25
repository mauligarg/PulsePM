const express = require('express');
const { body } = require('express-validator');
const sprintController = require('../controllers/sprintController');
const authenticate = require('../middleware/authenticate');
const resolveTenant = require('../middleware/resolveTenant');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(authenticate, resolveTenant);

router.get('/', authorize('sprint:read'), sprintController.listSprints);

router.post(
  '/',
  authorize('sprint:create'),
  [
    body('projectId').notEmpty().withMessage('Project ID is required'),
    body('name').trim().notEmpty().withMessage('Sprint name is required')
  ],
  validate,
  sprintController.createSprint
);

router.patch('/:id', authorize('sprint:update'), sprintController.updateSprint);
router.post('/:id/start', authorize('sprint:update'), sprintController.startSprint);
router.post('/:id/complete', authorize('sprint:update'), sprintController.completeSprint);
router.post('/:id/tasks', authorize('task:update'), sprintController.assignTasksToSprint);
router.delete('/:id', authorize('sprint:delete'), sprintController.deleteSprint);

module.exports = router;
