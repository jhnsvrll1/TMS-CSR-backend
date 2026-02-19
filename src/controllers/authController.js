const pool = require('../config/db');
//const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
//const { text, Buffer } = require('stream/consumers');
require('dotenv').config();

const algorithm = 'aes-256-cbc';
const secretKey = process.env.AES_SECRET_KEY;


const encrypt = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (hash) => {
    const textParts = hash.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};

const login = async (req, res) => {
    try {
        const {email, password} = req.body;


        const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0){
            return res.status(401).json({success: false, message:"Email Tidak Terdaftar"});
        }

        const user = userRes.rows[0];

        try {
            const decryptedPassword = decrypt(user.password);

            if(password !== decryptedPassword){
                return res.status(401).json({success: false, message: "Incorrect Password"});
            }
        }catch (err){
            return res.status(500).json({success: false, message: 'Decryption Error'});


        }
        // buat generate jwt nya
        const token = jwt.sign(
            {id: user.id, role: user.role, name: user.name},
            process.env.JWT_SECRET,
            {expiresIn: '24h'}
        );

        await pool.query('INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)', [user.id, 'LOGIN']);

        res.json({
        success:true,
        message: "Login Berhasil",
        token: token,
        user: {id: user.id, name: user.name, email: user.email}
        });

    } catch (error){
        console.error(error);
        res.status(500).json({success: false, message: "server error"})
    }
};

const logout = async (req, res) => {
    try{
        const {userId} = req.body;

        if(userId) {
            await pool.query('INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)', [user.id, 'LOGOUT']);
        }

        res.json({success:true, message: "Logout berhasil dicatat"});
    }catch(error) {
        console.error("Logout Log Error: ", error);
        res.status(500).json({success:false, message: "server error"});
    }
}

const registerAdmin = async(req, res) => {
 try {
    const {name, email, password} = req.body;
    const encryptedPassword = encrypt(password);

    await pool.query(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3)',
        [name, email, encryptedPassword]
    );
    res.json({success:true, message:"Admin Created!"});
 }catch(err){
    res.status(500).json({error: err.message})
 }
};

module.exports = {login, registerAdmin, logout};