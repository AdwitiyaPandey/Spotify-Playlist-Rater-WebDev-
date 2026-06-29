const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:5173"];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));

app.use("/api/auth", authRoutes);
app.listen(5000, () => {
    console.log("Server running on port 5000");
});
