const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');
const verifyToken = require('../middlewares/authMiddleware');
const { 
    getQuestions, 
    submitAssessment, 
    getAssessmentResult, 
    getAllResult
} = require('../controllers/assessmentController');

router.get('/questions', getQuestions);

router.post('/submit', submitAssessment);

router.get('/result/:resultId', getAssessmentResult);

router.get('/all', verifyToken, assessmentController.getAllResult);
//console.log('Check func:', { getQuestions, submitAssessment, getAssessmentResult });
module.exports = router;