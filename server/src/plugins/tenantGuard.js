/**
 * Tenant Guard Mongoose Plugin
 * 
 * Plain English explanation for Viva:
 * In a multi-tenant SaaS application where multiple organizations share the same database tables/collections,
 * there is a critical risk of data leaks if a developer forgets `where: { workspaceId }` in an endpoint.
 * 
 * TenantGuard solves this at the database driver level:
 * 1. It hooks into Mongoose query hooks (find, findOne, update, delete, count) and automatically
 *    injects `{ workspaceId: currentTenantId }` into the query filter.
 * 2. It hooks into document saves and guarantees `doc.workspaceId` is strictly assigned to the current tenant.
 * 3. It intercepts aggregation pipelines and prepends a `$match: { workspaceId }` stage.
 * 4. CRITICAL SAFETY FEATURE: If any tenant-scoped query runs without an active workspace context
 *    (and without an explicit system bypass), it THROWS an immediate error to prevent cross-tenant leaks.
 */

const mongoose = require('mongoose');
const { getTenantContext, getWorkspaceId } = require('../utils/context');

function tenantGuard(schema, options = {}) {
  // Ensure the schema defines workspaceId
  if (!schema.path('workspaceId')) {
    schema.add({
      workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        required: true,
        index: true
      }
    });
  }

  // Pre-query hook for find, findOne, updateOne, updateMany, deleteOne, deleteMany, countDocuments
  const queryMethods = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'findOneAndDelete',
    'findOneAndReplace',
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
    'countDocuments',
    'estimatedDocumentCount'
  ];

  queryMethods.forEach((method) => {
    schema.pre(method, function () {
      const context = getTenantContext();

      // System context (e.g. background worker, migration, seed script) can bypass
      if (context.isSystem || this.getOptions().skipTenantCheck) {
        return;
      }

      const activeWorkspaceId = getWorkspaceId();
      if (!activeWorkspaceId) {
        throw new Error(
          `[TenantGuard Violation] Operation '${method}' on '${this.model.modelName}' blocked. No tenant workspace context was set for this request.`
        );
      }

      // Convert to ObjectId for MongoDB comparison
      const tenantObjectId = mongoose.Types.ObjectId.isValid(activeWorkspaceId)
        ? new mongoose.Types.ObjectId(activeWorkspaceId)
        : activeWorkspaceId;

      // Force workspaceId into query criteria regardless of what the caller passed
      const currentQuery = this.getQuery() || {};
      
      // If caller tried to pass a different workspaceId, override it to the authenticated tenant
      this.setQuery({
        ...currentQuery,
        workspaceId: tenantObjectId
      });
    });
  });

  // Pre-validate hook: populates workspaceId BEFORE Mongoose required validations trigger
  schema.pre('validate', function (next) {
    const context = getTenantContext();

    if (context.isSystem && this.workspaceId) {
      return next();
    }

    const activeWorkspaceId = getWorkspaceId();
    if (!activeWorkspaceId) {
      if (context.isSystem) return next();
      return next(
        new Error(
          `[TenantGuard Violation] Validation on '${this.constructor.modelName}' blocked. No tenant workspace context was set.`
        )
      );
    }

    const tenantObjectId = mongoose.Types.ObjectId.isValid(activeWorkspaceId)
      ? new mongoose.Types.ObjectId(activeWorkspaceId)
      : activeWorkspaceId;

    // Always enforce the authenticated workspaceId
    this.workspaceId = tenantObjectId;
    next();
  });

  // Pre-save hook: guarantees new documents have the tenant's workspaceId
  schema.pre('save', function (next) {
    const context = getTenantContext();

    if (context.isSystem && this.workspaceId) {
      return next();
    }

    const activeWorkspaceId = getWorkspaceId();
    if (!activeWorkspaceId) {
      if (context.isSystem) return next();
      return next(
        new Error(
          `[TenantGuard Violation] Save on '${this.constructor.modelName}' blocked. No tenant workspace context was set.`
        )
      );
    }

    const tenantObjectId = mongoose.Types.ObjectId.isValid(activeWorkspaceId)
      ? new mongoose.Types.ObjectId(activeWorkspaceId)
      : activeWorkspaceId;

    this.workspaceId = tenantObjectId;
    next();
  });

  // Pre-insertMany hook
  schema.pre('insertMany', function (next, docs) {
    const context = getTenantContext();
    if (context.isSystem) {
      return next();
    }

    const activeWorkspaceId = getWorkspaceId();
    if (!activeWorkspaceId) {
      return next(
        new Error(
          `[TenantGuard Violation] insertMany on '${this.modelName}' blocked. No tenant workspace context was set.`
        )
      );
    }

    const tenantObjectId = mongoose.Types.ObjectId.isValid(activeWorkspaceId)
      ? new mongoose.Types.ObjectId(activeWorkspaceId)
      : activeWorkspaceId;

    if (Array.isArray(docs)) {
      docs.forEach((doc) => {
        doc.workspaceId = tenantObjectId;
      });
    }
    next();
  });

  // Pre-aggregate hook
  schema.pre('aggregate', function () {
    const context = getTenantContext();
    if (context.isSystem || this.options.skipTenantCheck) {
      return;
    }

    const activeWorkspaceId = getWorkspaceId();
    if (!activeWorkspaceId) {
      throw new Error(
        `[TenantGuard Violation] Aggregate pipeline on '${this.model().modelName}' blocked. No tenant workspace context was set.`
      );
    }

    const tenantObjectId = mongoose.Types.ObjectId.isValid(activeWorkspaceId)
      ? new mongoose.Types.ObjectId(activeWorkspaceId)
      : activeWorkspaceId;

    // Prepend a $match stage to enforce multi-tenancy at the root of the aggregation
    this.pipeline().unshift({
      $match: {
        workspaceId: tenantObjectId
      }
    });
  });
}

module.exports = tenantGuard;
