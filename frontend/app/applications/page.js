"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "../components/LogoutButton";

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

    return (
        <main style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
            <h1>Mis postulaciones</h1>
            <p>Consulta aquí el estado en tiempo real de todas tus postulaciones a vacantes laborales.</p>

            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem" }}>
                <Link href="/jobs">← Volver a vacantes disponibles</Link>
                <Link href="/dashboard">Ir a mi inicio</Link>
            </div>

            {error && <p role="status" style={{ color: "red" }}>{error}</p>}

            {/* Estado: cargando */}
            {!applications && !error && <p>Cargando tus postulaciones...</p>}

            {/* Estado: sin postulaciones */}
            {applications && applications.length === 0 && (
                <div style={{
                    border: "1px dashed #cbd5e1",
                    borderRadius: "8px",
                    padding: "2rem",
                    textAlign: "center",
                    backgroundColor: "#f8fafc"
                }}>
                    <p style={{ margin: "0 0 1rem", fontSize: "1.1rem", color: "#475569" }}>
                        Aún no te has postulado a ninguna vacante.
                    </p>
                    <Link
                        href="/jobs"
                        style={{
                            display: "inline-block",
                            padding: "8px 16px",
                            backgroundColor: "#0284c7",
                            color: "white",
                            textDecoration: "none",
                            borderRadius: "6px",
                            fontWeight: "bold"
                        }}
                    >
                        Explorar vacantes disponibles
                    </Link>
                </div>
            )}

            {/* Listado de postulaciones */}
            {applications && applications.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0 }}>
                    {applications.map((app) => {
                        const style = badgeColor(app.status);
                        const fecha = new Date(app.created_at).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                        });

                        return (
                            <li
                                key={app.id}
                                style={{
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                    padding: "1.25rem",
                                    marginBottom: "1.25rem",
                                    backgroundColor: "white",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                                    <h2 style={{ margin: "0 0 0.25rem" }}>{app.job_title}</h2>
                                    <span style={{
                                        backgroundColor: style.bg,
                                        color: style.color,
                                        border: `1px solid ${style.border}`,
                                        padding: "4px 12px",
                                        borderRadius: "16px",
                                        fontWeight: "bold",
                                        fontSize: "0.85rem"
                                    }}>
                                        Estado: {app.status.toUpperCase()}
                                    </span>
                                </div>

                                <p style={{ margin: "0 0 0.5rem", fontWeight: "bold", color: "#374151" }}>
                                    {app.job_company || "Empresa confidencial"}
                                </p>

                                <p style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", color: "#4b5563" }}>
                                    📍 {app.job_location || "Ubicación por confirmar"} ·
                                    {" "}{modalidadTexto(app.job_work_mode)} ·
                                    {" "}Exp. mínima: {app.job_min_experience_years ?? 0} año(s)
                                </p>

                                <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "#6b7280" }}>
                                    📅 Postulado el {fecha}
                                </p>

                                {(app.field || app.candidate_name) && (
                                    <div style={{
                                        backgroundColor: "#f0fdf4",
                                        padding: "0.75rem",
                                        borderRadius: "6px",
                                        border: "1px solid #bbf7d0",
                                        fontSize: "0.85rem",
                                        marginBottom: "0.75rem",
                                        color: "#166534"
                                    }}>
                                        <strong>📋 Datos del perfil registrados en la postulación:</strong>
                                        <p style={{ margin: "0.25rem 0 0" }}>
                                            <strong>Candidato:</strong> {app.candidate_name} ({app.candidate_email}) · <strong>Área:</strong> {app.field} · <strong>Experiencia:</strong> {app.experience_years ?? 0} año(s)
                                        </p>
                                        {app.education && (
                                            <p style={{ margin: "0.25rem 0 0" }}>
                                                <strong>Educación:</strong> {app.education}
                                            </p>
                                        )}
                                        {app.experience && (
                                            <p style={{ margin: "0.25rem 0 0" }}>
                                                <strong>Experiencia descrita:</strong> {app.experience}
                                            </p>
                                        )}
                                        {app.work_preferences && (
                                            <p style={{ margin: "0.25rem 0 0" }}>
                                                <strong>Preferencias:</strong> {app.work_preferences}
                                            </p>
                                        )}
                                        {app.work_mode && (
                                            <p style={{ margin: "0.25rem 0 0" }}>
                                                <strong>Modalidad preferida:</strong> {modalidadTexto(app.work_mode)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {app.cover_letter && (
                                    <div style={{
                                        backgroundColor: "#f8fafc",
                                        padding: "0.75rem",
                                        borderRadius: "6px",
                                        border: "1px solid #e2e8f0",
                                        fontSize: "0.9rem",
                                        marginBottom: "0.75rem",
                                        whiteSpace: "pre-line",
                                        color: "#334155"
                                    }}>
                                        <strong>Mensaje / Carta enviada:</strong>
                                        <p style={{ margin: "0.25rem 0 0" }}>{app.cover_letter}</p>
                                    </div>
                                )}

                                <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                                    <button
                                        type="button"
                                        onClick={() => handleViewHistory(app.id)}
                                        disabled={loadingHistory}
                                        style={{
                                            padding: "6px 14px",
                                            borderRadius: "6px",
                                            border: "1px solid #cbd5e1",
                                            background: "#f1f5f9",
                                            color: "#1e293b",
                                            fontSize: "0.85rem",
                                            fontWeight: "500",
                                            cursor: "pointer"
                                        }}
                                    >
                                        🔍 Ver trazabilidad / historial de estado
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {/* MODAL: Historial de estados de la postulación */}
            {selectedHistory && (
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
                        maxWidth: "550px",
                        width: "100%",
                        maxHeight: "85vh",
                        overflowY: "auto",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
                    }}>
                        <h2 style={{ marginTop: 0 }}>Historial de la postulación</h2>
                        <p style={{ margin: "0 0 1rem", color: "#475569" }}>
                            Vacante: <strong>{selectedHistory.application.job_title}</strong> ({selectedHistory.application.job_company})
                        </p>

                        <div style={{ marginBottom: "1.5rem" }}>
                            <p style={{ margin: "0 0 0.5rem" }}>
                                <strong>Estado actual:</strong>{" "}
                                <span style={{
                                    backgroundColor: badgeColor(selectedHistory.application.status).bg,
                                    color: badgeColor(selectedHistory.application.status).color,
                                    padding: "3px 8px",
                                    borderRadius: "12px",
                                    fontWeight: "bold",
                                    fontSize: "0.85rem"
                                }}>
                                    {selectedHistory.application.status.toUpperCase()}
                                </span>
                            </p>
                        </div>

                        {selectedHistory.application.field && (
                            <div style={{
                                backgroundColor: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "6px",
                                padding: "0.75rem",
                                marginBottom: "1.25rem",
                                fontSize: "0.85rem",
                                color: "#334155"
                            }}>
                                <strong style={{ color: "#0f172a" }}>Datos registrados en la postulación:</strong>
                                <p style={{ margin: "0.25rem 0 0" }}>
                                    <strong>Candidato:</strong> {selectedHistory.application.candidate_name} ({selectedHistory.application.candidate_email})
                                </p>
                                <p style={{ margin: "0.25rem 0 0" }}>
                                    <strong>Área y experiencia:</strong> {selectedHistory.application.field} — {selectedHistory.application.experience_years ?? 0} año(s)
                                </p>
                                {selectedHistory.application.education && (
                                    <p style={{ margin: "0.25rem 0 0" }}>
                                        <strong>Educación:</strong> {selectedHistory.application.education}
                                    </p>
                                )}
                                {selectedHistory.application.experience && (
                                    <p style={{ margin: "0.25rem 0 0" }}>
                                        <strong>Detalle de experiencia:</strong> {selectedHistory.application.experience}
                                    </p>
                                )}
                            </div>
                        )}

                        <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Línea de tiempo de estados:</h3>
                        <div style={{ borderLeft: "2px solid #0284c7", paddingLeft: "1rem", marginLeft: "0.5rem" }}>
                            {selectedHistory.history && selectedHistory.history.length > 0 ? (
                                selectedHistory.history.map((item, idx) => (
                                    <div key={item.id || idx} style={{ marginBottom: "1rem", position: "relative" }}>
                                        <div style={{
                                            position: "absolute",
                                            left: "-1.4rem",
                                            top: "0.2rem",
                                            width: "10px",
                                            height: "10px",
                                            borderRadius: "50%",
                                            backgroundColor: "#0284c7"
                                        }} />
                                        <p style={{ margin: 0, fontWeight: "bold" }}>
                                            Estado: {item.status.toUpperCase()}
                                        </p>
                                        <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                                            {new Date(item.changed_at).toLocaleString("es-ES")}
                                        </p>
                                        {item.note && (
                                            <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "#334155" }}>
                                                Nota: {item.note}
                                            </p>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p style={{ fontSize: "0.9rem", color: "#64748b" }}>
                                    Sin cambios adicionales registrados.
                                </p>
                            )}
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                            <button
                                type="button"
                                onClick={() => setSelectedHistory(null)}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "6px",
                                    border: "1px solid #ccc",
                                    background: "#f9fafb",
                                    cursor: "pointer",
                                    fontWeight: "bold"
                                }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <LogoutButton />
        </main>
    );
}
