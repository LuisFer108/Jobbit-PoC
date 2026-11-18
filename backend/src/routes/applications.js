const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const { validateWorkProfileCompleteness } = require("../utils/profileValidation");

const router = express.Router();

const VALID_STATUSES = ["postulado", "en_revision", "aceptada", "rechazada", "aceptado", "rechazado"];
const VALID_WORK_MODES = ["remote", "hybrid", "onsite"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// LISTAR TODAS LAS POSTULACIONES DEL SISTEMA (Solo Administradores)
router.get("/all", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "No autorizado. Acceso restringido para administradores." });
        }

        const {
            status,
            offerId,
            workMode,
            minExperience,
            search,
            sortBy = "date_desc"
        } = req.query;

        const conditions = [];
        const params = [];

        // 1. Filtro por estado (manejando equivalencia aceptada/aceptado y rechazada/rechazado)
        if (status && status !== "all") {
            if (status === "aceptada" || status === "aceptado") {
                conditions.push(`a.status IN ('aceptada', 'aceptado')`);
            } else if (status === "rechazada" || status === "rechazado") {
                conditions.push(`a.status IN ('rechazada', 'rechazado')`);
            } else {
                params.push(status);
                conditions.push(`a.status = $${params.length}`);
            }
        }

        // 2. Filtro por vacante
        if (offerId && offerId !== "all") {
            const parsedOffer = parseInt(offerId, 10);
            if (!isNaN(parsedOffer) && parsedOffer > 0) {
                params.push(parsedOffer);
                conditions.push(`a.offer_id = $${params.length}`);
            }
        }

        // 3. Filtro por modalidad
        if (workMode && workMode !== "all" && VALID_WORK_MODES.includes(workMode)) {
            params.push(workMode);
            conditions.push(`a.work_mode = $${params.length}`);
        }

        // 4. Filtro por años mínimos de experiencia
        if (minExperience !== undefined && minExperience !== "" && minExperience !== null) {
            const parsedMinExp = parseInt(minExperience, 10);
            if (!isNaN(parsedMinExp) && parsedMinExp >= 0) {
                params.push(parsedMinExp);
                conditions.push(`COALESCE(a.experience_years, 0) >= $${params.length}`);
            }
        }

        // 5. Filtro de búsqueda por texto (candidato, correo, campo, título de vacante o empresa)
        if (typeof search === "string" && search.trim() !== "") {
            params.push(`%${search.trim()}%`);
            const idx = params.length;
            conditions.push(
                `(a.candidate_name ILIKE $${idx}
                  OR a.candidate_email ILIKE $${idx}
                  OR COALESCE(a.field, '') ILIKE $${idx}
                  OR j.title ILIKE $${idx}
                  OR COALESCE(j.company, '') ILIKE $${idx})`
            );
        }

        const whereClause = conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        // Ordenamiento por al menos 3 criterios: fecha (SCRUM-174), estado (SCRUM-175), experiencia y candidato
        let orderByClause = "COALESCE(a.updated_at, a.created_at) DESC, a.id DESC";
        switch (sortBy) {
            case "date_asc":
                orderByClause = "a.created_at ASC, a.id ASC";
                break;
            case "date_desc":
                orderByClause = "COALESCE(a.updated_at, a.created_at) DESC, a.id DESC";
                break;
            case "status_asc":
                orderByClause = `
                    CASE a.status
                        WHEN 'postulado' THEN 1
                        WHEN 'en_revision' THEN 2
                        WHEN 'aceptada' THEN 3
                        WHEN 'aceptado' THEN 3
                        WHEN 'rechazada' THEN 4
                        WHEN 'rechazado' THEN 4
                        ELSE 5
                    END ASC,
                    COALESCE(a.updated_at, a.created_at) DESC`;
                break;
            case "status_desc":
                orderByClause = `
                    CASE a.status
                        WHEN 'aceptada' THEN 1
                        WHEN 'aceptado' THEN 1
                        WHEN 'rechazada' THEN 2
                        WHEN 'rechazado' THEN 2
                        WHEN 'en_revision' THEN 3
                        WHEN 'postulado' THEN 4
                        ELSE 5
                    END ASC,
                    COALESCE(a.updated_at, a.created_at) DESC`;
                break;
            case "exp_desc":
                orderByClause = "COALESCE(a.experience_years, 0) DESC, a.created_at DESC";
                break;
            case "exp_asc":
                orderByClause = "COALESCE(a.experience_years, 0) ASC, a.created_at DESC";
                break;
            case "candidate_asc":
                orderByClause = "LOWER(COALESCE(a.candidate_name, '')) ASC, a.id DESC";
                break;
            default:
                orderByClause = "COALESCE(a.updated_at, a.created_at) DESC, a.id DESC";
                break;
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
                a.experience,
                a.education,
                a.work_preferences,
                a.preferred_location,
                a.work_mode,
                a.created_at,
                a.updated_at,
                j.title AS job_title,
                j.company AS job_company,
                j.location AS job_location
             FROM applications a
             JOIN job_offers j ON j.id = a.offer_id
             ${whereClause}
             ORDER BY ${orderByClause}`,
            params
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Error al obtener todas las postulaciones para admin:", error);
        res.status(500).json({ message: "Error al cargar las postulaciones" });
    }
});

// LISTAR CANDIDATOS PARA CREAR POSTULACIÓN DESDE ADMIN (SCRUM-28 / SCRUM-171)
router.get("/candidates", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "No autorizado. Acceso restringido para administradores." });
        }

        const result = await pool.query(
            `SELECT
                u.id AS user_id,
                u.name,
                u.email,
                wp.field,
                wp.experience_years,
                wp.experience,
                wp.education,
                wp.work_preferences,
                wp.preferred_location,
                wp.work_mode
             FROM users u
             LEFT JOIN work_profiles wp ON wp.user_id = u.id
             WHERE u.role = 'user'
             ORDER BY u.name ASC, u.id ASC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Error al listar candidatos para admin:", error);
        res.status(500).json({ message: "Error al cargar la lista de candidatos" });
    }
});

