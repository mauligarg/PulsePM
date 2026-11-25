const pino = require('pino');
const env = require('../config/env');

const logger = pino({
  level: env.LOG_LEVEL || 'info',
  base: {
    service: 'pulsepm-api',
    env: env.NODE_ENV
  },
  redact: ['req.headers.authorization', 'password', 'tokenHash']
});

module.exports = logger;
