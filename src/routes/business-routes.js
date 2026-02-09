const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
//const { createBusinessProfile } = require('../controllers/businessController');

router.post('/register', businessController.createBusinessProfile); 

router.get('/province', businessController.gerProvince);

module.exports = router;