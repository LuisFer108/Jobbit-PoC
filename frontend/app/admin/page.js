"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LogoutButton from "../components/LogoutButton";
import styles from "./page.module.css";

export default function AdminPage() {
    const router = useRouter();

    // Estado de autorización y carga del panel (SCRUM-123, SCRUM-124)
    const [accessState, setAccessState] = useState("loading"); // "loading" | "authorized" | "forbidden" | "error"
    const [accessMessage, setAccessMessage] = useState("Verificando credenciales de administrador...");
    const [adminUser, setAdminUser] = useState(null);
    const [summary, setSummary] = useState(null);

    // Navegación interna del panel (SCRUM-125)
    // Pestañas: "overview" | "vacantes" | "postulaciones"
    const [activeTab, setActiveTab] = useState("overview");

    // Catálogo de habilidades y formulario de nueva vacante
    const [skillsCatalog, setSkillsCatalog] = useState([]);
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

    const loadAdminPanel = useCallback(async () => {
        const token = localStorage.getItem("token");

        if (!token) {
            router.replace("/login");
            return;
        }

        setAccessState("loading");
        setAccessMessage("Verificando permisos de administrador...");

        try {
            const adminRes = await fetch("http://localhost:5001/api/admin/summary", {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (adminRes.status === 401) {
                localStorage.removeItem("token");
                router.replace("/login");
                return;
            }

            if (adminRes.status === 403) {
                setAccessState("forbidden");
                setAccessMessage(
                    "Tu cuenta tiene perfil de candidato y no cuenta con permisos de administrador para acceder a esta sección."
                );
                return;
            }

            if (!adminRes.ok) {
                const errData = await adminRes.json().catch(() => ({}));
                setAccessState("error");
                setAccessMessage(errData.message || "No fue posible cargar el panel administrativo.");
                return;
            }

            const data = await adminRes.json();
            setSummary(data.summary);
            setAdminUser(data.admin || null);
            setAccessState("authorized");
            setAccessMessage("");

            // Cargar catálogo de habilidades enviando el token (solo cuando ya es admin)
            const skillsRes = await fetch("http://localhost:5001/api/skills", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (skillsRes.ok) {
                const skillsData = await skillsRes.json();
                setSkillsCatalog(skillsData.skills || []);
            }
        } catch {
            setAccessState("error");
            setAccessMessage("No fue posible conectar con el servidor. Verifica que el backend esté en ejecución.");
        }
    }, [router]);

    useEffect(() => {
        loadAdminPanel();
    }, [loadAdminPanel]);

    function toggleSkill(skillId) {
        setSelectedSkills((prev) =>
            prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
        );
    }

    async function handleCreateJob(e) {
        e.preventDefault();
        setJobFeedback(null);

        // Validaciones de datos en cliente (criterio de aceptación: mensajes de error claros)
        if (!title.trim()) {
            setJobFeedback({
                error: true,
                text: "Por favor ingresa el título de la vacante."
            });
            return;
        }

        const parsedExp = Number(minExp);
        if (minExp === "" || !Number.isInteger(parsedExp) || parsedExp < 0 || parsedExp > 50) {
            setJobFeedback({
                error: true,
                text: "Los años mínimos de experiencia deben ser un número entero entre 0 y 50."
            });
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
            router.replace("/login");
            return;
        }

        setCreatingJob(true);

        try {
            const payload = {
                title: title.trim(),
                company: company.trim(),
                description: description.trim(),
                min_experience_years: parsedExp,
                location: location.trim(),
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

            if (res.status === 401) {
                localStorage.removeItem("token");
                router.replace("/login");
                return;
            }

            if (res.status === 403) {
                setAccessState("forbidden");
                setAccessMessage("No tienes permisos de administrador para realizar esta acción.");
                return;
            }

            if (!res.ok) {
                setJobFeedback({
                    error: true,
                    text: data.message || "Error al publicar la vacante. Revisa los datos ingresados."
                });
                return;
            }

            setJobFeedback({
                error: false,
                text: `¡Vacante publicada con éxito! Se evaluó la compatibilidad con los candidatos y se notificó automáticamente a ${data.notifiedCandidatesCount} candidato(s) con más del 90% de afinidad.`
            });

            // Limpiar formulario y refrescar métricas del resumen
            setTitle("");
            setCompany("");
            setDescription("");
            setMinExp(1);
            setSelectedSkills([]);
            loadAdminPanel();
        } catch {
            setJobFeedback({
                error: true,
                text: "Error de conexión al publicar la vacante. Intenta nuevamente."
            });
        } finally {
            setCreatingJob(false);
        }
    }

    // 1. Vista mientras se verifican permisos
    if (accessState === "loading") {
        return (
            <main className={styles.page}>
                <div className={styles.card}>
                    <header className={styles.header}>
                        <p className={styles.eyebrow}>Jobbit · Administración</p>
                        <h1 className={styles.title}>Panel Administrativo</h1>
                    </header>
                    <div className={styles.body}>
                        <p className={styles.statusMessage} role="status">{accessMessage}</p>
                    </div>
                </div>
            </main>
        );
    }

    // 2. Vista de bloqueo para cuentas que NO son administrador (SCRUM-123, SCRUM-124)
    if (accessState === "forbidden") {
        return (
            <main className={styles.page}>
                <div className={styles.card}>
                    <header className={styles.header}>
                        <p className={styles.eyebrow}>Jobbit · Acceso restringido</p>
                        <h1 className={styles.title}>Sección exclusiva para administradores</h1>
                    </header>
                    <div className={styles.body}>
                        <div className={styles.alertError} role="alert">
                            <strong>Acceso denegado:</strong> {accessMessage}
                        </div>
                        <div className={styles.forbiddenActions}>
                            <Link href="/dashboard" className={styles.primaryButton}>
                                Ir a mi panel de candidato
                            </Link>
                            <LogoutButton className={styles.secondaryButton} />
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    // 3. Vista de error de conexión o servidor
    if (accessState === "error") {
        return (
            <main className={styles.page}>
                <div className={styles.card}>
                    <header className={styles.header}>
                        <p className={styles.eyebrow}>Jobbit · Administración</p>
                        <h1 className={styles.title}>Panel Administrativo</h1>
                    </header>
                    <div className={styles.body}>
                        <div className={styles.alertError} role="alert">
                            {accessMessage}
                        </div>
                        <div className={styles.forbiddenActions}>
                            <button
                                type="button"
                                onClick={loadAdminPanel}
                                className={styles.primaryButton}
                            >
                                Reintentar conexión
                            </button>
                            <LogoutButton className={styles.secondaryButton} />
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    // 4. Vista principal autorizada para administradores (SCRUM-122, SCRUM-125, SCRUM-126)
    return (
        <main className={styles.page}>
            <div className={styles.card}>
                {/* Cabecera del panel */}
                <header className={styles.header}>
                    <div className={styles.headerTop}>
                        <div className={styles.brandRow}>
                            <Image
                                src="/Logo-jobbit.svg"
                                alt="Jobbit"
                                width={115}
                                height={36}
                                priority
                            />
                            <span className={styles.adminBadge}>Administrador</span>
                        </div>
                        <LogoutButton className={styles.headerLogoutBtn} />
                    </div>

                    <p className={styles.eyebrow}>Jobbit · Panel Administrativo</p>
                    <h1 className={styles.title}>
                        ¡Hola, <span>{adminUser?.name || "Administrador"}</span>!
                    </h1>
                    <p className={styles.headerDescription}>
                        Supervisa la actividad del portal, publica vacantes con emparejamiento automático
                        y haz seguimiento a las postulaciones de los candidatos.
                    </p>
                </header>

                {/* Barra de navegación del panel (SCRUM-125) */}
                <nav className={styles.tabsNav} aria-label="Navegación del panel administrativo">
                    <button
                        type="button"
                        className={`${styles.tabButton} ${activeTab === "overview" ? styles.tabButtonActive : ""}`}
                        onClick={() => setActiveTab("overview")}
                    >
                        📊 Resumen y opciones
                    </button>
                    <button
                        type="button"
                        className={`${styles.tabButton} ${activeTab === "vacantes" ? styles.tabButtonActive : ""}`}
                        onClick={() => setActiveTab("vacantes")}
                    >
                        💼 Gestionar vacantes
                    </button>
                    <button
                        type="button"
                        className={`${styles.tabButton} ${activeTab === "postulaciones" ? styles.tabButtonActive : ""}`}
                        onClick={() => setActiveTab("postulaciones")}
                    >
                        📋 Gestionar postulaciones
                    </button>
                </nav>

                <div className={styles.body}>
                    {/* PESTAÑA 1: RESUMEN Y OPCIONES ADMINISTRATIVAS (SCRUM-126) */}
                    {activeTab === "overview" && (
                        <>
                            <section className={styles.section}>
                                <h2 className={styles.sectionTitle}>Métricas generales del portal</h2>
                                {summary && (
                                    <div className={styles.statsGrid}>
                                        <div className={styles.statCard}>
                                            <span className={styles.statLabel}>Usuarios registrados</span>
                                            <strong className={styles.statValue}>{summary.total_users ?? 0}</strong>
                                            <span className={styles.statHint}>
                                                {summary.total_candidates ?? summary.total_users ?? 0} candidato(s) en plataforma
                                            </span>
                                        </div>
                                        <div className={styles.statCard}>
                                            <span className={styles.statLabel}>Perfiles laborales</span>
                                            <strong className={styles.statValue}>{summary.total_profiles ?? 0}</strong>
                                            <span className={styles.statHint}>
                                                Hojas de vida y expectativas registradas
                                            </span>
                                        </div>
                                        <div className={styles.statCard}>
                                            <span className={styles.statLabel}>Vacantes activas</span>
                                            <strong className={styles.statValue}>{summary.active_jobs ?? 0}</strong>
                                            <span className={styles.statHint}>
                                                Disponibles para recomendación y match
                                            </span>
                                        </div>
                                        <div className={styles.statCard}>
                                            <span className={styles.statLabel}>Postulaciones recibidas</span>
                                            <strong className={styles.statValue}>{summary.total_applications ?? 0}</strong>
                                            <span className={styles.statHint}>
                                                Procesos de selección en seguimiento
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </section>

                            <section className={styles.section}>
                                <h2 className={styles.sectionTitle}>Opciones administrativas</h2>
                                <div className={styles.optionsGrid}>
                                    <article className={styles.optionCard}>
                                        <div>
                                            <span className={styles.optionTag}>Catálogo de ofertas</span>
                                            <h3 className={styles.optionTitle}>Crear y gestionar vacantes</h3>
                                            <p className={styles.optionDescription}>
                                                Publica nuevas oportunidades laborales definiendo habilidades clave,
                                                experiencia, modalidad y salario. El sistema notificará en tiempo real a
                                                los candidatos con más del 90% de compatibilidad.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className={styles.primaryButton}
                                            onClick={() => setActiveTab("vacantes")}
                                        >
                                            Ir a gestión de vacantes →
                                        </button>
                                    </article>

                                    <article className={styles.optionCard}>
                                        <div>
                                            <span className={styles.optionTag}>Procesos y candidatos</span>
                                            <h3 className={styles.optionTitle}>Gestionar postulaciones</h3>
                                            <p className={styles.optionDescription}>
                                                Consulta las postulaciones asistidas enviadas por los candidatos,
                                                filtra por estado y actualiza el avance de cada proceso rumbo a la
                                                entrevista.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className={styles.secondaryButton}
                                            onClick={() => setActiveTab("postulaciones")}
                                        >
                                            Ir a postulaciones →
                                        </button>
                                    </article>
                                </div>
                            </section>
                        </>
                    )}

                    {/* PESTAÑA 2: GESTIÓN DE VACANTES */}
                    {activeTab === "vacantes" && (
                        <section className={styles.section}>
                            <div className={styles.sectionHeaderRow}>
                                <h2 className={styles.sectionTitle}>Publicar nueva vacante</h2>
                                <button
                                    type="button"
                                    className={styles.backTabLink}
                                    onClick={() => setActiveTab("overview")}
                                >
                                    ← Volver al resumen
                                </button>
                            </div>
                            <p className={styles.sectionIntro}>
                                Al publicar una nueva vacante, Jobbit evalúa automáticamente la compatibilidad con todos
                                los perfiles registrados y envía una notificación en tiempo real a quienes superen el{" "}
                                <strong>90% de afinidad</strong> para invitarlos a postularse.
                            </p>

                            {jobFeedback && (
                                <div
                                    role={jobFeedback.error ? "alert" : "status"}
                                    className={jobFeedback.error ? styles.alertError : styles.alertSuccess}
                                >
                                    {jobFeedback.text}
                                </div>
                            )}

                            <form onSubmit={handleCreateJob} className={styles.form} noValidate>
                                <div className={styles.formGridTwo}>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label} htmlFor="job-title">
                                            Título de la vacante *
                                        </label>
                                        <input
                                            id="job-title"
                                            type="text"
                                            required
                                            placeholder="Ej: Desarrollador Backend Senior"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className={styles.input}
                                        />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label} htmlFor="job-company">
                                            Empresa
                                        </label>
                                        <input
                                            id="job-company"
                                            type="text"
                                            placeholder="Ej: TechBogotá SAS"
                                            value={company}
                                            onChange={(e) => setCompany(e.target.value)}
                                            className={styles.input}
                                        />
                                    </div>
                                </div>

                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="job-description">
                                        Descripción de la vacante
                                    </label>
                                    <textarea
                                        id="job-description"
                                        rows={3}
                                        placeholder="Describe las responsabilidades del rol y expectativas..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className={styles.textarea}
                                    />
                                </div>

                                <div className={styles.formGridThree}>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label} htmlFor="job-exp">
                                            Años mín. experiencia
                                        </label>
                                        <input
                                            id="job-exp"
                                            type="number"
                                            min={0}
                                            max={50}
                                            value={minExp}
                                            onChange={(e) => setMinExp(e.target.value)}
                                            className={styles.input}
                                        />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label} htmlFor="job-mode">
                                            Modalidad
                                        </label>
                                        <select
                                            id="job-mode"
                                            value={workMode}
                                            onChange={(e) => setWorkMode(e.target.value)}
                                            className={styles.select}
                                        >
                                            <option value="remote">Remoto</option>
                                            <option value="hybrid">Híbrido</option>
                                            <option value="onsite">Presencial</option>
                                        </select>
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label} htmlFor="job-salary">
                                            Rango salarial
                                        </label>
                                        <select
                                            id="job-salary"
                                            value={salaryRange}
                                            onChange={(e) => setSalaryRange(e.target.value)}
                                            className={styles.select}
                                        >
                                            <option value="Menos de 2M">Menos de 2M</option>
                                            <option value="2M - 5M">2M - 5M</option>
                                            <option value="Más de 5M">Más de 5M</option>
                                        </select>
                                    </div>
                                </div>

                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="job-location">
                                        Ubicación
                                    </label>
                                    <input
                                        id="job-location"
                                        type="text"
                                        placeholder="Ej: Bogotá, Medellín o Remoto Colombia"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>

                                {skillsCatalog.length > 0 && (
                                    <div className={styles.fieldGroup}>
                                        <span className={styles.label}>
                                            Habilidades requeridas (para el cálculo de compatibilidad):
                                        </span>
                                        <div className={styles.skillsList}>
                                            {skillsCatalog.map((s) => {
                                                const active = selectedSkills.includes(s.id);
                                                return (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        aria-pressed={active}
                                                        onClick={() => toggleSkill(s.id)}
                                                        className={`${styles.skillChip} ${active ? styles.skillChipActive : ""}`}
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
                                    className={styles.primaryButton}
                                >
                                    {creatingJob
                                        ? "Publicando y evaluando afinidad..."
                                        : "Publicar vacante y notificar candidatos (>90%)"}
                                </button>
                            </form>
                        </section>
                    )}

                    {/* PESTAÑA 3: GESTIÓN DE POSTULACIONES */}
                    {activeTab === "postulaciones" && (
                        <section className={styles.section}>
                            <div className={styles.sectionHeaderRow}>
                                <h2 className={styles.sectionTitle}>Seguimiento de postulaciones</h2>
                                <button
                                    type="button"
                                    className={styles.backTabLink}
                                    onClick={() => setActiveTab("overview")}
                                >
                                    ← Volver al resumen
                                </button>
                            </div>
                            <p className={styles.sectionIntro}>
                                Actualmente se han registrado{" "}
                                <strong>{summary?.total_applications ?? 0} postulación(es)</strong> en la plataforma.
                                Desde esta sección podrás filtrar, ordenar y actualizar el estado de las postulaciones
                                de los candidatos (En revisión, Entrevista / Aceptado, Rechazado).
                            </p>
                            <div className={styles.placeholderBox}>
                                <p>
                                    Módulo de gestión de postulaciones habilitado en el panel administrativo.
                                </p>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </main>
    );
}
