const express = require('express');
const { body } = require('express-validator');
const projectController = require('../controllers/projectController');
const taskController = require('../controllers/taskController');
const authenticate = require('../middleware/authenticate');
const resolveTenant = require('../middleware/resolveTenant');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');

const router = express.Router();

// All project routes require valid tenant context
router.use(authenticate, resolveTenant);

router.get('/', authorize('project:read'), projectController.listProjects);

router.post(
  '/',
  authorize('project:create'),
  [
    body('name').trim().notEmpty().withMessage('Project name is required'),
    body('key').optional().trim().isLength({ min: 2, max: 10 }).withMessage('Project key must be 2-10 characters')
  ],
  validate,
  projectController.createProject
);

router.patch('/:id', authorize('project:update'), projectController.updateProject);

router.delete('/:id', authorize('project:delete'), projectController.deleteProject);

// Nested tasks endpoint: GET /api/projects/:id/tasks
router.get('/:id/tasks', authorize('task:read'), taskController.listTasks);

module.exports = router;
