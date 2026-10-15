"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LogoutButton from "../components/LogoutButton";
import styles from "./page.module.css";

export default function JobsPage() {
    const router = useRouter();

    const [jobs, setJobs] = useState(null);   // null = cargando
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState("");

    // Estados para la postulación asistida
    const [selectedJob, setSelectedJob] = useState(null);
    const [coverLetter, setCoverLetter] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [applyError, setApplyError] = useState("");
    const [showProfileWarning, setShowProfileWarning] = useState(false);
    const [confirmation, setConfirmation] = useState(null);

    useEffect(() => {
        async function loadData() {
            const token = localStorage.getItem("token");

            // Vacantes solo con sesión iniciada
            if (!token) {
                router.replace("/login");
                return;
            }

            try {
                // Cargar vacantes y perfil en paralelo
                const [jobsRes, profileRes] = await Promise.all([
                    fetch("http://localhost:5001/api/jobs", {
                        headers: { "Authorization": `Bearer ${token}` }
                    }),
                    fetch("http://localhost:5001/api/profile", {
                        headers: { "Authorization": `Bearer ${token}` }
                    })
                ]);

                if (jobsRes.status === 401 || jobsRes.status === 403 || profileRes.status === 401 || profileRes.status === 403) {
                    localStorage.removeItem("token");
                    router.replace("/login");
                    return;
                }

                if (!jobsRes.ok) {
                    setError("No pudimos cargar las vacantes. Intenta de nuevo en un momento.");
                    return;
                }

                const jobsData = await jobsRes.json();
                setJobs(jobsData);

                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    setProfile(profileData);
                } else if (profileRes.status === 404) {
                    setProfile(null);
                }
            } catch {
                setError("No pudimos conectarnos. Revisa tu conexión e intenta otra vez.");
            }
        }

        loadData();
    }, [router]);

    // Modalidad en texto amigable (sin tecnicismos)
    function modalidadTexto(mode) {
        if (mode === "remote") return "Remoto";
        if (mode === "hybrid") return "Híbrido";
        if (mode === "onsite") return "Presencial";
        return "Modalidad no especificada";
    }

    // Verificar si el perfil está completo
    function isProfileComplete() {
        if (!profile) return false;
        if (typeof profile.is_complete === "boolean") return profile.is_complete;
        // Validación de respaldo en cliente
        const hasField = Boolean(profile.field && String(profile.field).trim());
        const hasExpYears = profile.experience_years !== null && profile.experience_years !== undefined && profile.experience_years !== "";
        const hasExp = Boolean(profile.experience && String(profile.experience).trim());
        const hasEdu = Boolean(profile.education && String(profile.education).trim());
        return hasField && hasExpYears && hasExp && hasEdu;
    }

    // Abrir flujo de postulación asistida
    function handleOpenApply(job) {
        setApplyError("");

        // 1. Validar que el usuario tenga perfil laboral completo antes de una postulación
        if (!profile || !isProfileComplete()) {
            setShowProfileWarning(true);
            return;
        }

        // Generar carta de presentación asistida por defecto utilizando los datos del perfil
        const defaultLetter = `Estimado equipo de selección de ${job.company || "la empresa"},\n\nPresento mi postulación asistida a la vacante de ${job.title}. Cuento con experiencia en el campo de ${profile.field} (${profile.experience_years ?? 0} año(s) de experiencia) y formación en ${profile.education || "el área"}.\n\nQuedo a su disposición para cualquier inquietud o entrevista.\n\nAtentamente,\n${profile.name || "Candidato"}`;

        setSelectedJob(job);
        setCoverLetter(defaultLetter);
    }

    // Enviar la postulación asistida
    async function handleConfirmApply(e) {
        e.preventDefault();
        if (!selectedJob) return;

        setSubmitting(true);
        setApplyError("");

        const token = localStorage.getItem("token");
        if (!token) {
            router.replace("/login");
            return;
        }

        try {
            const response = await fetch("http://localhost:5001/api/applications", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    offerId: selectedJob.id,
                    coverLetter: coverLetter
                })
            });

            const data = await response.json();

            if (response.status === 409) {
                // Postulación duplicada detectada
                setApplyError(data.message || "Ya te has postulado previamente a esta vacante.");
                // Actualizar la lista para reflejar que ya está postulado
                setJobs(prevJobs =>
                    prevJobs.map(j =>
                        j.id === selectedJob.id ? { ...j, application_status: "postulado" } : j
                    )
                );
                return;
            }

            if (!response.ok) {
                setApplyError(data.message || "Ocurrió un error al enviar la postulación.");
                return;
            }

            // Actualizar el estado de la vacante en la lista local para evitar duplicados
            setJobs(prevJobs =>
                prevJobs.map(j =>
                    j.id === selectedJob.id
                        ? { ...j, application_status: data.application.status, application_id: data.application.id, applied_at: data.application.created_at }
                        : j
                )
            );

            // Mostrar confirmación de postulación
            setConfirmation({
                jobTitle: selectedJob.title,
                company: selectedJob.company || "Empresa",
                status: data.application.status,
                date: new Date().toLocaleDateString("es-ES")
            });

            setSelectedJob(null);
        } catch {
            setApplyError("No fue posible comunicarse con el servidor. Intenta de nuevo.");
        } finally {
            setSubmitting(false);
        }
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
                        Vacantes
                    </div>
                </header>

                <div className={styles.body}>
                    <h1 className={styles.welcome}>Vacantes disponibles</h1>
                    <p className={styles.subtitle}>Estas son las oportunidades que tenemos para ti ahora mismo.</p>

                    <nav className={styles.nav}>
                        <Link href="/dashboard" className={styles.link}>← Volver a mi inicio</Link>
                        <Link href="/applications" className={styles.link}>📋 Ver mis postulaciones</Link>
                    </nav>

                    {/* Aviso si el perfil laboral está incompleto */}
                    {profile !== null && !isProfileComplete() && (
                        <div className={`${styles.notice} ${styles.warningNotice}`}>
                            <strong>⚠️ Perfil laboral incompleto:</strong> Para realizar postulaciones asistidas debes tener tu perfil laboral completo (campo profesional, experiencia, años de experiencia y educación).
                            <div>
                                <Link href="/profile/edit" className={styles.noticeLink}>
                                    ✏️ Completar mi perfil laboral aquí →
                                </Link>
                            </div>
                        </div>
                    )}

                    {profile === null && jobs && (
                        <div className={`${styles.notice} ${styles.errorNotice}`}>
                            <strong>⚠️ Aún no has creado tu perfil laboral:</strong> Debes crearlo para postularte a las vacantes.
                            <div>
                                <Link href="/profile" className={styles.noticeLink}>
                                    Crear perfil laboral ahora →
                                </Link>
                            </div>
                        </div>
                    )}

                    {error && <p role="status" className={styles.message}>{error}</p>}

                    {/* Estado: cargando */}
                    {!jobs && !error && <p className={styles.loading}>Cargando vacantes...</p>}

                    {/* Estado: no hay vacantes (lista vacía) */}
                    {jobs && jobs.length === 0 && (
                        <div className={styles.empty}>
                            <p>Por ahora no hay vacantes publicadas. ¡Vuelve pronto, estamos sumando nuevas!</p>
                        </div>
                    )}

                    {/* Listado de vacantes (SCRUM-65 / SCRUM-66) */}
                    {jobs && jobs.length > 0 && (
                        <ul className={styles.list}>
                            {jobs.map((job) => (
                                <li
                                    key={job.id}
                                    className={`${styles.jobCard} ${job.application_status ? styles.jobCardApplied : ""}`}
                                >
                                    <div className={styles.jobHeader}>
                                        <h2 className={styles.jobTitle}>{job.title}</h2>
                                        {job.application_status && (
                                            <span className={styles.statusBadge}>
                                                Estado: {job.application_status.toUpperCase()}
                                            </span>
                                        )}
                                    </div>

                                    <p className={styles.company}>{job.company || "Empresa confidencial"}</p>
                                    <p className={styles.description}>{job.description}</p>
                                    <p className={styles.meta}>
                                        📍 {job.location || "Ubicación por confirmar"} ·
                                        {" "}{modalidadTexto(job.work_mode)} ·
                                        {" "}Experiencia mínima: {job.min_experience_years ?? 0} año(s)
                                    </p>

                                    {/* Acciones de postulación */}
                                    <div className={styles.jobActions}>
                                        {job.application_status ? (
                                            <div className={styles.appliedInfo}>
                                                <button type="button" disabled className={styles.appliedButton}>
                                                    ✓ Ya te has postulado
                                                </button>
                                                <span className={styles.appliedText}>
                                                    Postulación registrada con éxito
                                                </span>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenApply(job)}
                                                className={styles.primaryButton}
                                            >
                                                Postulación asistida →
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className={styles.logout}>
                        <LogoutButton />
                    </div>
                </div>
            </div>

            {/* MODAL: Aviso de perfil incompleto */}
            {showProfileWarning && (
                <div className={styles.overlay}>
                    <div className={styles.modal}>
                        <h2 className={`${styles.modalTitle} ${styles.warningTitle}`}>Perfil laboral incompleto</h2>
                        <p>
                            Para realizar una <strong>postulación asistida</strong>, el sistema requiere que tu perfil laboral contenga información profesional completa.
                        </p>
                        <p className={styles.helpText}>
                            Revisa que hayas diligenciado: campo profesional, experiencia, años de experiencia y educación.
                        </p>
                        <div className={styles.modalActions}>
                            <button type="button" onClick={() => setShowProfileWarning(false)} className={styles.secondaryButton}>
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push(profile ? "/profile/edit" : "/profile")}
                                className={styles.primaryButton}
                            >
                                Completar mi perfil ahora
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Postulación asistida */}
            {selectedJob && profile && (
                <div className={styles.overlay}>
                    <div className={`${styles.modal} ${styles.wideModal}`}>
                        <h2 className={styles.modalTitle}>Postulación asistida</h2>
                        <p className={styles.meta}>
                            Vacante: <strong>{selectedJob.title}</strong> · {selectedJob.company || "Empresa"}
                        </p>

                        {/* Resumen asistido del perfil */}
                        <div className={styles.profileSummary}>
                            <h3 className={styles.summaryTitle}>👤 Información de tu perfil que se adjuntará:</h3>
                            <ul>
                                <li><strong>Nombre:</strong> {profile.name} ({profile.email})</li>
                                <li><strong>Campo laboral:</strong> {profile.field}</li>
                                <li><strong>Experiencia:</strong> {profile.experience_years} año(s) — {profile.experience}</li>
                                <li><strong>Educación:</strong> {profile.education}</li>
                                {profile.work_preferences && <li><strong>Preferencias:</strong> {profile.work_preferences}</li>}
                                {profile.work_mode && <li><strong>Modalidad preferida:</strong> {modalidadTexto(profile.work_mode)}</li>}
                            </ul>
                        </div>

                        {/* Carta de presentación asistida personalizable */}
                        <form onSubmit={handleConfirmApply} className={styles.form}>
                            <label htmlFor="coverLetter" className={styles.label}>
                                Carta / Mensaje de presentación asistido:
                            </label>
                            <p className={styles.helpText}>
                                Jobbit generó este texto con base en tu perfil. Puedes personalizarlo antes de enviar:
                            </p>
                            <textarea
                                id="coverLetter"
                                rows={6}
                                value={coverLetter}
                                onChange={(e) => setCoverLetter(e.target.value)}
                                className={styles.textarea}
                            />

                            {applyError && <p role="alert" className={styles.applyError}>{applyError}</p>}

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedJob(null)}
                                    disabled={submitting}
                                    className={styles.secondaryButton}
                                >
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting} className={styles.primaryButton}>
                                    {submitting ? "Enviando postulación..." : "Confirmar y postularme"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Confirmación de postulación */}
            {confirmation && (
                <div className={styles.overlay}>
                    <div className={`${styles.modal} ${styles.centered}`}>
                        <div className={styles.confirmationIcon}>🎉</div>
                        <h2 className={styles.confirmationTitle}>¡Postulación confirmada!</h2>
                        <p>
                            Te has postulado exitosamente a la vacante de <strong>{confirmation.jobTitle}</strong> en <strong>{confirmation.company}</strong>.
                        </p>
                        <div className={styles.confirmationDetails}>
                            <p>
                                <strong>Estado actual:</strong> <span className={styles.confirmationStatus}>{confirmation.status.toUpperCase()}</span>
                            </p>
                            <p><strong>Fecha:</strong> {confirmation.date}</p>
                        </div>
                        <p className={styles.helpText}>
                            Tu perfil laboral fue compartido con los reclutadores. Puedes consultar el progreso en la sección de postulaciones.
                        </p>
                        <div className={`${styles.modalActions} ${styles.centerActions}`}>
                            <button type="button" onClick={() => setConfirmation(null)} className={styles.secondaryButton}>
                                Seguir viendo vacantes
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setConfirmation(null);
                                    router.push("/applications");
                                }}
                                className={styles.primaryButton}
                            >
                                Ver mis postulaciones
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
