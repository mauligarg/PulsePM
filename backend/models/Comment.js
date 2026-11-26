const mongoose = require('mongoose');
const tenantGuard = require('../plugins/tenantGuard');

const commentSchema = new mongoose.Schema(
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
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: [true, 'Comment content cannot be empty'],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

commentSchema.plugin(tenantGuard);

module.exports = mongoose.model('Comment', commentSchema);
