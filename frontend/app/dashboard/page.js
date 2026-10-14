"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "../components/LogoutButton";

export default function DashboardPage() {

    

    const router = useRouter();

    const [profile, setProfile] = useState(null);
    const [userSkills, setUserSkills] = useState([]);

    useEffect(() => {
        async function getProfile() {
            const token = localStorage.getItem("token");

            if (!token) {
                router.push("/login");
                return;
            }

            try {
                const [profileRes, skillsRes] = await Promise.all([
                    fetch("http://localhost:5001/api/profile", {
                        headers: { "Authorization": `Bearer ${token}` }
                    }),
                    fetch("http://localhost:5001/api/skills/mine", {
                        headers: { "Authorization": `Bearer ${token}` }
                    })
                ]);

                if (!profileRes.ok) {
                    router.push("/profile");
                    return;
                }

                const data = await profileRes.json();
                setProfile(data);

                if (skillsRes.ok) {
                    const skillsData = await skillsRes.json();
                    setUserSkills(skillsData.skills || []);
                }
            } catch (err) {
                console.error("Error al cargar datos del dashboard:", err);
            }
        }

        getProfile();
    }, [router]);

    if (!profile) {
        return <p>Cargando...</p>;
    }

    function modalidadTexto(mode) {
        if (mode === "remote") return "Remoto";
        if (mode === "hybrid") return "Híbrido";
        if (mode === "onsite") return "Presencial";
        return mode || "No especificada";
    }

    return (
        <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
            <h1>Bienvenido/a {profile.name}</h1>

            <h2>Tu perfil laboral</h2>

            {profile.is_complete ? (
                <p style={{ color: "#16a34a", fontWeight: "bold" }}>
                    ✓ Estado del perfil: Completo (Habilitado para postulación asistida)
                </p>
            ) : (
                <p style={{ color: "#d97706", fontWeight: "bold" }}>
                    ⚠️ Estado del perfil: Incompleto (Debes completarlo para postularte a vacantes)
                </p>
            )}

            <p>
                <strong>Campo:</strong> {profile.field}
            </p>

            <p>
                <strong>Experiencia:</strong> {profile.experience || "No especificada"}
            </p>

            <p>
                <strong>Años:</strong> {profile.experience_years ?? 0}
            </p>

            <p>
                <strong>Educación:</strong> {profile.education || "No especificada"}
            </p>

            <p>
                <strong>Preferencias:</strong> {profile.work_preferences || "No especificadas"}
            </p>

            <p>
                <strong>Ubicación preferida:</strong> {profile.preferred_location || "No especificada"}
            </p>

            <p>
                <strong>Modalidad:</strong> {modalidadTexto(profile.work_mode)}
            </p>

            <p>
                <strong>Rango salarial esperado:</strong> {profile.salary_range || "No especificado"}
            </p>

            <div>
                <strong>Habilidades:</strong>{" "}
                {userSkills.length > 0 ? (
                    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "6px", marginLeft: "6px" }}>
                        {userSkills.map((s) => (
                            <span
                                key={s.id}
                                style={{
                                    background: "#e0e7ff",
                                    color: "#1e40af",
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    fontSize: "0.85rem"
                                }}
                            >
                                {s.name}
                            </span>
                        ))}
                    </span>
                ) : (
                    <span>No has seleccionado habilidades (puedes elegir hasta 5)</span>
                )}
            </div>

            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                    <Link
                        href="/compatibilidad"
                        style={{
                            display: "inline-block",
                            background: "#2563eb",
                            color: "#ffffff",
                            padding: "10px 18px",
                            borderRadius: "6px",
                            textDecoration: "none",
                            fontWeight: "bold",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                        }}
                    >
                        🎯 Ver compatibilidad con vacantes
                    </Link>
                </div>

                <p style={{ margin: 0 }}>
                    <Link href="/jobs">
                        Ver todas las vacantes disponibles
                    </Link>
                </p>

                <p style={{ margin: 0 }}>
                    <Link href="/profile/edit">
                        Actualizar perfil laboral
                    </Link>
                </p>
            </div>

            <div style={{ marginTop: "2rem" }}>
                <LogoutButton />
            </div>
        </main>
    );
}
