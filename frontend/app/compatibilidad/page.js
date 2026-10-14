"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "../components/LogoutButton";

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

    function headers() {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        };
    }

    async function request(path, options = {}) {
        const res = await fetch(`${API}${path}`, {
            ...options,
            headers: { ...headers(), ...(options.headers || {}) }
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
            setMessage(data.message || "Crea tu perfil laboral para ver tu compatibilidad.");
            return;
        }
        if (!res.ok) {
            setMessage(data.message || "Error al calcular compatibilidad");
            return;
        }
        setRecs(data.recommendations || []);
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

                await loadRecs();
            } catch (err) {
                setMessage("No fue posible conectar con el servidor. Intenta nuevamente.");
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
        } else {
            if (selected.length >= 5) {
                setMessage("Solo puedes seleccionar un máximo de 5 habilidades.");
                return;
            }
            setMessage("");
            setSelected([...selected, id]);
        }
    }

    async function saveSkills() {
        setMessage("");
        setSaving(true);
        try {
            const res = await request("/skills/mine", {
                method: "PUT",
                body: JSON.stringify({ skillIds: selected })
            });
            if (!res) return;
            const data = await res.json();
            if (res.ok) {
                setMessage("✓ Habilidades actualizadas. Recalculando compatibilidad...");
                await loadRecs();
            } else {
                setMessage(data.message || "No se pudieron guardar las habilidades.");
            }
        } catch {
            setMessage("Error de conexión al guardar habilidades.");
        } finally {
            setSaving(false);
        }
    }

    function color(score) {
        if (score >= 70) return "#16a34a"; // Verde - alta
        if (score >= 40) return "#d97706"; // Ámbar - media
        return "#dc2626"; // Rojo - baja
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

    return (
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1.5rem", fontFamily: "inherit" }}>
            <div style={{ marginBottom: "1.5rem" }}>
                <Link
                    href="/dashboard"
                    style={{
                        color: "#2563eb",
                        textDecoration: "none",
                        fontWeight: "500",
                        display: "inline-block",
                        marginBottom: "0.5rem"
                    }}
                >
                    ← Volver a mi inicio
                </Link>
                <h1 style={{ margin: "0.5rem 0", fontSize: "1.9rem" }}>
                    🎯 Nivel de Compatibilidad de Vacantes
                </h1>
                <p style={{ color: "#555", margin: 0 }}>
                    Calculamos la afinidad de cada vacante contigo según tus habilidades, experiencia,
                    expectativa salarial, ubicación y modalidad de trabajo.
                </p>
            </div>

            {/* SECCIÓN DE HABILIDADES DEL USUARIO */}
            <section
                style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "1.25rem",
                    marginBottom: "2rem"
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                        <h2 style={{ margin: "0 0 0.25rem 0", fontSize: "1.2rem" }}>
                            Tus habilidades seleccionadas
                        </h2>
                        <small style={{ color: "#64748b" }}>
                            Selecciona hasta 5 habilidades ({selected.length}/5 seleccionadas) para afinar tu recomendación
                        </small>
                    </div>
                    <button
                        type="button"
                        onClick={saveSkills}
                        disabled={saving}
                        style={{
                            background: "#2563eb",
                            color: "#fff",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: 6,
                            cursor: saving ? "not-allowed" : "pointer",
                            fontWeight: "bold",
                            fontSize: "0.9rem"
                        }}
                    >
                        {saving ? "Guardando..." : "Guardar y recalcular"}
                    </button>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: "1rem" }}>
                    {catalog.map((s) => {
                        const isSelected = selected.includes(s.id);
                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => toggle(s.id)}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: 16,
                                    border: isSelected ? "1px solid #2563eb" : "1px solid #cbd5e1",
                                    background: isSelected ? "#2563eb" : "#ffffff",
                                    color: isSelected ? "#ffffff" : "#1e293b",
                                    cursor: "pointer",
                                    fontSize: "0.85rem",
                                    transition: "all 0.15s ease-in-out"
                                }}
                            >
                                {isSelected ? "✓ " : "+ "}
                                {s.name}
                            </button>
                        );
                    })}
                </div>

                {message && (
                    <p
                        role="status"
                        style={{
                            marginTop: "0.75rem",
                            marginBottom: 0,
                            color: message.startsWith("✓") ? "#16a34a" : "#dc2626",
                            fontWeight: "500",
                            fontSize: "0.9rem"
                        }}
                    >
                        {message}
                    </p>
                )}
            </section>

            {/* LISTADO DE VACANTES ORDENADAS POR COMPATIBILIDAD (SCRUM-104) */}
            <section>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
                    <h2 style={{ margin: 0, fontSize: "1.3rem" }}>
                        Vacantes sugeridas (ordenadas por afinidad)
                    </h2>
                    <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                        {recs.length} vacante(s) evaluada(s)
                    </span>
                </div>

                {loading && <p>Calculando afinidad con las vacantes disponibles...</p>}

                {noProfile && !loading && (
                    <div
                        style={{
                            padding: "1.5rem",
                            border: "1px dashed #cbd5e1",
                            borderRadius: 8,
                            textAlign: "center"
                        }}
                    >
                        <p style={{ margin: "0 0 1rem 0" }}>
                            Aún no has registrado tu perfil laboral.
                        </p>
                        <Link
                            href="/profile"
                            style={{
                                background: "#2563eb",
                                color: "#fff",
                                padding: "8px 16px",
                                borderRadius: 6,
                                textDecoration: "none"
                            }}
                        >
                            Crear perfil laboral
                        </Link>
                    </div>
                )}

                {!loading && !noProfile && recs.length === 0 && (
                    <p>No hay vacantes activas en este momento.</p>
                )}

                {!loading &&
                    recs.map((r, index) => {
                        const scoreColor = color(r.score);
                        return (
                            <article
                                key={r.id}
                                style={{
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 10,
                                    padding: "1.25rem",
                                    marginBottom: "1.25rem",
                                    background: "#ffffff",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
                                }}
                            >
                                {/* Encabezado con título, empresa y porcentaje (SCRUM-103) */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "bold" }}>
                                                #{index + 1}
                                            </span>
                                            <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a" }}>
                                                {r.title}
                                            </h3>
                                        </div>
                                        <p style={{ margin: "0.25rem 0", color: "#475569", fontWeight: "600", fontSize: "0.95rem" }}>
                                            {r.company || "Empresa confidencial"}
                                        </p>
                                    </div>

                                    <div style={{ textAlign: "right", minWidth: 120 }}>
                                        <span
                                            style={{
                                                fontSize: "1.75rem",
                                                fontWeight: "800",
                                                color: scoreColor
                                            }}
                                        >
                                            {r.score}%
                                        </span>
                                        <div>
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    fontSize: "0.75rem",
                                                    fontWeight: "bold",
                                                    padding: "2px 8px",
                                                    borderRadius: 12,
                                                    background: `${scoreColor}20`,
                                                    color: scoreColor
                                                }}
                                            >
                                                {badgeLabel(r.score)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Barra de porcentaje visual */}
                                <div
                                    style={{
                                        background: "#e2e8f0",
                                        borderRadius: 6,
                                        height: 8,
                                        marginTop: 10,
                                        marginBottom: 12,
                                        overflow: "hidden"
                                    }}
                                >
                                    <div
                                        style={{
                                            width: `${r.score}%`,
                                            height: "100%",
                                            borderRadius: 6,
                                            background: scoreColor,
                                            transition: "width 0.4s ease-in-out"
                                        }}
                                    />
                                </div>

                                {/* Descripción */}
                                <p style={{ margin: "0.5rem 0 0.75rem 0", color: "#334155", fontSize: "0.95rem", lineHeight: "1.4" }}>
                                    {r.description}
                                </p>

                                {/* Metadatos de la vacante */}
                                <div
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "12px",
                                        fontSize: "0.85rem",
                                        color: "#475569",
                                        marginBottom: "0.75rem"
                                    }}
                                >
                                    <span>📍 {r.location || "Colombia"}</span>
                                    <span>🏢 {modalidadTexto(r.work_mode)}</span>
                                    <span>⏳ Exp. mínima: {r.min_experience_years ?? 0} año(s)</span>
                                    <span>💰 Salario: {r.salary_range || "Por definir"}</span>
                                </div>

                                {/* Habilidades requeridas y estado de coincidencia */}
                                {r.skills && r.skills.length > 0 && (
                                    <div style={{ marginTop: "0.5rem", marginBottom: "0.75rem" }}>
                                        <strong style={{ fontSize: "0.8rem", color: "#475569" }}>
                                            Habilidades requeridas:
                                        </strong>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                                            {r.skills.map((s) => (
                                                <span
                                                    key={s.skill_id}
                                                    style={{
                                                        padding: "2px 8px",
                                                        borderRadius: 12,
                                                        fontSize: "0.75rem",
                                                        fontWeight: s.matched ? "bold" : "normal",
                                                        border: s.matched ? "1px solid #16a34a" : "1px solid #cbd5e1",
                                                        background: s.matched ? "#dcfce7" : "#f1f5f9",
                                                        color: s.matched ? "#15803d" : "#475569"
                                                    }}
                                                >
                                                    {s.matched ? "✓ " : ""}{s.name}{" "}
                                                    {s.requirement === "must" ? "(Obligatoria)" : "(Deseable)"}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Desglose de compatibilidad (Breakdown de pesos SCRUM-95 a 100) */}
                                <div
                                    style={{
                                        background: "#f8fafc",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: 6,
                                        padding: "6px 10px",
                                        fontSize: "0.8rem",
                                        color: "#475569",
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "12px"
                                    }}
                                >
                                    <span>💡 Habilidades: <strong>{r.breakdown.skills}%</strong></span>
                                    <span>⏳ Experiencia: <strong>{r.breakdown.experience}%</strong></span>
                                    <span>💰 Salario: <strong>{r.breakdown.salary}%</strong></span>
                                    <span>📍 Ubicación: <strong>{r.breakdown.location}%</strong></span>
                                    <span>🏢 Modalidad: <strong>{r.breakdown.mode}%</strong></span>
                                </div>
                            </article>
                        );
                    })}
            </section>

            <div style={{ marginTop: "2rem" }}>
                <LogoutButton />
            </div>
        </main>
    );
}