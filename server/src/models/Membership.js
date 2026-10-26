const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'guest'],
      default: 'member'
    },
    status: {
      type: String,
      enum: ['invited', 'active', 'removed'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index ensuring a user only has one membership per workspace
membershipSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Membership', membershipSchema);
