const pool = require('../config/db');

const safeParse = (val) => {
    if (typeof val !== 'string') return val;
    try {
        let parsed = JSON.parse(val);
        if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch (e) {}
        }
        return parsed;
    } catch (e) {
        return val;
    }
};

// ==========================================================
// BULK SYNC
// ==========================================================
const syncSolutions = async (req, res) => {
    const { solutions } = req.body;
    const client = await pool.connect(); 
    try {
        await client.query('BEGIN'); 
        await client.query('DELETE FROM cms_solutions'); 

        if (solutions && solutions.length > 0) {
            for (let i = 0; i < solutions.length; i++) {
                const s = solutions[i];
                // 🔴 Update: Memasukkan data ke kolom _en dan _id
                await client.query(
                    'INSERT INTO cms_solutions(title_en, title_id, description_en, description_id, image_url, display_order, icon) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [
                        s.title_en || '', 
                        s.title_id || '', 
                        s.description_en || '', 
                        s.description_id || '', 
                        s.image_base64 || '', 
                        s.display_order || i + 1, 
                        s.icon || ''
                    ]
                );
            }
        }
        await client.query('COMMIT'); 
        res.json({ success: true, message: "Solutions synced!" });
    } catch (error) {
        await client.query('ROLLBACK'); 
        console.error("Error syncSolutions:", error);
        res.status(500).json({ success: false, message: "Failed syncing solutions" });
    } finally {
        client.release();
    }
};

const syncTeamMembers = async (req, res) => {
    const { team } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); 
        await client.query('DELETE FROM cms_team_members');

        if (team && team.length > 0) {
            for (let i = 0; i < team.length; i++) {
                const t = team[i];
                await client.query(
                  'INSERT INTO cms_team_members (name, title_en, title_id, description_en, description_id, image_url, display_order, label) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [
                        t.name || '', 
                        t.title_en || t.position_en || '', 
                        t.title_id || t.position_id || '',
                        t.description_en || '', 
                        t.description_id || '', 
                        t.image_base64 || '', 
                        t.display_order || i + 1,
                        t.labelName || t.label || '' 
                    ]
                );
            }
        }
        await client.query('COMMIT'); 
        res.json({ success: true, message: "Team synced!" });
    } catch (error) {
        await client.query('ROLLBACK'); 
        // Ini yang bikin error 500 tadi
        console.error("Error syncTeam:", error);
        res.status(500).json({ success: false, message: "Failed syncing team" });
    } finally {
        client.release();
    }
};

// ==========================================================
// CRUD FOR Solutions & Team
// ==========================================================
const addSolution = async(req, res) => {
    const { title_en, title_id, description_en, description_id, image_base64, display_order, icon } = req.body;
    try{
        const result = await pool.query(
            'INSERT INTO cms_solutions(title_en, title_id, description_en, description_id, image_url, display_order, icon) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', 
            [title_en, title_id, description_en, description_id, image_base64, display_order || 0, icon || '']
        );
        res.status(201).json({success: true, message: "added", data: result.rows[0]});
    }catch(error){
        res.status(500).json({success: false, message:"failed adding solution"});
    }
};

const updateSolution = async(req, res)=>{
    const {id} = req.params;
    const { title_en, title_id, description_en, description_id, image_base64, display_order, icon } = req.body;
    try{
        const result = await pool.query(
            'UPDATE cms_solutions SET title_en = $1, title_id = $2, description_en = $3, description_id = $4, image_url = $5, display_order = $6, icon = $7 WHERE id = $8 RETURNING *', 
            [title_en, title_id, description_en, description_id, image_base64, display_order, icon || '', id]
        );
        if (result.rows.length === 0) return res.status(404).json({success: false, message: "not found" });
        res.json({success:true, message: "updated", data: result.rows[0]});
    }catch(error){
        res.status(500).json({ success: false, message: "failed updating"});
    }
};

const deleteSolution = async (req, res) => {
    const {id} = req.params;
    try {
        await pool.query('DELETE FROM cms_solutions WHERE id = $1', [id]);
        res.json({success: true, message: 'deleted'});
    }catch(error){
        res.status(500).json({success: false, message: "failed deleting"});
    }
};

const getTeamMembers = async (req, res) => {
    try {
        // SELECT * aman karena akan otomatis menarik kolom _en dan _id yang baru
        const result = await pool.query ('SELECT * FROM cms_team_members ORDER BY display_order ASC, id ASC');
        res.json({success: true, data: result.rows});
    }catch(error){
        res.status(500).json({success: false, message: "failed retrieving team"});
    }
};

