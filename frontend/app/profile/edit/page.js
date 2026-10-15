"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LogoutButton from "../../components/LogoutButton";
import styles from "../page.module.css";

const initialForm = {
    name: "",
    email: "",
    field: "",
    experience: "",
    experienceYears: "",
    education: "",
    workPreferences: "",
    preferredLocation: "",
    workMode: "",
    salaryRange: ""
};

export default function EditProfilePage() {
    const router = useRouter();
    const [form, setForm] = useState(initialForm);
    const [catalog, setCatalog] = useState([]);
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function loadProfile() {
            const token = localStorage.getItem("token");

            if (!token) {
                router.push("/login");
                return;
            }

            try {
                const [response, skillsCatRes, userSkillsRes] = await Promise.all([
                    fetch("http://localhost:5001/api/profile", {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    fetch("http://localhost:5001/api/skills", {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    fetch("http://localhost:5001/api/skills/mine", {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);

                if (response.status === 401 ||
                    response.status === 403) {
                    localStorage.removeItem("token");
                    router.push("/login");
                    return;
                }

                if (response.status === 404) {
                    router.push("/profile");
                    return;
                }

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message || "No se pudo cargar el perfil"
                    );
                }

                setForm({
                    name: data.name ?? "",
                    email: data.email ?? "",
                    field: data.field ?? "",
                    experience: data.experience ?? "",
                    experienceYears: data.experience_years ?? "",
                    education: data.education ?? "",
                    workPreferences: data.work_preferences ?? "",
                    preferredLocation: data.preferred_location ?? "",
                    workMode: data.work_mode ?? "",
                    salaryRange: data.salary_range ?? ""
                });

                if (skillsCatRes.ok) {
                    const catData = await skillsCatRes.json();
                    setCatalog(catData.skills || []);
                }

                if (userSkillsRes.ok) {
                    const uData = await userSkillsRes.json();
                    setSelectedSkills(uData.skillIds || []);
                }
            } catch (err) {
                setError(err.message || "Error al cargar el perfil");
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, [router]);

    function toggleSkill(id) {
        if (selectedSkills.includes(id)) {
            setSelectedSkills(selectedSkills.filter((x) => x !== id));
        } else {
            if (selectedSkills.length >= 5) {
                setError("Solo puedes seleccionar un máximo de 5 habilidades");
                return;
            }
            setError("");
            setSelectedSkills([...selectedSkills, id]);
        }
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setForm(previous => ({
            ...previous,
            [name]: value
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setMessage("");
        setError("");
        setSaving(true);

        const token = localStorage.getItem("token");

        if (!token) {
            router.push("/login");
            return;
        }

        try {
            const [profileRes, skillsRes] = await Promise.all([
                fetch("http://localhost:5001/api/profile", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(form)
                }),
                fetch("http://localhost:5001/api/skills/mine", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ skillIds: selectedSkills })
                })
            ]);

            const data = await profileRes.json();

            if (!profileRes.ok) {
                throw new Error(
                    data.message || "No se pudo actualizar el perfil"
                );
            }

            if (!skillsRes.ok) {
                const sData = await skillsRes.json();
                throw new Error(sData.message || "Error al actualizar habilidades");
            }

            setForm(previous => ({
                ...previous,
                ...(data.profile || {})
            }));

            setMessage("Perfil actualizado correctamente.");
        } catch (err) {
            setError(err.message || "Ocurrió un error");
        } finally {
            setSaving(false);
        }
    }

    // ===== PRESENTACIÓN NUEVA =====
    if (loading) {
        return (
            <main className={styles.page}>
                <p className={styles.loadingText} role="status">Cargando perfil...</p>
            </main>
        );
    }

    return (
        <main className={styles.page}>
            <div className={styles.card}>

                {/* Barra superior con logo + título */}
                <header className={styles.topbar}>
                    <div className={styles.brand}>
                        <Image
                            src="/Logo-jobbit.svg"
                            alt="Jobbit"
                            width={130}
                            height={40}
                            priority
                            unoptimized
                        />
                    </div>
                    <div className={styles.topbarTitle}>
                        <span className={styles.userIcon} aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                                <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6Z"/>
                            </svg>
                        </span>
                        Editar perfil
                    </div>
                </header>

                {/* Cuerpo */}
                <div className={styles.body}>
                    <h1 className={styles.welcome}>Actualizar perfil laboral</h1>
                    <p className={styles.subtitle}>
                        Modifica tus datos personales y tu información laboral.
                    </p>

                    <form onSubmit={handleSubmit} className={styles.form}>

                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="name">Nombre</label>
                            <input
                                id="name"
                                className={styles.input}
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="email">Correo electrónico</label>
                            <input
                                id="email"
                                className={styles.input}
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="field">Campo profesional</label>
                            <input
                                id="field"
                                className={styles.input}
                                name="field"
                                value={form.field}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="experienceYears">Años de experiencia</label>
                            <input
                                id="experienceYears"
                                className={styles.input}
                                type="number"
                                min="0"
                                step="1"
                                name="experienceYears"
                                value={form.experienceYears}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label className={styles.label} htmlFor="experience">Describe tu experiencia</label>
                            <textarea
                                id="experience"
                                className={styles.textarea}
                                name="experience"
                                value={form.experience}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label className={styles.label} htmlFor="education">Educación</label>
                            <textarea
                                id="education"
                                className={styles.textarea}
                                name="education"
                                value={form.education}
                                onChange={handleChange}
                                placeholder="Estudios, títulos o formación"
                            />
                        </div>

                        <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label className={styles.label} htmlFor="workPreferences">Preferencias laborales</label>
                            <textarea
                                id="workPreferences"
                                className={styles.textarea}
                                name="workPreferences"
                                value={form.workPreferences}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="preferredLocation">Ubicación preferida</label>
                            <input
                                id="preferredLocation"
                                className={styles.input}
                                name="preferredLocation"
                                value={form.preferredLocation}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="workMode">Modalidad de trabajo</label>
                            <select
                                id="workMode"
                                className={styles.input}
                                name="workMode"
                                value={form.workMode}
                                onChange={handleChange}
                            >
                                <option value="">Selecciona una opción</option>
                                <option value="remote">Remoto</option>
                                <option value="hybrid">Híbrido</option>
                                <option value="onsite">Presencial</option>
                            </select>
                        </div>

                        <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label className={styles.label} htmlFor="salaryRange">Rango salarial esperado</label>
                            <select
                                id="salaryRange"
                                className={styles.input}
                                name="salaryRange"
                                value={form.salaryRange}
                                onChange={handleChange}
                            >
                                <option value="">Selecciona tu expectativa salarial</option>
                                <option value="Menos de 2M">Menos de $2.000.000</option>
                                <option value="2M - 5M">$2.000.000 - $5.000.000</option>
                                <option value="Más de 5M">Más de $5.000.000</option>
                            </select>
                        </div>

                        {/* Habilidades */}
                        <div className={`${styles.field} ${styles.fullWidth}`}>
                            <div className={styles.skillsHeader}>
                                <span className={styles.label}>Tus habilidades técnicas (máximo 5)</span>
                                <span className={styles.counter}>{selectedSkills.length}/5 seleccionadas</span>
                            </div>

                            <div className={styles.skillsList}>
                                {catalog.map((s) => {
                                    const isSelected = selectedSkills.includes(s.id);
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => toggleSkill(s.id)}
                                            className={`${styles.skillChip} ${isSelected ? styles.skillChipSelected : ""}`}
                                            aria-pressed={isSelected}
                                        >
                                            {isSelected ? "✓ " : "+ "}{s.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className={`${styles.actions} ${styles.fullWidth}`}>
                            <Link href="/dashboard" className={styles.cancelLink}>
                                Cancelar y volver al dashboard
                            </Link>
                            <button className={styles.primaryButton} type="submit" disabled={saving}>
                                {saving ? "Guardando..." : "Guardar cambios"}
                            </button>
                        </div>
                    </form>

                    {message && <p className={styles.successMessage} role="status">{message}</p>}
                    {error && <p className={styles.message} role="alert">{error}</p>}

                    <div className={styles.logout}>
                        <LogoutButton />
                    </div>
                </div>

            </div>
        </main>
    );
}
