/**
 * Database Seed Script
 * 
 * Run with: npm run seed
 * 
 * Populates realistic multi-tenant evaluation data:
 * - 2 Workspaces ("Acme Corp", "Globex Corp")
 * - 4 Users with all RBAC roles (Owner, Admin, Member, Guest)
 * - 3 Projects ("Mobile App v2", "Website Redesign", "Cloud Migration")
 * - 25+ Tasks across all Kanban columns (Backlog, Todo, In Progress, In Review, Done)
 *   with varied priorities, labels, and due dates
 * - Real comments & audit activity feed
 */

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Membership = require('../models/Membership');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const Activity = require('../models/Activity');
const { runWithSystemContext, runWithTenant } = require('../utils/context');

async function seedData() {
  console.log('\n======================================================');
  console.log('🌱 SEEDING MULTI-TENANT DATABASE WITH DEMO DATA');
  console.log('======================================================\n');

  await runWithSystemContext(async () => {
    // 1. Clean existing records
    console.log('🧹 Clearing previous demo data...');
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await Membership.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Comment.deleteMany({});
    await Activity.deleteMany({});

      // 2. Create Users
      console.log('👤 Creating users with different RBAC roles...');
      const password = 'password123';

      const owner = await User.create({
        name: 'Dhruv Owner',
        email: 'owner@acme.com',
        password,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dhruv'
      });

      const admin = await User.create({
        name: 'Sarah Admin',
        email: 'admin@acme.com',
        password,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
      });

      const member = await User.create({
        name: 'Alex Member',
        email: 'member@acme.com',
        password,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
      });

      const guest = await User.create({
        name: 'Greg Guest',
        email: 'guest@acme.com',
        password,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Greg'
      });

      // User for second workspace
      const globexOwner = await User.create({
        name: 'Hank Scorpio',
        email: 'hank@globex.com',
        password,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hank'
      });

      // 3. Create Workspaces
      console.log('🏢 Creating multi-tenant workspaces...');
      const acmeWorkspace = await Workspace.create({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: owner._id,
        plan: 'pro'
      });

      const globexWorkspace = await Workspace.create({
        name: 'Globex Corp',
        slug: 'globex-corp',
        ownerId: globexOwner._id,
        plan: 'free'
      });

      // 4. Create Memberships
      console.log('🤝 Assigning roles and memberships...');
      await Membership.create([
        { workspaceId: acmeWorkspace._id, userId: owner._id, role: 'owner', status: 'active' },
        { workspaceId: acmeWorkspace._id, userId: admin._id, role: 'admin', status: 'active' },
        { workspaceId: acmeWorkspace._id, userId: member._id, role: 'member', status: 'active' },
        { workspaceId: acmeWorkspace._id, userId: guest._id, role: 'guest', status: 'active' },
        // Globex memberships
        { workspaceId: globexWorkspace._id, userId: globexOwner._id, role: 'owner', status: 'active' },
        { workspaceId: globexWorkspace._id, userId: owner._id, role: 'member', status: 'active' } // Dhruv is also member of Globex to test switcher!
      ]);

      // 5. Seed Projects and Tasks in Acme Corp using Acme tenant context
      console.log('📁 Creating projects and tasks for Acme Corp...');
      await runWithTenant({ workspaceId: acmeWorkspace._id, userId: owner._id, role: 'owner' }, async () => {
        const p1 = await Project.create({
          name: 'Mobile App Redesign',
          key: 'MOB',
          description: 'Next-generation mobile iOS & Android client with React Native',
          leadId: owner._id
        });

        const p2 = await Project.create({
          name: 'Core Backend Services',
          key: 'SRV',
          description: 'Microservices architecture with Node.js and MongoDB sharding',
          leadId: admin._id
        });

        const p3 = await Project.create({
          name: 'Marketing Launch Portal',
          key: 'MKT',
          description: 'Customer facing landing pages, pricing calculator, and documentation',
          leadId: member._id
        });

        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

        // Array of realistic demo tasks
        const demoTasks = [
          // Project 1: Mobile App Redesign (10 tasks)
          { projectId: p1._id, title: 'Design onboarding user flows in Figma', status: 'done', priority: 'high', assigneeId: member._id, order: 1000, labels: ['design', 'ui'], dueDate: pastDate, estimateHours: 8 },
          { projectId: p1._id, title: 'Implement biometric FaceID / TouchID authentication', status: 'done', priority: 'urgent', assigneeId: admin._id, order: 2000, labels: ['security'], dueDate: pastDate, estimateHours: 12 },
          { projectId: p1._id, title: 'Build bottom tab navigation bar', status: 'in_review', priority: 'medium', assigneeId: member._id, order: 1000, labels: ['ui', 'navigation'], dueDate: tomorrow, estimateHours: 6 },
          { projectId: p1._id, title: 'Integrate push notification service with FCM', status: 'in_progress', priority: 'high', assigneeId: owner._id, order: 1000, labels: ['notifications'], dueDate: nextWeek, estimateHours: 16 },
          { projectId: p1._id, title: 'Implement offline caching for project boards', status: 'in_progress', priority: 'urgent', assigneeId: admin._id, order: 2000, labels: ['offline', 'sync'], dueDate: tomorrow, estimateHours: 14 },
          { projectId: p1._id, title: 'Dark mode theme toggle and persistent preference', status: 'todo', priority: 'low', assigneeId: member._id, order: 1000, labels: ['ui', 'theme'], dueDate: nextWeek, estimateHours: 4 },
          { projectId: p1._id, title: 'Optimize image asset loading and SVG rendering', status: 'todo', priority: 'medium', assigneeId: member._id, order: 2000, labels: ['performance'], dueDate: nextWeek, estimateHours: 5 },
          { projectId: p1._id, title: 'Draft test flight beta release checklist', status: 'todo', priority: 'medium', assigneeId: owner._id, order: 3000, labels: ['qa'], dueDate: nextWeek, estimateHours: 3 },
          { projectId: p1._id, title: 'Investigate deep-linking architecture for invite links', status: 'backlog', priority: 'medium', assigneeId: admin._id, order: 1000, labels: ['research'], dueDate: null, estimateHours: 8 },
          { projectId: p1._id, title: 'Conduct user interviews with 5 beta testers', status: 'backlog', priority: 'low', assigneeId: owner._id, order: 2000, labels: ['research'], dueDate: null, estimateHours: 10 },

          // Project 2: Core Backend Services (9 tasks)
          { projectId: p2._id, title: 'Design database schema and compound indexes', status: 'done', priority: 'high', assigneeId: admin._id, order: 1000, labels: ['database', 'architecture'], dueDate: pastDate, estimateHours: 10 },
          { projectId: p2._id, title: 'Implement tenantGuard Mongoose isolation plugin', status: 'done', priority: 'urgent', assigneeId: owner._id, order: 2000, labels: ['security', 'multi-tenancy'], dueDate: pastDate, estimateHours: 14 },
          { projectId: p2._id, title: 'Configure JWT workspace-scoped claims verification', status: 'done', priority: 'high', assigneeId: owner._id, order: 3000, labels: ['auth'], dueDate: pastDate, estimateHours: 6 },
          { projectId: p2._id, title: 'Set up Socket.io room-based event dispatching', status: 'in_review', priority: 'high', assigneeId: admin._id, order: 1000, labels: ['websockets'], dueDate: tomorrow, estimateHours: 8 },
          { projectId: p2._id, title: 'Implement single-use SHA-256 invite token system', status: 'in_progress', priority: 'high', assigneeId: admin._id, order: 1000, labels: ['security'], dueDate: tomorrow, estimateHours: 7 },
          { projectId: p2._id, title: 'Build fractional ordering algorithm for Kanban moves', status: 'todo', priority: 'medium', assigneeId: member._id, order: 1000, labels: ['algorithm'], dueDate: nextWeek, estimateHours: 5 },
          { projectId: p2._id, title: 'Implement audit activity logging pipeline', status: 'todo', priority: 'medium', assigneeId: member._id, order: 2000, labels: ['audit'], dueDate: nextWeek, estimateHours: 6 },
          { projectId: p2._id, title: 'Add express-validator sanitization schemas', status: 'backlog', priority: 'low', assigneeId: null, order: 1000, labels: ['validation'], dueDate: null, estimateHours: 4 },
          { projectId: p2._id, title: 'Automate multi-tenant isolation unit tests', status: 'backlog', priority: 'medium', assigneeId: admin._id, order: 2000, labels: ['testing'], dueDate: null, estimateHours: 8 },

          // Project 3: Marketing Launch Portal (7 tasks)
          { projectId: p3._id, title: 'Setup landing page hero section with Tailwind CSS', status: 'done', priority: 'high', assigneeId: member._id, order: 1000, labels: ['marketing', 'frontend'], dueDate: pastDate, estimateHours: 6 },
          { projectId: p3._id, title: 'Write copy for feature comparison matrix', status: 'in_progress', priority: 'medium', assigneeId: owner._id, order: 1000, labels: ['content'], dueDate: tomorrow, estimateHours: 4 },
          { projectId: p3._id, title: 'Interactive SaaS pricing calculator widget', status: 'in_progress', priority: 'high', assigneeId: member._id, order: 2000, labels: ['frontend'], dueDate: tomorrow, estimateHours: 8 },
          { projectId: p3._id, title: 'SEO meta tags, OpenGraph images, and sitemap.xml', status: 'todo', priority: 'medium', assigneeId: member._id, order: 1000, labels: ['seo'], dueDate: nextWeek, estimateHours: 4 },
          { projectId: p3._id, title: 'Set up customer support chat widget integration', status: 'todo', priority: 'low', assigneeId: null, order: 2000, labels: ['support'], dueDate: nextWeek, estimateHours: 3 },
          { projectId: p3._id, title: 'A/B testing analytics tracking for signup button', status: 'backlog', priority: 'low', assigneeId: null, order: 1000, labels: ['analytics'], dueDate: null, estimateHours: 4 },
          { projectId: p3._id, title: 'Prepare Product Hunt launch materials & gifs', status: 'backlog', priority: 'high', assigneeId: owner._id, order: 2000, labels: ['launch'], dueDate: null, estimateHours: 12 }
        ];

        const createdTasks = await Task.insertMany(demoTasks);

        // Add some realistic comments
        await Comment.create([
          {
            taskId: createdTasks[2]._id,
            authorId: owner._id,
            content: 'Great progress! Please ensure the active tab indicator uses our primary blue accent.'
          },
          {
            taskId: createdTasks[2]._id,
            authorId: member._id,
            content: 'Updated the theme colors in the latest commit, ready for review!'
          },
          {
            taskId: createdTasks[4]._id,
            authorId: admin._id,
            content: 'Offline SQLite cache is passing sync benchmarks with 5,000 tasks.'
          }
        ]);

        // Add activity feed entries
        await Activity.create([
          {
            actorId: owner._id,
            entityType: 'project',
            entityId: p1._id,
            action: 'created',
            meta: { name: p1.name, key: p1.key },
            createdAt: new Date(Date.now() - 3600000 * 5)
          },
          {
            actorId: admin._id,
            entityType: 'task',
            entityId: createdTasks[1]._id,
            action: 'moved',
            meta: { title: createdTasks[1].title, fromStatus: 'in_review', toStatus: 'done' },
            createdAt: new Date(Date.now() - 3600000 * 3)
          },
          {
            actorId: member._id,
            entityType: 'task',
            entityId: createdTasks[2]._id,
            action: 'moved',
            meta: { title: createdTasks[2].title, fromStatus: 'in_progress', toStatus: 'in_review' },
            createdAt: new Date(Date.now() - 3600000 * 2)
          },
          {
            actorId: owner._id,
            entityType: 'comment',
            entityId: createdTasks[2]._id,
            action: 'commented',
            meta: { taskTitle: createdTasks[2].title, snippet: 'Great progress! Please ensure...' },
            createdAt: new Date(Date.now() - 3600000 * 1)
          }
        ]);
      });

      // 6. Seed Project & Tasks in Globex Corp (To demonstrate multi-tenant isolation)
      console.log('🏢 Creating isolated project & tasks in Globex Corp...');
      await runWithTenant({ workspaceId: globexWorkspace._id, userId: globexOwner._id, role: 'owner' }, async () => {
        const globexProject = await Project.create({
          name: 'Project Scorpio',
          key: 'SCP',
          description: 'Top-secret international Globex energy initiative',
          leadId: globexOwner._id
        });

        await Task.create([
          {
            projectId: globexProject._id,
            title: 'Deploy volcanic generator power grid',
            status: 'in_progress',
            priority: 'urgent',
            assigneeId: globexOwner._id,
            order: 1000
          },
          {
            projectId: globexProject._id,
            title: 'Procure supply chain materials from overseas',
            status: 'todo',
            priority: 'high',
            assigneeId: globexOwner._id,
            order: 2000
          }
        ]);
      });
    });

    console.log('\n======================================================');
    console.log('✅ SEEDING COMPLETE! EVALUATION CREDENTIALS:');
    console.log('======================================================');
    console.log('Password for ALL demo accounts: password123\n');
    console.log('1. OWNER Account (Full Control):');
    console.log('   Email: owner@acme.com');
    console.log('   Role:  Owner (Acme Corp) & Member (Globex Corp)');
    console.log('------------------------------------------------------');
    console.log('2. ADMIN Account (Projects & Invites):');
    console.log('   Email: admin@acme.com');
    console.log('   Role:  Admin (Acme Corp)');
    console.log('------------------------------------------------------');
    console.log('3. MEMBER Account (Tasks & Comments):');
    console.log('   Email: member@acme.com');
    console.log('   Role:  Member (Acme Corp)');
    console.log('------------------------------------------------------');
    console.log('4. GUEST Account (Read-Only):');
    console.log('   Email: guest@acme.com');
    console.log('   Role:  Guest (Acme Corp - Read Only)');
    console.log('------------------------------------------------------');
    console.log('5. SECOND TENANT OWNER (Globex Corp):');
    console.log('   Email: hank@globex.com');
    console.log('   Role:  Owner (Globex Corp)');
  console.log('======================================================\n');
}

async function runCli() {
  await connectDB();
  try {
    await seedData();
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  seedData
};
