const pool = require('../config/db');

// ==========================================
// 1. GET QUESTIONS (Tampilan untuk User Form)
// ==========================================
const getQuestions = async (req, res) => {
    try {
        // Ambil semua data urut berdasarkan sequence
        const groupsRes = await pool.query('SELECT * FROM assessment_group ORDER BY sequence ASC');
        const subgroupsRes = await pool.query('SELECT * FROM assessment_subgroup ORDER BY sequence ASC');
        const categoriesRes = await pool.query('SELECT * FROM assessment_categorie ORDER BY sequence ASC');
        const questionsRes = await pool.query('SELECT * FROM assessment_question ORDER BY sequence ASC');
        const optionsRes = await pool.query('SELECT * FROM assessment_option ORDER BY sequence ASC');

        const groups = groupsRes.rows;
        const subgroups = subgroupsRes.rows;
        const categories = categoriesRes.rows;
        const questions = questionsRes.rows;
        const options = optionsRes.rows;

        // Rangkai JSON 5 Level
        const data = groups.map(group => ({
            id: group.id,
            name: group.name,
            subgroups: subgroups.filter(sub => sub.group_id === group.id).map(sub => ({
                id: sub.id,
                name: sub.name,
                categories: categories.filter(cat => cat.subgroup_id === sub.id).map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    questions: questions.filter(q => q.category_id === cat.id).map(q => ({
                        id: q.id,
                        text: q.question_text, 
                        options: options.filter(opt => opt.question_id === q.id).map(opt => ({
                            id: opt.id,
                            label: opt.option_text, 
                            score: parseFloat(opt.points)
                        }))
                    }))
                }))
            }))
        }));

        res.json({
            success: true,
            data: data
        });

    } catch (error) {
        console.error('Error getQuestions:', error);
        res.status(500).json({ success: false, error: 'Gagal mengambil data soal.' });
    }
};

// ==========================================
// 2. SUBMIT ASSESSMENT (Simpan Jawaban User)
// ==========================================
const submitAssessment = async (req, res) => {
    const client = await pool.connect(); 
    try {
        const { business_profile_id, answers } = req.body;

        // Validasi
        if (!business_profile_id || !answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Data tidak lengkap atau format salah' });
        }

        await client.query('BEGIN'); 

        // Buat Header Result
        const resultHeader = await client.query(
            `INSERT INTO assessment_results (business_profile_id, total_score, status) 
             VALUES ($1, 0, 'Pending') RETURNING id`,
            [business_profile_id]
        );
        const resultId = resultHeader.rows[0].id;
        
        let totalScore = 0;

        // Insert semua jawaban ke assessment_user_answer
        for (const answer of answers) {
            // Cek poin dari tabel master option
            const optRes = await client.query('SELECT points FROM assessment_option WHERE id = $1', [answer.selected_option_id]);
            const earnedPoint = optRes.rows.length > 0 ? parseFloat(optRes.rows[0].points) : 0;
            
            totalScore += earnedPoint;

            await client.query(
                `INSERT INTO assessment_user_answer (result_id, question_id, selected_option_id, earned_point)
                 VALUES ($1, $2, $3, $4)`,
                [resultId, answer.question_id, answer.selected_option_id, earnedPoint] 
            );
        }

        // Update total score ke header result
        await client.query(
            `UPDATE assessment_results SET total_score = $1 WHERE id = $2`,
            [totalScore, resultId]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Assessment berhasil disimpan!',
            resultId: resultId,
        });

    } catch (error) {
        await client.query('ROLLBACK'); 
        console.error('Error submitAssessment:', error);
        res.status(500).json({ success: false, error: 'Gagal menyimpan jawaban.' });
    } finally {
        client.release();
    }
};

