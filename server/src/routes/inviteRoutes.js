const express = require('express');
const { body } = require('express-validator');
const inviteController = require('../controllers/inviteController');
const { verifyToken } = require('../utils/tokens');
const User = require('../models/User');
const validate = require('../middleware/validate');

const router = express.Router();

// Optional authentication middleware: if Authorization header is present, attach req.user
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId);
      if (user) req.user = user;
    } catch (e) {
      // Ignore token failure for public invite acceptance
    }
  }
  next();
};

router.post(
  '/accept',
  optionalAuth,
  [
    body('token').trim().notEmpty().withMessage('Invite token is required')
  ],
  validate,
  inviteController.acceptInvite
);

router.get('/details', inviteController.getInviteDetails);

module.exports = router;
