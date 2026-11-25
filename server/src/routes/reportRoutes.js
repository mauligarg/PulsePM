const express = require('express');
const reportController = require('../controllers/reportController');
const authenticate = require('../middleware/authenticate');
const resolveTenant = require('../middleware/resolveTenant');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, resolveTenant);

router.get('/burndown', authorize('report:read'), reportController.getBurndown);
router.get('/velocity', authorize('report:read'), reportController.getVelocity);
router.get('/workload', authorize('report:read'), reportController.getWorkload);

module.exports = router;
