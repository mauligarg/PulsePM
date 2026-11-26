const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Membership = require('../models/Membership');
const { signToken } = require('../utils/tokens');

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

module.exports = {
  register,
  login,
  getMe
};
