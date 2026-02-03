const pool = require('../config/db');

const createBusinessProfile = async (req, res) => {
    try {
        const {
            nama_umkm, category_id, produk_utama, industry_id,
            alamat, kota_kabupaten, provinsi, nama_kontak,
            jabatan, email, nomor_telepon, company_size_id,
            website, tantangan_bisnis, tujuan_bisnis
        } = req.body;


        const query = `
      INSERT INTO business_profiles (
        nama_umkm, category_id, produk_utama, industry_id, 
        alamat, kota_kabupaten, provinsi, 
        nama_kontak, jabatan, email, nomor_telepon, 
        company_size_id, website, tantangan_bisnis, tujuan_bisnis
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
      RETURNING *
    `;
    const values = [
      nama_umkm, category_id, produk_utama, industry_id, 
      alamat, kota_kabupaten, provinsi, 
      nama_kontak, jabatan, email, nomor_telepon, 
      company_size_id, website, tantangan_bisnis, tujuan_bisnis
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
        success: true,
        message: 'Profil Bisnis Berhasil Disimpan!',
        data: result.rows[0]
    });

    }catch (error){
        console.error(error.message);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

module.exports = {createBusinessProfile};