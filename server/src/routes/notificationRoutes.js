const express = require('express');
const notificationController = require('../controllers/notificationController');
const authenticate = require('../middleware/authenticate');
const resolveTenant = require('../middleware/resolveTenant');

const router = express.Router();

router.use(authenticate, resolveTenant);

router.get('/', notificationController.listNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.post('/read-all', notificationController.markAllAsRead);

module.exports = router;
