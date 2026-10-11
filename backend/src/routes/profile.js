const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/", authenticateToken, async (req, res) => {
    try {
        const { field, experience, experienceYears, education, workPreferences, preferredLocation, workMode } = req.body;
        if (!field || !field.trim()) return res.status(400).json({ message: "El campo profesional es obligatorio" });
        const result = await pool.query(
            `INSERT INTO work_profiles
            (user_id, field, experience, experience_years, education, work_preferences, preferred_location, work_mode)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [req.user.userId, field.trim(), experience || null,
             experienceYears === "" || experienceYears == null ? null : Number(experienceYears),
             education || null, workPreferences || null, preferredLocation || null, workMode || null]
        );
        return res.status(201).json({ message: "Perfil creado correctamente", profile: result.rows[0] });
    } catch (error) {
        console.error("Error al crear el perfil:", error);
        if (error.code === "23505") return res.status(409).json({ message: "Ya tienes un perfil laboral. Puedes editarlo desde tu dashboard." });
        return res.status(500).json({ message: "Error al crear el perfil" });
    }
});

router.get("/", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT wp.*, u.name, u.email
             FROM work_profiles AS wp JOIN users AS u ON u.id = wp.user_id
             WHERE wp.user_id = $1`, [req.user.userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: "Perfil no encontrado" });
        return res.json(result.rows[0]);
    } catch (error) {
        console.error("Error al obtener el perfil:", error);
        return res.status(500).json({ message: "Error al obtener el perfil" });
    }
});

router.put("/", authenticateToken, async (req, res) => {
    let client;
    try {
        const { name, email, field, experience, experienceYears, education, workPreferences, preferredLocation, workMode } = req.body;
        if (!name || !name.trim() || !email || !email.trim()) {
            return res.status(400).json({ message: "El nombre y el correo son obligatorios" });
        }
        if (!field || !field.trim()) return res.status(400).json({ message: "El campo profesional es obligatorio" });

        const years = experienceYears === "" || experienceYears == null ? null : Number(experienceYears);
        if (years !== null && (!Number.isInteger(years) || years < 0)) {
            return res.status(400).json({ message: "Los años de experiencia deben ser un entero igual o mayor que cero" });
        }

        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();
        client = await pool.connect();
        await client.query("BEGIN");

        const exists = await client.query("SELECT id FROM work_profiles WHERE user_id = $1", [req.user.userId]);
        if (exists.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "No existe un perfil laboral para actualizar" });
        }

        await client.query("UPDATE users SET name = $1, email = $2 WHERE id = $3", [normalizedName, normalizedEmail, req.user.userId]);
        const updated = await client.query(
            `UPDATE work_profiles SET
                field = $1, experience = $2, experience_years = $3, education = $4,
                work_preferences = $5, preferred_location = $6, work_mode = $7,
                updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $8 RETURNING *`,
            [field.trim(), experience || null, years, education || null, workPreferences || null,
             preferredLocation || null, workMode || null, req.user.userId]
        );
        await client.query("COMMIT");
        return res.json({
            message: "Perfil actualizado correctamente",
            profile: { ...updated.rows[0], name: normalizedName, email: normalizedEmail }
        });
    } catch (error) {
        if (client) {
            try { await client.query("ROLLBACK"); } catch (rollbackError) { console.error(rollbackError); }
        }
        console.error("Error al actualizar el perfil:", error);
        if (error.code === "23505") return res.status(409).json({ message: "Ese correo ya está registrado en otra cuenta" });
        return res.status(500).json({ message: "No fue posible actualizar el perfil" });
    } finally {
        if (client) client.release();
    }
});

module.exports = router;
