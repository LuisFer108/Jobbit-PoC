"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LogoutButton from "../components/LogoutButton";
import styles from "./page.module.css";

export default function ProfilePage() {

    const router = useRouter();

    const [form, setForm] = useState({
        field: "",
        experience: "",
        experienceYears: "",
        education: "",
        workPreferences: "",
        preferredLocation: "",
        workMode: "",
        salaryRange: ""
    });

    const [catalog, setCatalog] = useState([]);
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [message, setMessage] = useState("");


    // Protección de ruta: si no hay token al cargar la página, se redirige al
    // login. Esto impide el acceso directo por URL tras cerrar sesión (SCRUM-71).
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.replace("/login");
            return;
        }

        // Cargar catálogo de habilidades
        fetch("http://localhost:5001/api/skills", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.skills) setCatalog(data.skills);
            })
            .catch(() => {});
    }, [router]);

    function toggleSkill(id) {
        if (selectedSkills.includes(id)) {
            setSelectedSkills(selectedSkills.filter((x) => x !== id));
        } else {
            if (selectedSkills.length >= 5) {
                setMessage("Solo puedes seleccionar un máximo de 5 habilidades");
                return;
            }
            setMessage("");
            setSelectedSkills([...selectedSkills, id]);
        }
    }

    function handleChange(e) {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();

        const token = localStorage.getItem("token");

        if (!token) {
            router.push("/login");
            return;
        }

        try {
            const response = await fetch("http://localhost:5001/api/profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(form)
            });

            const data = await response.json();

            if (response.ok) {
                if (selectedSkills.length > 0) {
                    await fetch("http://localhost:5001/api/skills/mine", {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({ skillIds: selectedSkills })
                    });
                }
                router.push("/dashboard");
            } else {
                setMessage(data.message);
            }
        } catch {
            setMessage("Error al conectar con el servidor");
        }
    }

    // ===== PRESENTACIÓN NUEVA =====
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
                        Mi perfil
                    </div>
                </header>

                {/* Cuerpo */}
                <div className={styles.body}>
                    <h1 className={styles.welcome}>Crea tu perfil laboral</h1>
                    <p className={styles.subtitle}>
                        Completa esta información para personalizar
                        tus futuras recomendaciones de empleo.
                    </p>

                    <form onSubmit={handleSubmit} className={styles.form}>

                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="field">Campo profesional</label>
                            <input
                                id="field"
                                className={styles.input}
                                type="text"
                                name="field"
                                placeholder="Ej: Desarrollo de software"
                                value={form.field}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="experienceYears">Años de experiencia</label>
                            <input
                                id="experienceYears"
                                className={styles.input}
                                type="number"
                                name="experienceYears"
                                min="0"
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
                                placeholder="Ej: He trabajado con Java, Python..."
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
                                placeholder="Ej: Estudié en..."
                                value={form.education}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label className={styles.label} htmlFor="workPreferences">Preferencias laborales</label>
                            <textarea
                                id="workPreferences"
                                className={styles.textarea}
                                name="workPreferences"
                                placeholder="Ej: Desarrollo backend, inteligencia artificial..."
                                value={form.workPreferences}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="preferredLocation">Ubicación preferida</label>
                            <input
                                id="preferredLocation"
                                className={styles.input}
                                type="text"
                                name="preferredLocation"
                                placeholder="Ej: Medellín o remoto"
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
                            <label className={styles.label} htmlFor="salaryRange">Salario mínimo esperado (COP)</label>
                            <input
                                id="salaryRange"
                                className={styles.input}
                                type="text"
                                name="salaryRange"
                                placeholder="Ej: 2500000 o $2.500.000"
                                value={form.salaryRange}
                                onChange={handleChange}
                            />
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
                            <button className={styles.primaryButton} type="submit">
                                Guardar perfil
                            </button>
                        </div>
                    </form>

                    {message && <p className={styles.message} role="status">{message}</p>}

                    <div className={styles.logout}>
                        <LogoutButton />
                    </div>
                </div>

            </div>
        </main>
    );
}
