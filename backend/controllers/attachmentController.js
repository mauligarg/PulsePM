const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Task = require('../models/Task');
const env = require('../config/env');
const { recordActivity } = require('../services/activity');
const { hasPermission } = require('../utils/permissions');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  }
});

const hasCloudinaryConfig = () =>
  Boolean(env.CLOUDINARY.CLOUD_NAME && env.CLOUDINARY.API_KEY && env.CLOUDINARY.API_SECRET);

if (hasCloudinaryConfig()) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY.CLOUD_NAME,
    api_key: env.CLOUDINARY.API_KEY,
    api_secret: env.CLOUDINARY.API_SECRET
  });
}

const uploadBufferToCloudinary = (buffer, originalname) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'pulsepm-attachments',
        resource_type: 'auto',
        public_id: `${Date.now()}-${path.parse(originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_')}`
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

/**
 * Upload an attachment to a task (Cloudinary or local /uploads fallback)
 * POST /api/tasks/:id/attachments
 */
const uploadAttachment = async (req, res, next) => {
  try {
    const { id: taskId } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    let url = '';
    let publicId = '';

    if (hasCloudinaryConfig()) {
      const result = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname);
      url = result.secure_url;
      publicId = result.public_id;
    } else {
      // Local dev fallback when Cloudinary keys are not configured
      const uploadsDir = path.resolve(__dirname, '../uploads', req.workspaceId.toString());
      fs.mkdirSync(uploadsDir, { recursive: true });
      const safeName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = path.join(uploadsDir, safeName);
      fs.writeFileSync(filePath, req.file.buffer);
      url = `/uploads/${req.workspaceId.toString()}/${safeName}`;
      publicId = `local:${req.workspaceId.toString()}/${safeName}`;
    }

    const attachment = {
      url,
      publicId,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    };

    task.attachments.push(attachment);
    await task.save();

    const savedAttachment = task.attachments[task.attachments.length - 1];

    await recordActivity({
      actorId: req.user._id,
      entityType: 'attachment',
      entityId: task._id,
      action: 'uploaded',
      meta: {
        taskId: task._id,
        taskTitle: task.title,
        filename: attachment.filename,
        size: attachment.size
      }
    });

    const io = req.app.get('io');
    if (io) {
      const populated = await Task.findById(task._id)
        .populate('assigneeId', 'name email avatar')
        .populate('projectId', 'name key');
      io.to(`ws:${req.workspaceId}`).emit('task:updated', populated);
    }

    res.status(201).json({
      success: true,
      message: 'Attachment uploaded successfully',
      data: savedAttachment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an attachment from a task
 * DELETE /api/tasks/:id/attachments/:attachmentId
 */
const deleteAttachment = async (req, res, next) => {
  try {
    const { id: taskId, attachmentId } = req.params;
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const att = task.attachments.id(attachmentId);
    if (!att) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    const isUploader = att.uploadedBy && att.uploadedBy.toString() === req.user._id.toString();
    const isAdminOrOwner = hasPermission(req.role, 'task:delete');
    if (!isUploader && !isAdminOrOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only the uploader or an admin/owner can delete this attachment'
      });
    }

    if (att.publicId && att.publicId.startsWith('local:')) {
      const rel = att.publicId.replace('local:', '');
      const localPath = path.resolve(__dirname, '../uploads', rel);
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    } else if (att.publicId && hasCloudinaryConfig()) {
      await cloudinary.uploader.destroy(att.publicId).catch(() => {});
    }

    const removedName = att.filename;
    task.attachments.pull({ _id: attachmentId });
    await task.save();

    await recordActivity({
      actorId: req.user._id,
      entityType: 'attachment',
      entityId: task._id,
      action: 'deleted',
      meta: { taskId: task._id, taskTitle: task.title, filename: removedName }
    });

    res.json({ success: true, message: 'Attachment deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadMiddleware: upload.single('file'),
  uploadAttachment,
  deleteAttachment
};
