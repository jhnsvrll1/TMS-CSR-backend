const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const verifyToken = require('../middlewares/authMiddleware');

router.get('/users', settingsController.getUsers);
router.post('/users', settingsController.addUser);
router.put('/users/:id', settingsController.updateUser);
router.delete('/users/:id', settingsController.deleteUser);
router.put('/change-password', verifyToken, settingsController.changePassword);

module.exports = router;