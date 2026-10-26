const Project = require('../models/Project');
const Task = require('../models/Task');
const { recordActivity } = require('../utils/activity');

/**
 * List projects for the active workspace
 * GET /api/projects or GET /api/workspaces/:id/projects
 */
const listProjects = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    }

    // tenantGuard automatically injects { workspaceId }
    const projects = await Project.find(filter)
      .populate('leadId', 'name email avatar')
      .sort({ createdAt: -1 });

    // Include task counts per project
    const projectIds = projects.map(p => p._id);
    const taskCounts = await Task.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      {
        $group: {
          _id: '$projectId',
          total: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } }
        }
      }
    ]);

    const countMap = {};
    taskCounts.forEach(tc => {
      countMap[tc._id.toString()] = tc;
    });

    const enriched = projects.map(p => {
      const counts = countMap[p._id.toString()] || { total: 0, done: 0 };
      return {
        ...p.toObject(),
        taskCount: counts.total,
        doneCount: counts.done,
        progress: counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0
      };
    });

    res.json({
      success: true,
      data: enriched
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new project
 * POST /api/projects
 */
const createProject = async (req, res, next) => {
  try {
    const { name, key, description, leadId } = req.body;

    const formattedKey = (key || name.substring(0, 3)).toUpperCase().trim();

    const existing = await Project.findOne({ key: formattedKey });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A project with key '${formattedKey}' already exists in this workspace.`
      });
    }

    // tenantGuard assigns workspaceId automatically
    const project = await Project.create({
      name,
      key: formattedKey,
      description: description || '',
      leadId: leadId || req.user._id,
      status: 'active'
    });

    await recordActivity({
      actorId: req.user._id,
      entityType: 'project',
      entityId: project._id,
      action: 'created',
      meta: { name: project.name, key: project.key }
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update project
 * PATCH /api/projects/:id
 */
const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, leadId, status } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (leadId) project.leadId = leadId;
    if (status) project.status = status;

    await project.save();

    await recordActivity({
      actorId: req.user._id,
      entityType: 'project',
      entityId: project._id,
      action: 'updated',
      meta: { name: project.name }
    });

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Archive or Delete project
 * DELETE /api/projects/:id
 */
const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (permanent === 'true') {
      await Task.deleteMany({ projectId: project._id });
      await Project.deleteOne({ _id: project._id });
      await recordActivity({
        actorId: req.user._id,
        entityType: 'project',
        entityId: project._id,
        action: 'deleted',
        meta: { name: project.name }
      });
    } else {
      project.status = 'archived';
      await project.save();
      await recordActivity({
        actorId: req.user._id,
        entityType: 'project',
        entityId: project._id,
        action: 'archived',
        meta: { name: project.name }
      });
    }

    res.json({
      success: true,
      message: permanent === 'true' ? 'Project permanently deleted' : 'Project archived'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listProjects,
  createProject,
  updateProject,
  deleteProject
};
