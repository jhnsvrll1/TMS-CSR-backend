const express = require('express');
const router = express.Router();

const { 
    getQuestions, 
    submitAssessment, 
    getAssessmentResult 
} = require('../controllers/assesmentController');

router.get('/questions', getQuestions);

router.post('/submit', submitAssessment);

router.get('/result/:resultId', getAssessmentResult);
//console.log('Check func:', { getQuestions, submitAssessment, getAssessmentResult });
module.exports = router;