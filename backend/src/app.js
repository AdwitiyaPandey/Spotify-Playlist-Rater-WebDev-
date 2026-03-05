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

module.exports = app;
