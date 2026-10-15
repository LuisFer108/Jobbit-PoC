"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LogoutButton from "../components/LogoutButton";
import styles from "./page.module.css";

const API = "http://localhost:5001/api";

export default function CompatibilidadPage() {
    const router = useRouter();

    const [catalog, setCatalog] = useState([]);
    const [selected, setSelected] = useState([]);
    const [recs, setRecs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [noProfile, setNoProfile] = useState(false);

    // Estados para la postulación asistida
    const [profile, setProfile] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [coverLetter, setCoverLetter] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [applyError, setApplyError] = useState("");
    const [showProfileWarning, setShowProfileWarning] = useState(false);
    const [confirmation, setConfirmation] = useState(null);

    function headers() {
        const token =
            typeof window !== "undefined"
                ? localStorage.getItem("token")
                : null;

        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        };
    }

    async function request(path, options = {}) {
        const res = await fetch(`${API}${path}`, {
            ...options,
            headers: {
                ...headers(),
                ...(options.headers || {})
            }
        });

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("token");
            router.replace("/login");
            return null;
        }

        return res;
    }

    async function loadRecs() {
        const res = await request("/recommendations");

        if (!res) return;

        const data = await res.json();

        if (res.status === 404) {
            setNoProfile(true);
            setMessage(
                data.message ||
                "Crea tu perfil laboral para ver tu compatibilidad."
            );
            return;
        }

        if (!res.ok) {
            setMessage(
                data.message || "Error al calcular compatibilidad."
            );
            return;
        }

        setNoProfile(false);

        // Conservar el estado de postulación de las vacantes ya postuladas
        setRecs((prev) => {
            const applied = {};
            prev.forEach((p) => {
                if (p.application_status) {
                    applied[p.id] = p;
                }
            });

            return (data.recommendations || []).map((r) =>
                applied[r.id] && !r.application_status
                    ? {
                          ...r,
                          application_status:
                              applied[r.id].application_status,
                          application_id: applied[r.id].application_id,
                          applied_at: applied[r.id].applied_at
                      }
                    : r
            );
        });
    }

    async function loadProfile() {
        const res = await request("/profile");

        if (!res) return;

        if (res.ok) {
            setProfile(await res.json());
        } else {
            setProfile(null);
        }
    }

    useEffect(() => {
        async function init() {
            setLoading(true);

            try {
                const token = localStorage.getItem("token");

                if (!token) {
                    router.replace("/login");
                    return;
                }

                const [c, m] = await Promise.all([
                    request("/skills"),
                    request("/skills/mine")
                ]);

                if (c && c.ok) {
                    const cData = await c.json();
                    setCatalog(cData.skills || []);
                }

                if (m && m.ok) {
                    const mData = await m.json();
                    setSelected(mData.skillIds || []);
                }

                await Promise.all([loadRecs(), loadProfile()]);
            } catch {
                setMessage(
                    "No fue posible conectar con el servidor. Intenta nuevamente."
                );
            } finally {
                setLoading(false);
            }
        }

        init();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function toggle(id) {
        if (selected.includes(id)) {
            setSelected(selected.filter((x) => x !== id));
            setMessage("");
            return;
        }

        if (selected.length >= 5) {
            setMessage(
                "Solo puedes seleccionar un máximo de 5 habilidades."
            );
            return;
        }

        setMessage("");
        setSelected([...selected, id]);
    }

    async function saveSkills() {
        setMessage("");
        setSaving(true);

        try {
            const res = await request("/skills/mine", {
                method: "PUT",
                body: JSON.stringify({
                    skillIds: selected
                })
            });

            if (!res) return;

            const data = await res.json();

            if (res.ok) {
                setMessage(
                    "✓ Habilidades actualizadas. Recalculando compatibilidad..."
                );
                await loadRecs();
            } else {
                setMessage(
                    data.message ||
                    "No se pudieron guardar las habilidades."
                );
            }
        } catch {
            setMessage(
                "Error de conexión al guardar habilidades."
            );
        } finally {
            setSaving(false);
        }
    }

    function color(score) {
        if (score >= 70) return "#15803d";
        if (score >= 40) return "#b45309";
        return "#b91c1c";
    }

    function badgeLabel(score) {
        if (score >= 70) return "Alta compatibilidad";
        if (score >= 40) return "Compatibilidad media";
        return "Baja compatibilidad";
    }

    function modalidadTexto(mode) {
        if (mode === "remote") return "Remoto";
        if (mode === "hybrid") return "Híbrido";
        if (mode === "onsite") return "Presencial";

        return mode || "No especificada";
    }

    // Verificar si el perfil laboral está completo
    function isProfileComplete() {
        if (!profile) return false;

        if (typeof profile.is_complete === "boolean") {
            return profile.is_complete;
        }

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

        if (!profile || !isProfileComplete()) {
            setShowProfileWarning(true);
            return;
        }

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

        try {
            const response = await request("/applications", {
                method: "POST",
                body: JSON.stringify({
                    offerId: selectedJob.id,
                    coverLetter: coverLetter
                })
            });

            if (!response) return;

            const data = await response.json();

            // Postulación duplicada
            if (response.status === 409) {
                setApplyError(
                    data.message ||
                        "Ya te has postulado previamente a esta vacante."
                );

                setRecs((prev) =>
                    prev.map((r) =>
                        r.id === selectedJob.id
                            ? { ...r, application_status: "postulado" }
                            : r
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
            setRecs((prev) =>
                prev.map((r) =>
                    r.id === selectedJob.id
                        ? {
                              ...r,
                              application_status: data.application.status,
                              application_id: data.application.id,
                              applied_at: data.application.created_at
                          }
                        : r
                )
            );

            setConfirmation({
                jobTitle: selectedJob.title,
                company: selectedJob.company || "Empresa",
                status: data.application.status,
                date: new Date().toLocaleDateString("es-ES")
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

    // ===== PRESENTACIÓN NUEVA =====
    return (
        <main className={styles.page}>
            <div className={styles.container}>

                {/* Barra superior con logo + título */}
                <div className={styles.topbar}>
                    <div className={styles.brand}>
                        <Image src="/Logo-jobbit.svg" alt="Jobbit" width={130} height={40} priority unoptimized />
                    </div>
                    <div className={styles.topbarTitle}>
                        <span className={styles.userIcon} aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                                <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6Z"/>
                            </svg>
                        </span>
                        Compatibilidad
                    </div>
                </div>

                {/* Cabecera */}
                <header className={styles.header}>
                    <Link href="/dashboard" className={styles.goback}>
                        ← Volver a mi inicio
                    </Link>

                    <p className={styles.eyebrow}>
                        Jobbit · Recomendaciones laborales
                    </p>

                    <h1 className={styles.title}>
                        Compatibilidad de vacantes
                    </h1>

                    <p className={styles.subtitle}>
                        Descubre qué oportunidades se adaptan mejor a ti.
                        Calculamos la afinidad según tus habilidades,
                        experiencia, expectativa salarial, ubicación y
                        modalidad de trabajo.
                    </p>

                    <Link
                        href="/applications"
                        className={styles.applicationsLink}
                    >
                        📋 Ver mis postulaciones
                    </Link>
                </header>

                <div className={styles.content}>

                    {/* Selección de habilidades */}
                    <section className={styles.skillsCard}>
                        <div className={styles.skillsHeader}>
                            <div>
                                <h2 className={styles.sectionTitle}>
                                    Tus habilidades
                                </h2>

                                <p className={styles.sectionDescription}>
                                    Selecciona hasta 5 habilidades para
                                    mejorar tus recomendaciones.
                                </p>
                            </div>

                            <span className={styles.counter}>
                                {selected.length}/5 seleccionadas
                            </span>
                        </div>

                        {loading ? (
                            <p className={styles.loadingText}>
                                Cargando catálogo de habilidades...
                            </p>
                        ) : (
                            <div
                                className={styles.skillsList}
                                aria-label="Seleccionar habilidades"
                            >
                                {catalog.map((s) => {
                                    const isSelected = selected.includes(s.id);

                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => toggle(s.id)}
                                            className={`${styles.skillChip} ${
                                                isSelected
                                                    ? styles.skillChipSelected
                                                    : ""
                                            }`}
                                            aria-pressed={isSelected}
                                        >
                                            <span aria-hidden="true">
                                                {isSelected ? "✓" : "+"}
                                            </span>
                                            {s.name}
                                        </button>
                                    );
                                })}

                                {catalog.length === 0 && (
                                    <p className={styles.emptyText}>
                                        No hay habilidades disponibles
                                        para seleccionar.
                                    </p>
                                )}
                            </div>
                        )}

                        <div className={styles.skillsFooter}>
                            <p className={styles.helperText}>
                                Puedes cambiar tu selección en cualquier
                                momento y recalcular tus resultados.
                            </p>

                            <button
                                type="button"
                                onClick={saveSkills}
                                disabled={saving || loading}
                                className={styles.primaryButton}
                            >
                                {saving
                                    ? "Guardando..."
                                    : "Guardar y recalcular"}
                            </button>
                        </div>

                        {message && (
                            <p
                                role="status"
                                aria-live="polite"
                                className={`${styles.message} ${
                                    message.startsWith("✓")
                                        ? styles.successMessage
                                        : styles.errorMessage
                                }`}
                            >
                                {message}
                            </p>
                        )}
                    </section>

                    {/* Aviso si el perfil está incompleto */}
                    {!loading && !noProfile && profile && !isProfileComplete() && (
                        <div className={`${styles.notice} ${styles.warningNotice}`}>
                            <strong className={styles.noticeTitle}>
                                ⚠️ Perfil laboral incompleto
                            </strong>
                            Para realizar postulaciones asistidas debes tener
                            tu perfil laboral completo: campo profesional,
                            experiencia, años de experiencia y educación.
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

                    {/* Recomendaciones */}
                    <section className={styles.recommendations}>
                        <div className={styles.resultsHeader}>
                            <div>
                                <p className={styles.eyebrow}>
                                    Tus oportunidades
                                </p>

                                <h2 className={styles.sectionTitle}>
                                    Vacantes sugeridas
                                </h2>

                                <p className={styles.sectionDescription}>
                                    Ordenadas de mayor a menor afinidad.
                                </p>
                            </div>

                            {!loading && !noProfile && (
                                <span className={styles.resultsCount}>
                                    {recs.length}{" "}
                                    {recs.length === 1 ? "vacante" : "vacantes"}
                                </span>
                            )}
                        </div>

                        {loading && (
                            <div className={styles.emptyState}>
                                <span className={styles.loadingIcon}>◌</span>
                                <h3>Calculando compatibilidad</h3>
                                <p>
                                    Estamos comparando tu perfil con las
                                    vacantes disponibles.
                                </p>
                            </div>
                        )}

                        {!loading && noProfile && (
                            <div className={styles.emptyState}>
                                <span className={styles.emptyIcon}>👤</span>
                                <h3>Completa tu perfil laboral</h3>
                                <p>
                                    Necesitas registrar tu perfil para
                                    calcular tu compatibilidad con las
                                    vacantes.
                                </p>
                                <Link
                                    href="/profile"
                                    className={styles.primaryButton}
                                >
                                    Crear perfil laboral
                                </Link>
                            </div>
                        )}

                        {!loading && !noProfile && recs.length === 0 && (
                            <div className={styles.emptyState}>
                                <span className={styles.emptyIcon}>🔎</span>
                                <h3>No hay vacantes disponibles</h3>
                                <p>
                                    No encontramos vacantes activas para
                                    evaluar en este momento. Vuelve a
                                    consultar más adelante.
                                </p>
                            </div>
                        )}

                        {!loading &&
                            !noProfile &&
                            recs.map((r, index) => {
                                const scoreColor = color(r.score);
                                const safeScore = Math.max(
                                    0,
                                    Math.min(100, r.score)
                                );

                                return (
                                    <article
                                        key={r.id}
                                        className={`${styles.jobCard} ${
                                            r.application_status
                                                ? styles.jobCardApplied
                                                : ""
                                        }`}
                                    >
                                        {/* Título y porcentaje */}
                                        <div className={styles.jobHeader}>
                                            <div className={styles.jobInfo}>
                                                <span className={styles.jobNumber}>
                                                    VACANTE #{index + 1}
                                                </span>

                                                <h3 className={styles.jobTitle}>
                                                    {r.title}
                                                </h3>

                                                <p className={styles.company}>
                                                    {r.company ||
                                                        "Empresa confidencial"}
                                                </p>

                                                {r.application_status && (
                                                    <span
                                                        className={
                                                            styles.statusBadge
                                                        }
                                                    >
                                                        Estado:{" "}
                                                        {r.application_status.toUpperCase()}
                                                    </span>
                                                )}
                                            </div>

                                            <div className={styles.scoreContainer}>
                                                <span
                                                    className={styles.score}
                                                    style={{ color: scoreColor }}
                                                >
                                                    {r.score}%
                                                </span>

                                                <span
                                                    className={styles.scoreBadge}
                                                    style={{
                                                        color: scoreColor,
                                                        backgroundColor: `${scoreColor}15`,
                                                        borderColor: `${scoreColor}45`
                                                    }}
                                                >
                                                    {badgeLabel(r.score)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Barra de compatibilidad */}
                                        <div
                                            className={styles.progressTrack}
                                            role="progressbar"
                                            aria-label={`Compatibilidad con ${r.title}`}
                                            aria-valuenow={safeScore}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                        >
                                            <div
                                                className={styles.progressFill}
                                                style={{
                                                    width: `${safeScore}%`,
                                                    backgroundColor: scoreColor
                                                }}
                                            />
                                        </div>

                                        <p className={styles.description}>
                                            {r.description ||
                                                "No hay descripción disponible."}
                                        </p>

                                        {/* Información de la vacante */}
                                        <div className={styles.metadata}>
                                            <div className={styles.metaItem}>
                                                <span aria-hidden="true">📍</span>
                                                <span>
                                                    {r.location || "Colombia"}
                                                </span>
                                            </div>

                                            <div className={styles.metaItem}>
                                                <span aria-hidden="true">🏢</span>
                                                <span>
                                                    {modalidadTexto(r.work_mode)}
                                                </span>
                                            </div>

                                            <div className={styles.metaItem}>
                                                <span aria-hidden="true">⏳</span>
                                                <span>
                                                    Experiencia mínima:{" "}
                                                    {r.min_experience_years ?? 0}{" "}
                                                    año(s)
                                                </span>
                                            </div>

                                            <div className={styles.metaItem}>
                                                <span aria-hidden="true">💰</span>
                                                <span>
                                                    Salario:{" "}
                                                    {r.salary_range ||
                                                        "Por definir"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Habilidades requeridas */}
                                        {r.skills && r.skills.length > 0 && (
                                            <div className={styles.requiredSkills}>
                                                <h4 className={styles.subsectionTitle}>
                                                    Habilidades requeridas
                                                </h4>

                                                <div
                                                    className={
                                                        styles.requiredSkillsList
                                                    }
                                                >
                                                    {r.skills.map((s) => (
                                                        <span
                                                            key={s.skill_id}
                                                            className={`${
                                                                styles.requiredSkill
                                                            } ${
                                                                s.matched
                                                                    ? styles.matchedSkill
                                                                    : styles.unmatchedSkill
                                                            }`}
                                                        >
                                                            {s.matched ? "✓ " : ""}
                                                            {s.name}{" "}
                                                            <span>
                                                                {s.requirement ===
                                                                "must"
                                                                    ? "(Obligatoria)"
                                                                    : "(Deseable)"}
                                                            </span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Desglose de compatibilidad */}
                                        {r.breakdown && (
                                            <div className={styles.breakdown}>
                                                <h4 className={styles.subsectionTitle}>
                                                    Desglose de compatibilidad
                                                </h4>

                                                <div className={styles.breakdownGrid}>
                                                    {[
                                                        ["Habilidades", r.breakdown.skills],
                                                        ["Experiencia", r.breakdown.experience],
                                                        ["Salario", r.breakdown.salary],
                                                        ["Ubicación", r.breakdown.location],
                                                        ["Modalidad", r.breakdown.mode]
                                                    ].map(([label, value]) => (
                                                        <div
                                                            key={label}
                                                            className={
                                                                styles.breakdownItem
                                                            }
                                                        >
                                                            <span>{label}</span>
                                                            <strong>{value}%</strong>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Acciones de postulación */}
                                        <div className={styles.jobActions}>
                                            {r.application_status ? (
                                                <div className={styles.appliedInfo}>
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className={
                                                            styles.appliedButton
                                                        }
                                                    >
                                                        ✓ Ya te has postulado
                                                    </button>

                                                    <span
                                                        className={
                                                            styles.appliedText
                                                        }
                                                    >
                                                        Postulación registrada con
                                                        éxito
                                                    </span>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleOpenApply(r)
                                                    }
                                                    className={
                                                        styles.primaryButton
                                                    }
                                                >
                                                    Postulación asistida →
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                    </section>

                    {/* Modal: perfil incompleto */}
                    {showProfileWarning && (
                        <div className={styles.modalOverlay} role="presentation">
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
                                    profesional, experiencia, años de
                                    experiencia y educación.
                                </p>

                                <div className={styles.modalActions}>
                                    <button
                                        type="button"
                                        onClick={() => setShowProfileWarning(false)}
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
                                        className={styles.primaryButton}
                                    >
                                        Completar mi perfil ahora
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Modal: postulación asistida */}
                    {selectedJob && profile && (
                        <div className={styles.modalOverlay} role="presentation">
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
                                    Vacante: <strong>{selectedJob.title}</strong>
                                    {" · "}
                                    {selectedJob.company || "Empresa"}
                                </p>

                                <div className={styles.profileSummary}>
                                    <h3 className={styles.summaryTitle}>
                                        👤 Información de tu perfil que se
                                        adjuntará
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
                                                <strong>
                                                    Modalidad preferida:
                                                </strong>{" "}
                                                {modalidadTexto(profile.work_mode)}
                                            </li>
                                        )}
                                    </ul>
                                </div>

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
                                            className={styles.primaryButton}
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
                        <div className={styles.modalOverlay} role="presentation">
                            <section
                                className={`${styles.modal} ${styles.confirmationModal}`}
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="confirmationTitle"
                            >
                                <div className={styles.confirmationIcon}>🎉</div>

                                <h2
                                    id="confirmationTitle"
                                    className={styles.confirmationTitle}
                                >
                                    ¡Postulación confirmada!
                                </h2>

                                <p className={styles.confirmationText}>
                                    Te has postulado exitosamente a la vacante
                                    de <strong>{confirmation.jobTitle}</strong>{" "}
                                    en <strong>{confirmation.company}</strong>.
                                </p>

                                <div className={styles.confirmationDetails}>
                                    <p>
                                        <strong>Estado actual:</strong>{" "}
                                        <span
                                            className={styles.confirmationStatus}
                                        >
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
                                        className={styles.primaryButton}
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
            </div>
        </main>
    );
}
