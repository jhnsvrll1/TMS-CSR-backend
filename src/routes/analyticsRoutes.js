const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

router.get('/dashboard-summary', analyticsController.getDashboardSummary);

module.exports = router;