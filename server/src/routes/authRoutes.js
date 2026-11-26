const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { createRateLimiter } = require('../middleware/rateLimit');
const { validatePasswordStrength, STRONG_PASSWORD_MESSAGE } = require('../utils/password');

const router = express.Router();

const strongPasswordRule = (fieldName = 'password') =>
  body(fieldName).custom((value) => {
    const { valid } = validatePasswordStrength(value);
    if (!valid) {
      throw new Error(STRONG_PASSWORD_MESSAGE);
    }
    return true;
  });

const forgotPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests. Please try again in 15 minutes.'
});

const resetPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many password reset attempts. Please try again later.'
});

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    strongPasswordRule('password')
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  authController.login
);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')],
  validate,
  authController.forgotPassword
);

router.get('/reset-password/verify', authController.verifyResetToken);

router.post(
  '/reset-password',
  resetPasswordLimiter,
  [
    body('token').trim().notEmpty().withMessage('Reset token is required'),
    strongPasswordRule('password')
  ],
  validate,
  authController.resetPassword
);

router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    strongPasswordRule('newPassword')
  ],
  validate,
  authController.changePassword
);

router.get('/me', authenticate, authController.getMe);

module.exports = router;
