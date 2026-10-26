const Activity = require('../models/Activity');
const { getWorkspaceId } = require('./context');

/**
 * Helper to record audit activity for any user action.
 * 
 * @param {Object} params
 * @param {string} [params.workspaceId]
 * @param {string} params.actorId
 * @param {string} params.entityType - 'project' | 'task' | 'comment' | 'workspace' | 'membership'
 * @param {string} params.entityId
 * @param {string} params.action - e.g. 'created', 'updated', 'moved', 'commented', 'invited'
 * @param {Object} [params.meta]
 * @returns {Promise<Activity|null>}
 */
const recordActivity = async ({
  workspaceId,
  actorId,
  entityType,
  entityId,
  action,
  meta = {}
}) => {
  try {
    const wsId = workspaceId || getWorkspaceId();
    if (!wsId || !actorId || !entityType || !entityId || !action) {
      return null;
    }

    const activity = await Activity.create({
      workspaceId: wsId,
      actorId,
      entityType,
      entityId,
      action,
      meta
    });

    return activity;
  } catch (error) {
    // Audit logging failure should not abort the primary transaction
    console.error('[ActivityLog Error]', error.message);
    return null;
  }
};

module.exports = {
  recordActivity
};
