const { Pool } = require("pg");
require("dotenv").config({ debug: true, override: true });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

module.exports = pool;
