const mongoose = require('mongoose');
const tenantGuard = require('../plugins/tenantGuard');

const sprintSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Sprint name is required'],
      trim: true
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['planned', 'active', 'completed'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

sprintSchema.plugin(tenantGuard);

module.exports = mongoose.model('Sprint', sprintSchema);
