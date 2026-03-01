const express = require("express");
const router = express.Router();
const pool = require("../db"); // postgres connection

async function ensurePlaylistsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS playlists (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      name TEXT,
      playlist_url TEXT,
      rating INTEGER,
      top_genre TEXT,
      feedback TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

// get all users
router.get("/users", async (req, res) => {
  try {
    const users = await pool.query("SELECT id, username, email FROM users ORDER BY id DESC");
    res.json(users.rows);
  } catch (err) {
    console.error("Admin users error:", err.message);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// get all playlists
router.get("/playlists", async (req, res) => {
  try {
    await ensurePlaylistsTable();
    const playlists = await pool.query("SELECT * FROM playlists ORDER BY id DESC");
    res.json(playlists.rows);
  } catch (err) {
    console.error("Admin playlists error:", err.message);
    res.status(500).json({ message: "Failed to fetch playlists" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    await ensurePlaylistsTable();
    const [usersCountRes, playlistsCountRes, ratingRes] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM users"),
      pool.query("SELECT COUNT(*)::int AS count FROM playlists"),
      pool.query("SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS avg_rating FROM playlists")
    ]);

    res.json({
      usersCount: usersCountRes.rows[0].count,
      playlistsCount: playlistsCountRes.rows[0].count,
      avgRating: Number(ratingRes.rows[0].avg_rating)
    });
  } catch (err) {
    console.error("Admin stats error:", err.message);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// delete user
router.delete("/users/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("Delete user error:", err.message);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// delete playlist
router.delete("/playlists/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM playlists WHERE id = $1", [req.params.id]);
    res.json({ message: "Playlist deleted" });
  } catch (err) {
    console.error("Delete playlist error:", err.message);
    res.status(500).json({ message: "Failed to delete playlist" });
  }
});

module.exports = router;