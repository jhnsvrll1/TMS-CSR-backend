//const { Activity } = require('react');
const pool = require ('../config/db');

const getDashboardSummary = async (req, res) => {
    try {
        const [business, provinces, areas, recent, logs] = await Promise.all ([
            pool.query('SELECT COUNT(id) FROM business_profiles'),
            pool.query('SELECT COUNT (DISTINCT provinsi) FROM business_profiles'),
            pool.query('SELECT COUNT (id) FROM assessment_sections'),
            pool.query (`
                SELECT id, nama_umkm as company, provinsi as province,
                created_at as date, 'Pending' as status
                FROM business_profiles ORDER BY created_at DESC LIMIT 5`),
            pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5')
        ]);

        res.json({
            success: true,
            data: {
                overview: {
                    total_businesses: parseInt(business.rows[0].count),
                    provinces_covered: parseInt(provinces.rows[0].count),
                    assessment_areas: parseInt(areas.rows[0].count),
                    satisfaction_rate: 87.4 //misal doang ini
                },

                recent_assessments: recent.rows,
                activity_logs: logs.rows
            }
        });
    }catch (error) {
        console.error("Error getDashboardSummary", error);
        res.status(500).json({success:false, message: "failed retrieving dashboard data"});
    }
};

module.exports = {getDashboardSummary};