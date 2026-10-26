const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

/**
 * Signs a JWT with user and optional workspace tenancy claims.
 * @param {Object} payload - { userId, workspaceId, role }
 * @param {string} [expiresIn]
 * @returns {string}
 */
const signToken = (payload, expiresIn = env.JWT_EXPIRES_IN) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
};

/**
 * Verifies a JWT token.
 * @param {string} token
 * @returns {Object} decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

/**
 * Generates a high-entropy random token for workspace invitations (48 chars hex).
 * @returns {string} rawToken
 */
const generateInviteToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hashes an invitation token using SHA-256 for secure database storage.
 * @param {string} token
 * @returns {string} hex hash
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
  signToken,
  verifyToken,
  generateInviteToken,
  hashToken
};
