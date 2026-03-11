const pool = require ('../config/db');
// ==========================================================
// BULK SYNC (Hapus lama, Insert baru)
// ==========================================================
const syncSolutions = async (req, res) => {
    const userId = req.user.id;
    const { solutions } = req.body;
    try {
        await pool.query('DELETE FROM cms_solutions');

        if (solutions && solutions.length > 0) {
            for (let i = 0; i < solutions.length; i++) {
                const s = solutions[i];
                await pool.query(
                    'INSERT INTO cms_solutions(title, description, image_url, display_order) VALUES ($1, $2, $3, $4)',
                    [s.title || '', s.description || '', s.image_base64 || '', s.display_order || i + 1]
                );
            }
        }
        res.json({ success: true, message: "Solutions successfully synced!" });
    } catch (error) {
        console.error("Error syncSolutions:", error);
        res.status(500).json({ success: false, message: "Failed syncing solutions" });
    }
};

const syncTeamMembers = async (req, res) => {
    const userId = req.user.id;
    const { team } = req.body;
    try {
        await pool.query('DELETE FROM cms_team_members');

        if (team && team.length > 0) {
            for (let i = 0; i < team.length; i++) {
                const t = team[i];
                await pool.query(
                    'INSERT INTO cms_team_members (name, title, description, image_url, display_order) VALUES ($1, $2, $3, $4, $5)',
                    [t.name || '', t.title || '', t.description || '', t.image_base64 || '', t.display_order || i + 1]
                );
            }
        }
        res.json({ success: true, message: "Team successfully synced!" });
    } catch (error) {
        console.error("Error syncTeam:", error);
        res.status(500).json({ success: false, message: "Failed syncing team" });
    }
};
// ==========================================================
// WEBSITE CONTENT (SETTINGS)
// ==========================================================
const getGeneralSettings = async(req, res) => {
    try{
        const result = await pool.query('SELECT setting_key, setting_value FROM cms_settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        res.json({success: true, data: settings});
    }catch (error){
        console.error("Error getGeneralSettings: ", error);
        res.status(500).json({success: false, message: "fail taking cms data"});
    }
};

const updateGeneralSettings = async (req, res) => {
    const { updates } = req.body;
    try {
        for (const key in updates) {
            let value = updates[key];
            const sectionName = key.split('_')[0]; 
            
            const check = await pool.query(
                'SELECT setting_key FROM cms_settings WHERE setting_key = $1',
                [key]
            );

            if (check.rows.length > 0) {
                await pool.query(
                    'UPDATE cms_settings SET setting_value = $1, section = $2, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $3',
                    [value, sectionName, key]
                );
            } else {
                await pool.query(
                    'INSERT INTO cms_settings (section, setting_key, setting_value) VALUES ($1, $2, $3)',
                    [sectionName, key, value] 
                );
            }
        }
        res.json({ success: true, message: "website content renewed" });
    } catch (error) {
        console.error("error updateGeneralSettings:", error);
        res.status(500).json({ success: false, message: "failed when renewing cms data" });
    }
};

// ==========================================================
// SOLUTIONS
// ==========================================================
const getSolutions = async(req, res) => {
    try {
        const result = await pool.query('SELECT * FROM cms_solutions ORDER BY display_order ASC, id ASC');
        res.json({success: true, data: result.rows});
    }catch(error){
        console.error('Error getSolutions:', error);
        res.status(500).json({success: false, message: "failed retrieving solutions data"});
    }
};

const addSolution = async(req, res) => {
    const { title, description, image_base64, display_order} = req.body;
    const userId = req.user.id;
    try{
        const result = await pool.query(
            'INSERT INTO cms_solutions(title, description, image_url, display_order, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, description, image_base64, display_order || 0, userId]
        );
        res.status(201).json({success: true, message: "solution added", data: result.rows[0]});
    }catch(error){
        console.error("error addSolution:", error);
        res.status(500).json({success: false, message:"failed when adding solutions"});
    }
};

const updateSolution = async(req, res)=>{
    const {id} = req.params;
    const { title, description, image_base64, display_order} = req.body;
    const userId = req.user.id;
    try{
        const result = await pool.query(
            'UPDATE cms_solutions SET title = $1, description = $2, image_url = $3, display_order = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
            [title, description, image_base64, display_order, id, userId]
        );

        if (result.rows.length === 0){
            return res.status(404).json({success: false, message: " Solution not found" });
        }
        res.json({success:true, message: "Solution Updated", data: result.rows[0]});
    }catch(error){
        console.error("Error updateSolution: ", error);
        res.status(500).json({ success: false, message: "failed updating solution"});
    }
};

const deleteSolution = async (req, res) => {
    const {id} = req.params;
    const userId = req.user.id;
    try {
        const result = await pool.query('DELETE FROM cms_solutions WHERE id = $1  AND user_id = $2 RETURNING *', [id, userId]);
        if (result.rows.length === 0){
            return res.status(404).json({success: false, message: "solution not found"});
        }
        res.json({success: true, message: 'solution successfully deleted'});
    }catch(error){
        console.error("Error deleteSolution:", error);
        res.status(500).json({success: false, message: "Failed Deleting Solution"});
    }
};

// ==========================================================
// TEAM MEMBERS
// ==========================================================
const getTeamMembers = async (req, res) => {
    try {
        const result = await pool.query ('SELECT * FROM cms_team_members ORDER BY display_order ASC, id ASC');
        res.json({success: true, data: result.rows});
    }catch(error){
        console.error("Error getTeamMembers:", error);
        res.status(500).json({success: false, message: "failed retrieving team data"});
    }
};

const addTeamMember = async(req, res) => {
    const userId = req.user.id;
    const {name, title, description, image_base64, display_order} = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO cms_team_members (name, title, description, image_url, display_order, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, title, description, image_base64, display_order || 0, userId]
        );
        res.status(201).json({success:true, message: "Team Members Added"});
    }catch(error){
        console.error("Error addTeamMember:", error);
        res.status(500).json({success: false, message: " failed adding team member"});
    }
};

