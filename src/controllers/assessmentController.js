const pool = require('../config/db');

// =======================================================
// A. SISI USER (MENGISI FORM & LIHAT HASIL)
// =======================================================

const getQuestions = async (req, res) => {
    try {
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
                            score: parseFloat(opt.points),
                            type: opt.option_type || "" // 🔴 PERBAIKAN: Mengirimkan status tipe agar checkbox di UI tidak reset / tertukar
                        }))
                    }))
                }))
            }))
        }));

        res.json({ success: true, data: data });
    } catch (error) {
        console.error('Error getQuestions:', error);
        res.status(500).json({ success: false, error: 'Gagal mengambil data soal.' });
    }
};

const submitAssessment = async (req, res) => {
    const client = await pool.connect(); 
    try {
        const { business_profile_id, answers } = req.body;
        if (!business_profile_id || !answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Data tidak lengkap atau format salah' });
        }

        await client.query('BEGIN'); 
        const resultHeader = await client.query(
            `INSERT INTO assessment_results (business_profile_id, total_score, status) VALUES ($1, 0, 'Pending') RETURNING id`,
            [business_profile_id]
        );
        const resultId = resultHeader.rows[0].id;
        
        let totalScore = 0;
        for (const answer of answers) {
            const optRes = await client.query('SELECT points FROM assessment_option WHERE id = $1', [answer.selected_option_id]);
            const earnedPoint = optRes.rows.length > 0 ? parseFloat(optRes.rows[0].points) : 0;
            totalScore += earnedPoint;

            await client.query(
                `INSERT INTO assessment_user_answer (result_id, question_id, selected_option_id, earned_point) VALUES ($1, $2, $3, $4)`,
                [resultId, answer.question_id, answer.selected_option_id, earnedPoint] 
            );
        }

        await client.query(`UPDATE assessment_results SET total_score = $1 WHERE id = $2`, [totalScore, resultId]);
        await client.query('COMMIT');
        res.status(201).json({ success: true, message: 'Assessment berhasil disimpan!', resultId: resultId });
    } catch (error) {
        await client.query('ROLLBACK'); 
        console.error('Error submitAssessment:', error);
        res.status(500).json({ success: false, error: 'Gagal menyimpan jawaban.' });
    } finally {
        client.release();
    }
};

