const pool = require("../db");

async function requireAdmin(req, res, next) {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const result = await pool.query(
      "SELECT id, is_admin FROM users WHERE id = $1 LIMIT 1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!result.rows[0].is_admin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.adminUser = result.rows[0];
    next();
  } catch (err) {
    console.error("Admin auth error:", err.message);
    res.status(500).json({ message: "Authentication failed" });
  }
}

module.exports = requireAdmin;
