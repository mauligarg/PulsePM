const Invite = require('../models/Invite');
const Membership = require('../models/Membership');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { hashToken, signToken } = require('../utils/tokens');
const { recordActivity } = require('../utils/activity');

/**
 * Accept an invitation token
 * POST /api/invites/accept
 * Body: { token, userId? } (if logged in, userId is req.user._id)
 */
const acceptInvite = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invitation token is required'
      });
    }

    const tokenHash = hashToken(token);

    const invite = await Invite.findOne({ tokenHash });
    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invitation token'
      });
    }

    if (invite.used) {
      return res.status(400).json({
        success: false,
        message: 'This invitation has already been used'
      });
    }

    if (new Date() > invite.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'This invitation token has expired (valid for 48 hours)'
      });
    }

    // Determine target user
    let targetUser = req.user;
    if (!targetUser) {
      // If user is not logged in through auth header, find user by the invited email
      targetUser = await User.findOne({ email: invite.email });
      if (!targetUser) {
        return res.status(401).json({
          success: false,
          message: 'Please register or login with the invited email to accept this invitation',
          email: invite.email
        });
      }
    }

    const workspace = await Workspace.findById(invite.workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'The associated workspace no longer exists'
      });
    }

    // Upsert membership
    let membership = await Membership.findOne({
      workspaceId: invite.workspaceId,
      userId: targetUser._id
    });

    if (membership) {
      membership.role = invite.role;
      membership.status = 'active';
      await membership.save();
    } else {
      membership = await Membership.create({
        workspaceId: invite.workspaceId,
        userId: targetUser._id,
        role: invite.role,
        status: 'active'
      });
    }

    // Mark single-use token as used
    invite.used = true;
    invite.usedAt = new Date();
    await invite.save();

    await recordActivity({
      workspaceId: workspace._id,
      actorId: targetUser._id,
      entityType: 'membership',
      entityId: membership._id,
      action: 'joined',
      meta: { role: invite.role }
    });

    // Issue JWT with new workspace claims
    const jwtToken = signToken({
      userId: targetUser._id,
      workspaceId: workspace._id,
      role: invite.role
    });

    res.json({
      success: true,
      message: `You have successfully joined ${workspace.name}!`,
      data: {
        workspace,
        role: invite.role,
        token: jwtToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get invitation details before accepting (to show preview in UI)
 * GET /api/invites/details?token=...
 */
const getInviteDetails = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const tokenHash = hashToken(token);
    const invite = await Invite.findOne({ tokenHash })
      .populate('workspaceId', 'name slug')
      .populate('invitedById', 'name email');

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    if (invite.used) {
      return res.status(400).json({
        success: false,
        message: 'This invitation has already been used'
      });
    }

    if (new Date() > invite.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'This invitation has expired'
      });
    }

    res.json({
      success: true,
      data: {
        email: invite.email,
        role: invite.role,
        workspaceName: invite.workspaceId?.name,
        inviterName: invite.invitedById?.name,
        expiresAt: invite.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  acceptInvite,
  getInviteDetails
};
