
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "../components/LogoutButton";
import styles from "./page.module.css";

export default function ApplicationsPage() {
    const router = useRouter();

    const [applications, setApplications] = useState(null);
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
                const response = await fetch(
                    "http://localhost:5001/api/applications/my-applications",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem("token");
                    router.replace("/login");
                    return;
                }

                if (!response.ok) {
                    setError(
                        "No fue posible cargar tus postulaciones. Intenta nuevamente."
                    );
                    return;
                }

                const data = await response.json();
                setApplications(data);
            } catch {
                setError(
                    "Error de conexión. Revisa que el backend esté ejecutándose."
                );
            }
        }

        loadApplications();
    }, [router]);

    function modalidadTexto(mode) {
        switch (mode) {
            case "remote":
                return "Remoto";
            case "hybrid":
                return "Híbrido";
            case "onsite":
                return "Presencial";
            default:
                return "Modalidad no especificada";
        }
    }

    function badgeColor(status) {
        switch (status) {
            case "postulado":
                return styles.statusPostulado;
            case "en_revision":
                return styles.statusRevision;
            case "aceptado":
                return styles.statusAceptado;
            case "rechazado":
                return styles.statusRechazado;
            default:
                return styles.statusDefault;
        }
    }

    function estadoTexto(status) {
        switch (status) {
            case "postulado":
                return "Postulado";
            case "en_revision":
                return "En revisión";
            case "aceptado":
                return "Aceptado";
            case "rechazado":
                return "Rechazado";
            default:
                return status?.replaceAll("_", " ") || "Sin estado";
        }
    }

    function formatearFecha(value, includeTime = false) {
        if (!value) return "Fecha no disponible";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Fecha no disponible";
        }

        return date.toLocaleString("es-CO", {
            year: "numeric",
            month: "long",
            day: "numeric",
            ...(includeTime
                ? { hour: "2-digit", minute: "2-digit" }
                : {}),
        });
    }

    async function handleViewHistory(appId) {
        const token = localStorage.getItem("token");

        if (!token) {
            router.replace("/login");
            return;
        }

        setLoadingHistory(true);
        setError("");

        try {
            const response = await fetch(
                `http://localhost:5001/api/applications/${appId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem("token");
                router.replace("/login");
                return;
            }

            if (!response.ok) {
                alert("No se pudo cargar el historial de esta postulación.");
                return;
            }

            const data = await response.json();
            setSelectedHistory(data);
        } catch {
            alert("Error al conectar con el servidor.");
        } finally {
            setLoadingHistory(false);
        }
    }

    useEffect(() => {
        if (!selectedHistory) return;

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                setSelectedHistory(null);
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedHistory]);

    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.headingContent}>
                        <span className={styles.eyebrow}>
                            MI ACTIVIDAD PROFESIONAL
                        </span>

                        <h1 className={styles.title}>
                            Mis <span>postulaciones</span>
                        </h1>

                        <p className={styles.subtitle}>
                            Consulta el estado de tus postulaciones y revisa
                            cómo ha evolucionado cada proceso de selección.
                        </p>
                    </div>

                    <div className={styles.navigation}>
                        <Link href="/jobs" className={styles.backLink}>
                            <span aria-hidden="true">←</span>
                            Vacantes disponibles
                        </Link>

                        <Link href="/dashboard" className={styles.homeLink}>
                            Mi inicio
                        </Link>
                    </div>
                </header>

                {error && (
                    <div className={styles.errorNotice} role="alert">
                        <span className={styles.noticeIcon} aria-hidden="true">
                            !
                        </span>
                        <div>
                            <strong>No se pudieron cargar las postulaciones</strong>
                            <p>{error}</p>
                            <button
                                type="button"
                                className={styles.retryButton}
                                onClick={() => window.location.reload()}
                            >
                                Intentar nuevamente
                            </button>
                        </div>
                    </div>
                )}

                {!applications && !error && (
                    <div className={styles.loading}>
                        <span className={styles.spinner} aria-hidden="true" />
                        <p>Cargando tus postulaciones...</p>
                    </div>
                )}

                {applications && applications.length === 0 && (
                    <section className={styles.emptyState}>
                        <div className={styles.emptyIcon} aria-hidden="true">
                            <svg
                                viewBox="0 0 64 64"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <rect
                                    x="13"
                                    y="10"
                                    width="38"
                                    height="46"
                                    rx="7"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                />
                                <path
                                    d="M23 23H41M23 32H41M23 41H34"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M42 47L46 51L54 41"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>

                        <h2>Aún no tienes postulaciones</h2>

                        <p>
                            Cuando te postules a una vacante, podrás consultar
                            aquí su estado y hacer seguimiento al proceso.
                        </p>

                        <Link href="/jobs" className={styles.primaryButton}>
                            Explorar vacantes
                            <span aria-hidden="true">→</span>
                        </Link>
                    </section>
                )}

                {applications && applications.length > 0 && (
                    <section className={styles.applicationsSection}>
                        <div className={styles.sectionHeader}>
                            <div>
                                <h2>Tu actividad</h2>
                                <p>
                                    {applications.length === 1
                                        ? "Tienes 1 postulación registrada."
                                        : `Tienes ${applications.length} postulaciones registradas.`}
                                </p>
                            </div>

                            <span className={styles.countBadge}>
                                {applications.length}{" "}
                                {applications.length === 1
                                    ? "postulación"
                                    : "postulaciones"}
                            </span>
                        </div>

                        <ul className={styles.applicationsList}>
                            {applications.map((app) => (
                                <li key={app.id} className={styles.applicationCard}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.jobHeading}>
                                            <span className={styles.cardEyebrow}>
                                                VACANTE
                                            </span>
                                            <h3 className={styles.jobTitle}>
                                                {app.job_title ||
                                                    "Vacante sin título"}
                                            </h3>
                                            <p className={styles.company}>
                                                {app.job_company ||
                                                    "Empresa confidencial"}
                                            </p>
                                        </div>

                                        <span
                                            className={`${styles.statusBadge} ${badgeColor(app.status)}`}
                                        >
                                            <span
                                                className={styles.statusDot}
                                                aria-hidden="true"
                                            />
                                            {estadoTexto(app.status)}
                                        </span>
                                    </div>

                                    <div className={styles.jobMetadata}>
                                        <span className={styles.metaItem}>
                                            <span aria-hidden="true">⌖</span>
                                            {app.job_location ||
                                                "Ubicación por confirmar"}
                                        </span>

                                        <span className={styles.metaItem}>
                                            <span aria-hidden="true">◷</span>
                                            {modalidadTexto(app.job_work_mode)}
                                        </span>

                                        <span className={styles.metaItem}>
                                            <span aria-hidden="true">▤</span>
                                            Exp. mínima:{" "}
                                            {app.job_min_experience_years ?? 0}{" "}
                                            año(s)
                                        </span>
                                    </div>

                                    <div className={styles.applicationDate}>
                                        <span aria-hidden="true">↗</span>
                                        Postulado el{" "}
                                        {formatearFecha(app.created_at)}
                                    </div>

                                    {(app.field || app.candidate_name) && (
                                        <details className={styles.profileDetails}>
                                            <summary>
                                                <span aria-hidden="true">▣</span>
                                                Datos del perfil registrados
                                            </summary>

                                            <div className={styles.profileInfo}>
                                                <p>
                                                    <strong>Candidato:</strong>{" "}
                                                    {app.candidate_name ||
                                                        "No especificado"}
                                                    {app.candidate_email
                                                        ? ` (${app.candidate_email})`
                                                        : ""}
                                                </p>

                                                {app.field && (
                                                    <p>
                                                        <strong>Área:</strong>{" "}
                                                        {app.field}
                                                    </p>
                                                )}

                                                <p>
                                                    <strong>Experiencia:</strong>{" "}
                                                    {app.experience_years ?? 0}{" "}
                                                    año(s)
                                                </p>

                                                {app.education && (
                                                    <p>
                                                        <strong>Educación:</strong>{" "}
                                                        {app.education}
                                                    </p>
                                                )}

                                                {app.experience && (
                                                    <p>
                                                        <strong>
                                                            Experiencia descrita:
                                                        </strong>{" "}
                                                        {app.experience}
                                                    </p>
                                                )}

                                                {app.work_preferences && (
                                                    <p>
                                                        <strong>
                                                            Preferencias:
                                                        </strong>{" "}
                                                        {app.work_preferences}
                                                    </p>
                                                )}

                                                {app.work_mode && (
                                                    <p>
                                                        <strong>
                                                            Modalidad preferida:
                                                        </strong>{" "}
                                                        {modalidadTexto(app.work_mode)}
                                                    </p>
                                                )}
                                            </div>
                                        </details>
                                    )}

                                    {app.cover_letter && (
                                        <div className={styles.coverLetter}>
                                            <h4>
                                                <span aria-hidden="true">✉</span>
                                                Mensaje enviado
                                            </h4>
                                            <p>{app.cover_letter}</p>
                                        </div>
                                    )}

                                    <div className={styles.cardFooter}>
                                        <span className={styles.footerHint}>
                                            Consulta los cambios de estado de
                                            tu proceso.
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleViewHistory(app.id)
                                            }
                                            disabled={loadingHistory}
                                            className={styles.historyButton}
                                        >
                                            {loadingHistory ? (
                                                <>
                                                    <span
                                                        className={styles.buttonSpinner}
                                                        aria-hidden="true"
                                                    />
                                                    Cargando...
                                                </>
                                            ) : (
                                                <>
                                                    <span aria-hidden="true">
                                                        ◷
                                                    </span>
                                                    Ver historial
                                                    <span aria-hidden="true">
                                                        →
                                                    </span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <footer className={styles.footer}>
                    <span className={styles.footerBrand}>jobbit</span>
                    <p>Tu próximo paso profesional empieza aquí.</p>
                    <LogoutButton />
                </footer>
            </div>

            {selectedHistory && (
                <div
                    className={styles.modalOverlay}
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setSelectedHistory(null);
                        }
                    }}
                >
                    <section
                        className={styles.historyModal}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="history-modal-title"
                    >
                        <div className={styles.modalHeader}>
                            <div>
                                <span className={styles.eyebrow}>
                                    SEGUIMIENTO
                                </span>
                                <h2
                                    id="history-modal-title"
                                    className={styles.modalTitle}
                                >
                                    Historial de la postulación
                                </h2>
                            </div>

                            <button
                                type="button"
                                className={styles.closeButton}
                                onClick={() => setSelectedHistory(null)}
                                aria-label="Cerrar historial"
                            >
                                ×
                            </button>
                        </div>

                        <div className={styles.modalJobInfo}>
                            <span className={styles.modalLabel}>VACANTE</span>
                            <h3>
                                {selectedHistory.application?.job_title ||
                                    "Vacante sin título"}
                            </h3>
                            <p>
                                {selectedHistory.application?.job_company ||
                                    "Empresa confidencial"}
                            </p>
                        </div>

                        {selectedHistory.application && (
                            <>
                                <div className={styles.currentStatus}>
                                    <span>Estado actual</span>
                                    <span
                                        className={`${styles.statusBadge} ${badgeColor(
                                            selectedHistory.application.status
                                        )}`}
                                    >
                                        <span
                                            className={styles.statusDot}
                                            aria-hidden="true"
                                        />
                                        {estadoTexto(
                                            selectedHistory.application.status
                                        )}
                                    </span>
                                </div>

                                {selectedHistory.application.field && (
                                    <details className={styles.historyProfile}>
                                        <summary>
                                            Datos registrados en la postulación
                                        </summary>

                                        <div className={styles.profileInfo}>
                                            <p>
                                                <strong>Candidato:</strong>{" "}
                                                {selectedHistory.application
                                                    .candidate_name ||
                                                    "No especificado"}
                                                {selectedHistory.application
                                                    .candidate_email
                                                    ? ` (${selectedHistory.application.candidate_email})`
                                                    : ""}
                                            </p>

                                            <p>
                                                <strong>Área y experiencia:</strong>{" "}
                                                {selectedHistory.application.field}
                                                {" — "}
                                                {selectedHistory.application
                                                    .experience_years ?? 0}{" "}
                                                año(s)
                                            </p>

                                            {selectedHistory.application
                                                .education && (
                                                <p>
                                                    <strong>Educación:</strong>{" "}
                                                    {selectedHistory.application
                                                        .education}
                                                </p>
                                            )}

                                            {selectedHistory.application
                                                .experience && (
                                                <p>
                                                    <strong>
                                                        Detalle de experiencia:
                                                    </strong>{" "}
                                                    {selectedHistory.application
                                                        .experience}
                                                </p>
                                            )}
                                        </div>
                                    </details>
                                )}
                            </>
                        )}

                        <div className={styles.timelineSection}>
                            <h3>Línea de tiempo</h3>
                            <p className={styles.timelineSubtitle}>
                                Registro de los cambios de estado de tu
                                postulación.
                            </p>

                            {selectedHistory.history &&
                            selectedHistory.history.length > 0 ? (
                                <div className={styles.timeline}>
                                    {selectedHistory.history.map(
                                        (item, index) => (
                                            <div
                                                key={item.id || index}
                                                className={styles.timelineItem}
                                            >
                                                <span
                                                    className={
                                                        styles.timelineMarker
                                                    }
                                                    aria-hidden="true"
                                                />

                                                <div
                                                    className={
                                                        styles.timelineContent
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.timelineTitleRow
                                                        }
                                                    >
                                                        <strong>
                                                            {estadoTexto(
                                                                item.status
                                                            )}
                                                        </strong>

                                                        <span
                                                            className={`${styles.statusBadge} ${badgeColor(item.status)}`}
                                                        >
                                                            {estadoTexto(
                                                                item.status
                                                            )}
                                                        </span>
                                                    </div>

                                                    <p
                                                        className={
                                                            styles.timelineDate
                                                        }
                                                    >
                                                        {formatearFecha(
                                                            item.changed_at,
                                                            true
                                                        )}
                                                    </p>

                                                    {item.note && (
                                                        <p
                                                            className={
                                                                styles.timelineNote
                                                            }
                                                        >
                                                            {item.note}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            ) : (
                                <div className={styles.noHistory}>
                                    <span aria-hidden="true">◷</span>
                                    <p>
                                        No hay cambios adicionales registrados
                                        para esta postulación.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.closeModalButton}
                                onClick={() => setSelectedHistory(null)}
                            >
                                Cerrar
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </main>
    );
}
