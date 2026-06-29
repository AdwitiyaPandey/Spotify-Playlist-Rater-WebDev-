const express = require("express");
const router = express.Router();
const pool = require("../db");
const { ensurePlaylistsTable } = require("../utils/ensureTables");
const asyncHandler = require("../utils/asyncHandler");

router.get("/users", asyncHandler("Fetch users")(async (req, res) => {
  const users = await pool.query("SELECT id, username, email FROM users ORDER BY id DESC");
  res.json(users.rows);
}));

router.get("/playlists", asyncHandler("Fetch playlists")(async (req, res) => {
  await ensurePlaylistsTable();
  const playlists = await pool.query("SELECT * FROM playlists ORDER BY id DESC");
  res.json(playlists.rows);
}));

router.get("/stats", asyncHandler("Fetch stats")(async (req, res) => {
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
}));

router.delete("/users/:id", asyncHandler("Delete user")(async (req, res) => {
  await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
  res.json({ message: "User deleted" });
}));

router.delete("/playlists/:id", asyncHandler("Delete playlist")(async (req, res) => {
  await pool.query("DELETE FROM playlists WHERE id = $1", [req.params.id]);
  res.json({ message: "Playlist deleted" });
}));

module.exports = router;