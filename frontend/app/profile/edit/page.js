"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const initialForm = { name:"", email:"", field:"", experienceYears:"", experience:"", education:"", workPreferences:"", preferredLocation:"", workMode:"" };

export default function EditProfilePage() {
    const router = useRouter();
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        async function loadProfile() {
            const token = localStorage.getItem("token");
            if (!token) { router.push("/login"); return; }
            try {
                const response = await fetch("http://localhost:5001/api/profile", { headers: { Authorization: `Bearer ${token}` } });
                if (response.status === 401) { localStorage.removeItem("token"); router.push("/login"); return; }
                if (response.status === 404) { router.push("/profile"); return; }
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || "No se pudo cargar el perfil");
                if (!cancelled) setForm({
                    name: data.name || "", email: data.email || "", field: data.field || "",
                    experienceYears: data.experience_years ?? "", experience: data.experience || "",
                    education: data.education || "", workPreferences: data.work_preferences || "",
                    preferredLocation: data.preferred_location || "", workMode: data.work_mode || ""
                });
            } catch (err) {
                if (!cancelled) setError(err.message || "No fue posible conectar con el servidor");
            } finally { if (!cancelled) setLoading(false); }
        }
        loadProfile();
        return () => { cancelled = true; };
    }, [router]);

    function handleChange(event) {
        const { name, value } = event.target;
        setForm(current => ({ ...current, [name]: value }));
        setMessage("");
        setError("");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true); setMessage(""); setError("");
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); setSaving(false); return; }
        try {
            const response = await fetch("http://localhost:5001/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(form)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "No se pudo actualizar el perfil");
            setMessage(data.message || "Perfil actualizado correctamente.");
        } catch (err) { setError(err.message || "No fue posible conectar con el servidor"); }
        finally { setSaving(false); }
    }

    if (loading) return <main><p>Cargando tu perfil...</p></main>;
    return <main>
        <h1>Actualizar perfil laboral</h1>
        <p>Modifica tus datos personales y la información de tu perfil profesional.</p>
        {error && <p role="alert" style={{ color: "crimson" }}>{error}</p>}
        {message && <p role="status" style={{ color: "green" }}>{message}</p>}
        <form onSubmit={handleSubmit}>
            <h2>Datos personales</h2>
            <label htmlFor="name">Nombre completo</label><br />
            <input id="name" name="name" value={form.name} onChange={handleChange} required maxLength={100} />
            <br /><br />
            <label htmlFor="email">Correo electrónico</label><br />
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required maxLength={150} />
            <br /><br />
            <h2>Información laboral</h2>
            <label htmlFor="field">Campo profesional</label><br />
            <input id="field" name="field" value={form.field} onChange={handleChange} required maxLength={150} />
            <br /><br />
            <label htmlFor="experienceYears">Años de experiencia</label><br />
            <input id="experienceYears" name="experienceYears" type="number" min="0" step="1" value={form.experienceYears} onChange={handleChange} />
            <br /><br />
            <label htmlFor="experience">Experiencia laboral</label><br />
            <textarea id="experience" name="experience" rows="4" value={form.experience} onChange={handleChange} />
            <br /><br />
            <label htmlFor="education">Educación</label><br />
            <textarea id="education" name="education" rows="3" value={form.education} onChange={handleChange} placeholder="Estudios, institución, título y año." />
            <br /><br />
            <label htmlFor="workPreferences">Preferencias laborales</label><br />
            <textarea id="workPreferences" name="workPreferences" rows="3" value={form.workPreferences} onChange={handleChange} />
            <br /><br />
            <label htmlFor="preferredLocation">Ubicación preferida</label><br />
            <input id="preferredLocation" name="preferredLocation" value={form.preferredLocation} onChange={handleChange} />
            <br /><br />
            <label htmlFor="workMode">Modalidad de trabajo</label><br />
            <select id="workMode" name="workMode" value={form.workMode} onChange={handleChange}>
                <option value="">Selecciona una opción</option>
                <option value="remote">Remoto</option>
                <option value="hybrid">Híbrido</option>
                <option value="onsite">Presencial</option>
            </select>
            <br /><br />
            <button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</button>
        </form>
        <p><Link href="/dashboard">Volver al dashboard</Link></p>
    </main>;
}
