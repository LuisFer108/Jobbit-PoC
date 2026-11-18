const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const { notifyCandidatesForNewOffer } = require("../utils/notificationService");

const router = express.Router();

const VALID_WORK_MODES = ["remote", "hybrid", "onsite"];
const VALID_SALARY_RANGES = ["Menos de 2M", "2M - 5M", "Más de 5M"];
const VALID_STATUSES = ["active", "inactive"];

/**
 * Valida los campos de creación o edición de una vacante (SCRUM-132).
 * Devuelve { error: string | null, values: object }.
 */
function validateJobPayload(body = {}, { isUpdate = false } = {}) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const company = typeof body.company === "string" ? body.company.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const location = typeof body.location === "string" ? body.location.trim() : "";
    const work_mode = body.work_mode || "remote";
    const salary_range = body.salary_range || "2M - 5M";
    const status = body.status || "active";

    if (!title) {
        return { error: "El título de la vacante es obligatorio" };
    }
    if (title.length < 3 || title.length > 200) {
        return { error: "El título de la vacante debe tener entre 3 y 200 caracteres" };
    }

    if (isUpdate && !company) {
        return { error: "El nombre de la empresa es obligatorio" };
    }
    if (company.length > 150) {
        return { error: "El nombre de la empresa no puede superar los 150 caracteres" };
    }

    if (isUpdate && !location) {
        return { error: "La ubicación de la vacante es obligatoria" };
    }
    if (location.length > 150) {
        return { error: "La ubicación no puede superar los 150 caracteres" };
    }

    const rawExp = body.min_experience_years;
    const parsedExp = rawExp !== undefined && rawExp !== "" && rawExp !== null
        ? Number(rawExp)
        : 0;
    if (!Number.isInteger(parsedExp) || parsedExp < 0 || parsedExp > 50) {
        return {
            error: "Los años mínimos de experiencia deben ser un número entero entre 0 y 50"
        };
    }

    if (!VALID_WORK_MODES.includes(work_mode)) {
        return { error: "La modalidad seleccionada no es válida (debe ser remote, hybrid u onsite)" };
    }

    if (!VALID_SALARY_RANGES.includes(salary_range)) {
        return { error: "El rango salarial seleccionado no es válido" };
    }

    if (!VALID_STATUSES.includes(status)) {
        return { error: "El estado de la vacante no es válido (debe ser active o inactive)" };
    }

    return {
        error: null,
        values: {
            title,
            company: company || "Jobbit Partner",
            description,
            min_experience_years: parsedExp,
            location: location || "Remoto",
            work_mode,
            salary_range,
            status
        }
    };
}

// LISTAR VACANTES ACTIVAS PARA CANDIDATOS (SCRUM-63 / SCRUM-64)
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

// LISTAR TODAS LAS VACANTES PARA EL ADMINISTRADOR (SCRUM-134)
// Incluye activas e inactivas, sus habilidades requeridas y el total de postulaciones.
router.get("/admin", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
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
                j.status,
                j.created_at,
                (SELECT COUNT(*)::int FROM applications a WHERE a.offer_id = j.id) AS applications_count,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'skill_id', os.skill_id,
                                'name', s.name,
                                'requirement', os.requirement,
                                'weight', os.weight
                            )
                            ORDER BY s.name ASC
                        )
                        FROM offer_skills os
                        JOIN skills s ON s.id = os.skill_id
                        WHERE os.offer_id = j.id
                    ),
                    '[]'::json
                ) AS skills
             FROM job_offers j
             ORDER BY j.created_at DESC, j.id DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Error al listar vacantes para administrador:", error);
        res.status(500).json({
            message: "Error al cargar el catálogo de vacantes del panel administrativo"
        });
    }
});