const addTeamMember = async(req, res) => {
    // 🔴 Update: Menangkap payload bilingual
    const { name, label, position_en, position_id, description_en, description_id, image_base64, display_order } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO cms_team_members (name, label, position_en, position_id, description_en, description_id, image_url, display_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', 
            [name, label, position_en, position_id, description_en, description_id, image_base64, display_order || 0]
        );
        res.status(201).json({success:true, message: "added"});
    }catch(error){
        res.status(500).json({success: false, message: "failed adding team"});
    }
};

const updateTeamMember = async (req, res) => {
    const {id } = req.params;
    // 🔴 Update: Menangkap payload bilingual
    const { name, label, position_en, position_id, description_en, description_id, image_base64, display_order } = req.body;
    try {
        const result = await pool.query(
            'UPDATE cms_team_members SET name = $1, label = $2, position_en = $3, position_id = $4, description_en = $5, description_id = $6, image_url = $7, display_order = $8 WHERE id = $9 RETURNING *', 
            [name, label, position_en, position_id, description_en, description_id, image_base64, display_order, id]
        );
        if(result.rows.length === 0) return res.status(404).json({success: false, message: "not found"});
        res.json({success: true, message:"updated", data: result.rows[0]});
    }catch(error){
        res.status(500).json({success: false, message: "failed updating"});
    }
};

const deleteTeamMember = async(req, res) => {
    const {id} = req.params;
    try{
        await pool.query ('DELETE FROM cms_team_members WHERE id = $1', [id]);
        res.json({success: true, message: "deleted"});
    }catch(error){
        res.status(500).json({success: false, message: "failed deleting"});
    }
};

const getSolutions = async(req, res) => {
    try {
        // SELECT * aman
        const result = await pool.query('SELECT * FROM cms_solutions ORDER BY display_order ASC, id ASC');
        res.json({success: true, data: result.rows});
    }catch(error){
        res.status(500).json({success: false, message: "failed retrieving solutions"});
    }
};

// ==========================================================
// SETTINGS (Tidak perlu diubah karena memakai sistem Key-Value)
// ==========================================================
const getGeneralSettings = async(req, res) => {
    try{
        const result = await pool.query('SELECT setting_key, setting_value FROM cms_settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.setting_key] = safeParse(row.setting_value);
        });
        res.json({success: true, data: settings});
    }catch (error){
        res.status(500).json({success: false, message: "fail taking cms data"});
    }
};

const updateGeneralSettings = async (req, res) => {
    const { updates } = req.body;
    try {
        for (const key in updates) {
            let value = updates[key];
            const sectionName = key.split('_')[0]; 
            
            if (typeof value === 'object' && value !== null) {
                value = JSON.stringify(value);
            }
            
            const check = await pool.query('SELECT setting_key FROM cms_settings WHERE setting_key = $1', [key]);

            if (check.rows.length > 0) {
                await pool.query('UPDATE cms_settings SET setting_value = $1, section = $2, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $3', [value, sectionName, key]);
            } else {
                await pool.query('INSERT INTO cms_settings (section, setting_key, setting_value) VALUES ($1, $2, $3)', [sectionName, key, value]);
            }
        }
        res.json({ success: true, message: "CMS settings updated" });
    } catch (error) {
        console.error("error updateGeneralSettings:", error);
        res.status(500).json({ success: false, message: "failed updating cms" });
    }
};

const getLandingPageData = async (req, res ) => {
    try {
        const setRes = await pool.query('SELECT setting_key, setting_value FROM cms_settings');
        const settings = {};
        setRes.rows.forEach(row => { 
            settings[row.setting_key] = safeParse(row.setting_value); 
        });

        // SELECT * otomatis akan membawa kolom _en dan _id ke Frontend
        const solRes = await pool.query('SELECT * FROM cms_solutions ORDER BY display_order ASC, id ASC');
        const teamRes = await pool.query('SELECT * FROM cms_team_members ORDER BY display_order ASC, id ASC');

        res.json({
            success:true,
            data: { settings: settings, solutions: solRes.rows, team: teamRes.rows }
        });
    } catch (error){
        console.error("Error getlandingpage:", error);
        res.status(500).json({success:false, message: "failed fetching data"})
    }
}

module.exports = { 
    getGeneralSettings, updateGeneralSettings, 
    deleteSolution, getSolutions, addSolution, updateSolution, 
    deleteTeamMember, addTeamMember, getTeamMembers, updateTeamMember, syncSolutions, syncTeamMembers, getLandingPageData
};