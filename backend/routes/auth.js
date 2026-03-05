const router = require("express").Router();
const bcrypt = require ("bcrypt");
const pool = require ("../db");

const BCRYPT_SALT_ROUNDS = 10;
const DEFAULT_ADMIN = {
    username: "admin123",
    email: "admin123@local.admin",
    password: "@dmin_0987"
};

async function ensureUsersTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);

    // Keep older local schemas compatible with current auth/admin logic.
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()");
}

async function ensureDefaultAdminUser() {
    await ensureUsersTable();

    const hashedAdminPassword = await bcrypt.hash(DEFAULT_ADMIN.password, BCRYPT_SALT_ROUNDS);

    const existingAdmin = await pool.query(
        "SELECT id FROM users WHERE username = $1 LIMIT 1",
        [DEFAULT_ADMIN.username]
    );

    if (existingAdmin.rows.length > 0) {
        await pool.query(
            `
                UPDATE users
                SET password = $1,
                    is_admin = TRUE
                WHERE id = $2
            `,
            [hashedAdminPassword, existingAdmin.rows[0].id]
        );
        return;
    }

    try {
        await pool.query(
            `
                INSERT INTO users (username, email, password, is_admin)
                VALUES ($1, $2, $3, TRUE)
            `,
            [DEFAULT_ADMIN.username, DEFAULT_ADMIN.email, hashedAdminPassword]
        );
    } catch (err) {
        if (err.code !== "23505") throw err;

        const fallbackEmail = `${DEFAULT_ADMIN.username}_${Date.now()}@local.admin`;
        await pool.query(
            `
                INSERT INTO users (username, email, password, is_admin)
                VALUES ($1, $2, $3, TRUE)
            `,
            [DEFAULT_ADMIN.username, fallbackEmail, hashedAdminPassword]
        );
    }
}

router.post("/register",async (req, res) =>  {
    try {
        await ensureDefaultAdminUser();

        const {username, email, password} = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "Username, email and password are required" });
        }

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1 OR username = $2",
            [email, username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: "User already exists" });
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
            return res.status(409).json({ message: "User already exists" });
        }

        console.error("Register error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/login", async (req, res) => {
    try {
        await ensureDefaultAdminUser();

        const {email, password} = req.body;
        const identifier = email;

        if (!identifier || !password) {
            return res.status(400).json({ message: "Username/email and password are required" });
        }

        const user = await pool.query(
            "SELECT * FROM users WHERE email = $1 OR username = $1",
            [identifier]
        );

        if (user.rows.length === 0) {
            return res.status(401).json({ message: "Invalid Credentials" });
        }

        const validPassword = await bcrypt.compare(password, user.rows[0].password);

        if (!validPassword) {
            return res.status(401).json({ message: "Invalid Credentials" });
        }

        const { password: _password, ...safeUser } = user.rows[0];
        res.json(safeUser);
    } catch (err) {
        console.error("Login error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;