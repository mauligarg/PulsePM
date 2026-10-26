const express = require('express');
const { body } = require('express-validator');
const workspaceController = require('../controllers/workspaceController');
const projectController = require('../controllers/projectController');
const authenticate = require('../middleware/authenticate');
const resolveTenant = require('../middleware/resolveTenant');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');

const router = express.Router();

// Workspace creation and listing (only requires global authentication)
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Workspace name is required')
  ],
  validate,
  workspaceController.createWorkspace
);

router.get('/', authenticate, workspaceController.listWorkspaces);

// Switch workspace context (returns new JWT token with workspace claims)
router.post('/:id/switch', authenticate, workspaceController.switchWorkspace);

// Tenant-scoped routes (require authenticate + resolveTenant + RBAC authorization)
router.get(
  '/:id/members',
  authenticate,
  resolveTenant,
  authorize('member:read'),
  workspaceController.getMembers
);

router.patch(
  '/:id/members/:userId',
  authenticate,
  resolveTenant,
  authorize('member:updateRole'),
  [
    body('role').isIn(['admin', 'member', 'guest']).withMessage('Role must be admin, member, or guest')
  ],
  validate,
  workspaceController.updateMemberRole
);

router.delete(
  '/:id/members/:userId',
  authenticate,
  resolveTenant,
  authorize('member:remove'),
  workspaceController.removeMember
);

router.post(
  '/:id/invites',
  authenticate,
  resolveTenant,
  authorize('member:invite'),
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('role').optional().isIn(['admin', 'member', 'guest']).withMessage('Role must be admin, member, or guest')
  ],
  validate,
  workspaceController.createInvite
);

// Route alias: GET /workspaces/:id/projects
router.get(
  '/:id/projects',
  authenticate,
  resolveTenant,
  authorize('project:read'),
  projectController.listProjects
);

module.exports = router;
