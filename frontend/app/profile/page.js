"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {

    const router = useRouter();

    const [form, setForm] = useState({
        field: "",
        experience: "",
        experienceYears: "",
        workPreferences: "",
        preferredLocation: "",
        workMode: ""
    });

    const [message, setMessage] = useState("");

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

        const response = await fetch(
            "http://localhost:5001/api/profile",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(form)
            }
        );

        const data = await response.json();

        if (response.ok) {
            router.push("/dashboard");
        } else {
            setMessage(data.message);
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

                <button type="submit">
                    Guardar perfil
                </button>

            </form>

            {message && <p>{message}</p>}

        </main>
    );
}