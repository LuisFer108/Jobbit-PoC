"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from "../components/LogoutButton";

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

    return (
        <main>

            <h1>Crea tu perfil laboral</h1>

            <p>
                Completa esta información para personalizar
                tus futuras recomendaciones de empleo.
            </p>

            <form onSubmit={handleSubmit}>

                <label>Campo profesional</label>

                <input
                    type="text"
                    name="field"
                    placeholder="Ej: Desarrollo de software"
                    value={form.field}
                    onChange={handleChange}
                />

                <br /><br />

                <label>Años de experiencia</label>

                <input
                    type="number"
                    name="experienceYears"
                    min="0"
                    value={form.experienceYears}
                    onChange={handleChange}
                />

                <br /><br />

                <label>Describe tu experiencia</label>

                <textarea
                    name="experience"
                    placeholder="Ej: He trabajado con Java, Python..."
                    value={form.experience}
                    onChange={handleChange}
                />

                <br /><br />

                <label>Educación</label>

                <textarea
                    name="education"
                    placeholder="Ej: Estudie en..."
                    value={form.education}
                    onChange={handleChange}
                />

                <br /><br />


                <label>Preferencias laborales</label>

                <textarea
                    name="workPreferences"
                    placeholder="Ej: Desarrollo backend, inteligencia artificial..."
                    value={form.workPreferences}
                    onChange={handleChange}
                />

                <br /><br />

                <label>Ubicación preferida</label>

                <input
                    type="text"
                    name="preferredLocation"
                    placeholder="Ej: Medellín o remoto"
                    value={form.preferredLocation}
                    onChange={handleChange}
                />

                <br /><br />

                <label>Modalidad de trabajo</label>

                <select
                    name="workMode"
                    value={form.workMode}
                    onChange={handleChange}
                >
                    <option value="">
                        Selecciona una opción
                    </option>

                    <option value="remote">
                        Remoto
                    </option>

                    <option value="hybrid">
                        Híbrido
                    </option>

                    <option value="onsite">
                        Presencial
                    </option>
                </select>

                <br /><br />

                <label>Rango salarial esperado</label>

                <select
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

                <button type="submit">
                    Guardar perfil
                </button>

            </form>

            {message && <p>{message}</p>}

            <LogoutButton />

        </main>
    );
}