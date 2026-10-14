"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "../components/LogoutButton";
import styles from "./page.module.css";

export default function JobsPage() {
    const router = useRouter();

    const [jobs, setJobs] = useState(null);
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState("");

    // Estados para la postulación asistida
    const [selectedJob, setSelectedJob] = useState(null);
    const [coverLetter, setCoverLetter] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [applyError, setApplyError] = useState("");
    const [showProfileWarning, setShowProfileWarning] = useState(false);
    const [confirmation, setConfirmation] = useState(null);

    // Cargar vacantes y perfil del usuario
    useEffect(() => {
        async function loadData() {
            const token = localStorage.getItem("token");

            if (!token) {
                router.replace("/login");
                return;
            }

            try {
                const [jobsRes, profileRes] = await Promise.all([
                    fetch("http://localhost:5001/api/jobs", {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }),
                    fetch("http://localhost:5001/api/profile", {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }),
                ]);

                // Si la sesión no es válida, volver al login
                if (
                    [401, 403].includes(jobsRes.status) ||
                    [401, 403].includes(profileRes.status)
                ) {
                    localStorage.removeItem("token");
                    router.replace("/login");
                    return;
                }

                if (!jobsRes.ok) {
                    setError(
                        "No pudimos cargar las vacantes. Intenta de nuevo en un momento."
                    );
                    return;
                }

                const jobsData = await jobsRes.json();
                setJobs(jobsData);

                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    setProfile(profileData);
                } else if (profileRes.status === 404) {
                    setProfile(null);
                } else {
                    setProfile(null);
                }
            } catch {
                setError(
                    "No pudimos conectarnos. Revisa tu conexión e intenta otra vez."
                );
            }
        }

        loadData();
    }, [router]);

    // Convertir la modalidad a un texto amigable
    function modalidadTexto(mode) {
        if (mode === "remote") return "Remoto";
        if (mode === "hybrid") return "Híbrido";
        if (mode === "onsite") return "Presencial";

        return "Modalidad no especificada";
    }

    // Verificar si el perfil laboral está completo
    function isProfileComplete() {
        if (!profile) return false;

        if (typeof profile.is_complete === "boolean") {
            return profile.is_complete;
        }

        // Validación de respaldo en el cliente
        const hasField = Boolean(
            profile.field && String(profile.field).trim()
        );

        const hasExpYears =
            profile.experience_years !== null &&
            profile.experience_years !== undefined &&
            profile.experience_years !== "";

        const hasExp = Boolean(
            profile.experience && String(profile.experience).trim()
        );

        const hasEdu = Boolean(
            profile.education && String(profile.education).trim()
        );

        return hasField && hasExpYears && hasExp && hasEdu;
    }

    // Abrir el flujo de postulación asistida
    function handleOpenApply(job) {
        setApplyError("");

        // Validar que el perfil laboral esté completo
        if (!profile || !isProfileComplete()) {
            setShowProfileWarning(true);
            return;
        }

        // Generar una carta de presentación inicial
        const defaultLetter = `Estimado equipo de selección de ${
            job.company || "la empresa"
        },

Presento mi postulación asistida a la vacante de ${job.title}. Cuento con experiencia en el campo de ${
            profile.field
        } (${profile.experience_years ?? 0} año(s) de experiencia) y formación en ${
            profile.education || "el área"
        }.

Quedo a su disposición para cualquier inquietud o entrevista.

Atentamente,
${profile.name || "Candidato"}`;

        setSelectedJob(job);
        setCoverLetter(defaultLetter);
    }

    // Enviar la postulación asistida
    async function handleConfirmApply(e) {
        e.preventDefault();

        if (!selectedJob || submitting) return;

        setSubmitting(true);
        setApplyError("");

        const token = localStorage.getItem("token");

        if (!token) {
            setSubmitting(false);
            router.replace("/login");
            return;
        }

        try {
            const response = await fetch(
                "http://localhost:5001/api/applications",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        offerId: selectedJob.id,
                        coverLetter: coverLetter,
                    }),
                }
            );

            const data = await response.json();

            // Manejar una postulación duplicada
            if (response.status === 409) {
                setApplyError(
                    data.message ||
                        "Ya te has postulado previamente a esta vacante."
                );

                setJobs((prevJobs) =>
                    prevJobs.map((job) =>
                        job.id === selectedJob.id
                            ? {
                                  ...job,
                                  application_status: "postulado",
                              }
                            : job
                    )
                );

                return;
            }

            if (!response.ok) {
                setApplyError(
                    data.message ||
                        "Ocurrió un error al enviar la postulación."
                );
                return;
            }

            // Actualizar el estado de la vacante en la lista
            setJobs((prevJobs) =>
                prevJobs.map((job) =>
                    job.id === selectedJob.id
                        ? {
                              ...job,
                              application_status:
                                  data.application.status,
                              application_id: data.application.id,
                              applied_at: data.application.created_at,
                          }
                        : job
                )
            );

            // Mostrar la confirmación de postulación
            setConfirmation({
                jobTitle: selectedJob.title,
                company: selectedJob.company || "Empresa",
                status: data.application.status,
                date: new Date().toLocaleDateString("es-ES"),
            });

            setSelectedJob(null);
        } catch {
            setApplyError(
                "No fue posible comunicarse con el servidor. Intenta de nuevo."
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className={styles.page}>
            <div className={styles.container}>
                {/* Encabezado */}
                <header className={styles.header}>
                    <p className={styles.eyebrow}>
                        Jobbit · Oportunidades laborales
                    </p>

                    <h1 className={styles.title}>
                        Vacantes disponibles
                    </h1>

                    <p className={styles.subtitle}>
                        Estas son las oportunidades que tenemos para ti
                        ahora mismo.
                    </p>
                </header>

                {/* Navegación */}
                <nav className={styles.navigation}>
                    <Link
                        href="/dashboard"
                        className={styles.backLink}
                    >
                        ← Volver a mi inicio
                    </Link>

                    <Link
                        href="/applications"
                        className={styles.applicationsLink}
                    >
                        📋 Ver mis postulaciones
                    </Link>
                </nav>

                {/* Aviso si el perfil está incompleto */}
                {profile !== null && !isProfileComplete() && (
                    <div className={`${styles.notice} ${styles.warningNotice}`}>
                        <strong className={styles.noticeTitle}>
                            ⚠️ Perfil laboral incompleto
                        </strong>

                        Para realizar postulaciones asistidas debes
                        tener tu perfil laboral completo: campo
                        profesional, experiencia, años de experiencia
                        y educación.

                        <div>
                            <Link
                                href="/profile/edit"
                                className={styles.noticeLink}
                            >
                                ✏️ Completar mi perfil laboral aquí →
                            </Link>
                        </div>
                    </div>
                )}

                {/* Aviso si todavía no existe un perfil */}
                {profile === null && jobs && (
                    <div className={`${styles.notice} ${styles.errorNotice}`}>
                        <strong className={styles.noticeTitle}>
                            ⚠️ Aún no has creado tu perfil laboral
                        </strong>

                        Debes crear tu perfil laboral para poder
                        postularte a las vacantes.

                        <div>
                            <Link
                                href="/profile"
                                className={styles.noticeLink}
                            >
                                Crear perfil laboral ahora →
                            </Link>
                        </div> 
                    </div>
                )}

                {/* Error al cargar vacantes */}
                {error && (
                    <p className={styles.errorMessage} role="alert">
                        {error}
                    </p>
                )}

                {/* Estado de carga */}
                {!jobs && !error && (
                    <p className={styles.loading} role="status">
                        Cargando vacantes...
                    </p>
                )}

                {/* No hay vacantes */}
                {jobs && jobs.length === 0 && (
                    <div className={styles.emptyMessage}>
                        <p>
                            Por ahora no hay vacantes publicadas.
                            ¡Vuelve pronto, estamos sumando nuevas!
                        </p>
                    </div>
                )}

                {/* Listado de vacantes */}
                {jobs && jobs.length > 0 && (
                    <ul className={styles.jobsList}>
                        {jobs.map((job) => (
                            <li
                                key={job.id}
                                className={`${styles.jobCard} ${
                                    job.application_status
                                        ? styles.jobCardApplied
                                        : ""
                                }`}
                            >
                                {/* Título y estado */}
                                <div className={styles.jobHeader}>
                                    <h2 className={styles.jobTitle}>
                                        {job.title}
                                    </h2>

                                    {job.application_status && (
                                        <span className={styles.statusBadge}>
                                            Estado:{" "}
                                            {job.application_status.toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                {/* Empresa */}
                                <p className={styles.company}>
                                    {job.company || "Empresa confidencial"}
                                </p>

                                {/* Descripción */}
                                <p className={styles.description}>
                                    {job.description}
                                </p>

                                {/* Información de la vacante */}
                                <div className={styles.metadata}>
                                    <span className={styles.metaItem}>
                                        📍{" "}
                                        {job.location ||
                                            "Ubicación por confirmar"}
                                    </span>

                                    <span className={styles.metaItem}>
                                        {modalidadTexto(job.work_mode)}
                                    </span>

                                    <span className={styles.metaItem}>
                                        Experiencia mínima:{" "}
                                        {job.min_experience_years ?? 0} año(s)
                                    </span>
                                </div>

                                {/* Acciones de postulación */}
                                <div className={styles.jobActions}>
                                    {job.application_status ? (
                                        <div className={styles.appliedInfo}>
                                            <button
                                                type="button"
                                                disabled
                                                className={styles.appliedButton}
                                            >
                                                ✓ Ya te has postulado
                                            </button>

                                            <span className={styles.appliedText}>
                                                Postulación registrada con éxito
                                            </span>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleOpenApply(job)
                                            }
                                            className={styles.button}
                                        >
                                            Postulación asistida →
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Modal: perfil incompleto */}
                {showProfileWarning && (
                    <div
                        className={styles.modalOverlay}
                        role="presentation"
                    >
                        <section
                            className={styles.modal}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="profileWarningTitle"
                        >
                            <h2
                                id="profileWarningTitle"
                                className={`${styles.modalTitle} ${styles.warningTitle}`}
                            >
                                Perfil laboral incompleto
                            </h2>

                            <p className={styles.modalDescription}>
                                Para realizar una{" "}
                                <strong>postulación asistida</strong>, el
                                sistema requiere que tu perfil laboral
                                contenga información profesional completa.
                            </p>

                            <p className={styles.helpText}>
                                Revisa que hayas diligenciado: campo
                                profesional, experiencia, años de experiencia
                                y educación.
                            </p>

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowProfileWarning(false)
                                    }
                                    className={styles.secondaryButton}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowProfileWarning(false);
                                        router.push(
                                            profile
                                                ? "/profile/edit"
                                                : "/profile"
                                        );
                                    }}
                                    className={styles.button}
                                >
                                    Completar mi perfil ahora
                                </button>
                            </div>
                        </section>
                    </div>
                )}

                {/* Modal: postulación asistida */}
                {selectedJob && profile && (
                    <div
                        className={styles.modalOverlay}
                        role="presentation"
                    >
                        <section
                            className={`${styles.modal} ${styles.applyModal}`}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="applyModalTitle"
                        >
                            <h2
                                id="applyModalTitle"
                                className={styles.modalTitle}
                            >
                                Postulación asistida
                            </h2>

                            <p className={styles.modalDescription}>
                                Vacante:{" "}
                                <strong>{selectedJob.title}</strong>
                                {" · "}
                                {selectedJob.company || "Empresa"}
                            </p>

                            {/* Resumen del perfil */}
                            <div className={styles.profileSummary}>
                                <h3 className={styles.summaryTitle}>
                                    👤 Información de tu perfil que se adjuntará
                                </h3>

                                <ul className={styles.profileDetails}>
                                    <li>
                                        <strong>Nombre:</strong>{" "}
                                        {profile.name || "No especificado"}
                                        {profile.email
                                            ? ` (${profile.email})`
                                            : ""}
                                    </li>

                                    <li>
                                        <strong>Campo laboral:</strong>{" "}
                                        {profile.field}
                                    </li>

                                    <li>
                                        <strong>Experiencia:</strong>{" "}
                                        {profile.experience_years} año(s)
                                        {" — "}
                                        {profile.experience}
                                    </li>

                                    <li>
                                        <strong>Educación:</strong>{" "}
                                        {profile.education}
                                    </li>

                                    {profile.work_preferences && (
                                        <li>
                                            <strong>Preferencias:</strong>{" "}
                                            {profile.work_preferences}
                                        </li>
                                    )}

                                    {profile.work_mode && (
                                        <li>
                                            <strong>Modalidad preferida:</strong>{" "}
                                            {modalidadTexto(profile.work_mode)}
                                        </li>
                                    )}
                                </ul>
                            </div>

                            {/* Carta de presentación */}
                            <form
                                onSubmit={handleConfirmApply}
                                className={styles.form}
                            >
                                <label
                                    htmlFor="coverLetter"
                                    className={styles.label}
                                >
                                    Carta / Mensaje de presentación asistido
                                </label>

                                <p className={styles.helpText}>
                                    Jobbit generó este texto con base en tu
                                    perfil. Puedes personalizarlo antes de
                                    enviar.
                                </p>

                                <textarea
                                    id="coverLetter"
                                    rows={6}
                                    value={coverLetter}
                                    onChange={(e) =>
                                        setCoverLetter(e.target.value)
                                    }
                                    className={styles.textarea}
                                    required
                                />

                                {/* Error al enviar la postulación */}
                                {applyError && (
                                    <p
                                        className={styles.applyError}
                                        role="alert"
                                    >
                                        {applyError}
                                    </p>
                                )}

                                <div className={styles.modalActions}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!submitting) {
                                                setSelectedJob(null);
                                                setApplyError("");
                                            }
                                        }}
                                        disabled={submitting}
                                        className={styles.secondaryButton}
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className={styles.button}
                                    >
                                        {submitting
                                            ? "Enviando postulación..."
                                            : "Confirmar y postularme"}
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                )}

                {/* Modal: confirmación de postulación */}
                {confirmation && (
                    <div
                        className={styles.modalOverlay}
                        role="presentation"
                    >
                        <section
                            className={`${styles.modal} ${styles.confirmationModal}`}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="confirmationTitle"
                        >
                            <div className={styles.confirmationIcon}>
                                🎉
                            </div>

                            <h2
                                id="confirmationTitle"
                                className={styles.confirmationTitle}
                            >
                                ¡Postulación confirmada!
                            </h2>

                            <p className={styles.confirmationText}>
                                Te has postulado exitosamente a la vacante de{" "}
                                <strong>{confirmation.jobTitle}</strong> en{" "}
                                <strong>{confirmation.company}</strong>.
                            </p>

                            <div className={styles.confirmationDetails}>
                                <p>
                                    <strong>Estado actual:</strong>{" "}
                                    <span className={styles.confirmationStatus}>
                                        {confirmation.status.toUpperCase()}
                                    </span>
                                </p>

                                <p>
                                    <strong>Fecha:</strong>{" "}
                                    {confirmation.date}
                                </p>
                            </div>

                            <p className={styles.confirmationNote}>
                                Tu perfil laboral fue compartido con los
                                reclutadores. Puedes consultar el progreso
                                en la sección de postulaciones.
                            </p>

                            <div className={styles.confirmationActions}>
                                <button
                                    type="button"
                                    onClick={() => setConfirmation(null)}
                                    className={styles.secondaryButton}
                                >
                                    Seguir viendo vacantes
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setConfirmation(null);
                                        router.push("/applications");
                                    }}
                                    className={styles.button}
                                >
                                    Ver mis postulaciones
                                </button>
                            </div>
                        </section>
                    </div>
                )}

                {/* Cerrar sesión */}
                <footer className={styles.footer}>
                    <LogoutButton />
                </footer>
            </div>
        </main>
    );
}
