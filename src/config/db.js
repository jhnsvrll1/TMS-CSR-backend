const { Pool } = require('pg');
require('../../.gitignore/node_modules/dotenv/lib/main').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('connect', () => {
  console.log('CONNECTED TO POSTGRESQL!');
});

module.exports = pool;