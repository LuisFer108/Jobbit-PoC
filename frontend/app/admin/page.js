"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LogoutButton from "../components/LogoutButton";
import SkillSelector from "../components/SkillSelector";
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
    const [appsSuccess, setAppsSuccess] = useState("");
    const [candidatesList, setCandidatesList] = useState([]);

    // Filtros y ordenamiento de postulaciones (SCRUM-27: SCRUM-172 a SCRUM-177)
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterOfferId, setFilterOfferId] = useState("all");
    const [filterWorkMode, setFilterWorkMode] = useState("all");
    const [filterMinExp, setFilterMinExp] = useState("");
    const [filterSearch, setFilterSearch] = useState("");
    const [sortByApps, setSortByApps] = useState("date_desc");

    // Modal de edición de postulación (SCRUM-168)
    const [editingAppId, setEditingAppId] = useState(null);
    const [editAppOfferId, setEditAppOfferId] = useState("");
    const [editAppStatus, setEditAppStatus] = useState("postulado");
    const [editAppName, setEditAppName] = useState("");
    const [editAppEmail, setEditAppEmail] = useState("");
    const [editAppField, setEditAppField] = useState("");
    const [editAppExpYears, setEditAppExpYears] = useState(0);
    const [editAppExperience, setEditAppExperience] = useState("");
    const [editAppEducation, setEditAppEducation] = useState("");
    const [editAppPreferences, setEditAppPreferences] = useState("");
    const [editAppLocation, setEditAppLocation] = useState("");
    const [editAppWorkMode, setEditAppWorkMode] = useState("hybrid");
    const [editAppCoverLetter, setEditAppCoverLetter] = useState("");
    const [editAppNote, setEditAppNote] = useState("");
    const [editAppSyncUser, setEditAppSyncUser] = useState(true);
    const [savingAppEdit, setSavingAppEdit] = useState(false);
    const [editAppFeedback, setEditAppFeedback] = useState(null);

    // Modal de creación de postulación desde admin (SCRUM-28 / SCRUM-171)
    const [creatingAppModal, setCreatingAppModal] = useState(false);
    const [newAppUserId, setNewAppUserId] = useState("");
    const [newAppOfferId, setNewAppOfferId] = useState("");
    const [newAppStatus, setNewAppStatus] = useState("postulado");
    const [newAppName, setNewAppName] = useState("");
    const [newAppEmail, setNewAppEmail] = useState("");
    const [newAppField, setNewAppField] = useState("");
    const [newAppExpYears, setNewAppExpYears] = useState(0);
    const [newAppLocation, setNewAppLocation] = useState("");
    const [newAppWorkMode, setNewAppWorkMode] = useState("hybrid");
    const [newAppCoverLetter, setNewAppCoverLetter] = useState("");
    const [savingNewApp, setSavingNewApp] = useState(false);
    const [newAppFeedback, setNewAppFeedback] = useState(null);

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

    // Limpiar el mensaje de feedback al cambiar de pestaña para que no quede flotando
    useEffect(() => {
        setJobFeedback(null);
    }, [activeTab]);

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

            // Cargar catálogo de habilidades enviando el token
            const skillsRes = await fetch("http://localhost:5001/api/skills", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (skillsRes.ok) {
                const skillsData = await skillsRes.json();
                setSkillsCatalog(skillsData.skills || []);
            }

            // Cargar todas las postulaciones del sistema
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

                // Cargar la lista de candidatos para crear postulaciones desde admin (SCRUM-28)
                const candidatesRes = await fetch("http://localhost:5001/api/applications/candidates", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (candidatesRes.ok) {
                    const candidatesData = await candidatesRes.json();
                    setCandidatesList(Array.isArray(candidatesData) ? candidatesData : []);
                }
            } catch {
                setAppsError("No fue posible cargar las postulaciones.");
            } finally {
                setLoadingApps(false);
            }

            // Cargar listado completo de vacantes para el administrador
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

    const clearAdminSessionState = useCallback(() => {
        setAccessState("loading");
        setAccessMessage("Sesión finalizada. Redirigiendo al inicio de sesión...");
        setAdminUser(null);
        setSummary(null);
        setAdminJobs([]);
        setApplications([]);
        setEditingJobId(null);
        setEditingAppId(null);
        setCreatingAppModal(false);
        setCandidatesList([]);
    }, []);

    // SCRUM-27: consulta GET /api/applications/all con los filtros y el orden seleccionados
    const fetchFilteredApplications = useCallback(async (customFilters = {}) => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const statusVal = customFilters.status !== undefined ? customFilters.status : filterStatus;
        const offerVal = customFilters.offerId !== undefined ? customFilters.offerId : filterOfferId;
        const modeVal = customFilters.workMode !== undefined ? customFilters.workMode : filterWorkMode;
        const minExpVal = customFilters.minExperience !== undefined ? customFilters.minExperience : filterMinExp;
        const searchVal = customFilters.search !== undefined ? customFilters.search : filterSearch;
        const sortVal = customFilters.sortBy !== undefined ? customFilters.sortBy : sortByApps;

        const query = new URLSearchParams();
        if (statusVal && statusVal !== "all") query.set("status", statusVal);
        if (offerVal && offerVal !== "all") query.set("offerId", offerVal);
        if (modeVal && modeVal !== "all") query.set("workMode", modeVal);
        if (minExpVal !== "" && minExpVal !== null) query.set("minExperience", String(minExpVal));
        if (searchVal && searchVal.trim() !== "") query.set("search", searchVal.trim());
        if (sortVal) query.set("sortBy", sortVal);

        setLoadingApps(true);
        setAppsError("");
        try {
            const appsRes = await fetch(
                `http://localhost:5001/api/applications/all?${query.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (appsRes.ok) {
                const appsData = await appsRes.json();
                setApplications(Array.isArray(appsData) ? appsData : []);
            } else {
                setAppsError("No fue posible aplicar los filtros a las postulaciones.");
            }
        } catch {
            setAppsError("Error de conexión al filtrar las postulaciones.");
        } finally {
            setLoadingApps(false);
        }
    }, [filterStatus, filterOfferId, filterWorkMode, filterMinExp, filterSearch, sortByApps]);

    function handleClearAppFilters() {
        setFilterStatus("all");
        setFilterOfferId("all");
        setFilterWorkMode("all");
        setFilterMinExp("");
        setFilterSearch("");
        setSortByApps("date_desc");
    }

    useEffect(() => {
        loadAdminPanel();
    }, [loadAdminPanel]);

    // SCRUM-27: re-consulta las postulaciones cuando cambia cualquier filtro u orden
    useEffect(() => {
        if (accessState === "authorized") {
            fetchFilteredApplications();
        }
    }, [accessState, fetchFilteredApplications]);

    // SCRUM-23 (SCRUM-139): Garantizar que la sesión no quede abierta en ninguna instancia
    // (otras pestañas abiertas o restauración desde caché al usar el botón "Atrás").
    useEffect(() => {
        function handleStorageOrLogout(event) {
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

        const previous = applications.find((a) => a.id === applicationId)?.status;

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
                setApplications((prev) =>
                    prev.map((app) => (app.id === applicationId ? { ...app, status: previous } : app))
                );
                setAppsError("No se pudo actualizar el estado de la postulación. Intenta de nuevo.");
            } else {
                // Actualizar en vivo la fecha de última modificación de esa fila (SCRUM-170)
                const data = await res.json().catch(() => ({}));
                const newUpdatedAt = data.application?.updated_at || new Date().toISOString();
                setApplications((prev) =>
                    prev.map((app) => (app.id === applicationId ? { ...app, updated_at: newUpdatedAt } : app))
                );
            }
        } catch {
            setApplications((prev) =>
                prev.map((app) => (app.id === applicationId ? { ...app, status: previous } : app))
            );
            setAppsError("Error de conexión al actualizar el estado.");
        }
    }

    function formatFechaModificacion(dateStr) {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "—";
        return d.toLocaleString("es-CO", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function openEditApplicationModal(app) {
        setEditingAppId(app.id);
        setEditAppOfferId(app.offer_id || "");
        setEditAppStatus(app.status || "postulado");
        setEditAppName(app.candidate_name || "");
        setEditAppEmail(app.candidate_email || "");
        setEditAppField(app.field || "");
        setEditAppExpYears(app.experience_years ?? 0);
        setEditAppExperience(app.experience || "");
        setEditAppEducation(app.education || "");
        setEditAppPreferences(app.work_preferences || "");
        setEditAppLocation(app.preferred_location || "");
        setEditAppWorkMode(app.work_mode || "hybrid");
        setEditAppCoverLetter(app.cover_letter || "");
        setEditAppNote("");
        setEditAppSyncUser(true);
        setEditAppFeedback(null);
        setAppsError("");
        setAppsSuccess("");
    }

    function closeEditApplicationModal() {
        setEditingAppId(null);
        setEditAppFeedback(null);
    }

    async function handleUpdateApplication(e) {
        e.preventDefault();
        setEditAppFeedback(null);

        if (!editAppName.trim() || editAppName.trim().length < 2) {
            setEditAppFeedback({ error: true, text: "El nombre del candidato es obligatorio." });
            return;
        }
        if (!editAppEmail.trim() || !editAppEmail.includes("@")) {
            setEditAppFeedback({ error: true, text: "Ingresa un correo electrónico válido." });
            return;
        }
        if (!editAppField.trim()) {
            setEditAppFeedback({ error: true, text: "El campo profesional es obligatorio." });
            return;
        }
        const parsedExp = Number(editAppExpYears);
        if (editAppExpYears === "" || !Number.isInteger(parsedExp) || parsedExp < 0 || parsedExp > 50) {
            setEditAppFeedback({ error: true, text: "Los años de experiencia deben ser un entero entre 0 y 50." });
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
            router.replace("/login");
            return;
        }

        setSavingAppEdit(true);

        try {
            const res = await fetch(`http://localhost:5001/api/applications/${editingAppId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    offer_id: Number(editAppOfferId),
                    status: editAppStatus,
                    candidate_name: editAppName.trim(),
                    candidate_email: editAppEmail.trim(),
                    field: editAppField.trim(),
                    experience_years: parsedExp,
                    experience: editAppExperience.trim(),
                    education: editAppEducation.trim(),
                    work_preferences: editAppPreferences.trim(),
                    preferred_location: editAppLocation.trim(),
                    work_mode: editAppWorkMode,
                    cover_letter: editAppCoverLetter.trim(),
                    note: editAppNote.trim(),
                    syncUserProfile: editAppSyncUser
                })
            });

            const data = await res.json();

            if (res.status === 401) {
                localStorage.removeItem("token");
                clearAdminSessionState();
                router.replace("/login");
                return;
            }

            if (!res.ok) {
                setEditAppFeedback({
                    error: true,
                    text: data.message || "No se pudo actualizar la postulación."
                });
                return;
            }

            setAppsSuccess(`¡Postulación #${editingAppId} modificada y guardada en PostgreSQL correctamente!`);
            closeEditApplicationModal();
            loadAdminPanel();
        } catch {
            setEditAppFeedback({
                error: true,
                text: "Error de conexión al guardar los cambios de la postulación."
            });
        } finally {
            setSavingAppEdit(false);
        }
    }

    function openCreateApplicationModal() {
        const firstCand = candidatesList[0] || null;
        const firstJob = adminJobs[0] || null;
        setNewAppUserId(firstCand ? String(firstCand.user_id) : "");
        setNewAppOfferId(firstJob ? String(firstJob.id) : "");
        setNewAppStatus("postulado");
        setNewAppName(firstCand?.name || "");
        setNewAppEmail(firstCand?.email || "");
        setNewAppField(firstCand?.field || "Desarrollo de Software");
        setNewAppExpYears(firstCand?.experience_years ?? 1);
        setNewAppLocation(firstCand?.preferred_location || "Bogotá");
        setNewAppWorkMode(firstCand?.work_mode || "hybrid");
        setNewAppCoverLetter("");
        setNewAppFeedback(null);
        setCreatingAppModal(true);
    }

    function handleSelectCandidateForNewApp(selectedId) {
        setNewAppUserId(selectedId);
        const cand = candidatesList.find((c) => String(c.user_id) === String(selectedId));
        if (cand) {
            setNewAppName(cand.name || "");
            setNewAppEmail(cand.email || "");
            setNewAppField(cand.field || "Desarrollo de Software");
            setNewAppExpYears(cand.experience_years ?? 0);
            setNewAppLocation(cand.preferred_location || "Bogotá");
            setNewAppWorkMode(cand.work_mode || "hybrid");
        }
    }

    async function handleCreateAdminApplication(e) {
        e.preventDefault();
        setNewAppFeedback(null);

        if (!newAppUserId || !newAppOfferId) {
            setNewAppFeedback({ error: true, text: "Selecciona tanto el candidato como la vacante." });
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
            router.replace("/login");
            return;
        }

        setSavingNewApp(true);

        try {
            const res = await fetch("http://localhost:5001/api/applications/admin", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: Number(newAppUserId),
                    offer_id: Number(newAppOfferId),
                    status: newAppStatus,
                    candidate_name: newAppName.trim(),
                    candidate_email: newAppEmail.trim(),
                    field: newAppField.trim(),
                    experience_years: Number(newAppExpYears) || 0,
                    preferred_location: newAppLocation.trim(),
                    work_mode: newAppWorkMode,
                    cover_letter: newAppCoverLetter.trim()
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setNewAppFeedback({
                    error: true,
                    text: data.message || "Error al crear la postulación."
                });
                return;
            }

            setAppsSuccess("¡Nueva postulación creada y registrada en la base de datos!");
            setCreatingAppModal(false);
            loadAdminPanel();
        } catch {
            setNewAppFeedback({
                error: true,
                text: "Error de conexión al crear la postulación."
            });
        } finally {
            setSavingNewApp(false);
        }
    }

    async function handleCreateJob(e) {
        e.preventDefault();
        setJobFeedback(null);

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
                text: `¡Vacante publicada con éxito! Se evaluó la compatibilidad con los candidatos y se notificó automáticamente a ${data.notifiedCandidatesCount ?? 0} candidato(s) con más del 90% de afinidad.`
            });

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

    return (
        <main className={styles.page}>
            <div className={styles.card}>
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
                                        <SkillSelector
                                            catalog={skillsCatalog}
                                            selectedSkills={selectedSkills}
                                            onToggleSkill={toggleSkill}
                                            maxSkills={null}
                                            title="Habilidades requeridas (para cálculo de compatibilidad)"
                                            subtitle="Filtra por categoría o busca habilidades requeridas para esta vacante"
                                        />
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

                    {activeTab === "postulaciones" && (
                        <section className={styles.section}>
                            <div className={styles.sectionHeaderRow}>
                                <h2 className={styles.sectionTitle}>Seguimiento de postulaciones</h2>
                                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                    <button
                                        type="button"
                                        className={styles.primaryButton}
                                        onClick={openCreateApplicationModal}
                                    >
                                        + Crear postulación
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.backTabLink}
                                        onClick={() => setActiveTab("overview")}
                                    >
                                        ← Volver al resumen
                                    </button>
                                </div>
                            </div>
                            <p className={styles.sectionIntro}>
                                Se han registrado{" "}
                                <strong>{summary?.total_applications ?? applications.length} postulación(es)</strong> en la plataforma.
                                Actualiza el estado de cada proceso para llevar a los candidatos rumbo a la entrevista.
                            </p>

                            {appsSuccess && (
                                <div role="status" className={styles.alertSuccess}>
                                    {appsSuccess}
                                </div>
                            )}

                            {/* BARRA DE FILTROS Y ORDENAMIENTO DE POSTULACIONES (SCRUM-27: SCRUM-172 a SCRUM-177) */}
                            <div className={styles.filtersPanel} aria-label="Filtros y ordenamiento de postulaciones">
                                <div className={styles.filtersGrid}>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label} htmlFor="filter-app-search">
                                            Buscar candidato o vacante
                                        </label>
                                        <input
                                            id="filter-app-search"
                                            type="search"
                                            placeholder="Nombre, correo, cargo o empresa..."
                                            value={filterSearch}
                                            onChange={(e) => setFilterSearch(e.target.value)}
                                            className={styles.input}
                                        />
                                    </div>

                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label} htmlFor="filter-app-status">
                                            Filtrar por estado
                                        </label>
                                        <select
                                            id="filter-app-status"
                                            value={filterStatus}
                                            onChange={(e) => setFilterStatus(e.target.value)}
                                            className={styles.select}
                                        >
                                            <option value="all">Todos los estados</option>
                                            <option value="postulado">Postulado</option>
                                            <option value="en_revision">En revisión</option>
                                            <option value="aceptada">Aceptada</option>
                                            <option value="rechazada">Rechazada</option>
                                        </select>
                                    </div>

                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label} htmlFor="filter-app-offer">
                                            Filtrar por vacante
                                        </label>
                                        <select
                                            id="filter-app-offer"
                                            value={filterOfferId}
                                            onChange={(e) => setFilterOfferId(e.target.value)}
                                            className={styles.select}
                                        >
                                            <option value="all">Todas las vacantes</option>
                                            {adminJobs.map((job) => (
                                                <option key={job.id} value={String(job.id)}>
                                                    {job.title} ({job.company || "Jobbit"})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label} htmlFor="filter-app-mode">
                                            Modalidad del candidato
                                        </label>
                                        <select
                                            id="filter-app-mode"
                                            value={filterWorkMode}
                                            onChange={(e) => setFilterWorkMode(e.target.value)}
                                            className={styles.select}
                                        >
                                            <option value="all">Todas las modalidades</option>
                                            <option value="remote">Remoto</option>
                                            <option value="hybrid">Híbrido</option>
                                            <option value="onsite">Presencial</option>
                                        </select>
                                    </div>

                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label} htmlFor="filter-app-minexp">
                                            Experiencia mín. (años)
                                        </label>
                                        <input
                                            id="filter-app-minexp"
                                            type="number"
                                            min={0}
                                            max={50}
                                            placeholder="Ej: 2"
                                            value={filterMinExp}
                                            onChange={(e) => setFilterMinExp(e.target.value)}
                                            className={styles.input}
                                        />
                                    </div>

                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label} htmlFor="sort-apps">
                                            Ordenar por (4 criterios)
                                        </label>
                                        <select
                                            id="sort-apps"
                                            value={sortByApps}
                                            onChange={(e) => setSortByApps(e.target.value)}
                                            className={styles.select}
                                        >
                                            <option value="date_desc">📅 Fecha: más recientes primero</option>
                                            <option value="date_asc">📅 Fecha: más antiguas primero</option>
                                            <option value="status_asc">📌 Estado: Postulado → Revisión → Aceptada</option>
                                            <option value="status_desc">📌 Estado: Aceptada / Rechazada primero</option>
                                            <option value="exp_desc">⏳ Experiencia: mayor a menor</option>
                                            <option value="exp_asc">⏳ Experiencia: menor a mayor</option>
                                            <option value="candidate_asc">👤 Candidato: orden alfabético (A - Z)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className={styles.filtersFooter}>
                                    <span className={styles.resultsCounter} role="status">
                                        Mostrando <strong>{applications.length}</strong> postulación(es)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleClearAppFilters}
                                        className={styles.clearFiltersBtn}
                                    >
                                        ↺ Limpiar filtros y orden
                                    </button>
                                </div>
                            </div>

                            {appsError && (
                                <div role="alert" className={styles.alertError}>
                                    {appsError}
                                </div>
                            )}

                            {loadingApps ? (
                                <p className={styles.statusMessage}>Cargando postulaciones...</p>
                            ) : applications.length === 0 ? (
                                <div className={styles.placeholderBox}>
                                    <p>
                                        {filterStatus !== "all" || filterOfferId !== "all" || filterWorkMode !== "all" || filterMinExp !== "" || filterSearch.trim() !== ""
                                            ? "No se encontraron postulaciones que coincidan con los filtros seleccionados."
                                            : "Aún no hay postulaciones registradas en la plataforma."}
                                    </p>
                                </div>
                            ) : (
                                <div className={styles.tableWrapper}>
                                    <table className={styles.appsTable}>
                                        <thead>
                                            <tr>
                                                <th>Candidato</th>
                                                <th>Vacante</th>
                                                <th>Estado</th>
                                                <th>Última modificación</th>
                                                <th>Cambiar estado</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {applications.map((app) => (
                                                <tr key={app.id}>
                                                    <td>
                                                        <span className={styles.candidateName}>{app.candidate_name}</span>
                                                        <span className={styles.candidateEmail}>{app.candidate_email}</span>
                                                        {app.field && (
                                                            <span className={styles.candidateMeta}>
                                                                {app.field} · {app.experience_years ?? 0} año(s)
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className={styles.candidateName}>{app.job_title}</span>
                                                        <span className={styles.candidateEmail}>{app.job_company}</span>
                                                    </td>
                                                    <td>
                                                        <span className={`${styles.statusBadge} ${styles[`status_${app.status}`] || ""}`}>
                                                            {estadoTexto(app.status)}
                                                        </span>
                                                    </td>
                                                    <td className={styles.dateCell}>
                                                        {formatFechaModificacion(app.updated_at || app.created_at)}
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
                                                    <td>
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditApplicationModal(app)}
                                                            className={styles.secondaryButton}
                                                        >
                                                            ✎ Editar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    )}

                    <div className={styles.footerLogout}>
                        <LogoutButton
                            className={styles.secondaryButton}
                            onLogout={clearAdminSessionState}
                        />
                    </div>
                </div>
            </div>

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
                                    <SkillSelector
                                        catalog={skillsCatalog}
                                        selectedSkills={editSelectedSkills}
                                        onToggleSkill={toggleEditSkill}
                                        maxSkills={null}
                                        title="Habilidades requeridas para la vacante"
                                        subtitle="Filtra por categoría o busca las habilidades que requiere el puesto"
                                    />
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

            {/* MODAL DE EDICIÓN DE POSTULACIÓN (SCRUM-168) */}
            {editingAppId !== null && (
                <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="edit-app-title">
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3 id="edit-app-title" className={styles.modalTitle}>
                                Editar postulación #{editingAppId}
                            </h3>
                            <button
                                type="button"
                                onClick={closeEditApplicationModal}
                                className={styles.modalCloseBtn}
                                aria-label="Cerrar ventana de edición"
                            >
                                ✕
                            </button>
                        </div>

                        {editAppFeedback && (
                            <div
                                role={editAppFeedback.error ? "alert" : "status"}
                                className={editAppFeedback.error ? styles.alertError : styles.alertSuccess}
                            >
                                {editAppFeedback.text}
                            </div>
                        )}

                        <form onSubmit={handleUpdateApplication} className={styles.form} noValidate>
                            <div className={styles.formGridTwo}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="edit-app-name">Nombre del candidato *</label>
                                    <input
                                        id="edit-app-name"
                                        type="text"
                                        required
                                        value={editAppName}
                                        onChange={(e) => setEditAppName(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="edit-app-email">Correo del candidato *</label>
                                    <input
                                        id="edit-app-email"
                                        type="email"
                                        required
                                        value={editAppEmail}
                                        onChange={(e) => setEditAppEmail(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGridThree}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="edit-app-offer">Vacante asociada</label>
                                    <select
                                        id="edit-app-offer"
                                        value={editAppOfferId}
                                        onChange={(e) => setEditAppOfferId(e.target.value)}
                                        className={styles.select}
                                    >
                                        {adminJobs.map((job) => (
                                            <option key={job.id} value={job.id}>{job.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="edit-app-status">Estado</label>
                                    <select
                                        id="edit-app-status"
                                        value={editAppStatus}
                                        onChange={(e) => setEditAppStatus(e.target.value)}
                                        className={styles.select}
                                    >
                                        <option value="postulado">Postulado</option>
                                        <option value="en_revision">En revisión</option>
                                        <option value="aceptada">Aceptada</option>
                                        <option value="rechazada">Rechazada</option>
                                    </select>
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="edit-app-exp">Años de experiencia</label>
                                    <input
                                        id="edit-app-exp"
                                        type="number"
                                        min={0}
                                        max={50}
                                        value={editAppExpYears}
                                        onChange={(e) => setEditAppExpYears(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGridThree}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="edit-app-field">Campo profesional *</label>
                                    <input
                                        id="edit-app-field"
                                        type="text"
                                        required
                                        value={editAppField}
                                        onChange={(e) => setEditAppField(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="edit-app-location">Ubicación preferida</label>
                                    <input
                                        id="edit-app-location"
                                        type="text"
                                        value={editAppLocation}
                                        onChange={(e) => setEditAppLocation(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="edit-app-mode">Modalidad preferida</label>
                                    <select
                                        id="edit-app-mode"
                                        value={editAppWorkMode}
                                        onChange={(e) => setEditAppWorkMode(e.target.value)}
                                        className={styles.select}
                                    >
                                        <option value="remote">Remoto</option>
                                        <option value="hybrid">Híbrido</option>
                                        <option value="onsite">Presencial</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="edit-app-experience">Descripción de experiencia</label>
                                <textarea
                                    id="edit-app-experience"
                                    rows={2}
                                    value={editAppExperience}
                                    onChange={(e) => setEditAppExperience(e.target.value)}
                                    className={styles.textarea}
                                />
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="edit-app-education">Educación / Formación</label>
                                <textarea
                                    id="edit-app-education"
                                    rows={2}
                                    value={editAppEducation}
                                    onChange={(e) => setEditAppEducation(e.target.value)}
                                    className={styles.textarea}
                                />
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="edit-app-prefs">Preferencias laborales</label>
                                <textarea
                                    id="edit-app-prefs"
                                    rows={2}
                                    value={editAppPreferences}
                                    onChange={(e) => setEditAppPreferences(e.target.value)}
                                    className={styles.textarea}
                                />
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="edit-app-cover">Carta de presentación</label>
                                <textarea
                                    id="edit-app-cover"
                                    rows={2}
                                    value={editAppCoverLetter}
                                    onChange={(e) => setEditAppCoverLetter(e.target.value)}
                                    className={styles.textarea}
                                />
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="edit-app-note">Nota de la modificación (opcional)</label>
                                <input
                                    id="edit-app-note"
                                    type="text"
                                    placeholder="Ej: Se corrigió el correo del candidato"
                                    value={editAppNote}
                                    onChange={(e) => setEditAppNote(e.target.value)}
                                    className={styles.input}
                                />
                            </div>

                            <label className={styles.checkboxRow}>
                                <input
                                    type="checkbox"
                                    checked={editAppSyncUser}
                                    onChange={(e) => setEditAppSyncUser(e.target.checked)}
                                />
                                Sincronizar también estos datos con el perfil del usuario (users / work_profiles)
                            </label>

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={closeEditApplicationModal}
                                    className={styles.secondaryButton}
                                    disabled={savingAppEdit}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingAppEdit}
                                    className={styles.primaryButton}
                                >
                                    {savingAppEdit ? "Guardando cambios..." : "Guardar cambios"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE CREACIÓN DE POSTULACIÓN DESDE ADMIN (SCRUM-28 / SCRUM-171) */}
            {creatingAppModal && (
                <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="new-app-title">
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3 id="new-app-title" className={styles.modalTitle}>
                                Crear nueva postulación
                            </h3>
                            <button
                                type="button"
                                onClick={() => setCreatingAppModal(false)}
                                className={styles.modalCloseBtn}
                                aria-label="Cerrar ventana de creación"
                            >
                                ✕
                            </button>
                        </div>

                        {newAppFeedback && (
                            <div
                                role={newAppFeedback.error ? "alert" : "status"}
                                className={newAppFeedback.error ? styles.alertError : styles.alertSuccess}
                            >
                                {newAppFeedback.text}
                            </div>
                        )}

                        <form onSubmit={handleCreateAdminApplication} className={styles.form} noValidate>
                            <div className={styles.formGridTwo}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="new-app-candidate">Candidato *</label>
                                    <select
                                        id="new-app-candidate"
                                        value={newAppUserId}
                                        onChange={(e) => handleSelectCandidateForNewApp(e.target.value)}
                                        className={styles.select}
                                    >
                                        <option value="">Selecciona un candidato</option>
                                        {candidatesList.map((c) => (
                                            <option key={c.user_id} value={c.user_id}>
                                                {c.name} ({c.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="new-app-offer">Vacante *</label>
                                    <select
                                        id="new-app-offer"
                                        value={newAppOfferId}
                                        onChange={(e) => setNewAppOfferId(e.target.value)}
                                        className={styles.select}
                                    >
                                        <option value="">Selecciona una vacante</option>
                                        {adminJobs.map((job) => (
                                            <option key={job.id} value={job.id}>{job.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formGridTwo}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="new-app-name">Nombre del candidato</label>
                                    <input
                                        id="new-app-name"
                                        type="text"
                                        value={newAppName}
                                        onChange={(e) => setNewAppName(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="new-app-email">Correo del candidato</label>
                                    <input
                                        id="new-app-email"
                                        type="email"
                                        value={newAppEmail}
                                        onChange={(e) => setNewAppEmail(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGridThree}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="new-app-field">Campo profesional</label>
                                    <input
                                        id="new-app-field"
                                        type="text"
                                        value={newAppField}
                                        onChange={(e) => setNewAppField(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="new-app-exp">Años de experiencia</label>
                                    <input
                                        id="new-app-exp"
                                        type="number"
                                        min={0}
                                        max={50}
                                        value={newAppExpYears}
                                        onChange={(e) => setNewAppExpYears(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="new-app-status">Estado inicial</label>
                                    <select
                                        id="new-app-status"
                                        value={newAppStatus}
                                        onChange={(e) => setNewAppStatus(e.target.value)}
                                        className={styles.select}
                                    >
                                        <option value="postulado">Postulado</option>
                                        <option value="en_revision">En revisión</option>
                                        <option value="aceptada">Aceptada</option>
                                        <option value="rechazada">Rechazada</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formGridTwo}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="new-app-location">Ubicación preferida</label>
                                    <input
                                        id="new-app-location"
                                        type="text"
                                        value={newAppLocation}
                                        onChange={(e) => setNewAppLocation(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="new-app-mode">Modalidad preferida</label>
                                    <select
                                        id="new-app-mode"
                                        value={newAppWorkMode}
                                        onChange={(e) => setNewAppWorkMode(e.target.value)}
                                        className={styles.select}
                                    >
                                        <option value="remote">Remoto</option>
                                        <option value="hybrid">Híbrido</option>
                                        <option value="onsite">Presencial</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="new-app-cover">Carta de presentación</label>
                                <textarea
                                    id="new-app-cover"
                                    rows={2}
                                    value={newAppCoverLetter}
                                    onChange={(e) => setNewAppCoverLetter(e.target.value)}
                                    className={styles.textarea}
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={() => setCreatingAppModal(false)}
                                    className={styles.secondaryButton}
                                    disabled={savingNewApp}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingNewApp}
                                    className={styles.primaryButton}
                                >
                                    {savingNewApp ? "Creando postulación..." : "Crear postulación"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}