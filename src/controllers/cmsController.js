const pool = require ('../config/db');


const getGeneralSettings = async(requestAnimationFrame, res) => {
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
        const {updates} = req.body;

        try{
        for (const key in updates){
            await pool.query(
                'UPDATE cms_settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key =$2',
                [updates[key], key]
            );
        }
        res.json({success: true, message: "website content renewed"});
    }catch (error){
        console.error("error updateGeneralSettings:", error);
        res.status(500).json({success: false, message: "failed when renewing cms data"});
    }
    };

    const getSolutions = async(req, res) => {
        try {
            const result = await pool.query('SELECT * FROM cms_solutions ORDERY BY display_order ASC, id ASC');
            res.json({success: true, data: result.rows});
        }catch(error){
            console.error('Error getSolutions:', error);
            res.status(500).json({success: false, message: "failed retrieving solutions data"});
        }
    };


    const addSolution = async(req, res) => {
        const { title, description, image_url, display_order} = req.body;
        try{
            const result = await pool.query(
                'INSERT INTO cms_solutions(title, description, image_url, display_order) VALUES ($1, $2, $3, $4) RETURNING *',
                [title, description, image_url, display_order || 0]
            );
            res.status(201).json({success: true, message: "solution added", data: result.rows[0]});
        }catch(error){
            console.error("error addSolution:", error);
            res.status(500).json({success: false, message:"failed when adding solutions"});
        }
    };


    const updateSolution = async(req, res)=>{
        const {id} = req.params;
        const { title, description, image_url, display_order} = req.body;
        try{
            const result = await pool.query(
                'UPDATE cms_solutions SET title = $1, description = $2, image_url = $3, display_order = $4 WHERE id = $5 RETURNING *',
                [title, description, image_url, display_order, id]
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
        try {
            const result = await pool.query('DELETE FROM cms_solutions WHERE id = $1 RETURNING *');

            if (result.rows.length === 0){
                return res.status(404).json({success: false, message: "solution not found"});
            }

            res.json({success: true, message: 'solution successfully deleted'});
        }catch(error){
            console.error("Error deleteSolution:", error);
            res.status(500).json({success: false, message: "Failed Deleting Solution"});
        }
    };


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
        const {name, title, description, image_url, display_order} = req.body;

        try {
            const result = await pool.query(
                'INSERT INTO cms_team_members (name, title, description, image_url, display_order VALUES ($1, $2, $3,$4) RETURNING *',
                [name, title, description, image_url, display_order || 0]
            );

            res.status(201).json({success:true, message: "Team Members Added"});
        }catch(error){
            console.error("Error addTeamMember:", error);
            res.status(500).json({success: false, message: " failed adding team member"});
        }
    };


    const updateTeamMember = async (req, res) => {
        const {id } = req.params;
        const { name, title, description, image_url, display_order} = req.body;
        try {
            const result = await pool.query(
                'UPDATE cms_team_members SET name = $1, title $2, description = $3, image_url = $4, display_order = $5 WHERE id = $6 RETURNING *',
                [name, title, description, image_url, display_order, id]
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
        try{
            const result = await pool.query ('DELETE FROM cms_team_members WHERE id = $1, RETURNING *');
            if (result.rows.length === 0) return res.status(404).json({success: false, message: "member not found "});
            res.json({success: true, message: "member deleted"});
        }catch(error){
            console.error("Error deleteTeamMember:", error);
            res.status(500).json({success: false, message: "failed when deleting member"});
        }
    };

    
module.exports = { getGeneralSettings, updateGeneralSettings, deleteSolution, getSolutions, addSolution, updateSolution, deleteTeamMember, addTeamMember, getTeamMembers, updateTeamMember};