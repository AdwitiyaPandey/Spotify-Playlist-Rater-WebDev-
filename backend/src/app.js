const express = require("express");
const cors = require("cors");

const authRoutes = require("../routes/auth");
const playlistRoutes = require("../routes/playlist");
const adminRoutes = require("../routes/admin");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/playlist", playlistRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Backend running" });
});

app.use((err, req, res, _next) => {
  console.error("Unhandled route error:", err.stack || err.message || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: err.expose ? err.message : "Internal server error"
  });
});

module.exports = app;
