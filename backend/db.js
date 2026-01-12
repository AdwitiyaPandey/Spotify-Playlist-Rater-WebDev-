const { Pool } = require("pg");

const pool = new Pool({
    user: "postgres",
    password: "adwi",
    host: "localhost",
    port: 5432,
    database: "WebDev(Spotify)", 
})