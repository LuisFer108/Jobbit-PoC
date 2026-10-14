"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "../../components/LogoutButton";

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

    if (loading) {
        return <main><p>Cargando perfil...</p></main>;
    }

    return (
        <main>
            <h1>Actualizar perfil laboral</h1>

            <p>
                Modifica tus datos personales y tu información laboral.
            </p>

            <form onSubmit={handleSubmit}>
                <label htmlFor="name">Nombre</label>
                <input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                />

                <br /><br />

                <label htmlFor="email">Correo electrónico</label>
                <input
                    id="email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                />

                <br /><br />

                <label htmlFor="field">Campo profesional</label>
                <input
                    id="field"
                    name="field"
                    value={form.field}
                    onChange={handleChange}
                    required
                />

                <br /><br />

                <label htmlFor="experienceYears">
                    Años de experiencia
                </label>
                <input
                    id="experienceYears"
                    type="number"
                    min="0"
                    step="1"
                    name="experienceYears"
                    value={form.experienceYears}
                    onChange={handleChange}
                />

                <br /><br />

                <label htmlFor="experience">
                    Describe tu experiencia
                </label>
                <textarea
                    id="experience"
                    name="experience"
                    value={form.experience}
                    onChange={handleChange}
                />

                <br /><br />

                <label htmlFor="education">Educación</label>
                <textarea
                    id="education"
                    name="education"
                    value={form.education}
                    onChange={handleChange}
                    placeholder="Estudios, títulos o formación"
                />

                <br /><br />

                <label htmlFor="workPreferences">
                    Preferencias laborales
                </label>
                <textarea
                    id="workPreferences"
                    name="workPreferences"
                    value={form.workPreferences}
                    onChange={handleChange}
                />

                <br /><br />

                <label htmlFor="preferredLocation">
                    Ubicación preferida
                </label>
                <input
                    id="preferredLocation"
                    name="preferredLocation"
                    value={form.preferredLocation}
                    onChange={handleChange}
                />

                <br /><br />

                <label htmlFor="workMode">
                    Modalidad de trabajo
                </label>
                <select
                    id="workMode"
                    name="workMode"
                    value={form.workMode}
                    onChange={handleChange}
                >
                    <option value="">Selecciona una opción</option>
                    <option value="remote">Remoto</option>
                    <option value="hybrid">Híbrido</option>
                    <option value="onsite">Presencial</option>
                </select>

                <br /><br />

                <label htmlFor="salaryRange">Rango salarial esperado</label>
                <select
                    id="salaryRange"
                    name="salaryRange"
                    value={form.salaryRange}
                    onChange={handleChange}
                >
                    <option value="">Selecciona tu expectativa salarial</option>
                    <option value="Menos de 2M">Menos de $2.000.000</option>
                    <option value="2M - 5M">$2.000.000 - $5.000.000</option>
                    <option value="Más de 5M">Más de $5.000.000</option>
                </select>

                <br /><br />

                <label>
                    Tus habilidades técnicas (máximo 5) — {selectedSkills.length}/5 seleccionadas
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                    {catalog.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleSkill(s.id)}
                            style={{
                                padding: "6px 12px",
                                borderRadius: 16,
                                border: "1px solid #2563eb",
                                background: selectedSkills.includes(s.id) ? "#2563eb" : "transparent",
                                color: selectedSkills.includes(s.id) ? "#fff" : "inherit",
                                cursor: "pointer",
                                fontSize: "0.9rem"
                            }}
                        >
                            {selectedSkills.includes(s.id) ? "✓ " : "+ "}{s.name}
                        </button>
                    ))}
                </div>

                <br /><br />

                <button type="submit" disabled={saving}>
                    {saving ? "Guardando..." : "Guardar cambios"}
                </button>
            </form>

            {message && <p>{message}</p>}
            {error && <p role="alert">{error}</p>}

            <p>
                <Link href="/dashboard">Cancelar y volver al dashboard</Link>
            </p>

            <LogoutButton />
        </main>
    );
}