// CREAR VACANTE NUEVA Y NOTIFICAR AUTOMÁTICAMENTE A CANDIDATOS COMPATIBLES (>90%) (SCRUM-129, SCRUM-132, SCRUM-133)
router.post("/", authenticateToken, requireRole("admin"), async (req, res) => {
    let client;
    try {
        const { error, values } = validateJobPayload(req.body, { isUpdate: false });
        if (error) {
            return res.status(400).json({ message: error });
        }

        const { skills } = req.body;

        client = await pool.connect();
        await client.query("BEGIN");

        const offerRes = await client.query(
            `INSERT INTO job_offers
                (created_by, title, company, description, min_experience_years, location, work_mode, salary_range, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
             RETURNING *`,
            [
                req.user.userId,
                values.title,
                values.company,
                values.description,
                values.min_experience_years,
                values.location,
                values.work_mode,
                values.salary_range
            ]
        );

        const newOffer = offerRes.rows[0];

        // Asociar habilidades requeridas si vienen en el payload
        if (Array.isArray(skills) && skills.length > 0) {
            for (const s of skills) {
                const skillId = typeof s === "object" ? (s.skill_id || s.id) : parseInt(s, 10);
                const weight = typeof s === "object" && s.weight ? parseInt(s.weight, 10) : 2;
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

        // Notificar en tiempo real a candidatos compatibles con > 90%
        const notified = await notifyCandidatesForNewOffer(newOffer.id);

        return res.status(201).json({
            message: "Vacante creada y candidatos notificados exitosamente",
            job: newOffer,
            notifiedCandidatesCount: notified.length,
            notified
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

// MODIFICAR VACANTE EXISTENTE EN POSTGRESQL (SCRUM-131, SCRUM-132, SCRUM-133)
router.put("/:id", authenticateToken, requireRole("admin"), async (req, res) => {
    const jobId = parseInt(req.params.id, 10);
    if (!Number.isInteger(jobId) || jobId <= 0) {
        return res.status(400).json({ message: "El identificador de la vacante no es válido" });
    }

    const { error, values } = validateJobPayload(req.body, { isUpdate: true });
    if (error) {
        return res.status(400).json({ message: error });
    }

    const { skills } = req.body;
    let client;

    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const existingRes = await client.query(
            "SELECT id FROM job_offers WHERE id = $1",
            [jobId]
        );

        if (existingRes.rows.length === 0) {
            await client.query("ROLLBACK");
            client.release();
            client = null;
            return res.status(404).json({ message: "La vacante que intentas modificar no existe" });
        }

        const updateRes = await client.query(
            `UPDATE job_offers
             SET title = $1,
                 company = $2,
                 description = $3,
                 min_experience_years = $4,
                 location = $5,
                 work_mode = $6,
                 salary_range = $7,
                 status = $8
             WHERE id = $9
             RETURNING *`,
            [
                values.title,
                values.company,
                values.description,
                values.min_experience_years,
                values.location,
                values.work_mode,
                values.salary_range,
                values.status,
                jobId
            ]
        );

        const updatedJob = updateRes.rows[0];

        // Si se envía el arreglo de habilidades, sincronizar offer_skills en la misma transacción
        if (Array.isArray(skills)) {
            await client.query("DELETE FROM offer_skills WHERE offer_id = $1", [jobId]);

            for (const s of skills) {
                const skillId = typeof s === "object" ? (s.skill_id || s.id) : parseInt(s, 10);
                const weight = typeof s === "object" && s.weight ? parseInt(s.weight, 10) : 2;
                const reqType = typeof s === "object" && s.requirement ? s.requirement : "must";
                if (skillId && !isNaN(skillId)) {
                    await client.query(
                        `INSERT INTO offer_skills (offer_id, skill_id, requirement, weight)
                         VALUES ($1, $2, $3, $4)
                         ON CONFLICT (offer_id, skill_id) DO NOTHING`,
                        [jobId, skillId, reqType, weight]
                    );
                }
            }
        }

        await client.query("COMMIT");
        client.release();
        client = null;

        return res.json({
            message: "Vacante actualizada exitosamente en la base de datos",
            job: updatedJob
        });
    } catch (err) {
        if (client) {
            await client.query("ROLLBACK");
            client.release();
        }
        console.error("Error al actualizar vacante:", err);
        return res.status(500).json({ message: "Error al guardar los cambios de la vacante" });
    }
});

module.exports = router;
