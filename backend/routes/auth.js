const router = require ("express").ROuter();
const bcrypt = require ("bcrypt");
const pool = require ("../db");

router.post("/register",async (req, res) =>  {
    try {
        const {username, email, password} = req.body;
        
        const hashedPassword = await bcrypt.hash(password, 20);

        const newUser = await pool.query(
            "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
            [username, email, hashedPassword]
        );

        res.json(newUser.rows[0]);
    } catch (err) {
        res.status(500).json("User already exists");
    }
});

router.post("/login", async (req, res) => {
    try {
        const {email, password} = req.body;

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

        res.json(user.rows[0]);
    } catch (err) {
        res.status(500).json("Server error");
    }
});

module.exports = router;