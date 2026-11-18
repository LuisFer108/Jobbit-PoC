const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const { validateWorkProfileCompleteness } = require("../utils/profileValidation");

const router = express.Router();

// LISTAR TODAS LAS POSTULACIONES DEL SISTEMA (Solo Administradores)
router.get("/all", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "No autorizado. Acceso restringido para administradores." });
        }

        const result = await pool.query(
            `SELECT
                a.id,
                a.user_id,
                a.offer_id,
                a.status,
                a.cover_letter,
                a.candidate_name,
                a.candidate_email,
                a.field,
                a.experience_years,
                a.created_at,
                j.title AS job_title,
                j.company AS job_company,
                j.location AS job_location
             FROM applications a
             JOIN job_offers j ON j.id = a.offer_id
             ORDER BY a.created_at DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Error al obtener todas las postulaciones para admin:", error);
        res.status(500).json({ message: "Error al cargar las postulaciones" });
    }
});

// ACTUALIZAR EL ESTADO DE UNA POSTULACIÓN (Solo Administradores)
router.patch("/:id/status", authenticateToken, async (req, res) => {
    let client;
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "No autorizado. Solo los administradores pueden cambiar el estado." });
        }

        const applicationId = parseInt(req.params.id, 10);
        const { status, note } = req.body;

        if (isNaN(applicationId)) {
            return res.status(400).json({ message: "ID de postulación inválido" });
        }

        if (!status) {
            return res.status(400).json({ message: "El nuevo estado es obligatorio" });
        }

        client = await pool.connect();
        await client.query("BEGIN");

        const updateResult = await client.query(
            `UPDATE applications 
             SET status = $1 
             WHERE id = $2 
             RETURNING *`,
            [status, applicationId]
        );

        if (updateResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Postulación no encontrada" });
        }

        const updatedApplication = updateResult.rows[0];

        await client.query(
            `INSERT INTO application_status_history (application_id, status, note)
             VALUES ($1, $2, $3)`,
            [applicationId, status, note || `Actualizado a: ${status}`]
        );

        await client.query("COMMIT");

        return res.json({
            message: "Estado actualizado exitosamente",
            application: updatedApplication
        });

    } catch (error) {
        if (client) {
            try { await client.query("ROLLBACK"); } catch (rbErr) { console.error(rbErr); }
        }
        console.error("Error al actualizar estado:", error);
        res.status(500).json({ message: "Error interno al actualizar el estado" });
    } finally {
        if (client) client.release();
    }
});

// LISTAR TODAS LAS POSTULACIONES DEL CANDIDATO AUTENTICADO
router.get("/my-applications", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            `SELECT
                a.id,
                a.offer_id,
                a.status,
                a.cover_letter,
                a.candidate_name,
                a.candidate_email,
                a.field,
                a.experience_years,
                a.experience,
                a.education,
                a.work_preferences,
                a.preferred_location,
                a.work_mode,
                a.created_at,
                j.title AS job_title,
                j.company AS job_company,
                j.location AS job_location,
                j.work_mode AS job_work_mode,
                j.min_experience_years AS job_min_experience_years
             FROM applications a
             JOIN job_offers j ON j.id = a.offer_id
             WHERE a.user_id = $1
             ORDER BY a.created_at DESC`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Error al obtener postulaciones:", error);
        res.status(500).json({
            message: "Error al cargar las postulaciones"
        });
    }
});

// CONSULTAR DETALLE Y HISTORIAL DE ESTADOS DE UNA POSTULACIÓN
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const applicationId = parseInt(req.params.id, 10);
        if (isNaN(applicationId)) {
            return res.status(400).json({ message: "ID de postulación inválido" });
        }

        const appResult = await pool.query(
            `SELECT
                a.id,
                a.user_id,
                a.offer_id,
                a.status,
                a.cover_letter,
                a.candidate_name,
                a.candidate_email,
                a.field,
                a.experience_years,
                a.experience,
                a.education,
                a.work_preferences,
                a.preferred_location,
                a.work_mode,
                a.created_at,
                j.title AS job_title,
                j.company AS job_company,
                j.location AS job_location,
                j.work_mode AS job_work_mode,
                j.description AS job_description
             FROM applications a
             JOIN job_offers j ON j.id = a.offer_id
             WHERE a.id = $1`,
            [applicationId]
        );

        if (appResult.rows.length === 0) {
            return res.status(404).json({ message: "Postulación no encontrada" });
        }

        const application = appResult.rows[0];

        if (application.user_id !== req.user.userId && req.user.role !== "admin") {
            return res.status(403).json({ message: "Acceso no autorizado a esta postulación" });
        }

        const historyResult = await pool.query(
            `SELECT id, status, note, changed_at
             FROM application_status_history
             WHERE application_id = $1
             ORDER BY changed_at ASC`,
            [applicationId]
        );

        res.json({
            application,
            history: historyResult.rows
        });
    } catch (error) {
        console.error("Error al consultar postulación:", error);
        res.status(500).json({
            message: "Error al consultar los detalles de la postulación"
        });
    }
});

// CREAR POSTULACIÓN ASISTIDA A UNA VACANTE
router.post("/", authenticateToken, async (req, res) => {
    let client;
    try {
        const userId = req.user.userId;
        const offerId = parseInt(req.body.offerId, 10);
        const coverLetter = typeof req.body.coverLetter === "string" ? req.body.coverLetter.trim() : null;

        if (!offerId || isNaN(offerId)) {
            return res.status(400).json({
                message: "Debes especificar una vacante válida para postularte"
            });
        }

        const jobResult = await pool.query(
            `SELECT id, title, company, status FROM job_offers WHERE id = $1`,
            [offerId]
        );

        if (jobResult.rows.length === 0) {
            return res.status(404).json({
                message: "La vacante no existe"
            });
        }

        const job = jobResult.rows[0];
        if (job.status !== "active") {
            return res.status(400).json({
                message: "Esta vacante ya no se encuentra activa para postulaciones"
            });
        }

        const profileResult = await pool.query(
            `SELECT wp.*, u.name, u.email
             FROM work_profiles wp
             JOIN users u ON u.id = wp.user_id
             WHERE wp.user_id = $1`,
            [userId]
        );

        if (profileResult.rows.length === 0) {
            return res.status(400).json({
                message: "Debes crear tu perfil laboral antes de postularte a una vacante",
                code: "PROFILE_REQUIRED"
            });
        }

        const userProfile = profileResult.rows[0];
        const completeness = validateWorkProfileCompleteness(userProfile);

        if (!completeness.isComplete) {
            return res.status(400).json({
                message: `Tu perfil laboral está incompleto. Debes completar: ${completeness.missingFields.join(", ")} antes de postularte.`,
                code: "PROFILE_INCOMPLETE",
                missingFields: completeness.missingFields
            });
        }

        const existingApp = await pool.query(
            `SELECT id, status, created_at FROM applications WHERE user_id = $1 AND offer_id = $2`,
            [userId, offerId]
        );

        if (existingApp.rows.length > 0) {
            return res.status(409).json({
                message: "Ya te has postulado previamente a esta vacante",
                code: "DUPLICATE_APPLICATION",
                application: existingApp.rows[0]
            });
        }

        client = await pool.connect();
        await client.query("BEGIN");

        const insertAppResult = await client.query(
            `INSERT INTO applications (
                user_id,
                offer_id,
                status,
                cover_letter,
                candidate_name,
                candidate_email,
                field,
                experience_years,
                experience,
                education,
                work_preferences,
                preferred_location,
                work_mode
             )
             VALUES ($1, $2, 'postulado', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [
                userId,
                offerId,
                coverLetter,
                userProfile.name,
                userProfile.email,
                userProfile.field,
                userProfile.experience_years,
                userProfile.experience,
                userProfile.education,
                userProfile.work_preferences,
                userProfile.preferred_location,
                userProfile.work_mode
            ]
        );

        const newApplication = insertAppResult.rows[0];

        await client.query(
            `INSERT INTO application_status_history (application_id, status, note)
             VALUES ($1, 'postulado', 'Postulación asistida registrada exitosamente')`,
            [newApplication.id]
        );

        await client.query("COMMIT");

        return res.status(201).json({
            message: "¡Postulación enviada exitosamente!",
            application: newApplication,
            job: {
                id: job.id,
                title: job.title,
                company: job.company
            },
            candidate: {
                name: userProfile.name,
                email: userProfile.email,
                field: userProfile.field
            }
        });

    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rbError) {
                console.error("Error al revertir transacción:", rbError);
            }
        }

        console.error("Error en postulación asistida:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Ya te has postulado previamente a esta vacante",
                code: "DUPLICATE_APPLICATION"
            });
        }

        return res.status(500).json({
            message: "No fue posible procesar tu postulación. Intenta nuevamente más tarde"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
});

module.exports = router;