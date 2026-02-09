const pool = require('../config/db');
const { head } = require('../routes/business-routes');

const getQuestions = async (req, res) => {
    try {
        const query = `
            SELECT 
                s.id AS section_id,
                s.title AS section_name,
                (
                    SELECT json_agg(
                        json_build_object(
                            'sub_section_name', sub.sub_section,
                            'questions', sub.questions_list
                        )
                    )
                    FROM (
                        SELECT 
                            COALESCE(q.sub_section, 'General') as sub_section,
                            json_agg(
                                json_build_object(
                                    'id', q.id,
                                    'text', q.question_text,
                                    'options', (
                                        SELECT json_agg(
                                            json_build_object(
                                                'id', o.id,
                                                'label', o.option_text,
                                                'score', o.score_value
                                            )
                                        ) FROM assessment_options o WHERE o.question_id = q.id
                                    )
                                ) ORDER BY q.id ASC
                            ) AS questions_list
                        FROM assessment_questions q
                        WHERE q.section_id = s.id
                        GROUP BY q.sub_section
                    ) sub
                ) AS sub_sections
            FROM assessment_sections s
            ORDER BY s.id ASC;
        `;

        const result = await pool.query(query);
        
        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Error getQuestions:', error);
        res.status(500).json({ success: false, error: 'Gagal mengambil data soal.' });
    }
};

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
        
        for (const answer of answers) {
            await client.query(
                `INSERT INTO assessment_answers (assessment_result_id, question_id, selected_option_id)
                 VALUES ($1, $2, $3)`,
                [resultId, answer.question_id, answer.selected_option_id] 
            );
        }

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

// const getAssessmentResult = async (req, res) => {
//     try {
//         const { resultId } = req.params;

//         const query = `
//             SELECT 
//                 s.id as section_id,
//                 s.title AS section_name,
                
//                 -- Hitung Skor User saat ini
//                 COALESCE(SUM(opt.score_value), 0) AS current_score,
                
//                 -- Hitung Skor Maksimal (Perbaikan Logic)
//                 (
//                     SELECT SUM(max_val) FROM (
//                         SELECT MAX(score_value) as max_val
//                         FROM assessment_options ao
//                         JOIN assessment_questions aq ON ao.question_id = aq.id
//                         WHERE aq.section_id = s.id
//                         GROUP BY aq.id
//                     ) as subquery
//                 ) AS max_score,

//                 COUNT(ans.id) AS answered_count,
//                 (SELECT COUNT(*) FROM assessment_questions WHERE section_id = s.id) AS total_questions

//             FROM assessment_sections s
//             LEFT JOIN assessment_questions q ON s.id = q.section_id
//             -- Join ke jawaban user
//             LEFT JOIN assessment_answers ans ON q.id = ans.question_id AND ans.assessment_result_id = $1
//             LEFT JOIN assessment_options opt ON ans.selected_option_id = opt.id
//             GROUP BY s.id, s.title
//             ORDER BY s.id ASC;
//         `;

//         const result = await pool.query(query, [resultId]);

//         let totalUserScore = 0;
//         let totalMaxScore = 0;

//         const sectionsData = result.rows.map(row => {
//             const current = parseInt(row.current_score || 0);
//             const max = parseInt(row.max_score || 0);
            
//             totalUserScore += current;
//             totalMaxScore += max;

//             const percentage = max > 0 ? Math.round((current / max) * 100) : 0;
            
//             let status = 'Perlu Perbaikan';
//             if (percentage >= 85) status = 'Sangat Baik';
//             else if (percentage >= 70) status = 'Baik';
//             else if (percentage >= 50) status = 'Cukup';

//             return {
//                 ...row,
//                 percentage,
//                 status_label: status
//             };
//         });

//         const finalPercentage = totalMaxScore > 0 ? Math.round((totalUserScore / totalMaxScore) * 100) : 0;
//         let finalStatus = 'Perlu Perbaikan';
//         if (finalPercentage >= 85) finalStatus = 'Sangat Baik';
//         else if (finalPercentage >= 70) finalStatus = 'Baik';
//         else if (finalPercentage >= 50) finalStatus = 'Cukup';

//         await pool.query(
//             `UPDATE assessment_results SET total_score = $1, status = 'Completed' WHERE id = $2`,
//             [totalUserScore, resultId]
//         );

//         res.json({
//             success: true,
//             data: {
//                 summary: {
//                     total_score: totalUserScore,
//                     max_score: totalMaxScore,
//                     final_percentage: finalPercentage,
//                     final_status: finalStatus
//                 },
//                 sections: sectionsData
//             }
//         });

//     } catch (error) {
//         console.error('Error getAssessmentResult:', error);
//         res.status(500).json({ success: false, error: 'Gagal menghitung hasil.' });
//     }
// };
const getAssessmentResult = async (req, res) => {
    try {
        const { resultId } = req.params;

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
            LEFT JOIN industries ind ON bp.industry_id = ind.id
            WHERE ar.id = $1
        `;

        const headerRes = await pool.query(headerQuery, [resultId]);

        if (headerRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data assessment not found' });
        }

        const headerData = headerRes.rows[0];

        const scoreQuery = `
            SELECT 
                s.id as section_id,
                s.title AS section_name,

                COALESCE(SUM(opt.score_value), 0) AS current_score,

                (
                    SELECT SUM(max_val) FROM (
                        SELECT MAX(score_value) as max_val
                        FROM assessment_options ao
                        JOIN assessment_questions aq ON ao.question_id = aq.id
                        WHERE aq.section_id = s.id
                        GROUP BY aq.id
                    ) as subquery
                ) AS max_score,  -- SUDAH DITAMBAH KOMA

                COUNT(ans.id) AS answered_count, -- SUDAH DIPERBAIKI (ans.id)
                (SELECT COUNT(*) FROM assessment_questions WHERE section_id = s.id) AS total_questions -- SUDAH DIPERBAIKI (s.id)

            FROM assessment_sections s 
            LEFT JOIN assessment_questions q ON s.id = q.section_id
            LEFT JOIN assessment_answers ans ON q.id = ans.question_id AND ans.assessment_result_id = $1
            LEFT JOIN assessment_options opt ON ans.selected_option_id = opt.id
            GROUP BY s.id, s.title
            ORDER BY s.id ASC;
        `;

        const result = await pool.query(scoreQuery, [resultId]);

        let totalUserScore = 0;
        let totalMaxScore = 0;

        const sectionsData = result.rows.map(row => {
            const current = parseInt(row.current_score || 0);
            const max = parseInt(row.max_score || 0);
            
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
        }catch (error){
            console.error('ERROR getAllResults', error);
            res.status(500).json({success:false, error: 'failed retrieving dashboard data'});
        }
    };

module.exports = { getQuestions, submitAssessment, getAssessmentResult, getAllResult};