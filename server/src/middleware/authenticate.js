const { verifyToken } = require('../utils/tokens');
const User = require('../models/User');

/**
 * Authentication Middleware
 * Validates JWT from Authorization header ('Bearer <token>')
 * Attaches authenticated user and any token-scoped tenant claims to req.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing or invalid'
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Token has expired or is invalid'
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists'
      });
    }

    req.user = user;
    // Extract workspace tenancy claims if present in token
    req.workspaceId = decoded.workspaceId || null;
    req.role = decoded.role || null;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
