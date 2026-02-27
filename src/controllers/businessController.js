const pool = require('../config/db');

const provinceList = [
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Jambi", 
  "Sumatera Selatan", "Bengkulu", "Lampung", "Kepulauan Bangka Belitung", "Kepulauan Riau",
  "DKI Jakarta", "Jawa Barat", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur", "Banten",
  "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur",
  "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara",
  "Sulawesi Utara", "Sulawesi Tengah", "Sulawesi Selatan", "Sulawesi Tenggara", "Gorontalo", "Sulawesi Barat",
  "Maluku", "Maluku Utara",
  "Papua Barat", "Papua", "Papua Tengah", "Papua Pegunungan", "Papua Selatan", "Papua Barat Daya"
];

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

const gerProvince = async (req, res) => {
    try {
        const formattedData = provinceList.map((prov,index) => ({
            id: index + 1,
            name: prov
        }));

        res.json({
            success: true,
            data: formattedData
        });
    }catch (error) {
        console.error('Error getProvince: ', error);
        res.status(500).json({success: false, error: 'fail retrieving province data!'});
    }
}

const getCompanies = async (req, res) => {
    try {
        const { 
            search = '', 
            province = '', 
            page = 1, 
            limit = 10 
        } = req.query;
        let queryText = `
            SELECT 
                id, 
                nama_umkm AS company_name, 
                provinsi AS province,
                'Active' AS status, -- (Bisa diubah kalau kamu udah punya kolom status)
                created_at 
            FROM business_profiles 
            WHERE 1=1
        `;
        let queryValues = [];
        let valueIndex = 1;
        if (search) {
            queryText += ` AND nama_umkm ILIKE $${valueIndex}`;
            queryValues.push(`%${search}%`);
            valueIndex++;
        }

        if (province && province !== 'All Provinces') {
            queryText += ` AND provinsi = $${valueIndex}`;
            queryValues.push(province);
            valueIndex++;
        }

        if (search) {
            queryText += ` AND (nama_umkm ILIKE $${valueIndex} OR kota_kabupaten ILIKE $${valueIndex} OR provinsi ILIKE $${valueIndex})`;
            queryValues.push(`%${search}%`);
            valueIndex++;
        }

        if(province && province !== 'All Provinces') {
            queryText += ` AND provinsi = $${valueIndex}`;
            queryValues.push(province);
            valueIndex++;
        }

        const countQuery = ` SELECT COUNT(*) FROM (${queryText}) AS total`;
        const totalResult = await pool.query(countQuery, queryValues);
        const totalItems = parseInt(totalResult.rows[0].count);

        const offset = (page - 1) * limit;
        queryText += ` ORDER BY created_at DESC LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
        queryValues.push(limit, offset);

        const result = await pool.query(queryText, queryValues);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error getCompanies:', error);
        res.status(500).json({ success: false, error: 'Gagal mengambil data perusahaan!' });
    }
};

module.exports = {createBusinessProfile, gerProvince, getCompanies};