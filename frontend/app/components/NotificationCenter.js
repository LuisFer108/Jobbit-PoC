"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./NotificationCenter.module.css";

export default function NotificationCenter() {
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [applyingId, setApplyingId] = useState(null);
    const [actionMessage, setActionMessage] = useState("");
    const [bannerNotif, setBannerNotif] = useState(null);
    const [browserPermission, setBrowserPermission] = useState("default");
    const dropdownRef = useRef(null);

    // Lanzar notificación nativa del sistema operativo a través del navegador
    function triggerNativeBrowserNotification(notif) {
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
                const score = Math.round(Number(notif.score) || 0);
                const title = `🎯 Jobbit: ¡Vacante compatible al ${score}%!`;
                const options = {
                    body: `"${notif.job_title}" en ${notif.job_company || "Empresa"}. ¿Quieres aplicar?`,
                    icon: "/Logo-jobbit.svg",
                    tag: `job-offer-${notif.offer_id}`,
                    requireInteraction: true
                };

                const nativeNotif = new Notification(title, options);

                nativeNotif.onclick = () => {
                    window.focus();
                    setBannerNotif(notif);
                    setIsOpen(true);
                    nativeNotif.close();
                };
            } catch (err) {
                console.error("Error mostrando notificación nativa:", err);
            }
        }
    }

    // Solicitar permiso al usuario para notificaciones nativas en el navegador
    async function requestBrowserPermission() {
        if (typeof window !== "undefined" && "Notification" in window) {
            try {
                const perm = await Notification.requestPermission();
                setBrowserPermission(perm);
                if (perm === "granted") {
                    // Notificación de confirmación amigable
                    new Notification("Jobbit Notificaciones Activas", {
                        body: "¡Listo! Te avisaremos al instante cada vez que aparezca una vacante con más del 90% de compatibilidad.",
                        icon: "/Logo-jobbit.svg"
                    });
                }
            } catch (err) {
                console.error("Error al solicitar permisos:", err);
            }
        }
    }

    // Cargar notificaciones iniciales
    async function fetchNotifications() {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) return;

        try {
            const res = await fetch("http://localhost:5001/api/notifications", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const list = data.notifications || [];
                setNotifications(list);
                setUnreadCount(data.unreadCount || 0);

                // Mostrar banner emergente ante una notificación de estado de postulación
                // o una vacante de alta compatibilidad no leída.
                const highlight = list.find(
                    (n) => !n.read && (n.type === "application_status" || (!n.is_applied && Number(n.score) > 90))
                );
                if (highlight) {
                    setBannerNotif(highlight);
                }
            }
        } catch (err) {
            console.error("Error al obtener notificaciones:", err);
        }
    }

    // Inicializar estado de permisos y canal en tiempo real SSE
    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            setBrowserPermission(Notification.permission);
        }

        fetchNotifications();

        // CONEXIÓN EN TIEMPO REAL VÍA SERVER-SENT EVENTS (SSE)
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        let eventSource = null;

        if (token) {
            eventSource = new EventSource(
                `http://localhost:5001/api/notifications/stream?token=${encodeURIComponent(token)}`
            );

            eventSource.onmessage = (event) => {
                try {
                    const newNotif = JSON.parse(event.data);
                    if (newNotif && newNotif.id) {
                        // Incorporar inmediatamente la nueva notificación
                        setNotifications((prev) => {
                            const exists = prev.some((n) => n.id === newNotif.id);
                            if (exists) return prev;
                            return [newNotif, ...prev];
                        });
                        setUnreadCount((c) => c + 1);

                        // Mostrar banner interactivo en pantalla
                        setBannerNotif(newNotif);

                        // Disparar la notificación real nativa en el navegador
                        triggerNativeBrowserNotification(newNotif);
                    }
                } catch (err) {
                    console.error("Error parseando notificación SSE:", err);
                }
            };

            eventSource.onerror = () => {
                // Si la conexión cae, el navegador reintenta reconectar automáticamente según estándar SSE
            };
        }

        // Intervalo de respaldo periódico cada 45 segundos
        const backupInterval = setInterval(fetchNotifications, 45000);

        return () => {
            if (eventSource) eventSource.close();
            clearInterval(backupInterval);
        };
    }, []);

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Marcar como leída
    async function markAsRead(id, e) {
        if (e) e.stopPropagation();
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            await fetch(`http://localhost:5001/api/notifications/${id}/read`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${token}` }
            });

            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n))
            );
            setUnreadCount((c) => Math.max(0, c - 1));

            if (bannerNotif && bannerNotif.id === id) {
                setBannerNotif(null);
            }
        } catch (err) {
            console.error("Error al marcar como leída:", err);
        }
    }

    // Marcar todas como leídas
    async function markAllAsRead() {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            await fetch("http://localhost:5001/api/notifications/read-all", {
                method: "PUT",
                headers: { "Authorization": `Bearer ${token}` }
            });

            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
            setBannerNotif(null);
        } catch (err) {
            console.error("Error marcando todas como leídas:", err);
        }
    }

    // Aplicar a la vacante directamente desde la notificación
    async function handleApply(notif, e) {
        if (e) e.stopPropagation();
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        setApplyingId(notif.id);
        setActionMessage("");

        try {
            const res = await fetch("http://localhost:5001/api/applications", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    offerId: notif.offer_id,
                    coverLetter: `Postulación motivada por notificación en tiempo real con ${Math.round(notif.score)}% de compatibilidad.`
                })
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.code === "PROFILE_INCOMPLETE" || data.code === "PROFILE_REQUIRED") {
                    setActionMessage("Debes completar tu perfil laboral antes de postularte.");
                    setTimeout(() => router.push("/profile/edit"), 1800);
                    return;
                }
                setActionMessage(data.message || "No fue posible realizar la postulación.");
                return;
            }

            // Éxito: marcar como leída y como aplicada
            await markAsRead(notif.id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === notif.id ? { ...n, is_applied: true, read: true } : n))
            );
            if (bannerNotif && bannerNotif.id === notif.id) {
                setBannerNotif(null);
            }
            setActionMessage(`¡Postulación enviada con éxito a "${notif.job_title}"!`);
            setTimeout(() => setActionMessage(""), 4000);
        } catch {
            setActionMessage("Error de conexión al enviar la postulación.");
        } finally {
            setApplyingId(null);
        }
    }

    return (
        <div className={styles.container} ref={dropdownRef}>
            {/* Botón de la campana */}
            <button
                type="button"
                className={styles.bellButton}
                onClick={() => setIsOpen(!isOpen)}
                aria-label={`Notificaciones ${unreadCount > 0 ? `(${unreadCount} no leídas)` : ""}`}
                title="Notificaciones en tiempo real"
            >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2Zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2Z"/>
                </svg>
                {unreadCount > 0 && (
                    <span className={styles.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
                )}
            </button>

            {/* Dropdown de notificaciones */}
            {isOpen && (
                <div className={styles.dropdown} role="dialog" aria-label="Notificaciones de vacantes en tiempo real">
                    <div className={styles.header}>
                        <div className={styles.headerTitle}>
                            <span>🔔 Notificaciones</span>
                            {unreadCount > 0 && (
                                <span className={styles.countBadge}>{unreadCount} nuevas</span>
                            )}
                        </div>
                        {notifications.length > 0 && unreadCount > 0 && (
                            <button
                                type="button"
                                className={styles.markAllButton}
                                onClick={markAllAsRead}
                            >
                                Marcar todas leídas
                            </button>
                        )}
                    </div>

                    {/* Banner de activación de notificaciones nativas del navegador */}
                    {browserPermission === "default" && (
                        <div className={styles.permissionBanner}>
                            <p className={styles.permissionText}>
                                📢 ¿Deseas recibir avisos flotantes en tu pantalla en tiempo real cuando surjan vacantes afines?
                            </p>
                            <button
                                type="button"
                                className={styles.permissionButton}
                                onClick={requestBrowserPermission}
                            >
                                Activar notificaciones del navegador
                            </button>
                        </div>
                    )}

                    {actionMessage && (
                        <div className={styles.actionAlert} role="status">
                            {actionMessage}
                        </div>
                    )}

                    <div className={styles.list}>
                        {notifications.length === 0 ? (
                            <div className={styles.empty}>
                                <p className={styles.emptyTitle}>Sin notificaciones pendientes</p>
                                <p className={styles.emptyText}>
                                    En cuanto se publique una vacante con más del 90% de afinidad, te avisaremos en tiempo real.
                                </p>
                            </div>
                        ) : (
                            notifications.map((n) => {
                                const scoreNum = Math.round(Number(n.score) || 0);
                                const isStatusNotif = n.type === "application_status";

                                // Notificación de cambio de estado de una postulación (SCRUM-28 flujo admin → candidato)
                                if (isStatusNotif) {
                                    return (
                                        <div
                                            key={n.id}
                                            className={`${styles.item} ${n.read ? styles.itemRead : styles.itemUnread}`}
                                        >
                                            <div className={styles.itemTop}>
                                                <span className={styles.scorePill}>
                                                    📋 Actualización de postulación
                                                </span>
                                                <span className={styles.itemDate}>
                                                    {new Date(n.created_at).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <p className={styles.itemCompany}>{n.message}</p>

                                            <div className={styles.itemActions}>
                                                <button
                                                    type="button"
                                                    className={styles.applyButton}
                                                    onClick={() => {
                                                        markAsRead(n.id);
                                                        setIsOpen(false);
                                                        router.push("/applications");
                                                    }}
                                                >
                                                    Ver mis postulaciones
                                                </button>

                                                {!n.read && (
                                                    <button
                                                        type="button"
                                                        className={styles.dismissButton}
                                                        onClick={(e) => markAsRead(n.id, e)}
                                                        title="Marcar como leída"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={n.id}
                                        className={`${styles.item} ${n.read ? styles.itemRead : styles.itemUnread}`}
                                    >
                                        <div className={styles.itemTop}>
                                            <span className={styles.scorePill}>
                                                🎯 {scoreNum}% compatible
                                            </span>
                                            <span className={styles.itemDate}>
                                                {new Date(n.created_at).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <h4 className={styles.itemJobTitle}>
                                            {n.job_title || "Vacante destacada"}
                                        </h4>
                                        <p className={styles.itemCompany}>
                                            {n.job_company || "Empresa"} · {n.job_location || "Colombia"} ({n.job_work_mode === "remote" ? "Remoto" : n.job_work_mode === "hybrid" ? "Híbrido" : "Presencial"})
                                        </p>

                                        {/* Pregunta clave: ¿Quieres aplicar? */}
                                        <div className={styles.questionBox}>
                                            <p className={styles.questionText}>
                                                ¿Quieres aplicar a esta vacante?
                                            </p>

                                            <div className={styles.itemActions}>
                                                {n.is_applied ? (
                                                    <span className={styles.appliedBadge}>
                                                        ✓ Ya te has postulado
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className={styles.applyButton}
                                                        onClick={(e) => handleApply(n, e)}
                                                        disabled={applyingId === n.id}
                                                    >
                                                        {applyingId === n.id ? "Postulando..." : "✓ Sí, aplicar"}
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className={styles.viewJobButton}
                                                    onClick={() => {
                                                        markAsRead(n.id);
                                                        setIsOpen(false);
                                                        router.push("/jobs");
                                                    }}
                                                >
                                                    Ver vacante
                                                </button>

                                                {!n.read && (
                                                    <button
                                                        type="button"
                                                        className={styles.dismissButton}
                                                        onClick={(e) => markAsRead(n.id, e)}
                                                        title="Marcar como leída"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Banner interactivo flotante en pantalla */}
            {bannerNotif && !isOpen && (
                bannerNotif.type === "application_status" ? (
                    <aside className={styles.toast} role="alert" aria-live="assertive">
                        <div className={styles.toastIcon}>📋</div>
                        <div className={styles.toastContent}>
                            <div className={styles.toastTitle}>
                                📋 Actualización en tus postulaciones
                            </div>
                            <p className={styles.toastDesc}>{bannerNotif.message}</p>
                            <div className={styles.toastButtons}>
                                <button
                                    type="button"
                                    className={styles.toastApply}
                                    onClick={() => {
                                        markAsRead(bannerNotif.id);
                                        router.push("/applications");
                                    }}
                                >
                                    Ver estado de mi postulación
                                </button>
                                <button
                                    type="button"
                                    className={styles.toastClose}
                                    onClick={() => markAsRead(bannerNotif.id)}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </aside>
                ) : (
                    <aside className={styles.toast} role="alert" aria-live="assertive">
                        <div className={styles.toastIcon}>🎯</div>
                        <div className={styles.toastContent}>
                            <div className={styles.toastTitle}>
                                ¡Vacante en tiempo real ({Math.round(bannerNotif.score)}% de afinidad)!
                            </div>
                            <p className={styles.toastDesc}>
                                <strong>{bannerNotif.job_title}</strong> en {bannerNotif.job_company}.
                            </p>
                            <p className={styles.toastQuestion}>¿Quieres aplicar ahora?</p>
                            <div className={styles.toastButtons}>
                                <button
                                    type="button"
                                    className={styles.toastApply}
                                    onClick={() => handleApply(bannerNotif)}
                                    disabled={applyingId === bannerNotif.id}
                                >
                                    {applyingId === bannerNotif.id ? "Postulando..." : "✓ Sí, aplicar"}
                                </button>
                                <button
                                    type="button"
                                    className={styles.toastDetails}
                                    onClick={() => {
                                        markAsRead(bannerNotif.id);
                                        router.push("/jobs");
                                    }}
                                >
                                    Ver vacante
                                </button>
                                <button
                                    type="button"
                                    className={styles.toastClose}
                                    onClick={() => markAsRead(bannerNotif.id)}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </aside>
                )
            )}
        </div>
    );
}
