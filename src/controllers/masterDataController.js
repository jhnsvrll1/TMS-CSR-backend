const pool = require ('../config/db');

const allowedTables = [
    'provinces', 'legal_entities', 'business_sectors', 'company_sizes', 'industries',
    'financial_statuses', 'revenue_ranges', 'market_scopes', 'market_positions'
];

const getAllData = async (req, res) => {
    const {table} = req.params;

    if(!allowedTables.includes(table)) {
        return res.status(400).json({success: false, message: "table name not valid"});
    }

    try {
        const result = await pool.query(`SELECT * FROM ${table} ORDER BY id ASC`);
        res.json ({success: true, data: result.rows});
    }catch(error) {
        console.error(`Error get ${table}`, error);
        res.status(500).json({success: false, message: `fail taking data from ${table}`});
    }
};

const addData = async (req, res) => {
    const {table} = req.params;
    const { name, description} = req.body;

    if(!allowedTables.includes(table)) {
        return res.status(400).json({success:false, message: "table name invalid"});
    }

    try {
        let queryText = `INSERT INTO ${table} (name, description) VALUES ($1,$2) RETURNING *`
        let queryParams = [name, description];

        if (table === 'provinces') {
            queryText = `INSERT INTO ${table} (name) VALUES ($1) RETURNING *`;
            queryParams = [name];
        }


        const result = await pool.query(queryText, queryParams);
        res.status(201).json({success:true, message:`Data added to ${table}`, data: result.rows[0]});
    }catch(error){
        console.error(`Error add ${table}`, table);
        res.status(500).json({success:false, message:`Fail adding data to ${table}`});
    }
};

module.exports = { getAllData, addData}