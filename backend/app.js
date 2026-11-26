const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const Sentry = require('@sentry/node');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/error');
const requestIdMiddleware = require('./middleware/requestId');
const logger = require('./utils/logger');
const env = require('./config/env');

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0.2
  });
}

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = (env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// Security, request tracing, and structured logging middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (curl, health checks, server-to-server)
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/+$/, '');
      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true
  })
);
app.use(requestIdMiddleware);
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.requestId,
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url
      }),
      res: (res) => ({
        statusCode: res.statusCode
      })
    },
    customProps: (req) => ({
      requestId: req.requestId,
      workspaceId: req.workspaceId ? req.workspaceId.toString() : undefined
    })
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static local uploads fallback (used when Cloudinary is not configured)
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// Main API routes
app.use('/api', routes);

// 404 and global error handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;
