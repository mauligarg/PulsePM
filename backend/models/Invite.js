const mongoose = require('mongoose');

/**
 * Workspace Invite Model
 * 
 * Plain English explanation for Viva - Token Hashing Security:
 * Similar to secure password storage or API keys, raw invitation tokens are NEVER stored in the database.
 * If the database were ever compromised, an attacker could not use stored records to join workspaces.
 * Instead:
 * 1. The server generates a high-entropy cryptographically secure random token (or signed hex token).
 * 2. Only its SHA-256 one-way cryptographic hash (`tokenHash`) is saved in the database.
 * 3. The raw token is emailed (or returned in dev mode) to the invitee.
 * 4. When accepted, the incoming token is hashed with SHA-256 and matched against `tokenHash`.
 * 5. Expired or already-used invitations are immediately rejected.
 */

const inviteSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'guest'],
      default: 'member'
    },
    tokenHash: {
      type: String,
      required: true,
      index: true
    },
    invitedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    used: {
      type: Boolean,
      default: false
    },
    usedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Invite', inviteSchema);
