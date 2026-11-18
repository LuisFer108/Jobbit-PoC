const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const { jobQueue } = require("../../queue/jobQueue"); // Importamos la cola creada

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

// CREAR VACANTE NUEVA Y ENVIAR TAREA A LA COLA PARA NOTIFICAR A CANDIDATOS (>90%)
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

        const newOffer = offerRes.rows[0];

        // Asociar habilidades requeridas si vienen en el payload
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

        // Mandamos la tarea de evaluación y notificación a la cola de BullMQ en segundo plano
        await jobQueue.add("evaluar-compatibilidad", {
            jobId: newOffer.id,
            offerTitle: newOffer.title
        });

        return res.status(201).json({
            message: "Vacante creada exitosamente. La evaluación de candidatos se está procesando en segundo plano.",
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