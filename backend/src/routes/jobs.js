const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// LISTAR VACANTES ACTIVAS (SCRUM-63 / SCRUM-64)
// Requiere sesión iniciada: solo usuarios autenticados ven las vacantes.
// Corresponde a GestorOfertas.listarOfertas() del diagrama de clases.
router.get("/", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await pool.query(
            `SELECT
                j.id,
                j.title,
                j.company,
                j.description,
                j.min_experience_years,
                j.location,
                j.work_mode,
                j.created_at,
                a.id AS application_id,
                a.status AS application_status,
                a.created_at AS applied_at
             FROM job_offers j
             LEFT JOIN applications a ON a.offer_id = j.id AND a.user_id = $1
             WHERE j.status = 'active'
             ORDER BY j.created_at DESC
             LIMIT 100`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Error al listar vacantes:", error);
        res.status(500).json({
            message: "Error al cargar las vacantes"
        });
    }
});

module.exports = router;