const getAssessmentResult = async (req, res) => {
    try {
        const { resultId } = req.params;
        const headerQuery = `
            SELECT bp.nama_umkm, bp.produk_utama, ind.name AS industry_name, ar.created_at, ar.total_score, ar.status
            FROM assessment_results ar
            JOIN business_profiles bp ON ar.business_profile_id = bp.id
            LEFT JOIN cms_master_data ind ON bp.industry_id = ind.id AND ind.category = 'industries'
            WHERE ar.id = $1
        `;
        const headerRes = await pool.query(headerQuery, [resultId]);
        if (headerRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Data assessment not found' });
        const headerData = headerRes.rows[0];

        const scoreQuery = `
            SELECT g.id AS section_id, g.name AS section_name,
                COALESCE(SUM(ans.earned_point), 0) AS current_score,
                (SELECT SUM(max_val) FROM (SELECT MAX(o.points) as max_val FROM assessment_option o JOIN assessment_question q ON o.question_id = q.id JOIN assessment_categorie c ON q.category_id = c.id JOIN assessment_subgroup sg ON c.subgroup_id = sg.id WHERE sg.group_id = g.id AND (o.option_type IS NULL OR o.option_type != 'no-point') GROUP BY q.id) as subquery) AS max_score,
                COUNT(ans.id) AS answered_count,
                (SELECT COUNT(q2.id) FROM assessment_question q2 JOIN assessment_categorie c2 ON q2.category_id = c2.id JOIN assessment_subgroup sg2 ON c2.subgroup_id = sg2.id WHERE sg2.group_id = g.id) AS total_questions
            FROM assessment_group g
            LEFT JOIN assessment_subgroup sg ON g.id = sg.group_id LEFT JOIN assessment_categorie c ON sg.id = c.subgroup_id LEFT JOIN assessment_question q ON c.id = q.category_id LEFT JOIN assessment_user_answer ans ON q.id = ans.question_id AND ans.result_id = $1
            GROUP BY g.id, g.name ORDER BY g.id ASC;
        `;
        const result = await pool.query(scoreQuery, [resultId]);
        let totalUserScore = 0; let totalMaxScore = 0;
        const sectionsData = result.rows.map(row => {
            const current = parseFloat(row.current_score || 0); const max = parseFloat(row.max_score || 0);
            totalUserScore += current; totalMaxScore += max;
            const percentage = max > 0 ? Math.round((current / max) * 100) : 0;
            let status = 'Perlu Perbaikan';
            if (percentage >= 75) status = 'Sangat Baik'; else if (percentage >= 50) status = 'Baik'; else if (percentage >= 25) status = 'Cukup';
            return { name: row.section_name, percentage: percentage, answered: parseInt(row.answered_count), total: parseInt(row.total_questions), status_label: status };
        });

        const finalPercentage = totalMaxScore > 0 ? Math.round((totalUserScore / totalMaxScore) * 100) : 0;
        let finalStatus = 'Perlu Perbaikan';
        if (finalPercentage >= 75) finalStatus = 'Sangat Baik'; else if (finalPercentage >= 50) finalStatus = 'Baik'; else if (finalPercentage >= 25) finalStatus = 'Cukup';

        await pool.query(`UPDATE assessment_results SET total_score = $1, status = $2 WHERE id = $3`, [totalUserScore, finalStatus, resultId]);
        res.json({
            success: true,
            data: { company_info: { name: headerData.nama_umkm, produk_utama: headerData.produk_utama, industry: headerData.industry_name || '-', assessment_date: headerData.created_at }, result_summary: { total_score: totalUserScore, max_score: totalMaxScore, percentage: finalPercentage, status: finalStatus }, section_details: sectionsData }
        });
    } catch (error) {
        console.error('Error getAssessmentResult:', error);
        res.status(500).json({ success: false, error: 'Gagal menghitung hasil.' });
    }
};

const getAllResult = async (req, res) => {
    try {
        const query = `
            SELECT r.id, b.nama_umkm AS company_name, r.total_score, r.status, r.created_at
            FROM assessment_results r JOIN business_profiles b ON r.business_profile_id = b.id ORDER BY r.created_at DESC
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error){
        console.error('ERROR getAllResults', error);
        res.status(500).json({success:false, error: 'failed retrieving dashboard data'});
    }
};

// =======================================================
// B. SISI ADMIN CMS (CRUD KUESIONER BUILDER)
// =======================================================

// 1. Group
const addGroup = async (req, res) => {
    try {
        const result = await pool.query('INSERT INTO assessment_group (name, sequence) VALUES ($1, $2) RETURNING *', [req.body.name, req.body.sequence || 0]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
const updateGroup = async (req, res) => {
    try {
        await pool.query('UPDATE assessment_group SET name = $1 WHERE id = $2', [req.body.name, req.params.id]);
        res.status(200).json({ success: true, message: "Group updated!" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
const deleteGroup = async (req, res) => {
    try {
        await pool.query('DELETE FROM assessment_group WHERE id = $1', [req.params.id]);
        res.status(200).json({ success: true, message: "Group deleted!" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// 2. Subgroup
const addSubgroup = async (req, res) => {
    try {
        const result = await pool.query('INSERT INTO assessment_subgroup (group_id, name, sequence) VALUES ($1, $2, $3) RETURNING *', [req.body.group_id, req.body.name, req.body.sequence || 0]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
const updateSubgroup = async (req, res) => {
    try {
        await pool.query('UPDATE assessment_subgroup SET name = $1 WHERE id = $2', [req.body.name, req.params.id]);
        res.status(200).json({ success: true, message: "Subgroup updated!" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
const deleteSubgroup = async (req, res) => {
    try {
        await pool.query('DELETE FROM assessment_subgroup WHERE id = $1', [req.params.id]);
        res.status(200).json({ success: true, message: "Subgroup deleted!" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// 3. Category
const addCategory = async (req, res) => {
    try {
        const result = await pool.query('INSERT INTO assessment_categorie (subgroup_id, name, sequence) VALUES ($1, $2, $3) RETURNING *', [req.body.subgroup_id, req.body.name, req.body.sequence || 0]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
const updateCategory = async (req, res) => {
    try {
        await pool.query('UPDATE assessment_categorie SET name = $1 WHERE id = $2', [req.body.name, req.params.id]);
        res.status(200).json({ success: true, message: "Category updated!" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
const deleteCategory = async (req, res) => {
    try {
        await pool.query('DELETE FROM assessment_categorie WHERE id = $1', [req.params.id]);
        res.status(200).json({ success: true, message: "Category deleted!" });
    } catch (error) { res.status(500).json({ success: false, message: message.error }); }
};

// 4. Question
const addQuestion = async (req, res) => {
    try {
        const result = await pool.query('INSERT INTO assessment_question (category_id, question_text, sequence) VALUES ($1, $2, $3) RETURNING *', [req.body.category_id, req.body.question_text, req.body.sequence || 0]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
const updateQuestion = async (req, res) => {
    try {
        await pool.query('UPDATE assessment_question SET question_text = $1 WHERE id = $2', [req.body.question_text, req.params.id]);
        res.status(200).json({ success: true, message: "Question updated!" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
const deleteQuestion = async (req, res) => {
    try {
        await pool.query('DELETE FROM assessment_question WHERE id = $1', [req.params.id]);
        res.status(200).json({ success: true, message: "Question deleted!" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// 5. Option (Jawaban & Poin)
const addOption = async (req, res) => {
    try {
        // 🔴 PERBAIKAN: Menyimpan properti option_type saat opsi dibuat baru
        const result = await pool.query(
            'INSERT INTO assessment_option (question_id, option_text, points, sequence, option_type) VALUES ($1, $2, $3, $4, $5) RETURNING *', 
            [req.body.question_id, req.body.option_text, req.body.points || 0, req.body.sequence || 0, req.body.option_type || '']
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
const updateOption = async (req, res) => {
    try {
        // 🔴 PERBAIKAN: Mengupdate properti option_type agar status "no-answer" / "no-point" tersimpan permanen ke database
        await pool.query(
            'UPDATE assessment_option SET option_text = $1, points = $2, option_type = $3 WHERE id = $4', 
            [req.body.option_text, req.body.points, req.body.option_type || '', req.params.id]
        );
        res.status(200).json({ success: true, message: "Option updated!" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
const deleteOption = async (req, res) => {
    try {
        await pool.query('DELETE FROM assessment_option WHERE id = $1', [req.params.id]);
        res.status(200).json({ success: true, message: "Option deleted!" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

module.exports = { 
    getQuestions, submitAssessment, getAssessmentResult, getAllResult,
    addGroup, updateGroup, deleteGroup,
    addSubgroup, updateSubgroup, deleteSubgroup,
    addCategory, updateCategory, deleteCategory,
    addQuestion, updateQuestion, deleteQuestion,
    addOption, updateOption, deleteOption
};