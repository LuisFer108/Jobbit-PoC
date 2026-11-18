const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const { jobQueue } = require("../../queue/jobQueue");

const router = express.Router();

// LISTAR TODAS LAS VACANTES PARA ADMINISTRADOR (SCRUM-134)
router.get("/admin", authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                j.id,
                j.title,
                j.company,
                j.description,
                j.min_experience_years,
                j.location,
                j.work_mode,
                j.salary_range,
                j.status,
                j.created_at,
                (SELECT COUNT(*) FROM applications a WHERE a.offer_id = j.id) AS applications_count,
                COALESCE(
                    (SELECT json_agg(json_build_object('skill_id', s.id, 'name', s.name))
                     FROM offer_skills os
                     JOIN skills s ON s.id = os.skill_id
                     WHERE os.offer_id = j.id), 
                    '[]'
                ) AS skills
            FROM job_offers j
            ORDER BY j.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Error al listar vacantes para admin:", error);
        res.status(500).json({
            message: "No fue posible cargar el listado de vacantes."
        });
    }
});

// LISTAR VACANTES ACTIVAS (SCRUM-63 / SCRUM-64)
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
                j.salary_range,
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

// CREAR VACANTE NUEVA Y ENVIAR TAREA A LA COLA
router.post("/", authenticateToken, async (req, res) => {
    let client;
    try {
        const {
            title,
            company,
            description,
            min_experience_years,
            location,
            work_mode,
            salary_range,
            skills
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: "El título de la vacante es obligatorio" });
        }

        client = await pool.connect();
        await client.query("BEGIN");

        const offerRes = await client.query(
            `INSERT INTO job_offers
                (created_by, title, company, description, min_experience_years, location, work_mode, salary_range, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
             RETURNING *`,
            [
                req.user.userId,
                title.trim(),
                (company || "Jobbit Partner").trim(),
                (description || "").trim(),
                parseInt(min_experience_years, 10) || 0,
                (location || "Remoto").trim(),
                work_mode || "remote",
                salary_range || "2M - 5M"
            ]
        );
        
        // 1. Definimos newOffer correctamente antes de usarlo
        const newOffer = offerRes.rows[0];

        // 2. Guardamos las habilidades asociadas a la oferta si existen
        if (Array.isArray(skills) && skills.length > 0) {
            for (const s of skills) {
                const skillId = typeof s === "object" ? (s.skill_id || s.id) : parseInt(s, 10);
                const weight = typeof s === "object" && s.weight ? parseInt(s.weight, 10) : 1;
                const reqType = typeof s === "object" && s.requirement ? s.requirement : "must";
                if (skillId && !isNaN(skillId)) {
                    await client.query(
                        `INSERT INTO offer_skills (offer_id, skill_id, requirement, weight)
                         VALUES ($1, $2, $3, $4)
                         ON CONFLICT (offer_id, skill_id) DO NOTHING`,
                        [newOffer.id, skillId, reqType, weight]
                    );
                }
            }
        }

        await client.query("COMMIT");
        client.release();
        client = null;

        // 3. Enviamos la tarea a la cola de BullMQ en segundo plano de forma segura
        await jobQueue.add("evaluar-compatibilidad", {
            jobId: newOffer.id,
            offerTitle: newOffer.title
        });

        return res.status(201).json({
            message: "¡Vacante publicada con éxito! La compatibilidad se está evaluando en segundo plano.",
            job: newOffer
        });

    } catch (error) {
        if (client) {
            await client.query("ROLLBACK");
            client.release();
        }
        console.error("Error al crear vacante:", error);
        return res.status(500).json({ message: "Error al publicar la vacante" });
    }
});

module.exports = router;