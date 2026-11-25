/**
 * @Mention Parser & Workspace-Scoped Notification Dispatcher
 *
 * Plain English explanation for Viva:
 * When a user types `@name` in a task description or comment, we extract `@tokens`
 * and resolve them STRICTLY against active Memberships of the current workspace.
 * Users outside the workspace can never be mentioned or notified (preserving tenant isolation).
 * Each matched member receives a persisted Notification document plus a real-time
 * Socket.io event pushed to their user-scoped room `user:<userId>`.
 */

const Membership = require('../models/Membership');
const Notification = require('../models/Notification');

const processMentions = async ({ text, workspaceId, actor, task, io }) => {
  if (!text || !workspaceId || !actor) return [];

  // Match @username or @"Full Name" or @email-style tokens
  const mentionMatches = text.match(/@([a-zA-Z0-9._-]+)/g);
  if (!mentionMatches || mentionMatches.length === 0) return [];

  const tokens = [...new Set(mentionMatches.map((m) => m.slice(1).toLowerCase()))];

  // Fetch active members of THIS workspace only
  const memberships = await Membership.find({
    workspaceId,
    status: 'active'
  }).populate('userId', 'name email avatar');

  const notifiedUserIds = new Set();
  const createdNotifications = [];

  for (const m of memberships) {
    if (!m.userId) continue;
    const member = m.userId;

    // Do not notify the author if they mention themselves
    if (member._id.toString() === actor._id.toString()) continue;
    if (notifiedUserIds.has(member._id.toString())) continue;

    const fullNameSlug = member.name.toLowerCase().replace(/\s+/g, '');
    const firstName = member.name.toLowerCase().split(/\s+/)[0];
    const emailPrefix = member.email.toLowerCase().split('@')[0];

    const isMatched = tokens.some(
      (tok) =>
        tok === firstName ||
        tok === fullNameSlug ||
        tok === emailPrefix ||
        tok === member.email.toLowerCase()
    );

    if (isMatched) {
      notifiedUserIds.add(member._id.toString());
      const notif = await Notification.create({
        userId: member._id,
        actorId: actor._id,
        taskId: task?._id,
        type: 'mention',
        message: `${actor.name} mentioned you in "${task?.title || 'a task'}"`
      });

      const populated = await Notification.findById(notif._id)
        .populate('actorId', 'name email avatar')
        .populate('taskId', 'title projectId');

      createdNotifications.push(populated);

      if (io) {
        io.to(`user:${member._id.toString()}`).emit('notification:new', populated);
      }
    }
  }

  return createdNotifications;
};

module.exports = { processMentions };
