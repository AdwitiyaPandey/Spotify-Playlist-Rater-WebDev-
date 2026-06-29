const { Pool } = require("pg");

const pool = new Pool({
    user: "postgres",
    password: "adwi",
    host: "localhost",
    port: 5432,
    database: "WebDev(Spotify)", 
});

pool.on("error", (err) => {
    console.error("Unexpected PostgreSQL pool error:", err.message);
});

module.exports = pool;