/**
 * Role-Based Access Control (RBAC) Permission Matrix
 * 
 * Plain English explanation for Viva:
 * We map individual action permissions (e.g. 'task:create', 'member:invite')
 * to the allowed tenant roles (owner, admin, member, guest).
 * Guest is strictly read-only across projects and tasks.
 * Member can create/edit tasks and comments, but cannot manage projects or invite members.
 * Admin can manage projects, invite members, change roles.
 * Owner has full rights including workspace deletion.
 */

const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  GUEST: 'guest'
};

const PERMISSIONS = {
  // Workspace management
  'workspace:read': [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER, ROLES.GUEST],
  'workspace:update': [ROLES.OWNER, ROLES.ADMIN],
  'workspace:delete': [ROLES.OWNER],

  // Member & Invites
  'member:read': [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER, ROLES.GUEST],
  'member:invite': [ROLES.OWNER, ROLES.ADMIN],
  'member:updateRole': [ROLES.OWNER, ROLES.ADMIN],
  'member:remove': [ROLES.OWNER, ROLES.ADMIN],

  // Projects
  'project:read': [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER, ROLES.GUEST],
  'project:create': [ROLES.OWNER, ROLES.ADMIN],
  'project:update': [ROLES.OWNER, ROLES.ADMIN],
  'project:archive': [ROLES.OWNER, ROLES.ADMIN],
  'project:delete': [ROLES.OWNER],

  // Tasks
  'task:read': [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER, ROLES.GUEST],
  'task:create': [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER],
  'task:update': [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER],
  'task:move': [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER],
  'task:delete': [ROLES.OWNER, ROLES.ADMIN],

  // Comments
  'comment:read': [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER, ROLES.GUEST],
  'comment:create': [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER],

  // Dashboard & Activity
  'dashboard:read': [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER, ROLES.GUEST],
  'activity:read': [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER, ROLES.GUEST]
};

/**
 * Checks if a role has the given permission.
 * @param {string} role - 'owner' | 'admin' | 'member' | 'guest'
 * @param {string} permission - e.g. 'task:create'
 * @returns {boolean}
 */
const hasPermission = (role, permission) => {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
};

module.exports = {
  ROLES,
  PERMISSIONS,
  hasPermission
};
