const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// Catálogo
router.get("/", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name, category FROM skills ORDER BY category, name"
        );
        res.json({ skills: result.rows });
    } catch (error) {
        console.error("Error al cargar habilidades:", error);
        res.status(500).json({ message: "Error al cargar las habilidades" });
    }
});

// Habilidades del usuario
router.get("/mine", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT s.id, s.name, s.category FROM profile_skills ps
             JOIN work_profiles wp ON wp.id = ps.profile_id
             JOIN skills s ON s.id = ps.skill_id
             WHERE wp.user_id = $1
             ORDER BY s.name`,
            [req.user.userId]
        );
        res.json({
            skillIds: result.rows.map((r) => r.id),
            skills: result.rows
        });
    } catch (error) {
        console.error("Error al cargar tus habilidades:", error);
        res.status(500).json({ message: "Error al cargar tus habilidades" });
    }
});

// Guardar (reemplaza la selección completa)
router.put("/mine", authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const raw = Array.isArray(req.body?.skillIds) ? req.body.skillIds : [];
        const ids = [...new Set(raw.map(Number))].filter(Number.isInteger);

        if (ids.length > 5) {
            return res.status(400).json({ message: "Puedes seleccionar máximo 5 habilidades" });
        }

        const profile = await client.query(
            "SELECT id FROM work_profiles WHERE user_id = $1",
            [req.user.userId]
        );
        if (!profile.rows[0]) {
            return res.status(404).json({ message: "Crea tu perfil laboral primero" });
        }
        const profileId = profile.rows[0].id;

        // Solo habilidades que existan en el catálogo
        const valid = await client.query(
            "SELECT id FROM skills WHERE id = ANY($1::int[])",
            [ids]
        );

        await client.query("BEGIN");
        await client.query("DELETE FROM profile_skills WHERE profile_id = $1", [profileId]);
        for (const row of valid.rows) {
            await client.query(
                "INSERT INTO profile_skills (profile_id, skill_id) VALUES ($1, $2)",
                [profileId, row.id]
            );
        }
        await client.query("COMMIT");

        res.json({ message: "Habilidades guardadas" });
    } catch (error) {
        try { await client.query("ROLLBACK"); } catch {}
        console.error("Error al guardar habilidades:", error.message, error.code);
        res.status(500).json({ message: "Error al guardar las habilidades" });
    } finally {
        client.release();
    }
});

module.exports = router;