// CREAR POSTULACIÓN DESDE EL PANEL ADMINISTRATIVO (SCRUM-28 / SCRUM-171)
router.post("/admin", authenticateToken, async (req, res) => {
    let client;
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "No autorizado. Solo administradores pueden crear postulaciones aquí." });
        }

        const userId = parseInt(req.body.user_id, 10);
        const offerId = parseInt(req.body.offer_id, 10);
        const status = req.body.status || "postulado";

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({ message: "Debes seleccionar un candidato válido" });
        }
        if (!Number.isInteger(offerId) || offerId <= 0) {
            return res.status(400).json({ message: "Debes seleccionar una vacante válida" });
        }
        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({ message: "El estado seleccionado no es válido" });
        }

        // Consultar datos base del usuario y perfil por si algún campo viene vacío
        const userRes = await pool.query(
            `SELECT u.id, u.name, u.email,
                    wp.field, wp.experience_years, wp.experience, wp.education,
                    wp.work_preferences, wp.preferred_location, wp.work_mode
             FROM users u
             LEFT JOIN work_profiles wp ON wp.user_id = u.id
             WHERE u.id = $1`,
            [userId]
        );
        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: "El candidato seleccionado no existe" });
        }

        const jobRes = await pool.query(
            `SELECT id, title, company FROM job_offers WHERE id = $1`,
            [offerId]
        );
        if (jobRes.rows.length === 0) {
            return res.status(404).json({ message: "La vacante seleccionada no existe" });
        }

        const dupRes = await pool.query(
            `SELECT id FROM applications WHERE user_id = $1 AND offer_id = $2`,
            [userId, offerId]
        );
        if (dupRes.rows.length > 0) {
            return res.status(409).json({
                message: "Este candidato ya tiene una postulación registrada para esa vacante"
            });
        }

        const baseUser = userRes.rows[0];
        const candidateName = (req.body.candidate_name ?? baseUser.name ?? "").trim();
        const candidateEmail = (req.body.candidate_email ?? baseUser.email ?? "").trim().toLowerCase();
        const field = (req.body.field ?? baseUser.field ?? "General").trim();
        const rawExp = req.body.experience_years !== undefined && req.body.experience_years !== ""
            ? Number(req.body.experience_years)
            : (baseUser.experience_years ?? 0);

        if (!candidateName) {
            return res.status(400).json({ message: "El nombre del candidato es obligatorio" });
        }
        if (!candidateEmail || !EMAIL_REGEX.test(candidateEmail)) {
            return res.status(400).json({ message: "Ingresa un correo electrónico válido para el candidato" });
        }
        if (!field) {
            return res.status(400).json({ message: "El campo profesional es obligatorio" });
        }
        if (!Number.isInteger(rawExp) || rawExp < 0 || rawExp > 50) {
            return res.status(400).json({ message: "Los años de experiencia deben ser un número entero entre 0 y 50" });
        }

        const experience = (req.body.experience ?? baseUser.experience ?? "").trim();
        const education = (req.body.education ?? baseUser.education ?? "").trim();
        const workPreferences = (req.body.work_preferences ?? baseUser.work_preferences ?? "").trim();
        const preferredLocation = (req.body.preferred_location ?? baseUser.preferred_location ?? "").trim();
        const workMode = VALID_WORK_MODES.includes(req.body.work_mode)
            ? req.body.work_mode
            : (baseUser.work_mode || "hybrid");
        const coverLetter = typeof req.body.cover_letter === "string" ? req.body.cover_letter.trim() : "";

        client = await pool.connect();
        await client.query("BEGIN");

        const insertRes = await client.query(
            `INSERT INTO applications (
                user_id, offer_id, status, cover_letter,
                candidate_name, candidate_email, field, experience_years,
                experience, education, work_preferences, preferred_location, work_mode,
                created_at, updated_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING *`,
            [
                userId,
                offerId,
                status,
                coverLetter,
                candidateName,
                candidateEmail,
                field,
                rawExp,
                experience,
                education,
                workPreferences,
                preferredLocation,
                workMode
            ]
        );

        const createdApp = insertRes.rows[0];

        await client.query(
            `INSERT INTO application_status_history (application_id, status, note)
             VALUES ($1, $2, $3)`,
            [createdApp.id, status, "Postulación creada desde el panel administrativo"]
        );

        await client.query("COMMIT");

        return res.status(201).json({
            message: "Postulación creada exitosamente desde el panel administrativo",
            application: createdApp
        });
    } catch (error) {
        if (client) {
            try { await client.query("ROLLBACK"); } catch (rbErr) { console.error(rbErr); }
        }
        console.error("Error al crear postulación desde admin:", error);
        if (error.code === "23505") {
            return res.status(409).json({
                message: "Este candidato ya tiene una postulación registrada para esa vacante"
            });
        }
        return res.status(500).json({ message: "Error al crear la postulación" });
    } finally {
        if (client) client.release();
    }
});

