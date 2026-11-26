const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const authenticate = require('../middleware/authenticate');
const resolveTenant = require('../middleware/resolveTenant');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, resolveTenant);

router.get('/summary', authorize('dashboard:read'), dashboardController.getDashboardSummary);

module.exports = router;
