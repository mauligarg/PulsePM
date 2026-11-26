const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Membership = require('../models/Membership');
const env = require('../config/env');
const { signToken, generateInviteToken, hashToken } = require('../utils/tokens');
const { sendPasswordResetEmail } = require('../services/mailer');

const RESET_TOKEN_TTL_MINUTES = 20;

const getClientBaseUrl = () =>
  (env.CLIENT_URL || 'http://localhost:5173')
    .split(',')[0]
    .trim()
    .replace(/\/+$/, '');

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    const user = await User.create({
      name,
      email,
      password
    });

    // Generate token with userId claim
    const token = signToken({ userId: user._id });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user belongs to any active workspace (skip orphaned memberships where workspace was deleted)
    const memberships = await Membership.find({
      userId: user._id,
      status: 'active'
    })
      .populate('workspaceId')
      .sort({ createdAt: 1 });

    const validMembership = memberships.find((m) => m.workspaceId !== null);

    let tokenPayload = { userId: user._id };
    let activeWorkspace = null;
    let role = null;

    if (validMembership) {
      tokenPayload.workspaceId = validMembership.workspaceId._id;
      tokenPayload.role = validMembership.role;
      activeWorkspace = validMembership.workspaceId;
      role = validMembership.role;
    }

    const token = signToken(tokenPayload);

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user: user.toJSON(),
        token,
        activeWorkspace,
        role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile and active workspace claims
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    let activeWorkspace = null;
    let role = req.role;

    if (req.workspaceId) {
      activeWorkspace = await Workspace.findById(req.workspaceId);
    }

    if (!activeWorkspace) {
      const memberships = await Membership.find({
        userId: req.user._id,
        status: 'active'
      })
        .populate('workspaceId')
        .sort({ createdAt: 1 });
      const fallback = memberships.find((m) => m.workspaceId !== null);
      if (fallback) {
        activeWorkspace = fallback.workspaceId;
        role = fallback.role;
      }
    }

    // Get count of workspaces user belongs to
    const workspacesCount = await Membership.countDocuments({
      userId: req.user._id,
      status: 'active'
    });

    res.json({
      success: true,
      data: {
        user: req.user,
        activeWorkspace,
        role,
        workspacesCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset link
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  const genericMessage =
    'If an account exists with this email, you will receive a password reset link shortly.';

  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ success: true, message: genericMessage });
    }

    const rawToken = generateInviteToken();
    user.resetPasswordTokenHash = hashToken(rawToken);
    user.resetPasswordExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const resetLink = `${getClientBaseUrl()}/reset-password?token=${rawToken}`;

    await sendPasswordResetEmail({
      to: user.email,
      userName: user.name,
      resetLink,
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES
    });

    return res.json({ success: true, message: genericMessage });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify password reset token validity
 * GET /api/auth/reset-password/verify?token=...
 */
const verifyResetToken = async (req, res, next) => {
  try {
    const rawToken = typeof req.query.token === 'string' ? req.query.token.trim() : '';
    if (!rawToken) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is missing'
      });
    }

    const tokenHash = hashToken(rawToken);
    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired'
      });
    }

    res.json({
      success: true,
      message: 'Reset token is valid'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password using one-time token
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const tokenHash = hashToken(String(token).trim());

    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() }
    }).select('+password +resetPasswordTokenHash +resetPasswordExpiresAt');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired'
      });
    }

    user.password = password;
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpiresAt = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password for authenticated user
 * POST /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpiresAt = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    const tokenPayload = { userId: user._id };
    if (req.workspaceId) tokenPayload.workspaceId = req.workspaceId;
    if (req.role) tokenPayload.role = req.role;
    const newToken = signToken(tokenPayload);

    res.json({
      success: true,
      message: 'Password updated successfully',
      data: { token: newToken }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update authenticated user profile (name, avatar)
 * PATCH /api/auth/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }
    if (typeof avatar === 'string') {
      user.avatar = avatar.trim();
    }

    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  changePassword,
  updateProfile
};
