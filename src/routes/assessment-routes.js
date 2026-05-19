const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');
const verifyToken = require('../middlewares/authMiddleware');

// =====================================
// A. Routes Sisi User
// =====================================
router.get('/questions', assessmentController.getQuestions);
router.post('/submit', assessmentController.submitAssessment);
router.get('/result/:resultId', assessmentController.getAssessmentResult);
router.get('/all', verifyToken, assessmentController.getAllResult);

// =====================================
// B. Routes Sisi Admin (CRUD Builder)
// =====================================
// Groups
router.post('/groups', verifyToken, assessmentController.addGroup);
router.put('/groups/:id', verifyToken, assessmentController.updateGroup);
router.delete('/groups/:id', verifyToken, assessmentController.deleteGroup);

// Subgroups
router.post('/subgroups', verifyToken, assessmentController.addSubgroup);
router.put('/subgroups/:id', verifyToken, assessmentController.updateSubgroup);
router.delete('/subgroups/:id', verifyToken, assessmentController.deleteSubgroup);

// Categories
router.post('/categories', verifyToken, assessmentController.addCategory);
router.put('/categories/:id', verifyToken, assessmentController.updateCategory);
router.delete('/categories/:id', verifyToken, assessmentController.deleteCategory);

// Questions
router.post('/questions', verifyToken, assessmentController.addQuestion);
router.put('/questions/:id', verifyToken, assessmentController.updateQuestion);
router.delete('/questions/:id', verifyToken, assessmentController.deleteQuestion);

// Options (Jawaban & Skor)
router.post('/options', verifyToken, assessmentController.addOption);
router.put('/options/:id', verifyToken, assessmentController.updateOption);
router.delete('/options/:id', verifyToken, assessmentController.deleteOption);

module.exports = router;