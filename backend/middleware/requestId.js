const crypto = require('crypto');

/**
 * Request ID Middleware
 * Assigns a unique x-request-id to every incoming request so logs, error responses,
 * and Sentry events can be correlated across services.
 */
const requestIdMiddleware = (req, res, next) => {
  const incomingId = req.headers['x-request-id'];
  const requestId = typeof incomingId === 'string' && incomingId.trim() ? incomingId.trim() : crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};

module.exports = requestIdMiddleware;
