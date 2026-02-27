const express = require('express');
const router = express.Router();
const cmsController = require('../controllers/cmsController');

router.get('/settings', cmsController.getGeneralSettings);

router.put('/settings', cmsController.updateGeneralSettings);
router.get('/solutions', cmsController.getSolutions);
router.post('/solutions', cmsController.addSolution);
router.put('/solutions/:id', cmsController.updateSolution);
router.delete('/solutions/:id', cmsController.deleteSolution);
router.get('/team', cmsController.getTeamMembers);
router.post('/team', cmsController.addTeamMember);
router.put('/team/:id', cmsController.updateTeamMember);
router.delete('/team/:id', cmsController.deleteTeamMember);
module.exports = router;