const mongoose = require('mongoose');
const tenantGuard = require('../plugins/tenantGuard');

const projectSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true
    },
    key: {
      type: String,
      required: [true, 'Project key is required'],
      uppercase: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

// Compound index for uniqueness of key within a workspace
projectSchema.index({ workspaceId: 1, key: 1 }, { unique: true });

// Attach tenant isolation guard
projectSchema.plugin(tenantGuard);

module.exports = mongoose.model('Project', projectSchema);