// ACTUALIZAR EL ESTADO DE UNA POSTULACIÓN (Solo Administradores — SCRUM-167, SCRUM-170)
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

        if (!status || !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ message: "El nuevo estado es obligatorio y debe ser válido" });
        }

        client = await pool.connect();
        await client.query("BEGIN");

        const updateResult = await client.query(
            `UPDATE applications 
             SET status = $1,
                 updated_at = CURRENT_TIMESTAMP
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

// MODIFICAR DATOS COMPLETOS DE UNA POSTULACIÓN Y DEL USUARIO (SCRUM-165, SCRUM-166, SCRUM-167, SCRUM-169, SCRUM-170)
router.put("/:id", authenticateToken, async (req, res) => {
    let client;
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "No autorizado. Solo los administradores pueden modificar postulaciones." });
        }

        const applicationId = parseInt(req.params.id, 10);
        if (!Number.isInteger(applicationId) || applicationId <= 0) {
            return res.status(400).json({ message: "ID de postulación inválido" });
        }

        const {
            offer_id,
            status,
            candidate_name,
            candidate_email,
            field,
            experience_years,
            experience,
            education,
            work_preferences,
            preferred_location,
            work_mode,
            cover_letter,
            note,
            syncUserProfile = true
        } = req.body;

        const cleanName = typeof candidate_name === "string" ? candidate_name.trim() : "";
        const cleanEmail = typeof candidate_email === "string" ? candidate_email.trim().toLowerCase() : "";
        const cleanField = typeof field === "string" ? field.trim() : "";
        const parsedOfferId = parseInt(offer_id, 10);
        const parsedExp = experience_years !== undefined && experience_years !== "" && experience_years !== null
            ? Number(experience_years)
            : 0;

        if (!cleanName || cleanName.length < 2) {
            return res.status(400).json({ message: "El nombre del candidato es obligatorio (mínimo 2 caracteres)" });
        }
        if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
            return res.status(400).json({ message: "Ingresa un correo electrónico válido para el candidato" });
        }
        if (!cleanField) {
            return res.status(400).json({ message: "El campo profesional es obligatorio" });
        }
        if (!Number.isInteger(parsedExp) || parsedExp < 0 || parsedExp > 50) {
            return res.status(400).json({ message: "Los años de experiencia deben ser un número entero entre 0 y 50" });
        }
        if (!Number.isInteger(parsedOfferId) || parsedOfferId <= 0) {
            return res.status(400).json({ message: "La vacante seleccionada no es válida" });
        }
        if (!status || !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ message: "El estado de la postulación no es válido" });
        }
        if (work_mode && !VALID_WORK_MODES.includes(work_mode)) {
            return res.status(400).json({ message: "La modalidad de trabajo no es válida" });
        }

        client = await pool.connect();
        await client.query("BEGIN");

        const existingRes = await client.query(
            `SELECT * FROM applications WHERE id = $1`,
            [applicationId]
        );
        if (existingRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "La postulación que intentas modificar no existe" });
        }

        const currentApp = existingRes.rows[0];

        // Si cambió de vacante, verificar que la vacante exista y no haya duplicado para el mismo usuario
        if (parsedOfferId !== currentApp.offer_id) {
            const offerCheck = await client.query(`SELECT id FROM job_offers WHERE id = $1`, [parsedOfferId]);
            if (offerCheck.rows.length === 0) {
                await client.query("ROLLBACK");
                return res.status(404).json({ message: "La vacante seleccionada no existe" });
            }

            const dupCheck = await client.query(
                `SELECT id FROM applications WHERE user_id = $1 AND offer_id = $2 AND id <> $3`,
                [currentApp.user_id, parsedOfferId, applicationId]
            );
            if (dupCheck.rows.length > 0) {
                await client.query("ROLLBACK");
                return res.status(409).json({
                    message: "El candidato ya tiene otra postulación activa para la vacante seleccionada"
                });
            }
        }

        // Actualizar la postulación y registrar fecha de modificación updated_at (SCRUM-169, SCRUM-170)
        const updateRes = await client.query(
            `UPDATE applications
             SET offer_id = $1,
                 status = $2,
                 candidate_name = $3,
                 candidate_email = $4,
                 field = $5,
                 experience_years = $6,
                 experience = $7,
                 education = $8,
                 work_preferences = $9,
                 preferred_location = $10,
                 work_mode = $11,
                 cover_letter = $12,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $13
             RETURNING *`,
            [
                parsedOfferId,
                status,
                cleanName,
                cleanEmail,
                cleanField,
                parsedExp,
                typeof experience === "string" ? experience.trim() : "",
                typeof education === "string" ? education.trim() : "",
                typeof work_preferences === "string" ? work_preferences.trim() : "",
                typeof preferred_location === "string" ? preferred_location.trim() : "",
                work_mode || "hybrid",
                typeof cover_letter === "string" ? cover_letter.trim() : "",
                applicationId
            ]
        );

        const updatedApp = updateRes.rows[0];

        // Criterio de aceptación 2: "Debe permitir modificar datos de usuario de la base de datos"
        // Sincronizar también con la tabla users y work_profiles del candidato
        if (syncUserProfile && currentApp.user_id) {
            const emailConflict = await client.query(
                `SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2`,
                [cleanEmail, currentApp.user_id]
            );
            if (emailConflict.rows.length > 0) {
                await client.query("ROLLBACK");
                return res.status(409).json({
                    message: "El correo electrónico ingresado ya pertenece a otra cuenta de usuario"
                });
            }

            await client.query(
                `UPDATE users SET name = $1, email = $2 WHERE id = $3`,
                [cleanName, cleanEmail, currentApp.user_id]
            );

            await client.query(
                `UPDATE work_profiles
                 SET field = $1,
                     experience_years = $2,
                     experience = $3,
                     education = $4,
                     work_preferences = $5,
                     preferred_location = $6,
                     work_mode = $7,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $8`,
                [
                    cleanField,
                    parsedExp,
                    typeof experience === "string" ? experience.trim() : "",
                    typeof education === "string" ? education.trim() : "",
                    typeof work_preferences === "string" ? work_preferences.trim() : "",
                    typeof preferred_location === "string" ? preferred_location.trim() : "",
                    work_mode || "hybrid",
                    currentApp.user_id
                ]
            );
        }

        // Registrar trazabilidad y fecha de modificación en application_status_history (SCRUM-167, SCRUM-170)
        const historyNote = typeof note === "string" && note.trim()
            ? note.trim()
            : `Postulación modificada por administrador (estado: ${status})`;

        await client.query(
            `INSERT INTO application_status_history (application_id, status, note, changed_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
            [applicationId, status, historyNote]
        );

        await client.query("COMMIT");

        return res.json({
            message: "Postulación y datos del usuario actualizados correctamente en la base de datos",
            application: updatedApp
        });
    } catch (error) {
        if (client) {
            try { await client.query("ROLLBACK"); } catch (rbErr) { console.error(rbErr); }
        }
        console.error("Error al modificar postulación:", error);
        return res.status(500).json({ message: "Error al guardar los cambios de la postulación" });
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
                a.updated_at,
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
                a.updated_at,
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

// CREAR POSTULACIÓN ASISTIDA A UNA VACANTE (Candidato)
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
                work_mode,
                created_at,
                updated_at
             )
             VALUES ($1, $2, 'postulado', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
