const { hasPermission } = require('../utils/permissions');

/**
 * RBAC Authorization Middleware Factory
 * Checks if the user's role in the current tenant possesses the requested permission.
 * 
 * @param {string} permission - e.g. 'task:create', 'project:delete'
 */
const authorize = (permission) => {
  return (req, res, next) => {
    const userRole = req.role;

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: No role assigned in current workspace context'
      });
    }

    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${userRole}' does not have permission '${permission}'`
      });
    }

    next();
  };
};

module.exports = authorize;
