const router = require("express").Router();
const bcrypt = require ("bcrypt");
const pool = require ("../db");

const BCRYPT_SALT_ROUNDS = 10;

router.post("/register",async (req, res) =>  {
    try {
        const {username, email, password} = req.body;

        if (!username || !email || !password) {
            return res.status(400).json("Username, email and password are required");
        }

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1 OR username = $2",
            [email, username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json("User already exists");
        }
        
        const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

        const newUser = await pool.query(
            "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
            [username, email, hashedPassword]
        );

        const { password: _password, ...safeUser } = newUser.rows[0];
        res.json(safeUser);
    } catch (err) {
        if (err.code === "23505") {
            return res.status(409).json("User already exists");
        }

        console.error("Register error:", err.message);
        res.status(500).json("Server error");
    }
});

router.post("/login", async (req, res) => {
    try {
        const {email, password} = req.body;

        if (!email || !password) {
            return res.status(400).json("Email and password are required");
        }

        const user = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (user.rows.length === 0) {
            return res.status(401).json("Invalid Credentials");
        }

        const validPassword = await bcrypt.compare(password, user.rows[0].password);

        if (!validPassword) {
            return res.status(401).json("Invalid Credentials");
        }

        const { password: _password, ...safeUser } = user.rows[0];
        res.json(safeUser);
    } catch (err) {
        console.error("Login error:", err.message);
        res.status(500).json("Server error");
    }
});

module.exports = router;