const mongoose = require('mongoose');
const tenantGuard = require('../plugins/tenantGuard');

/**
 * Task Model
 * 
 * Plain English explanation for Viva - Task Ordering Strategy:
 * We use a numeric / fractional gap-ordering strategy (default spacing: 1000).
 * When reordering a task between two adjacent tasks (task A with order 1000 and task B with order 2000),
 * the moved task is assigned order = (1000 + 2000) / 2 = 1500.
 * Benefits:
 * 1. Only the single moved task needs an UPDATE query, instead of shifting the order of all downstream tasks.
 * 2. Greatly minimizes race conditions when two users drag cards simultaneously in real-time.
 * 3. If gap spacing between items becomes less than 0.001, an automatic column re-normalization restores
 *    clean increments (1000, 2000, 3000, ...).
 */

const taskSchema = new mongoose.Schema(
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
    sprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sprint',
      index: true
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    status: {
      type: String,
      enum: ['backlog', 'todo', 'in_progress', 'in_review', 'done'],
      default: 'todo',
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true
    },
    labels: {
      type: [String],
      default: []
    },
    order: {
      type: Number,
      default: 1000,
      index: true
    },
    parentTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      index: true
    },
    dueDate: {
      type: Date
    },
    estimateHours: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

taskSchema.plugin(tenantGuard);

module.exports = mongoose.model('Task', taskSchema);
