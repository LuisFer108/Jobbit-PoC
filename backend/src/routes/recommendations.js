const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const { computeCompatibility } = require("../utils/compatibility");

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
    try {
        const profileResult = await pool.query(
            "SELECT * FROM work_profiles WHERE user_id = $1",
            [req.user.userId]
        );
        const profile = profileResult.rows[0];
        if (!profile) {
            return res.status(404).json({ message: "Crea tu perfil para ver tu compatibilidad" });
        }

        const skillsResult = await pool.query(
            "SELECT skill_id FROM profile_skills WHERE profile_id = $1",
            [profile.id]
        );
        const profileSkillIds = new Set(skillsResult.rows.map((r) => r.skill_id));

        const offersResult = await pool.query(
            "SELECT * FROM job_offers WHERE status = 'active'"
        );
        const offerSkillsResult = await pool.query(
            `SELECT os.offer_id, os.skill_id, os.weight, os.requirement, s.name as skill_name
             FROM offer_skills os
             JOIN skills s ON s.id = os.skill_id`
        );

        const skillsByOffer = {};
        for (const row of offerSkillsResult.rows) {
            (skillsByOffer[row.offer_id] ||= []).push({
                skill_id: row.skill_id,
                name: row.skill_name,
                weight: row.weight,
                requirement: row.requirement,
                matched: profileSkillIds.has(row.skill_id)
            });
        }

        const recommendations = offersResult.rows
            .map((offer) => {
                const offerSkills = skillsByOffer[offer.id] || [];
                const { score, breakdown } = computeCompatibility(
                    profile,
                    offer,
                    offerSkills,
                    profileSkillIds
                );
                return {
                    ...offer,
                    score,
                    breakdown,
                    skills: offerSkills
                };
            })
            .sort((a, b) => b.score - a.score);

        return res.json({ recommendations });
    } catch (error) {
        console.error("Error en recomendaciones:", error);
        return res.status(500).json({ message: "Error al calcular la compatibilidad" });
    }
});

module.exports = router;