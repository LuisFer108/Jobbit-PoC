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
            education,
            workPreferences,
            preferredLocation,
            workMode,
            salaryRange,
            salary_range
        } = req.body;

        const userId = req.user.userId;

        if (!field) {
            return res.status(400).json({
                message: "El campo profesional es obligatorio"
            });
        }

        const chosenSalary = salaryRange || salary_range || null;

        const result = await pool.query(
            `INSERT INTO work_profiles
            (
                user_id,
                field,
                experience,
                experience_years,
                education,
                work_preferences,
                preferred_location,
                work_mode,
                salary_range
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                userId,
                field,
                experience,
                experienceYears,
                education,
                workPreferences,
                preferredLocation,
                workMode,
                chosenSalary
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
            `SELECT wp.*, u.name, u.email
            FROM work_profiles wp
            JOIN users u ON u.id = wp.user_id
            WHERE wp.user_id = $1`,
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

 // ACTUALIZAR PERFIL
router.put("/", authenticateToken, async (req, res) => {
    let client;

    try {
        const {
            name,
            email,
            field,
            experience,
            experienceYears,
            education,
            workPreferences,
            preferredLocation,
            workMode,
            salaryRange,
            salary_range
        } = req.body;

    
        if (typeof field !== "string" || !field.trim()) {
            return res.status(400).json({
                message: "El campo profesional es obligatorio"
            });
        }

        const years =
            experienceYears === "" || experienceYears == null
                ? null
                : Number(experienceYears);

        if (
            years !== null &&
            (!Number.isInteger(years) || years < 0)
        ) {
            return res.status(400).json({
                message: "Los años deben ser un entero igual o mayor que cero"
            });
        }

        client = await pool.connect();
        await client.query("BEGIN");

        // Consultar el nombre y el correo que ya tiene el usuario.
        const userResult = await client.query(
            "SELECT name, email FROM users WHERE id = $1",
            [req.user.userId]
        );

        if (userResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Usuario no encontrado"
            });
        }

        const currentUser = userResult.rows[0];

        // Si no se introduce un dato nuevo, se conserva el actual.
        const normalizedName =
            typeof name === "string" && name.trim()
                ? name.trim()
                : currentUser.name;

        const normalizedEmail =
            typeof email === "string" && email.trim()
                ? email.trim().toLowerCase()
                : currentUser.email;

        const existingProfile = await client.query(
            "SELECT user_id FROM work_profiles WHERE user_id = $1",
            [req.user.userId]
        );

        if (existingProfile.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "No existe un perfil laboral para actualizar"
            });
        }

        await client.query(
            "UPDATE users SET name = $1, email = $2 WHERE id = $3",
            [normalizedName, normalizedEmail, req.user.userId]
        );

        const chosenSalary =
            salaryRange !== undefined
                ? (salaryRange || null)
                : (salary_range !== undefined ? (salary_range || null) : null);

        const result = await client.query(
            `UPDATE work_profiles
             SET field = $1,
                 experience = $2,
                 experience_years = $3,
                 education = $4,
                 work_preferences = $5,
                 preferred_location = $6,
                 work_mode = $7,
                 salary_range = COALESCE($8, salary_range),
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $9
             RETURNING *`,
            [
                field.trim(),
                experience || null,
                years,
                education || null,
                workPreferences || null,
                preferredLocation || null,
                workMode || null,
                chosenSalary,
                req.user.userId
            ]
        );

        await client.query("COMMIT");

        return res.json({
            message: "Perfil actualizado correctamente",
            profile: {
                ...result.rows[0],
                name: normalizedName,
                email: normalizedEmail
            }
        });
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error(
                    "Error al revertir transacción:",
                    rollbackError
                );
            }
        }

        console.error("Error al actualizar el perfil:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Ese correo ya está registrado en otra cuenta"
            });
        }

        return res.status(500).json({
            message: "No fue posible actualizar el perfil"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
});


module.exports = router;
