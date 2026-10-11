const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

// Endpoint mínimo para demostrar que las rutas administrativas están protegidas.
router.get("/summary", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                (SELECT COUNT(*)::int FROM users) AS total_users,
                (SELECT COUNT(*)::int FROM work_profiles) AS total_profiles`
        );

        res.json({
            message: "Acceso administrativo autorizado",
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