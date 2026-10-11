const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();


// CREAR PERFIL
router.post("/", authenticateToken, async (req, res) => {
    try {
        const {
            field,
            experience,
            experienceYears,
            workPreferences,
            preferredLocation,
            workMode
        } = req.body;

        const userId = req.user.userId;

        if (!field) {
            return res.status(400).json({
                message: "El campo profesional es obligatorio"
            });
        }

        const result = await pool.query(
            `INSERT INTO work_profiles
            (
                user_id,
                field,
                experience,
                experience_years,
                work_preferences,
                preferred_location,
                work_mode
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                userId,
                field,
                experience,
                experienceYears,
                workPreferences,
                preferredLocation,
                workMode
            ]
        );

        res.status(201).json({
            message: "Perfil creado correctamente",
            profile: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Error al crear el perfil"
        });
    }
});


// OBTENER PERFIL
router.get("/", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            "SELECT * FROM work_profiles WHERE user_id = $1",
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Perfil no encontrado"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        res.status(500).json({
            message: "Error al obtener el perfil"
        });
    }
});

module.exports = router;