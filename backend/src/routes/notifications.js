const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const { syncNotificationsForUser } = require("../utils/notificationService");
const realtimeEmitter = require("../utils/realtimeEmitter");

const router = express.Router();

// Mapa de conexiones activas en tiempo real: userId -> Set de respuestas SSE
const sseClients = new Map();

// Escuchar eventos globales de notificaciones emitidos por el servicio
realtimeEmitter.on("notification", ({ userId, notification }) => {
    const userConnections = sseClients.get(userId);
    if (userConnections && userConnections.size > 0) {
        const payload = `data: ${JSON.stringify(notification)}\n\n`;
        for (const res of userConnections) {
            try {
                res.write(payload);
            } catch (err) {
                console.error("Error enviando SSE:", err);
            }
        }
    }
});

// STREAM EN TIEMPO REAL VÍA SERVER-SENT EVENTS (SSE)
router.get("/stream", (req, res) => {
    const token = req.query.token || (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (!token) {
        return res.status(401).json({ message: "Token requerido para conexión en tiempo real" });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return res.status(401).json({ message: "Token inválido o expirado" });
    }

    const userId = decoded.userId;

    // Configurar cabeceras de Server-Sent Events
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (typeof res.flushHeaders === "function") {
        res.flushHeaders();
    }

    // Registrar conexión del usuario
    if (!sseClients.has(userId)) {
        sseClients.set(userId, new Set());
    }
    sseClients.get(userId).add(res);

    // Enviar evento de bienvenida/conexión establecida
    res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", userId })}\n\n`);

    // Heartbeat para mantener viva la conexión
    const heartbeat = setInterval(() => {
        try {
            res.write(": heartbeat\n\n");
        } catch {
            clearInterval(heartbeat);
        }
    }, 25000);

    req.on("close", () => {
        clearInterval(heartbeat);
        const connections = sseClients.get(userId);
        if (connections) {
            connections.delete(res);
            if (connections.size === 0) {
                sseClients.delete(userId);
            }
        }
    });
});

// OBTENER NOTIFICACIONES DEL CANDIDATO
// Sincroniza automáticamente cualquier vacante nueva con >90% de compatibilidad
router.get("/", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Sincronizar automáticamente vacantes de alta compatibilidad (>90%)
        await syncNotificationsForUser(userId);

        const result = await pool.query(
            `SELECT
                n.id,
                n.user_id,
                n.offer_id,
                n.type,
                n.score,
                n.message,
                n.read,
                n.created_at,
                j.title AS job_title,
                j.company AS job_company,
                j.location AS job_location,
                j.work_mode AS job_work_mode,
                j.salary_range AS job_salary_range,
                j.min_experience_years AS job_min_experience_years,
                j.description AS job_description,
                a.status AS application_status,
                (CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END) AS is_applied
             FROM notifications n
             LEFT JOIN job_offers j ON j.id = n.offer_id
             LEFT JOIN applications a ON a.offer_id = n.offer_id AND a.user_id = n.user_id
             WHERE n.user_id = $1
             ORDER BY n.created_at DESC
             LIMIT 50`,
            [userId]
        );

        const unreadCount = result.rows.filter((n) => !n.read).length;

        res.json({
            notifications: result.rows,
            unreadCount
        });
    } catch (error) {
        console.error("Error al obtener notificaciones:", error);
        res.status(500).json({ message: "Error al cargar las notificaciones" });
    }
});

// MARCAR UNA NOTIFICACIÓN COMO LEÍDA
router.put("/:id/read", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const notificationId = parseInt(req.params.id, 10);

        if (isNaN(notificationId)) {
            return res.status(400).json({ message: "ID de notificación inválido" });
        }

        const result = await pool.query(
            "UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *",
            [notificationId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Notificación no encontrada" });
        }

        res.json({ message: "Notificación marcada como leída", notification: result.rows[0] });
    } catch (error) {
        console.error("Error al marcar notificación como leída:", error);
        res.status(500).json({ message: "Error al actualizar la notificación" });
    }
});

// MARCAR TODAS LAS NOTIFICACIONES COMO LEÍDAS
router.put("/read-all", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        await pool.query(
            "UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE",
            [userId]
        );

        res.json({ message: "Todas las notificaciones marcadas como leídas" });
    } catch (error) {
        console.error("Error al marcar todas las notificaciones como leídas:", error);
        res.status(500).json({ message: "Error al actualizar las notificaciones" });
    }
});

// ELIMINAR / DESCARTAR UNA NOTIFICACIÓN
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const notificationId = parseInt(req.params.id, 10);

        if (isNaN(notificationId)) {
            return res.status(400).json({ message: "ID de notificación inválido" });
        }

        const result = await pool.query(
            "DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id",
            [notificationId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Notificación no encontrada" });
        }

        res.json({ message: "Notificación descartada" });
    } catch (error) {
        console.error("Error al descartar notificación:", error);
        res.status(500).json({ message: "Error al eliminar la notificación" });
    }
});

// FORZAR SINCRONIZACIÓN DE COMPATIBILIDAD
router.post("/sync", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const newNotifs = await syncNotificationsForUser(userId);
        res.json({
            message: "Sincronización completada",
            newNotificationsCount: newNotifs.length,
            created: newNotifs
        });
    } catch (error) {
        console.error("Error al sincronizar notificaciones:", error);
        res.status(500).json({ message: "Error al sincronizar notificaciones" });
    }
});

module.exports = router;
