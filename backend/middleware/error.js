const Sentry = require('@sentry/node');
const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Central Error Handler Middleware
 * Formats all application errors into a predictable JSON shape:
 * { success: false, message: string, requestId?: string, errors?: Array }
 */
const errorHandler = (err, req, res, next) => {
  const log = req.log || logger;
  log.error({ err, requestId: req.requestId, workspaceId: req.workspaceId }, err.message || 'Application Error');

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || undefined;

  // Handle Mongoose Duplicate Key (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A resource with that ${field} already exists.`;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error occurred';
    errors = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message
    }));
  }

  // Handle TenantGuard Violation specifically
  if (err.message && err.message.includes('[TenantGuard Violation]')) {
    statusCode = 403;
    message = err.message;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token invalid or expired';
  }

  if (statusCode >= 500 && env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (req.requestId) scope.setTag('requestId', req.requestId);
      if (req.workspaceId) scope.setTag('workspaceId', req.workspaceId.toString());
      Sentry.captureException(err);
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(req.requestId ? { requestId: req.requestId } : {}),
    ...(errors ? { errors } : {})
  });
};

const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.method} ${req.originalUrl}`,
    ...(req.requestId ? { requestId: req.requestId } : {})
  });
};

module.exports = {
  errorHandler,
  notFound
};
