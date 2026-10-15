"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LogoutButton from "../components/LogoutButton";
import styles from "./page.module.css";

export default function ApplicationsPage() {
    const router = useRouter();

    const [applications, setApplications] = useState(null); // null = cargando
    const [error, setError] = useState("");
    const [selectedHistory, setSelectedHistory] = useState(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        async function loadApplications() {
            const token = localStorage.getItem("token");

            if (!token) {
                router.replace("/login");
                return;
            }

            try {
                const response = await fetch("http://localhost:5001/api/applications/my-applications", {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });

                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem("token");
                    router.replace("/login");
                    return;
                }

                if (!response.ok) {
                    setError("No fue posible cargar tus postulaciones. Intenta nuevamente.");
                    return;
                }

                const data = await response.json();
                setApplications(data);
            } catch {
                setError("Error de conexión. Revisa que el backend esté ejecutándose.");
            }
        }

        loadApplications();
    }, [router]);

    // Modalidad amigable
    function modalidadTexto(mode) {
        if (mode === "remote") return "Remoto";
        if (mode === "hybrid") return "Híbrido";
        if (mode === "onsite") return "Presencial";
        return "Modalidad no especificada";
    }

    // Color del badge según estado
    function badgeColor(status) {
        switch (status) {
            case "postulado":
                return { bg: "#e0f2fe", color: "#0369a1", border: "#7dd3fc" };
            case "en_revision":
                return { bg: "#fef3c7", color: "#b45309", border: "#fcd34d" };
            case "aceptado":
                return { bg: "#dcfce7", color: "#15803d", border: "#86efac" };
            case "rechazado":
                return { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5" };
            default:
                return { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" };
        }
    }

    // Cargar historial de cambios de estado de una postulación
    async function handleViewHistory(appId) {
        setLoadingHistory(true);
        const token = localStorage.getItem("token");

        try {
            const response = await fetch(`http://localhost:5001/api/applications/${appId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSelectedHistory(data);
            } else {
                alert("No se pudo cargar el historial de esta postulación.");
            }
        } catch {
            alert("Error al conectar con el servidor.");
        } finally {
            setLoadingHistory(false);
        }
    }

    // Estilo dinámico del badge de estado
    function badgeStyle(status) {
        const c = badgeColor(status);
        return { backgroundColor: c.bg, color: c.color, borderColor: c.border };
    }

    // ===== PRESENTACIÓN NUEVA =====
    return (
        <main className={styles.page}>
            <div className={styles.card}>
                <header className={styles.topbar}>
                    <div className={styles.brand}>
                        <Image src="/Logo-jobbit.svg" alt="Jobbit" width={130} height={40} priority unoptimized />
                    </div>
                    <div className={styles.topbarTitle}>
                        <span className={styles.userIcon} aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                                <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6Z"/>
                            </svg>
                        </span>
                        Postulaciones
                    </div>
                </header>

                <div className={styles.body}>
                    <h1 className={styles.welcome}>Mis postulaciones</h1>
                    <p className={styles.subtitle}>
                        Consulta aquí el estado en tiempo real de todas tus postulaciones a vacantes laborales.
                    </p>

                    <nav className={styles.nav}>
                        <Link href="/jobs" className={styles.link}>← Volver a vacantes disponibles</Link>
                        <Link href="/dashboard" className={styles.link}>Ir a mi inicio</Link>
                    </nav>

                    {error && <p role="status" className={styles.message}>{error}</p>}

                    {/* Estado: cargando */}
                    {!applications && !error && <p className={styles.loading}>Cargando tus postulaciones...</p>}

                    {/* Estado: sin postulaciones */}
                    {applications && applications.length === 0 && (
                        <div className={styles.empty}>
                            <p>Aún no te has postulado a ninguna vacante.</p>
                            <Link href="/jobs" className={styles.primaryButton}>
                                Explorar vacantes disponibles
                            </Link>
                        </div>
                    )}

                    {/* Listado de postulaciones */}
                    {applications && applications.length > 0 && (
                        <ul className={styles.list}>
                            {applications.map((app) => {
                                const fecha = new Date(app.created_at).toLocaleDateString("es-ES", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric"
                                });

                                return (
                                    <li key={app.id} className={styles.appCard}>
                                        <div className={styles.appHeader}>
                                            <h2 className={styles.appTitle}>{app.job_title}</h2>
                                            <span className={styles.badge} style={badgeStyle(app.status)}>
                                                Estado: {app.status.toUpperCase()}
                                            </span>
                                        </div>

                                        <p className={styles.company}>
                                            {app.job_company || "Empresa confidencial"}
                                        </p>

                                        <p className={styles.meta}>
                                            📍 {app.job_location || "Ubicación por confirmar"} ·
                                            {" "}{modalidadTexto(app.job_work_mode)} ·
                                            {" "}Exp. mínima: {app.job_min_experience_years ?? 0} año(s)
                                        </p>

                                        <p className={styles.meta}>📅 Postulado el {fecha}</p>

                                        {(app.field || app.candidate_name) && (
                                            <div className={`${styles.box} ${styles.profileBox}`}>
                                                <strong>📋 Datos del perfil registrados en la postulación:</strong>
                                                <p>
                                                    <strong>Candidato:</strong> {app.candidate_name} ({app.candidate_email}) · <strong>Área:</strong> {app.field} · <strong>Experiencia:</strong> {app.experience_years ?? 0} año(s)
                                                </p>
                                                {app.education && (
                                                    <p><strong>Educación:</strong> {app.education}</p>
                                                )}
                                                {app.experience && (
                                                    <p><strong>Experiencia descrita:</strong> {app.experience}</p>
                                                )}
                                                {app.work_preferences && (
                                                    <p><strong>Preferencias:</strong> {app.work_preferences}</p>
                                                )}
                                                {app.work_mode && (
                                                    <p><strong>Modalidad preferida:</strong> {modalidadTexto(app.work_mode)}</p>
                                                )}
                                            </div>
                                        )}

                                        {app.cover_letter && (
                                            <div className={`${styles.box} ${styles.letterBox}`}>
                                                <strong>Mensaje / Carta enviada:</strong>
                                                <p>{app.cover_letter}</p>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleViewHistory(app.id)}
                                            disabled={loadingHistory}
                                            className={styles.secondaryButton}
                                        >
                                            🔍 Ver trazabilidad / historial de estado
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    <div className={styles.logout}>
                        <LogoutButton />
                    </div>
                </div>
            </div>

            {/* MODAL: Historial de estados de la postulación */}
            {selectedHistory && (
                <div className={styles.overlay}>
                    <div className={styles.modal}>
                        <h2 className={styles.modalTitle}>Historial de la postulación</h2>
                        <p className={styles.meta}>
                            Vacante: <strong>{selectedHistory.application.job_title}</strong> ({selectedHistory.application.job_company})
                        </p>

                        <p>
                            <strong>Estado actual:</strong>{" "}
                            <span className={styles.badge} style={badgeStyle(selectedHistory.application.status)}>
                                {selectedHistory.application.status.toUpperCase()}
                            </span>
                        </p>

                        {selectedHistory.application.field && (
                            <div className={`${styles.box} ${styles.letterBox}`}>
                                <strong>Datos registrados en la postulación:</strong>
                                <p>
                                    <strong>Candidato:</strong> {selectedHistory.application.candidate_name} ({selectedHistory.application.candidate_email})
                                </p>
                                <p>
                                    <strong>Área y experiencia:</strong> {selectedHistory.application.field} — {selectedHistory.application.experience_years ?? 0} año(s)
                                </p>
                                {selectedHistory.application.education && (
                                    <p><strong>Educación:</strong> {selectedHistory.application.education}</p>
                                )}
                                {selectedHistory.application.experience && (
                                    <p><strong>Detalle de experiencia:</strong> {selectedHistory.application.experience}</p>
                                )}
                            </div>
                        )}

                        <h3 className={styles.timelineTitle}>Línea de tiempo de estados:</h3>
                        <div className={styles.timeline}>
                            {selectedHistory.history && selectedHistory.history.length > 0 ? (
                                selectedHistory.history.map((item, idx) => (
                                    <div key={item.id || idx} className={styles.timelineItem}>
                                        <strong>Estado: {item.status.toUpperCase()}</strong>
                                        <span className={styles.timelineDate}>
                                            {new Date(item.changed_at).toLocaleString("es-ES")}
                                        </span>
                                        {item.note && <span>Nota: {item.note}</span>}
                                    </div>
                                ))
                            ) : (
                                <p className={styles.meta}>Sin cambios adicionales registrados.</p>
                            )}
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                onClick={() => setSelectedHistory(null)}
                                className={styles.primaryButton}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
