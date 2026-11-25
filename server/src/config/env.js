const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'supersecret_jwt_key_for_multitenant_saas_evaluation_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  SMTP: {
    HOST: process.env.SMTP_HOST || '',
    PORT: Number(process.env.SMTP_PORT) || 587,
    USER: process.env.SMTP_USER || '',
    PASS: process.env.SMTP_PASS || '',
    FROM: process.env.SMTP_FROM || 'no-reply@saas-pm.local'
  },
  GMAIL: {
    CLIENT_ID: process.env.GMAIL_CLIENT_ID || '',
    CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET || '',
    REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN || '',
    USER: process.env.GMAIL_USER || ''
  },
  REDIS_URL: process.env.REDIS_URL || '',
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    API_KEY: process.env.CLOUDINARY_API_KEY || '',
    API_SECRET: process.env.CLOUDINARY_API_SECRET || ''
  },
  SENTRY_DSN: process.env.SENTRY_DSN || '',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};
