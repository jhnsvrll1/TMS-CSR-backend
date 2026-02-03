const express = require('express');
const router = express.Router();
const { createBusinessProfile } = require('../controllers/businessController');

router.post('/register', createBusinessProfile); 

module.exports = router;