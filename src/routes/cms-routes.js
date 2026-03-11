const express = require('express');
const router = express.Router();
const cmsController = require('../controllers/cmsController');
const upload = require('../middlewares/upload');
const verifyToken = require('../middlewares/authMiddleware');

// router.post('/upload-image', upload.single('image'), (req, res) =>{
//     try{
//         if(!req.file){
//             return res.status(400).json({success: false, message: 'No file attached'});
//         }

//         const imageUrl = `/uploads/${req.file.filename}`;
//         res.status(200).json({success: true, imageUrl: imageUrl});
//     }catch(error){
//         console.error("upload error: ", error);
//         res.sptatus(500).json({success:false, message: "failed uploading image"});
//     }
// })




// INI YG PUBLIC
router.get('/solutions',cmsController.getSolutions);
router.get('/team',cmsController.getTeamMembers);
router.get('/settings',cmsController.getGeneralSettings);
router.get('/public/landing', cmsController.getLandingPageData);
// PRVIVATE
router.post('/solutions', verifyToken,cmsController.addSolution);
router.put('/solutions/:id', verifyToken,cmsController.updateSolution);
router.delete('/solutions/:id', verifyToken,cmsController.deleteSolution);
router.put('/settings', verifyToken,cmsController.updateGeneralSettings);
router.post('/team', verifyToken,cmsController.addTeamMember);
router.put('/team/:id', verifyToken,cmsController.updateTeamMember);
router.delete('/team/:id', verifyToken,cmsController.deleteTeamMember);
router.post('/solutions/sync', verifyToken, cmsController.syncSolutions);
router.post('/team/sync', verifyToken, cmsController.syncTeamMembers);
module.exports = router;