/**
 * Multi-Tenant Context Manager using Node.js AsyncLocalStorage
 * 
 * Plain English explanation for Viva:
 * AsyncLocalStorage provides execution-scoped asynchronous storage, similar to thread-local storage in other languages.
 * When an incoming HTTP request is authenticated and its tenant (workspaceId) is resolved,
 * the entire request lifecycle runs inside `tenantStorage.run(...)`.
 * Any downstream database query, service function, or Mongoose hook can access `getWorkspaceId()`
 * without needing to manually pass `workspaceId` as an argument down dozens of function parameters.
 */

const { AsyncLocalStorage } = require('async_hooks');

const tenantStorage = new AsyncLocalStorage();

/**
 * Runs a function within the specified tenant context.
 * @param {Object} context - { workspaceId, userId, role, isSystem }
 * @param {Function} fn - Asynchronous or synchronous callback
 */
const runWithTenant = (context, fn) => {
  return tenantStorage.run(context, fn);
};

/**
 * Retrieves the current tenant context.
 * @returns {Object} context or empty object
 */
const getTenantContext = () => {
  return tenantStorage.getStore() || {};
};

/**
 * Retrieves the active workspaceId from the current context.
 * @returns {string|null}
 */
const getWorkspaceId = () => {
  const store = tenantStorage.getStore();
  return store && store.workspaceId ? store.workspaceId.toString() : null;
};

/**
 * Executes a callback with system privileges (bypassing tenant guard).
 * Used for seeding, migration, or internal cross-tenant verification scripts.
 * @param {Function} fn
 */
const runWithSystemContext = (fn) => {
  return tenantStorage.run({ isSystem: true }, fn);
};

module.exports = {
  tenantStorage,
  runWithTenant,
  getTenantContext,
  getWorkspaceId,
  runWithSystemContext
};
