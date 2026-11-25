const mongoose = require('mongoose');
const tenantGuard = require('../plugins/tenantGuard');

const timeLogSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    hours: {
      type: Number,
      required: [true, 'Hours are required'],
      min: [0.1, 'Minimum time log is 0.1 hours'],
      max: [24, 'Cannot log more than 24 hours in a single entry']
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    note: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

timeLogSchema.plugin(tenantGuard);

module.exports = mongoose.model('TimeLog', timeLogSchema);
