const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

// RESUMEN Y VALIDACIÓN DE ACCESO AL PANEL ADMINISTRATIVO (SCRUM-21: SCRUM-123, SCRUM-124, SCRUM-126)
router.get("/summary", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                (SELECT COUNT(*)::int FROM users) AS total_users,
                (SELECT COUNT(*)::int FROM users WHERE role = 'candidate') AS total_candidates,
                (SELECT COUNT(*)::int FROM work_profiles) AS total_profiles,
                (SELECT COUNT(*)::int FROM job_offers WHERE status = 'active') AS active_jobs,
                (SELECT COUNT(*)::int FROM job_offers WHERE status = 'inactive') AS inactive_jobs,
                (SELECT COUNT(*)::int FROM applications) AS total_applications`
        );

        res.json({
            message: "Acceso administrativo autorizado",
            admin: {
                id: req.user.userId,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role
            },
            summary: result.rows[0]
        });
    } catch (error) {
        console.error("Error al consultar el resumen administrativo:", error);
        res.status(500).json({
            message: "Error al consultar el resumen administrativo"
        });
    }
});

module.exports = router;
