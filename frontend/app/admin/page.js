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

    // Gestión de postulaciones dentro del panel (SCRUM-7: integrado en la pestaña "postulaciones")
    const [applications, setApplications] = useState([]);
    const [loadingApps, setLoadingApps] = useState(true);
    const [appsError, setAppsError] = useState("");

    // Listado de vacantes en el panel administrativo (SCRUM-134)
    const [adminJobs, setAdminJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [jobsError, setJobsError] = useState("");

    // Estado del formulario/modal de edición de vacante (SCRUM-130)
    const [editingJobId, setEditingJobId] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [editCompany, setEditCompany] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editMinExp, setEditMinExp] = useState(0);
    const [editLocation, setEditLocation] = useState("");
    const [editWorkMode, setEditWorkMode] = useState("hybrid");
    const [editSalaryRange, setEditSalaryRange] = useState("2M - 5M");
    const [editStatus, setEditStatus] = useState("active");
    const [editSelectedSkills, setEditSelectedSkills] = useState([]);
    const [savingEdit, setSavingEdit] = useState(false);
    const [editFeedback, setEditFeedback] = useState(null);

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

            // Cargar todas las postulaciones del sistema (SCRUM-7: gestión de estados desde admin)
            setLoadingApps(true);
            setAppsError("");
            try {
                const appsRes = await fetch("http://localhost:5001/api/applications/all", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (appsRes.ok) {
                    const appsData = await appsRes.json();
                    setApplications(Array.isArray(appsData) ? appsData : []);
                } else {
                    setAppsError("No fue posible cargar las postulaciones.");
                }
            } catch {
                setAppsError("No fue posible cargar las postulaciones.");
            } finally {
                setLoadingApps(false);
            }

            // Cargar listado completo de vacantes para el administrador (SCRUM-134)
            setLoadingJobs(true);
            setJobsError("");
            try {
                const jobsRes = await fetch("http://localhost:5001/api/jobs/admin", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (jobsRes.ok) {
                    const jobsData = await jobsRes.json();
                    setAdminJobs(Array.isArray(jobsData) ? jobsData : []);
                } else {
                    setJobsError("No fue posible cargar el listado de vacantes.");
                }
            } catch {
                setJobsError("No fue posible cargar el listado de vacantes.");
            } finally {
                setLoadingJobs(false);
            }
        } catch {
            setAccessState("error");
            setAccessMessage("No fue posible conectar con el servidor. Verifica que el backend esté en ejecución.");
        }
    }, [router]);

    // SCRUM-23 (SCRUM-139): limpia inmediatamente todos los datos administrativos en memoria
    // cuando se cierra sesión o se detecta pérdida de token.
    const clearAdminSessionState = useCallback(() => {
        setAccessState("loading");
        setAccessMessage("Sesión finalizada. Redirigiendo al inicio de sesión...");
        setAdminUser(null);
        setSummary(null);
        setAdminJobs([]);
        setApplications([]);
        setEditingJobId(null);
    }, []);

    useEffect(() => {
        loadAdminPanel();
    }, [loadAdminPanel]);

    // SCRUM-23 (SCRUM-139): Garantizar que la sesión no quede abierta en ninguna instancia
    // (otras pestañas abiertas o restauración desde caché al usar el botón "Atrás").
    useEffect(() => {
        function handleStorageOrLogout(event) {
            // Si otra pestaña eliminó "token" de localStorage, cerrar esta instancia de inmediato
            if (event.type === "storage" && event.key === "token" && !event.newValue) {
                clearAdminSessionState();
                router.replace("/login");
                return;
            }
            if (event.type === "jobbit:logout") {
                clearAdminSessionState();
                router.replace("/login");
            }
        }

        function handlePageShow() {
            // Si el navegador intenta mostrar /admin al presionar "Atrás" después de cerrar sesión
            const currentToken = localStorage.getItem("token");
            if (!currentToken) {
                clearAdminSessionState();
                router.replace("/login");
            }
        }

        window.addEventListener("storage", handleStorageOrLogout);
        window.addEventListener("jobbit:logout", handleStorageOrLogout);
        window.addEventListener("pageshow", handlePageShow);

        return () => {
            window.removeEventListener("storage", handleStorageOrLogout);
            window.removeEventListener("jobbit:logout", handleStorageOrLogout);
            window.removeEventListener("pageshow", handlePageShow);
        };
    }, [clearAdminSessionState, router]);

    function toggleSkill(skillId) {
        setSelectedSkills((prev) =>
            prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
        );
    }

    function modalidadTexto(mode) {
        if (mode === "remote") return "Remoto";
        if (mode === "hybrid") return "Híbrido";
        if (mode === "onsite") return "Presencial";
        return mode || "No especificada";
    }

    function openEditJobModal(job) {
        setEditingJobId(job.id);
        setEditTitle(job.title || "");
        setEditCompany(job.company || "");
        setEditDescription(job.description || "");
        setEditMinExp(job.min_experience_years ?? 0);
        setEditLocation(job.location || "");
        setEditWorkMode(job.work_mode || "hybrid");
        setEditSalaryRange(job.salary_range || "2M - 5M");
        setEditStatus(job.status || "active");
        const currentSkillIds = Array.isArray(job.skills)
            ? job.skills.map((s) => s.skill_id).filter(Boolean)
            : [];
        setEditSelectedSkills(currentSkillIds);
        setEditFeedback(null);
    }

    function closeEditJobModal() {
        setEditingJobId(null);
        setEditFeedback(null);
    }

    function toggleEditSkill(skillId) {
        setEditSelectedSkills((prev) =>
            prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
        );
    }

    async function handleUpdateJob(e) {
        e.preventDefault();
        setEditFeedback(null);

        // Validaciones en cliente (SCRUM-132)
        if (!editTitle.trim() || editTitle.trim().length < 3) {
            setEditFeedback({
                error: true,
                text: "El título de la vacante es obligatorio y debe tener al menos 3 caracteres."
            });
            return;
        }

        if (!editCompany.trim()) {
            setEditFeedback({
                error: true,
                text: "Por favor ingresa el nombre de la empresa."
            });
            return;
        }

        if (!editLocation.trim()) {
            setEditFeedback({
                error: true,
                text: "Por favor ingresa la ubicación de la vacante."
            });
            return;
        }

        const parsedExp = Number(editMinExp);
        if (editMinExp === "" || !Number.isInteger(parsedExp) || parsedExp < 0 || parsedExp > 50) {
            setEditFeedback({
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

        setSavingEdit(true);

        try {
            const payload = {
                title: editTitle.trim(),
                company: editCompany.trim(),
                description: editDescription.trim(),
                min_experience_years: parsedExp,
                location: editLocation.trim(),
                work_mode: editWorkMode,
                salary_range: editSalaryRange,
                status: editStatus,
                skills: editSelectedSkills.map((id) => ({ skill_id: id, requirement: "must", weight: 2 }))
            };

            const res = await fetch(`http://localhost:5001/api/jobs/${editingJobId}`, {
                method: "PUT",
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

            if (!res.ok) {
                setEditFeedback({
                    error: true,
                    text: data.message || "No se pudo actualizar la vacante. Revisa los datos ingresados."
                });
                return;
            }

            // Mostrar mensaje de éxito en la pestaña de vacantes, cerrar modal y recargar datos desde BD
            setJobFeedback({
                error: false,
                text: `¡La vacante "${editTitle.trim()}" fue modificada y guardada correctamente en la base de datos!`
            });
            closeEditJobModal();
            loadAdminPanel();
        } catch {
            setEditFeedback({
                error: true,
                text: "Error de conexión al guardar los cambios de la vacante."
            });
        } finally {
            setSavingEdit(false);
        }
    }

    // Etiqueta amigable para cada estado de postulación
    function estadoTexto(status) {
        switch (status) {
            case "postulado": return "Postulado";
            case "en_revision": return "En revisión";
            case "aceptada": return "Aceptada";
            case "rechazada": return "Rechazada";
            default: return status || "—";
        }
    }

    async function handleStatusChange(applicationId, newStatus) {
        const token = localStorage.getItem("token");
        if (!token) {
            router.replace("/login");
            return;
        }

        // Guardar el estado previo para poder revertir si falla
        const previous = applications.find((a) => a.id === applicationId)?.status;

        // Actualización optimista
        setApplications((prev) =>
            prev.map((app) => (app.id === applicationId ? { ...app, status: newStatus } : app))
        );

        try {
            const res = await fetch(`http://localhost:5001/api/applications/${applicationId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: newStatus,
                    note: `Actualizado por administración a: ${newStatus}`
                })
            });

            if (res.status === 401) {
                localStorage.removeItem("token");
                clearAdminSessionState();
                router.replace("/login");
                return;
            }

            if (res.status === 403) {
                setAccessState("forbidden");
                setAccessMessage("No tienes permisos de administrador para realizar esta acción.");
                return;
            }

            if (!res.ok) {
                // Revertir si el servidor rechaza el cambio
                setApplications((prev) =>
                    prev.map((app) => (app.id === applicationId ? { ...app, status: previous } : app))
                );
                setAppsError("No se pudo actualizar el estado de la postulación. Intenta de nuevo.");
            }
        } catch {
            setApplications((prev) =>
                prev.map((app) => (app.id === applicationId ? { ...app, status: previous } : app))
            );
            setAppsError("Error de conexión al actualizar el estado.");
        }
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
                        <LogoutButton
                            className={styles.headerLogoutBtn}
                            onLogout={clearAdminSessionState}
                        />
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

                            {/* LISTADO DE VACANTES PARA EL ADMINISTRADOR (SCRUM-134) */}
                            <div className={styles.sectionHeaderRow} style={{ marginTop: "32px" }}>
                                <h2 className={styles.sectionTitle}>
                                    Vacantes registradas ({adminJobs.length})
                                </h2>
                            </div>
                            <p className={styles.sectionIntro}>
                                Consulta todas las vacantes almacenadas en PostgreSQL y haz clic en{" "}
                                <strong>Editar vacante</strong> para corregir información, actualizar habilidades o
                                cambiar su estado (Activa / Inactiva).
                            </p>

                            {jobsError && (
                                <div role="alert" className={styles.alertError}>
                                    {jobsError}
                                </div>
                            )}

                            {loadingJobs ? (
                                <p className={styles.statusMessage}>Cargando catálogo de vacantes...</p>
                            ) : adminJobs.length === 0 ? (
                                <div className={styles.placeholderBox}>
                                    <p>No hay vacantes registradas todavía. Usa el formulario superior para crear la primera.</p>
                                </div>
                            ) : (
                                <div className={styles.jobsAdminList}>
                                    {adminJobs.map((job) => (
                                        <article key={job.id} className={styles.jobAdminCard}>
                                            <div className={styles.jobAdminHeader}>
                                                <div>
                                                    <div className={styles.jobTitleRow}>
                                                        <h3 className={styles.jobAdminTitle}>{job.title}</h3>
                                                        <span
                                                            className={`${styles.jobStatusBadge} ${
                                                                job.status === "active"
                                                                    ? styles.jobStatusActive
                                                                    : styles.jobStatusInactive
                                                            }`}
                                                        >
                                                            {job.status === "active" ? "Activa" : "Inactiva"}
                                                        </span>
                                                    </div>
                                                    <p className={styles.jobAdminCompany}>
                                                        {job.company || "Jobbit Partner"} · 📍 {job.location || "Remoto"}
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => openEditJobModal(job)}
                                                    className={styles.secondaryButton}
                                                >
                                                    ✎ Editar vacante
                                                </button>
                                            </div>

                                            {job.description && (
                                                <p className={styles.jobAdminDesc}>{job.description}</p>
                                            )}

                                            <div className={styles.jobAdminMeta}>
                                                <span>💼 {modalidadTexto(job.work_mode)}</span>
                                                <span>⏳ Mín. {job.min_experience_years ?? 0} año(s)</span>
                                                <span>💰 {job.salary_range || "No especificado"}</span>
                                                <span>📋 {job.applications_count ?? 0} postulación(es)</span>
                                            </div>

                                            {Array.isArray(job.skills) && job.skills.length > 0 && (
                                                <div className={styles.jobAdminSkills}>
                                                    {job.skills.map((sk) => (
                                                        <span key={sk.skill_id} className={styles.jobSkillTag}>
                                                            {sk.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* PESTAÑA 3: GESTIÓN DE POSTULACIONES (SCRUM-7 integrado en el panel de SCRUM-21) */}
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
                                Se han registrado{" "}
                                <strong>{summary?.total_applications ?? applications.length} postulación(es)</strong> en la plataforma.
                                Actualiza el estado de cada proceso para llevar a los candidatos rumbo a la entrevista.
                            </p>

                            {appsError && (
                                <div role="alert" className={styles.alertError}>
                                    {appsError}
                                </div>
                            )}

                            {loadingApps ? (
                                <p className={styles.statusMessage}>Cargando postulaciones...</p>
                            ) : applications.length === 0 ? (
                                <div className={styles.placeholderBox}>
                                    <p>Aún no hay postulaciones registradas en la plataforma.</p>
                                </div>
                            ) : (
                                <div className={styles.tableWrapper}>
                                    <table className={styles.appsTable}>
                                        <thead>
                                            <tr>
                                                <th>Candidato</th>
                                                <th>Vacante</th>
                                                <th>Estado</th>
                                                <th>Cambiar estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {applications.map((app) => (
                                                <tr key={app.id}>
                                                    <td>
                                                        <span className={styles.candidateName}>{app.candidate_name}</span>
                                                        <span className={styles.candidateEmail}>{app.candidate_email}</span>
                                                    </td>
                                                    <td>{app.job_title}</td>
                                                    <td>
                                                        <span className={`${styles.statusBadge} ${styles[`status_${app.status}`] || ""}`}>
                                                            {estadoTexto(app.status)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={app.status}
                                                            onChange={(e) => handleStatusChange(app.id, e.target.value)}
                                                            className={styles.select}
                                                            aria-label={`Cambiar estado de la postulación de ${app.candidate_name}`}
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
                    )}

                    {/* Pie de cierre de sesión seguro (SCRUM-23 / SCRUM-136) */}
                    <div className={styles.footerLogout}>
                        <LogoutButton
                            className={styles.secondaryButton}
                            onLogout={clearAdminSessionState}
                        />
                    </div>
                </div>
            </div>

            {/* MODAL / FORMULARIO DE EDICIÓN DE VACANTE (SCRUM-130) */}
            {editingJobId !== null && (
                <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="edit-job-title">
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3 id="edit-job-title" className={styles.modalTitle}>
                                Editar vacante #{editingJobId}
                            </h3>
                            <button
                                type="button"
                                onClick={closeEditJobModal}
                                className={styles.modalCloseBtn}
                                aria-label="Cerrar ventana de edición"
                            >
                                ✕
                            </button>
                        </div>

                        {editFeedback && (
                            <div
                                role={editFeedback.error ? "alert" : "status"}
                                className={editFeedback.error ? styles.alertError : styles.alertSuccess}
                            >
                                {editFeedback.text}
                            </div>
                        )}

                        <form onSubmit={handleUpdateJob} className={styles.form} noValidate>
                            <div className={styles.formGridTwo}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="edit-title">
                                        Título de la vacante *
                                    </label>
                                    <input
                                        id="edit-title"
                                        type="text"
                                        required
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="edit-company">
                                        Empresa *
                                    </label>
                                    <input
                                        id="edit-company"
                                        type="text"
                                        required
                                        value={editCompany}
                                        onChange={(e) => setEditCompany(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="edit-description">
                                    Descripción de la vacante
                                </label>
                                <textarea
                                    id="edit-description"
                                    rows={3}
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className={styles.textarea}
                                />
                            </div>

                            <div className={styles.formGridThree}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="edit-exp">
                                        Años mín. experiencia *
                                    </label>
                                    <input
                                        id="edit-exp"
                                        type="number"
                                        min={0}
                                        max={50}
                                        value={editMinExp}
                                        onChange={(e) => setEditMinExp(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="edit-mode">
                                        Modalidad
                                    </label>
                                    <select
                                        id="edit-mode"
                                        value={editWorkMode}
                                        onChange={(e) => setEditWorkMode(e.target.value)}
                                        className={styles.select}
                                    >
                                        <option value="remote">Remoto</option>
                                        <option value="hybrid">Híbrido</option>
                                        <option value="onsite">Presencial</option>
                                    </select>
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="edit-salary">
                                        Rango salarial
                                    </label>
                                    <select
                                        id="edit-salary"
                                        value={editSalaryRange}
                                        onChange={(e) => setEditSalaryRange(e.target.value)}
                                        className={styles.select}
                                    >
                                        <option value="Menos de 2M">Menos de 2M</option>
                                        <option value="2M - 5M">2M - 5M</option>
                                        <option value="Más de 5M">Más de 5M</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formGridTwo}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="edit-location">
                                        Ubicación *
                                    </label>
                                    <input
                                        id="edit-location"
                                        type="text"
                                        required
                                        value={editLocation}
                                        onChange={(e) => setEditLocation(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="edit-status">
                                        Estado de la vacante
                                    </label>
                                    <select
                                        id="edit-status"
                                        value={editStatus}
                                        onChange={(e) => setEditStatus(e.target.value)}
                                        className={styles.select}
                                    >
                                        <option value="active">Activa (visible para candidatos)</option>
                                        <option value="inactive">Inactiva (oculta para candidatos)</option>
                                    </select>
                                </div>
                            </div>

                            {skillsCatalog.length > 0 && (
                                <div className={styles.fieldGroup}>
                                    <span className={styles.label}>
                                        Habilidades requeridas:
                                    </span>
                                    <div className={styles.skillsList}>
                                        {skillsCatalog.map((s) => {
                                            const active = editSelectedSkills.includes(s.id);
                                            return (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    aria-pressed={active}
                                                    onClick={() => toggleEditSkill(s.id)}
                                                    className={`${styles.skillChip} ${active ? styles.skillChipActive : ""}`}
                                                >
                                                    {active ? "✓ " : "+ "}{s.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={closeEditJobModal}
                                    className={styles.secondaryButton}
                                    disabled={savingEdit}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className={styles.primaryButton}
                                >
                                    {savingEdit ? "Guardando cambios..." : "Guardar cambios en la vacante"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
