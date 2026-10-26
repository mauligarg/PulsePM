const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Membership = require('../models/Membership');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const Comment = require('../models/Comment');
const Activity = require('../models/Activity');
const Invite = require('../models/Invite');
const { runWithSystemContext } = require('../utils/context');

async function clearDatabase() {
  console.log('\n======================================================');
  console.log('🧹 CLEARING ALL DATA FROM DATABASE');
  console.log('======================================================\n');

  await connectDB();

  try {
    await runWithSystemContext(async () => {
      await User.deleteMany({});
      await Workspace.deleteMany({});
      await Membership.deleteMany({});
      await Project.deleteMany({});
      await Task.deleteMany({});
      await Sprint.deleteMany({});
      await Comment.deleteMany({});
      await Activity.deleteMany({});
      await Invite.deleteMany({});
    });

    console.log('✅ All collections have been cleared successfully!');
    console.log('Database is now in a pristine, empty state.\n');
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  clearDatabase();
}

module.exports = clearDatabase;
