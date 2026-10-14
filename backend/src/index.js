const express = require("express");
const cors = require("cors");
const skillRoutes = require("./routes/skills");

const recommendationRoutes = require("./routes/recommendations");

const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const adminRoutes = require("./routes/admin");
const jobsRoutes = require("./routes/jobs");
const applicationsRoutes = require("./routes/applications");

const app = express();

app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:3001"]
}));

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/applications", applicationsRoutes);

app.get("/", (req, res) => {
    res.send("Backend funcionando");
});

if (require.main === module) {
    app.listen(5001, () => {
        console.log("Servidor ejecutándose en http://localhost:5001");
    });
}

module.exports = app;
