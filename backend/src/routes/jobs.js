const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// LISTAR VACANTES ACTIVAS (SCRUM-63 / SCRUM-64)
// Requiere sesión iniciada: solo usuarios autenticados ven las vacantes.
// Corresponde a GestorOfertas.listarOfertas() del diagrama de clases.
router.get("/", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                id,
                title,
                company,
                description,
                min_experience_years,
                location,
                work_mode,
                created_at
             FROM job_offers
             WHERE status = 'active'
             ORDER BY created_at DESC
             LIMIT 100`
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
