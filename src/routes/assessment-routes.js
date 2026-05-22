const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');
const verifyToken = require('../middlewares/authMiddleware');

router.get('/questions', assessmentController.getQuestions);
router.post('/submit', assessmentController.submitAssessment);
router.get('/result/:resultId', assessmentController.getAssessmentResult);
router.get('/all', verifyToken, assessmentController.getAllResult);

router.post('/groups', verifyToken, assessmentController.addGroup);
router.put('/groups/:id', verifyToken, assessmentController.updateGroup);
router.delete('/groups/:id', verifyToken, assessmentController.deleteGroup);

router.post('/subgroups', verifyToken, assessmentController.addSubgroup);
router.put('/subgroups/:id', verifyToken, assessmentController.updateSubgroup);
router.delete('/subgroups/:id', verifyToken, assessmentController.deleteSubgroup);

router.post('/categories', verifyToken, assessmentController.addCategory);
router.put('/categories/:id', verifyToken, assessmentController.updateCategory);
router.delete('/categories/:id', verifyToken, assessmentController.deleteCategory);

router.post('/questions', verifyToken, assessmentController.addQuestion);
router.put('/questions/:id', verifyToken, assessmentController.updateQuestion);
router.delete('/questions/:id', verifyToken, assessmentController.deleteQuestion);

router.post('/options', verifyToken, assessmentController.addOption);
router.put('/options/:id', verifyToken, assessmentController.updateOption);
router.delete('/options/:id', verifyToken, assessmentController.deleteOption);

module.exports = router;