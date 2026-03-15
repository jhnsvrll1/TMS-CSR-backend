const e = require('express');
const pool = require ('../config/db');
//MASTER DATA
const allowedCategories = [
    'provinces', 'legal_entities', 'business_sectors', 'company_sizes', 'industries',
    'financial_statuses', 'revenue_ranges', 'market_scopes', 'market_positions'
];

const getAllData = async (req, res) => {
    const category = req.params.table;

    if(!allowedCategories.includes(category)) {
        return res.status(400).json({success: false, message: "category name not valid"});
    }

    try {
        const result = await pool.query(
            `SELECT * FROM cms_master_data WHERE category = $1 AND is_active = true ORDER BY sequence ASC, id ASC`, [category]);
        res.json ({success: true, data: result.rows});
    }catch(error) {
        console.error(`Error get ${category}`, error);
        res.status(500).json({success: false, message: `fail taking data from ${category}`});
    }
};

const addData = async (req, res) => {
    const category = req.params.table;
    const { name, description, code, sequence} = req.body;

    if(!allowedCategories.includes(category)) {
        return res.status(400).json({success:false, message: "category name invalid"});
    }

    try {
        let queryText = `INSERT INTO cms_master_data (category, name, description, code, sequence) VALUES ($1,$2, $3, $4, $5) RETURNING *`
        let queryParams = [category, name, description || null, code || null, sequence];

        const result = await pool.query(queryText, queryParams);
        res.status(201).json({success:true, message:`Data added to ${category}`, data: result.rows[0]});
    }catch(error){
        console.error(`Error add ${category}`, category);
        res.status(500).json({success:false, message:`Fail adding data to ${category}`});
    }
};

const updateData = async (req, res) => {
    const category = req.params.table;
    const { id } = req.params;
    const { name, description , code, sequence} = req.body;

    if(!allowedCategories.includes(category)) {
        return res.status(400).json({success: false, message: "Category name invalid"});
    }

    try {
        const queryText = `
        UPDATE cms_master_data
        SET name = $1, description = $2, code = $3, sequence = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5 AND CATEGORY = $6
        RETURNING *
        `;

        const queryParams = [name, description || null, code || null, sequence || 0, id, category];

        const result = await pool.query(queryText, queryParams);

        if (result.rows.length === 0){
            return res.status(404).json({success:false, message: "Data not found"});
        }

        res.json({success:true, message: "Data updated successfully", data: result.rows[0]});
    }catch (error) {
        console.error(`Error update ${category}`, error);
        res.status(500).json({success: false, message: `Fail updating data in ${category}`});
    }
};


const deleteData = async(req, res) => {
    const category = req.params.table;
    const { id } = req.params;

    if(!allowedCategories.includes(category)){
        return res.status(400).json({success: false, message: "Category name invallid"});
    }

    try {
        const queryText =  `DELETE FROM cms_master_data
         WHERE id = $1 AND category = $2 RETURNING *`;
        const result = await pool.query(queryText, [id, category]);

        if(result.rows.length === 0){
            return res.status(400).json({success:false, message:"Data not found"});
        }

        res.json({success: true, message: "Data moved to trash"});
    }catch(error){
        console.error(`Error delete ${category}`, error);
        res.status(500).json({success:false, message: `Fail deleting data from ${category}`});
    }
}

module.exports = { getAllData, addData, deleteData, updateData}