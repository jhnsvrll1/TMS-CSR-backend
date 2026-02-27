const pool = require('../config/db');
const crypto = require('crypto');
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


const getUsers = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, status FROM users ORDER BY id ASC');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Error getUsers:", error);
        res.status(500).json({ success: false, message: "Gagal mengambil data users" });
    }
};

const addUser = async (req, res) => {
    const { name, email, password, role, status } = req.body;
    try {
        const encryptedPassword = encrypt(password);

        const result = await pool.query(
            'INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, status',
            [name, email, encryptedPassword, role || 'Assessor', status || 'Active']
        );
        res.status(201).json({ success: true, message: "User berhasil ditambahkan", data: result.rows[0] });
    } catch (error) {
        console.error("Error addUser:", error);
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: "Email sudah digunakan!" });
        }
        res.status(500).json({ success: false, message: "Gagal menambah user" });
    }
};

const updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, role, status } = req.body;
    try {
        const result = await pool.query(
            'UPDATE users SET name = $1, email = $2, role = $3, status = $4 WHERE id = $5 RETURNING id, name, email, role, status',
            [name, email, role, status, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "User tidak ditemukan" });
        res.json({ success: true, message: "User berhasil diupdate", data: result.rows[0] });
    } catch (error) {
        console.error("Error updateUser:", error);
        res.status(500).json({ success: false, message: "Gagal mengupdate user" });
    }
};

const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id');
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "User tidak ditemukan" });
        res.json({ success: true, message: "User berhasil dihapus" });
    } catch (error) {
        console.error("Error deleteUser:", error);
        res.status(500).json({ success: false, message: "Gagal menghapus user" });
    }
};

const changePassword = async (req, res) => {
    const userId = req.user.id; 
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: "old and new password need to be filled" });
    }

    try {
        const user = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
        
        if (user.rows.length === 0) {
            return res.status(404).json({ success: false, message: "user not found" });
        }

        const dbPasswordEncrypted = user.rows[0].password;

        try {
            const decryptedDbPassword = decrypt(dbPasswordEncrypted);
            
            if (currentPassword !== decryptedDbPassword) {
                return res.status(400).json({ success: false, message: "current password is wrong" });
            }
        } catch (decryptErr) {
            console.error("Decryption error during change password:", decryptErr);
            return res.status(500).json({ success: false, message: "Format password lama tidak valid" });
        }

        const encryptedNewPassword = encrypt(newPassword);

        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [encryptedNewPassword, userId]);

        res.json({ success: true, message: "password changed" });
    } catch (error) {
        console.error("Error changePassword:", error);
        res.status(500).json({ success: false, message: "failed changing password" });
    }
};

module.exports = { getUsers, addUser, updateUser, deleteUser, changePassword };