// ==========================================
// 3. GET RESULT (Kalkulasi Skor)
// ==========================================
const getAssessmentResult = async (req, res) => {
    try {
        const { resultId } = req.params;

        // Ambil Header Informasi Perusahaan
        const headerQuery = `
            SELECT 
                bp.nama_umkm,
                bp.produk_utama,
                ind.name AS industry_name,
                ar.created_at,
                ar.total_score,
                ar.status
            FROM assessment_results ar
            JOIN business_profiles bp ON ar.business_profile_id = bp.id
            LEFT JOIN cms_master_data ind ON bp.industry_id = ind.id AND ind.category = 'industries'
            WHERE ar.id = $1
        `;

        const headerRes = await pool.query(headerQuery, [resultId]);

        if (headerRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data assessment not found' });
        }

        const headerData = headerRes.rows[0];

        // Hitung skor berdasarkan level tertinggi (assessment_group)
        const scoreQuery = `
            SELECT 
                g.id AS section_id,
                g.name AS section_name,

                -- Total skor yang didapat user di grup ini
                COALESCE(SUM(ans.earned_point), 0) AS current_score,

                -- Total skor maksimal yang BISA didapat di grup ini
                (
                    SELECT SUM(max_val) FROM (
                        SELECT MAX(o.points) as max_val
                        FROM assessment_option o
                        JOIN assessment_question q ON o.question_id = q.id
                        JOIN assessment_categorie c ON q.category_id = c.id
                        JOIN assessment_subgroup sg ON c.subgroup_id = sg.id
                        WHERE sg.group_id = g.id
                        GROUP BY q.id
                    ) as subquery
                ) AS max_score,

                -- Total soal yang sudah dijawab
                COUNT(ans.id) AS answered_count,
                
                -- Total soal yang ada di grup ini
                (
                    SELECT COUNT(q2.id) 
                    FROM assessment_question q2
                    JOIN assessment_categorie c2 ON q2.category_id = c2.id
                    JOIN assessment_subgroup sg2 ON c2.subgroup_id = sg2.id
                    WHERE sg2.group_id = g.id
                ) AS total_questions

            FROM assessment_group g
            LEFT JOIN assessment_subgroup sg ON g.id = sg.group_id
            LEFT JOIN assessment_categorie c ON sg.id = c.subgroup_id
            LEFT JOIN assessment_question q ON c.id = q.category_id
            LEFT JOIN assessment_user_answer ans ON q.id = ans.question_id AND ans.result_id = $1
            GROUP BY g.id, g.name
            ORDER BY g.id ASC;
        `;

        const result = await pool.query(scoreQuery, [resultId]);

        let totalUserScore = 0;
        let totalMaxScore = 0;

        const sectionsData = result.rows.map(row => {
            const current = parseFloat(row.current_score || 0);
            const max = parseFloat(row.max_score || 0);
            
            totalUserScore += current;
            totalMaxScore += max;

            const percentage = max > 0 ? Math.round((current / max) * 100) : 0;
            
            let status = 'Perlu Perbaikan';
            if (percentage >= 75) status = 'Sangat Baik';
            else if (percentage >= 50) status = 'Baik';
            else if (percentage >= 25) status = 'Cukup';

            return {
                name: row.section_name,
                percentage: percentage,
                answered: parseInt(row.answered_count),
                total: parseInt(row.total_questions),
                status_label: status
            };
        });

        const finalPercentage = totalMaxScore > 0 ? Math.round((totalUserScore / totalMaxScore) * 100) : 0;
        let finalStatus = 'Perlu Perbaikan';
        if (finalPercentage >= 75) finalStatus = 'Sangat Baik';
        else if (finalPercentage >= 50) finalStatus = 'Baik';
        else if (finalPercentage >= 25) finalStatus = 'Cukup';

        // Update status akhir di DB
        await pool.query(
            `UPDATE assessment_results SET total_score = $1, status = $2 WHERE id = $3`,
            [totalUserScore, finalStatus, resultId]
        );

        res.json({
            success: true,
            data: {
                company_info: {
                    name: headerData.nama_umkm,
                    produk_utama: headerData.produk_utama,
                    industry: headerData.industry_name || '-',
                    assessment_date: headerData.created_at
                },
                result_summary: {
                    total_score: totalUserScore,
                    max_score: totalMaxScore,
                    percentage: finalPercentage,
                    status: finalStatus
                },
                section_details: sectionsData
            }
        });

    } catch (error) {
        console.error('Error getAssessmentResult:', error);
        res.status(500).json({ success: false, error: 'Gagal menghitung hasil.' });
    }
};

// ==========================================
// 4. GET ALL RESULTS (Untuk Dashboard Admin)
// ==========================================
const getAllResult = async (req, res) => {
    try {
        const query = `
            SELECT 
                r.id,
                b.nama_umkm AS company_name,
                r.total_score,
                r.status,
                r.created_at
            FROM assessment_results r
            JOIN business_profiles b ON r.business_profile_id = b.id
            ORDER BY r.created_at DESC
        `;

        const result = await pool.query(query);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error){
        console.error('ERROR getAllResults', error);
        res.status(500).json({success:false, error: 'failed retrieving dashboard data'});
    }
};

module.exports = { getQuestions, submitAssessment, getAssessmentResult, getAllResult };