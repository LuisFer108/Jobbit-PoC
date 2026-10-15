"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "../components/LogoutButton";
import styles from "./page.module.css";

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
    <main className={styles.page}>
        <div className={styles.card}>

            {/* Cabecera */}
            <header className={styles.header}>
                <p className={styles.eyebrow}>Jobbit · Mi cuenta</p>

                <h1 className={styles.title}>
                    ¡Bienvenido/a, <span>{profile.name}</span>!
                </h1>

                <p className={styles.headerDescription}>
                    Consulta tu perfil laboral y encuentra oportunidades
                    que se adapten a ti.
                </p>
            </header>

            {/* Contenido */}
            <div className={styles.body}>
                <h2 className={styles.sectionTitle}>
                    Tu perfil laboral
                </h2>

                {/* Estado */}
                <div
                    className={`${styles.status} ${
                        profile.is_complete
                            ? styles.statusComplete
                            : styles.statusIncomplete
                    }`}
                    role="status"
                >
                    <span className={styles.statusIcon} aria-hidden="true">
                        {profile.is_complete ? "✓" : "⚠"}
                    </span>

                    <div>
                        <span className={styles.statusTitle}>
                            {profile.is_complete
                                ? "Perfil completo"
                                : "Perfil incompleto"}
                        </span>

                        <p className={styles.statusText}>
                            {profile.is_complete
                                ? "Tu perfil está habilitado para la postulación asistida."
                                : "Completa tu perfil para poder postularte a vacantes."}
                        </p>
                    </div>
                </div>

                {/* Información */}
                <div className={styles.detailsGrid}>
                    <div className={styles.detail}>
                        <span className={styles.detailLabel}>Campo profesional</span>
                        <span className={styles.detailValue}>
                            {profile.field}
                        </span>
                    </div>

                    <div className={styles.detail}>
                        <span className={styles.detailLabel}>Experiencia</span>
                        <span className={styles.detailValue}>
                            {profile.experience || "No especificada"}
                        </span>
                    </div>

                    <div className={styles.detail}>
                        <span className={styles.detailLabel}>Años de experiencia</span>
                        <span className={styles.detailValue}>
                            {profile.experience_years ?? 0}
                        </span>
                    </div>

                    <div className={styles.detail}>
                        <span className={styles.detailLabel}>Educación</span>
                        <span className={styles.detailValue}>
                            {profile.education || "No especificada"}
                        </span>
                    </div>

                    <div className={styles.detail}>
                        <span className={styles.detailLabel}>Modalidad de trabajo</span>
                        <span className={styles.detailValue}>
                            {modalidadTexto(profile.work_mode)}
                        </span>
                    </div>

                    <div className={styles.detail}>
                        <span className={styles.detailLabel}>Ubicación preferida</span>
                        <span className={styles.detailValue}>
                            {profile.preferred_location || "No especificada"}
                        </span>
                    </div>

                    <div className={styles.detail}>
                        <span className={styles.detailLabel}>Rango salarial esperado</span>
                        <span className={styles.detailValue}>
                            {profile.salary_range || "No especificado"}
                        </span>
                    </div>

                    <div className={styles.detail}>
                        <span className={styles.detailLabel}>Preferencias laborales</span>
                        <span className={styles.detailValue}>
                            {profile.work_preferences || "No especificadas"}
                        </span>
                    </div>
                </div>

                {/* Habilidades */}
                <section className={styles.skillsSection}>
                    <h2 className={styles.sectionTitle}>
                        Tus habilidades
                    </h2>

                    {userSkills.length > 0 ? (
                        <div className={styles.skills}>
                            {userSkills.map((s) => (
                                <span key={s.id} className={styles.skill}>
                                    {s.name}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.emptySkills}>
                            Aún no has seleccionado habilidades.
                            Puedes elegir hasta 5 para mejorar la
                            compatibilidad con las vacantes.
                        </p>
                    )}
                </section>

                {/* Acciones */}
                <nav className={styles.actions} aria-label="Acciones del perfil">
                    <Link
                        href="/compatibilidad"
                        className={styles.primaryButton}
                    >
                        🎯 Ver compatibilidad con vacantes
                    </Link>

                    <Link
                        href="/jobs"
                        className={styles.secondaryButton}
                    >
                        Explorar vacantes disponibles
                    </Link>

                    <Link
                        href="/profile/edit"
                        className={styles.secondaryButton}
                    >
                        ✎ Actualizar perfil laboral
                    </Link>
                </nav>

                {/* Cerrar sesión */}
                <div className={styles.logout}>
                    <LogoutButton />
                </div>
            </div>
        </div>
    </main>
);
}
