const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const login = async (req, res) => {
    try {
        const {email, password} = req.body;


        const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0){
            return res.status(401).json({success: false, message:"Email Tidak Terdaftar"});
        }

        const user = userRes.rows[0];

        const validPass = await bcrypt.compare(password, user.password);
        if(!validPass){
            return res.status(401).json({success:false, message:"Password Salah"});
        }

        const token = jwt.sign(
            {id: user.id, role: user.role, name: user.name},
            process.env.jwt_SECRET,
            {expiresIN: '24h'}
        );

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


const registerAdmin = async(req, res) => {

}