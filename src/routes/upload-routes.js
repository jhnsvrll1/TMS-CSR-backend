const express = require('express');
const router = express.Router();
const upload = require ('../middlewares/upload');

router.post('/image', upload.single('image'), (req,res) => {
    try {
        if(!req.file){
            return res.status(400).json({success: false, message: 'no image Uploaded!'});
        }

        const fileUrl =  `http://localhost:3000/uploads/${req.file.filename}`;
        
        res.json({
            success:true,
            message: 'Image Successfully Uploaded',
            data: {
                filename: req.file.filename,
                url: fileUrl
            }
        });
    }catch (error){

        console.error("upload error:", error);
        res.status(500).json({success: false, message:"fail when uploading image"});
    }
});

module.exports = router;