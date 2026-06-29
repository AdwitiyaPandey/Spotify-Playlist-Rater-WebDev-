const express = require("express");
const cors = require("cors");

const authRoutes = require("../routes/auth");
const playlistRoutes = require("../routes/playlist");
const adminRoutes = require("../routes/admin");
const requireAdmin = require("../middleware/requireAdmin");

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:5173"];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/playlist", playlistRoutes);
app.use("/api/admin", requireAdmin, adminRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Backend running" });
});

module.exports = app;
