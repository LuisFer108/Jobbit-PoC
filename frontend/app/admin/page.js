"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "../components/LogoutButton";


export default function AdminPage() {
    const router = useRouter();
    const [summary, setSummary] = useState(null);
    const [message, setMessage] = useState("Verificando permisos...");
    const [skillsCatalog, setSkillsCatalog] = useState([]);

    // Estado del formulario de nueva vacante
    const [title, setTitle] = useState("");
    const [company, setCompany] = useState("");
    const [description, setDescription] = useState("");
    const [minExp, setMinExp] = useState(1);
    const [location, setLocation] = useState("Bogotá");
    const [workMode, setWorkMode] = useState("hybrid");
    const [salaryRange, setSalaryRange] = useState("2M - 5M");
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [creatingJob, setCreatingJob] = useState(false);
    const [jobFeedback, setJobFeedback] = useState(null);
    
    // Estado para listar las postulaciones en el panel de admin
    const [applications, setApplications] = useState([]);
    const [loadingApps, setLoadingApps] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function loadSummary() {
            const token = localStorage.getItem("token");

            if (!token) {
                router.replace("/login");
                return;
            }

            try {
                const [adminRes, skillsRes, appsRes] = await Promise.all([
                    fetch("http://localhost:5001/api/admin/summary", {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    fetch("http://localhost:5001/api/skills"),
                    fetch("http://localhost:5001/api/applications/all", {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);

                if (cancelled) return;

                if (adminRes.status === 401) {
                    localStorage.removeItem("token");
                    router.replace("/login");
                    return;
                }

                if (adminRes.status === 403) {
                    setMessage("No tienes permisos para acceder al panel administrativo.");
                    return;
                }

                if (!adminRes.ok) {
                    const data = await adminRes.json();
                    setMessage(data.message || "No fue posible cargar el panel.");
                    return;
                }

                const data = await adminRes.json();
                setSummary(data.summary);
                setMessage("");

                if (skillsRes.ok) {
                    const skillsData = await skillsRes.json();
                    setSkillsCatalog(skillsData.skills || []);
                }

                if (appsRes.ok) {
                    const appsData = await appsRes.json();
                    setApplications(appsData || []);
                }
            } catch {
                if (!cancelled) setMessage("No fue posible conectar con el servidor.");
            } finally {
                setLoadingApps(false);
            }
        }

        loadSummary();
        return () => { cancelled = true; };
    }, [router]);

    function toggleSkill(skillId) {
        setSelectedSkills((prev) =>
            prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
        );
    }

    async function handleStatusChange(applicationId, newStatus) {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`http://localhost:5001/api/applications/${applicationId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus, note: `Actualizado por administración a: ${newStatus}` })
            });

            if (res.ok) {
                setApplications((prev) =>
                    prev.map((app) => app.id === applicationId ? { ...app, status: newStatus } : app)
                );
            } else {
                alert("No se pudo actualizar el estado.");
            }
        } catch (error) {
            console.error("Error de conexión:", error);
        }
    }

    async function handleCreateJob(e) {
        e.preventDefault();
        setJobFeedback(null);
        setCreatingJob(true);

        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        try {
            const payload = {
                title,
                company,
                description,
                min_experience_years: parseInt(minExp, 10) || 0,
                location,
                work_mode: workMode,
                salary_range: salaryRange,
                skills: selectedSkills.map((id) => ({ skill_id: id, requirement: "must", weight: 2 }))
            };

            const res = await fetch("http://localhost:5001/api/jobs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                setJobFeedback({
                    error: true,
                    text: data.message || "Error al publicar la vacante"
                });
                return;
            }

            setJobFeedback({
                error: false,
                text: `¡Vacante publicada con éxito! Se evaluó la compatibilidad con los candidatos y se notificó automáticamente a ${data.notifiedCandidatesCount} candidato(s) con más del 90% de afinidad.`
            });

            // Limpiar formulario
            setTitle("");
            setCompany("");
            setDescription("");
            setSelectedSkills([]);
        } catch {
            setJobFeedback({
                error: true,
                text: "Error de conexión al publicar la vacante"
            });
        } finally {
            setCreatingJob(false);
        }
    }

    return (
        <main style={{ maxWidth: "800px", margin: "40px auto", padding: "24px", fontFamily: "var(--font-poppins), system-ui, sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h1 style={{ color: "#16182e", margin: 0 }}>Panel Administrativo</h1>
                <LogoutButton />
            </div>

            {message && <p role="status" style={{ color: "#dc2626", fontWeight: "bold" }}>{message}</p>}

            {summary && (
                <section style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
                    <div style={{ background: "#ffffff", padding: "16px 24px", borderRadius: "12px", border: "1px solid #e5e7eb", flex: 1, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                        <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Usuarios registrados</span>
                        <h2 style={{ margin: "6px 0 0", color: "#16182e" }}>{summary.total_users}</h2>
                    </div>
                    <div style={{ background: "#ffffff", padding: "16px 24px", borderRadius: "12px", border: "1px solid #e5e7eb", flex: 1, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                        <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Perfiles laborales</span>
                        <h2 style={{ margin: "6px 0 0", color: "#16182e" }}>{summary.total_profiles}</h2>
                    </div>
                </section>
            )}

            {/* Publicar nueva vacante con notificación automática a candidatos >90% */}
            <section style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", border: "1px solid #e5e7eb", boxShadow: "0 6px 20px rgba(0,0,0,0.06)" }}>
                <h2 style={{ marginTop: 0, color: "#16182e", fontSize: "1.3rem" }}>
                    Publicar nueva vacante
                </h2>
                <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: "20px" }}>
                    Al publicar una nueva vacante, el sistema evaluará la compatibilidad con todos los candidatos registrados y notificará en tiempo real a aquellos con más del <strong>90% de afinidad</strong> preguntándoles si desean aplicar.
                </p>

                {jobFeedback && (
                    <div style={{
                        padding: "12px 16px",
                        borderRadius: "10px",
                        marginBottom: "18px",
                        backgroundColor: jobFeedback.error ? "#fef2f2" : "#ecfdf5",
                        color: jobFeedback.error ? "#dc2626" : "#065f46",
                        border: `1px solid ${jobFeedback.error ? "#fecaca" : "#a7f3d0"}`
                    }}>
                        {jobFeedback.text}
                    </div>
                )}

                <form onSubmit={handleCreateJob} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                                Título de la vacante *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: Desarrollador Backend Senior"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                                Empresa
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: TechBogotá SAS"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                            Descripción
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Describe brevemente las responsabilidades del rol..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                        />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                                Años min. experiencia
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={20}
                                value={minExp}
                                onChange={(e) => setMinExp(e.target.value)}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                                Modalidad
                            </label>
                            <select
                                value={workMode}
                                onChange={(e) => setWorkMode(e.target.value)}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                            >
                                <option value="remote">Remoto</option>
                                <option value="hybrid">Híbrido</option>
                                <option value="onsite">Presencial</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                                Salario
                            </label>
                            <select
                                value={salaryRange}
                                onChange={(e) => setSalaryRange(e.target.value)}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                            >
                                <option value="Menos de 2M">Menos de 2M</option>
                                <option value="2M - 5M">2M - 5M</option>
                                <option value="Más de 5M">Más de 5M</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                            Ubicación
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: Bogotá o Remoto Colombia"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                        />
                    </div>

                    {skillsCatalog.length > 0 && (
                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px" }}>
                                Habilidades requeridas (selecciona las aplicables para el cálculo de afinidad):
                            </label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {skillsCatalog.map((s) => {
                                    const active = selectedSkills.includes(s.id);
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => toggleSkill(s.id)}
                                            style={{
                                                padding: "6px 12px",
                                                borderRadius: "20px",
                                                border: active ? "1px solid #f59f32" : "1px solid #d1d5db",
                                                backgroundColor: active ? "#fffbeb" : "#ffffff",
                                                color: active ? "#b45309" : "#4b5563",
                                                fontWeight: active ? "700" : "500",
                                                fontSize: "0.82rem",
                                                cursor: "pointer"
                                            }}
                                        >
                                            {active ? "✓ " : "+ "}{s.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={creatingJob}
                        style={{
                            marginTop: "10px",
                            padding: "12px 20px",
                            backgroundColor: "#f59f32",
                            color: "#16182e",
                            border: "none",
                            borderRadius: "10px",
                            fontWeight: "700",
                            fontSize: "1rem",
                            cursor: "pointer"
                        }}
                    >
                        {creatingJob ? "Publicando y notificando candidatos..." : "Publicar vacante y notificar candidatos (>90%)"}
                    </button>
                </form>
            </section>

            {/* Gestión de Postulaciones */}
            <section style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", border: "1px solid #e5e7eb", boxShadow: "0 6px 20px rgba(0,0,0,0.06)", marginTop: "24px" }}>
                <h2 style={{ marginTop: 0, color: "#16182e", fontSize: "1.3rem" }}>Gestión de Postulaciones</h2>
                {loadingApps ? (
                    <p style={{ color: "#6b7280" }}>Cargando postulaciones...</p>
                ) : applications.length === 0 ? (
                    <p style={{ color: "#6b7280" }}>No hay postulaciones registradas.</p>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                            <thead>
                                <tr style={{ borderBottom: "2px solid #e5e7eb", color: "#374151" }}>
                                    <th style={{ padding: "10px" }}>Candidato</th>
                                    <th style={{ padding: "10px" }}>Vacante</th>
                                    <th style={{ padding: "10px" }}>Estado</th>
                                    <th style={{ padding: "10px" }}>Cambiar Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {applications.map((app) => (
                                    <tr key={app.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                        <td style={{ padding: "12px 10px", fontWeight: "600" }}>{app.candidate_name}<br/><span style={{ fontSize: "0.8rem", color: "#6b7280" }}>{app.candidate_email}</span></td>
                                        <td style={{ padding: "12px 10px" }}>{app.job_title}</td>
                                        <td style={{ padding: "12px 10px" }}><span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "0.78rem", fontWeight: "700", backgroundColor: '#fffbeb', color: '#b45309' }}>{app.status}</span></td>
                                        <td style={{ padding: "12px 10px" }}>
                                            <select
                                                value={app.status}
                                                onChange={(e) => handleStatusChange(app.id, e.target.value)}
                                                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                                            >
                                                <option value="postulado">Postulado</option>
                                                <option value="en_revision">En revisión</option>
                                                <option value="aceptada">Aceptada</option>
                                                <option value="rechazada">Rechazada</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <div style={{ marginTop: "24px" }}>
                <Link href="/dashboard" style={{ color: "#4b5563", textDecoration: "none", fontSize: "0.9rem" }}>
                    ← Volver a mi cuenta
                </Link>
            </div>
        </main>
    );
}