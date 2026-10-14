"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "../components/LogoutButton";

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

    return (
        <main style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
            <h1>Vacantes disponibles</h1>
            <p>Estas son las oportunidades que tenemos para ti ahora mismo.</p>

            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem" }}>
                <Link href="/dashboard">← Volver a mi inicio</Link>
                <Link href="/applications" style={{ fontWeight: "bold" }}>📋 Ver mis postulaciones</Link>
            </div>

            {/* Aviso si el perfil laboral está incompleto */}
            {profile !== null && !isProfileComplete() && (
                <div style={{
                    backgroundColor: "#fef3c7",
                    border: "1px solid #f59e0b",
                    color: "#92400e",
                    padding: "1rem",
                    borderRadius: "8px",
                    marginBottom: "1.5rem"
                }}>
                    <strong>⚠️ Perfil laboral incompleto:</strong> Para realizar postulaciones asistidas debes tener tu perfil laboral completo (campo profesional, experiencia, años de experiencia y educación).
                    <div style={{ marginTop: "0.5rem" }}>
                        <Link href="/profile/edit" style={{ fontWeight: "bold", color: "#b45309" }}>
                            ✏️ Completar mi perfil laboral aquí →
                        </Link>
                    </div>
                </div>
            )}

            {profile === null && jobs && (
                <div style={{
                    backgroundColor: "#fef2f2",
                    border: "1px solid #ef4444",
                    color: "#991b1b",
                    padding: "1rem",
                    borderRadius: "8px",
                    marginBottom: "1.5rem"
                }}>
                    <strong>⚠️ Aún no has creado tu perfil laboral:</strong> Debes crearlo para postularte a las vacantes.
                    <div style={{ marginTop: "0.5rem" }}>
                        <Link href="/profile" style={{ fontWeight: "bold", color: "#dc2626" }}>
                            Crear perfil laboral ahora →
                        </Link>
                    </div>
                </div>
            )}

            {error && <p role="status" style={{ color: "red" }}>{error}</p>}

            {/* Estado: cargando */}
            {!jobs && !error && <p>Cargando vacantes...</p>}

            {/* Estado: no hay vacantes (lista vacía) */}
            {jobs && jobs.length === 0 && (
                <p>Por ahora no hay vacantes publicadas. ¡Vuelve pronto, estamos sumando nuevas!</p>
            )}

            {/* Listado de vacantes (SCRUM-65 / SCRUM-66) */}
            {jobs && jobs.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0 }}>
                    {jobs.map((job) => (
                        <li
                            key={job.id}
                            style={{
                                border: job.application_status ? "2px solid #38bdf8" : "1px solid #ccc",
                                borderRadius: "8px",
                                padding: "1.25rem",
                                marginBottom: "1.25rem",
                                backgroundColor: job.application_status ? "#f0f9ff" : "white"
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                                <h2 style={{ margin: "0 0 0.25rem" }}>{job.title}</h2>
                                {job.application_status && (
                                    <span style={{
                                        backgroundColor: "#0284c7",
                                        color: "white",
                                        padding: "4px 10px",
                                        borderRadius: "12px",
                                        fontSize: "0.85rem",
                                        fontWeight: "bold"
                                    }}>
                                        Estado: {job.application_status.toUpperCase()}
                                    </span>
                                )}
                            </div>

                            <p style={{ margin: "0 0 0.5rem", fontWeight: "bold", color: "#374151" }}>
                                {job.company || "Empresa confidencial"}
                            </p>
                            <p style={{ margin: "0 0 0.5rem" }}>{job.description}</p>
                            <p style={{ margin: "0 0 1rem", fontSize: "0.95rem", color: "#4b5563" }}>
                                📍 {job.location || "Ubicación por confirmar"} ·
                                {" "}{modalidadTexto(job.work_mode)} ·
                                {" "}Experiencia mínima: {job.min_experience_years ?? 0} año(s)
                            </p>

                            {/* Acciones de postulación */}
                            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                                {job.application_status ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        <button
                                            type="button"
                                            disabled
                                            style={{
                                                padding: "6px 14px",
                                                borderRadius: "6px",
                                                border: "1px solid #cbd5e1",
                                                backgroundColor: "#e2e8f0",
                                                color: "#475569",
                                                cursor: "not-allowed",
                                                fontWeight: "500"
                                            }}
                                        >
                                            ✓ Ya te has postulado
                                        </button>
                                        <span style={{ fontSize: "0.85rem", color: "#0369a1" }}>
                                            Postulación registrada con éxito
                                        </span>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleOpenApply(job)}
                                        style={{
                                            padding: "8px 18px",
                                            borderRadius: "6px",
                                            border: "none",
                                            backgroundColor: "#0284c7",
                                            color: "white",
                                            fontWeight: "600",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Postulación asistida →
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {/* MODAL: Aviso de perfil incompleto */}
            {showProfileWarning && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "8px",
                        padding: "2rem",
                        maxWidth: "500px",
                        width: "90%",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
                    }}>
                        <h2 style={{ marginTop: 0, color: "#92400e" }}>Perfil laboral incompleto</h2>
                        <p>
                            Para realizar una <strong>postulación asistida</strong>, el sistema requiere que tu perfil laboral contenga información profesional completa.
                        </p>
                        <p style={{ fontSize: "0.95rem", color: "#4b5563" }}>
                            Revisa que hayas diligenciado: campo profesional, experiencia, años de experiencia y educación.
                        </p>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
                            <button
                                type="button"
                                onClick={() => setShowProfileWarning(false)}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "6px",
                                    border: "1px solid #ccc",
                                    background: "#f9fafb",
                                    cursor: "pointer"
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push(profile ? "/profile/edit" : "/profile")}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: "#0284c7",
                                    color: "white",
                                    fontWeight: "600",
                                    cursor: "pointer"
                                }}
                            >
                                Completar mi perfil ahora
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Postulación asistida */}
            {selectedJob && profile && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                    padding: "1rem"
                }}>
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "8px",
                        padding: "2rem",
                        maxWidth: "650px",
                        width: "100%",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
                    }}>
                        <h2 style={{ marginTop: 0, marginBottom: "0.25rem" }}>Postulación asistida</h2>
                        <p style={{ margin: "0 0 1rem", color: "#4b5563" }}>
                            Vacante: <strong>{selectedJob.title}</strong> · {selectedJob.company || "Empresa"}
                        </p>

                        {/* Resumen asistido del perfil */}
                        <div style={{
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            padding: "1rem",
                            marginBottom: "1rem",
                            fontSize: "0.9rem"
                        }}>
                            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>
                                👤 Información de tu perfil que se adjuntará:
                            </h3>
                            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                                <li><strong>Nombre:</strong> {profile.name} ({profile.email})</li>
                                <li><strong>Campo laboral:</strong> {profile.field}</li>
                                <li><strong>Experiencia:</strong> {profile.experience_years} año(s) — {profile.experience}</li>
                                <li><strong>Educación:</strong> {profile.education}</li>
                                {profile.work_preferences && <li><strong>Preferencias:</strong> {profile.work_preferences}</li>}
                                {profile.work_mode && <li><strong>Modalidad preferida:</strong> {modalidadTexto(profile.work_mode)}</li>}
                            </ul>
                        </div>

                        {/* Carta de presentación asistida personalizable */}
                        <form onSubmit={handleConfirmApply}>
                            <label htmlFor="coverLetter" style={{ display: "block", fontWeight: "bold", marginBottom: "0.25rem" }}>
                                Carta / Mensaje de presentación asistido:
                            </label>
                            <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0 0 0.5rem" }}>
                                Jobbit generó este texto con base en tu perfil. Puedes personalizarlo antes de enviar:
                            </p>
                            <textarea
                                id="coverLetter"
                                rows={6}
                                value={coverLetter}
                                onChange={(e) => setCoverLetter(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "0.75rem",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    fontFamily: "inherit",
                                    fontSize: "0.95rem",
                                    boxSizing: "border-box"
                                }}
                            />

                            {applyError && (
                                <p role="alert" style={{ color: "#dc2626", marginTop: "0.75rem", fontWeight: "500" }}>
                                    {applyError}
                                </p>
                            )}

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedJob(null)}
                                    disabled={submitting}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: "6px",
                                        border: "1px solid #ccc",
                                        background: "#f9fafb",
                                        cursor: submitting ? "not-allowed" : "pointer"
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        padding: "8px 20px",
                                        borderRadius: "6px",
                                        border: "none",
                                        background: submitting ? "#93c5fd" : "#0284c7",
                                        color: "white",
                                        fontWeight: "600",
                                        cursor: submitting ? "not-allowed" : "pointer"
                                    }}
                                >
                                    {submitting ? "Enviando postulación..." : "Confirmar y postularme"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Confirmación de postulación */}
            {confirmation && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                    padding: "1rem"
                }}>
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "8px",
                        padding: "2rem",
                        maxWidth: "500px",
                        width: "100%",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                        textAlign: "center"
                    }}>
                        <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎉</div>
                        <h2 style={{ marginTop: 0, color: "#065f46" }}>¡Postulación confirmada!</h2>
                        <p style={{ fontSize: "1.05rem", color: "#374151" }}>
                            Te has postulado exitosamente a la vacante de <strong>{confirmation.jobTitle}</strong> en <strong>{confirmation.company}</strong>.
                        </p>
                        <div style={{
                            backgroundColor: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            borderRadius: "6px",
                            padding: "0.75rem",
                            margin: "1rem 0",
                            textAlign: "left",
                            fontSize: "0.95rem"
                        }}>
                            <p style={{ margin: "0 0 0.25rem" }}>
                                <strong>Estado actual:</strong> <span style={{ color: "#16a34a", fontWeight: "bold" }}>{confirmation.status.toUpperCase()}</span>
                            </p>
                            <p style={{ margin: 0 }}>
                                <strong>Fecha:</strong> {confirmation.date}
                            </p>
                        </div>
                        <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                            Tu perfil laboral fue compartido con los reclutadores. Puedes consultar el progreso en la sección de postulaciones.
                        </p>
                        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "1.5rem" }}>
                            <button
                                type="button"
                                onClick={() => setConfirmation(null)}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "6px",
                                    border: "1px solid #ccc",
                                    background: "#f9fafb",
                                    cursor: "pointer"
                                }}
                            >
                                Seguir viendo vacantes
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setConfirmation(null);
                                    router.push("/applications");
                                }}
                                style={{
                                    padding: "8px 18px",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: "#0284c7",
                                    color: "white",
                                    fontWeight: "600",
                                    cursor: "pointer"
                                }}
                            >
                                Ver mis postulaciones
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <LogoutButton />
        </main>
    );
}
