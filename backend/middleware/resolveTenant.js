/**
 * Multi-Tenant Context Resolution Middleware
 * 
 * Plain English explanation for Viva:
 * In a multi-tenant system, relying on query params (like `?workspaceId=123`) or request body
 * is a severe security vulnerability because a malicious user could tamper with the ID.
 * 
 * Our architecture guarantees multi-tenant integrity by:
 * 1. Issuing a cryptographically signed JWT containing `{ userId, workspaceId, role }` whenever
 *    a user logs in or switches their active workspace.
 * 2. Reading `workspaceId` EXCLUSIVELY from the cryptographically verified token claims (`req.workspaceId`).
 * 3. Checking that the user has an 'active' membership in that workspace in the database.
 * 4. Wrapping the request lifecycle in `runWithTenant(...)` using Node.js AsyncLocalStorage,
 *    which powers our Mongoose `tenantGuard` plugin.
 */

const Membership = require('../models/Membership');
const { runWithTenant } = require('../utils/context');

const resolveTenant = async (req, res, next) => {
  try {
    // workspaceId is strictly read from token claims
    const workspaceId = req.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'No active workspace selected in authentication token. Please switch to a workspace.'
      });
    }

    // Verify active membership in the target workspace
    const membership = await Membership.findOne({
      workspaceId,
      userId: req.user._id,
      status: 'active'
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have an active membership in this workspace.'
      });
    }

    // Update req.role from current database state to prevent stale token roles
    req.role = membership.role;

    // Run remaining middleware and controller within the tenant execution context
    runWithTenant(
      {
        workspaceId,
        userId: req.user._id,
        role: membership.role
      },
      () => {
        next();
      }
    );
  } catch (error) {
    next(error);
  }
};

module.exports = resolveTenant;
