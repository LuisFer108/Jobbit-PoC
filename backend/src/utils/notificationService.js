const pool = require("../db");
const { computeCompatibility } = require("./compatibility");
const { validateWorkProfileCompleteness } = require("./profileValidation");
const realtimeEmitter = require("./realtimeEmitter");

/**
 * Evalúa las vacantes activas para un candidato y genera notificaciones
 * para aquellas que superen el 90% de compatibilidad y aún no hayan sido notificadas.
 * @param {number} userId - ID del candidato
 */
async function syncNotificationsForUser(userId) {
    try {
        // 1. Obtener perfil del usuario
        const profileRes = await pool.query(
            "SELECT * FROM work_profiles WHERE user_id = $1",
            [userId]
        );
        if (profileRes.rows.length === 0) return [];

        const profile = profileRes.rows[0];
        const completeness = validateWorkProfileCompleteness(profile);
        if (!completeness.isComplete) return [];

        // 2. Obtener habilidades del usuario
        const skillsRes = await pool.query(
            "SELECT skill_id FROM profile_skills WHERE profile_id = $1",
            [profile.id]
        );
        const profileSkillIds = new Set(skillsRes.rows.map((r) => r.skill_id));

        // 3. Obtener vacantes activas a las que el usuario aún NO se ha postulado
        const offersRes = await pool.query(
            `SELECT j.*
             FROM job_offers j
             WHERE j.status = 'active'
               AND NOT EXISTS (
                   SELECT 1 FROM applications a
                   WHERE a.user_id = $1 AND a.offer_id = j.id
               )
             ORDER BY j.created_at DESC`,
            [userId]
        );
        if (offersRes.rows.length === 0) return [];

        // 4. Obtener habilidades de todas las vacantes
        const offerSkillsRes = await pool.query(
            `SELECT os.offer_id, os.skill_id, os.weight, os.requirement, s.name as skill_name
             FROM offer_skills os
             JOIN skills s ON s.id = os.skill_id`
        );
        const skillsByOffer = {};
        for (const row of offerSkillsRes.rows) {
            (skillsByOffer[row.offer_id] ||= []).push({
                skill_id: row.skill_id,
                name: row.skill_name,
                weight: row.weight,
                requirement: row.requirement
            });
        }

        // 5. Notificaciones ya existentes para no duplicar
        const existingNotifsRes = await pool.query(
            "SELECT offer_id FROM notifications WHERE user_id = $1 AND offer_id IS NOT NULL",
            [userId]
        );
        const notifiedOfferIds = new Set(existingNotifsRes.rows.map((r) => r.offer_id));

        const newlyCreated = [];

        for (const offer of offersRes.rows) {
            if (notifiedOfferIds.has(offer.id)) continue;

            const offerSkills = skillsByOffer[offer.id] || [];
            const { score } = computeCompatibility(profile, offer, offerSkills, profileSkillIds);

            // Requisito: vacante nueva con más del 90% de compatibilidad (> 90%)
            if (score > 90) {
                const companyName = offer.company ? offer.company.trim() : "Empresa confidencial";
                const message = `¡Encontramos una vacante con ${score}% de compatibilidad para ti! "${offer.title}" en ${companyName}. ¿Quieres aplicar?`;

                const insertRes = await pool.query(
                    `INSERT INTO notifications (user_id, offer_id, type, score, message, read)
                     VALUES ($1, $2, 'job_match', $3, $4, FALSE)
                     RETURNING *`,
                    [userId, offer.id, score, message]
                );

                const notifData = {
                    ...insertRes.rows[0],
                    job_title: offer.title,
                    job_company: companyName,
                    job_location: offer.location,
                    job_work_mode: offer.work_mode,
                    job_salary_range: offer.salary_range,
                    is_applied: false
                };

                newlyCreated.push(notifData);
                notifiedOfferIds.add(offer.id);

                realtimeEmitter.emit("notification", {
                    userId,
                    notification: notifData
                });
            }
        }

        return newlyCreated;
    } catch (error) {
        console.error("Error sincronizando notificaciones para usuario:", error);
        return [];
    }
}

/**
 * Notifica a todos los candidatos calificados cuando se publica una nueva vacante.
 * @param {number} offerId - ID de la vacante recién creada
 */
async function notifyCandidatesForNewOffer(offerId) {
    try {
        // 1. Obtener datos de la vacante
        const offerRes = await pool.query(
            "SELECT * FROM job_offers WHERE id = $1 AND status = 'active'",
            [offerId]
        );
        if (offerRes.rows.length === 0) return [];
        const offer = offerRes.rows[0];

        // 2. Obtener habilidades requeridas por la vacante
        const offerSkillsRes = await pool.query(
            `SELECT os.offer_id, os.skill_id, os.weight, os.requirement, s.name as skill_name
             FROM offer_skills os
             JOIN skills s ON s.id = os.skill_id
             WHERE os.offer_id = $1`,
            [offerId]
        );
        const offerSkills = offerSkillsRes.rows;

        // 3. Obtener todos los candidatos con perfil laboral
        const profilesRes = await pool.query(
            `SELECT wp.*, u.id AS user_id, u.name, u.email
             FROM work_profiles wp
             JOIN users u ON u.id = wp.user_id
             WHERE u.role = 'candidate'`
        );

        const notified = [];

        for (const profile of profilesRes.rows) {
            const completeness = validateWorkProfileCompleteness(profile);
            if (!completeness.isComplete) continue;

            // Verificar si ya aplicó o ya fue notificado
            const checkRes = await pool.query(
                `SELECT
                    (SELECT COUNT(*)::int FROM applications WHERE user_id = $1 AND offer_id = $2) AS applied,
                    (SELECT COUNT(*)::int FROM notifications WHERE user_id = $1 AND offer_id = $2) AS notified`,
                [profile.user_id, offerId]
            );

            if (checkRes.rows[0].applied > 0 || checkRes.rows[0].notified > 0) continue;

            // Habilidades del candidato
            const skillsRes = await pool.query(
                "SELECT skill_id FROM profile_skills WHERE profile_id = $1",
                [profile.id]
            );
            const profileSkillIds = new Set(skillsRes.rows.map((r) => r.skill_id));

            const { score } = computeCompatibility(profile, offer, offerSkills, profileSkillIds);

            if (score > 90) {
                const companyName = offer.company ? offer.company.trim() : "Empresa confidencial";
                const message = `¡Encontramos una vacante con ${score}% de compatibilidad para ti! "${offer.title}" en ${companyName}. ¿Quieres aplicar?`;

                const insertRes = await pool.query(
                    `INSERT INTO notifications (user_id, offer_id, type, score, message, read)
                     VALUES ($1, $2, 'job_match', $3, $4, FALSE)
                     RETURNING *`,
                    [profile.user_id, offerId, score, message]
                );

                const notifData = {
                    ...insertRes.rows[0],
                    job_title: offer.title,
                    job_company: companyName,
                    job_location: offer.location,
                    job_work_mode: offer.work_mode,
                    job_salary_range: offer.salary_range,
                    is_applied: false
                };

                notified.push({
                    userId: profile.user_id,
                    candidateName: profile.name,
                    score,
                    notification: notifData
                });

                realtimeEmitter.emit("notification", {
                    userId: profile.user_id,
                    notification: notifData
                });
            }
        }

        return notified;
    } catch (error) {
        console.error("Error notificando candidatos para vacante nueva:", error);
        return [];
    }
}

module.exports = {
    syncNotificationsForUser,
    notifyCandidatesForNewOffer
};
