const mongoose = require('mongoose');
const tenantGuard = require('../plugins/tenantGuard');

const activitySchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    entityType: {
      type: String,
      enum: ['project', 'task', 'comment', 'workspace', 'membership'],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    action: {
      type: String,
      required: true
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

activitySchema.plugin(tenantGuard);

module.exports = mongoose.model('Activity', activitySchema);