const updateTeamMember = async (req, res) => {
    const userId = req.user.id;
    const {id } = req.params;
    const { name, title, description, image_base64, display_order} = req.body;
    try {
        const result = await pool.query(
            'UPDATE cms_team_members SET name = $1, title = $2, description = $3, image_url = $4, display_order = $5 WHERE id = $6 AND user_id = $7 RETURNING *',
            [name, title, description, image_base64, display_order, id, userId]
        );

        if(result.rows.length === 0) return res.status(404).json({success: false, message: "no data found"});
        res.json({success: true, message:"team updated", data: result.rows});
    }catch(error){
        console.error("Error updateTeamMember", error);
        res.status(500).json({success: false, message: "failed updating team"});
    }
};

const deleteTeamMember = async(req, res) => {
    const {id} = req.params;
    const userId = req.user.id;
    try{
        const result = await pool.query ('DELETE FROM cms_team_members WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
        if (result.rows.length === 0) return res.status(404).json({success: false, message: "member not found "});
        res.json({success: true, message: "member deleted"});
    }catch(error){
        console.error("Error deleteTeamMember:", error);
        res.status(500).json({success: false, message: "failed when deleting member"});
    }
};

const getLandingPageData = async (req, res ) => {
    try {
        const setRes = await pool.query('SELECT setting_key, setting_value FROM cms_settings');
        const settings = {};
        setRes.rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });

        const solRes = await pool.query('SELECT * FROM cms_solutions ORDER BY display_order ASC, id ASC');

        const teamRes = await pool.query('SELECT * FROM cms_team_members ORDER BY display_order ASC, id ASC');

        res.json({
            success:true,
            data: {
                settings: settings,
                solutions: solRes.rows,
                team: teamRes.rows
            }
        });
    } catch (error){
        console.error("Error getlandingpage:", error);
        res.status(500).json({success:false, message: "faied Fethcing Landing Page Data"})
    }
}

module.exports = { 
    getGeneralSettings, updateGeneralSettings, 
    deleteSolution, getSolutions, addSolution, updateSolution, 
    deleteTeamMember, addTeamMember, getTeamMembers, updateTeamMember, syncSolutions, syncTeamMembers, getLandingPageData
};