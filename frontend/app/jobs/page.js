"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "../components/LogoutButton";

export default function JobsPage() {
    const router = useRouter();

    const [jobs, setJobs] = useState(null);   // null = cargando
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadJobs() {
            const token = localStorage.getItem("token");

            // Vacantes solo con sesión iniciada
            if (!token) {
                router.replace("/login");
                return;
            }

            try {
                const response = await fetch(
                    "http://localhost:5001/api/jobs",
                    {
                        headers: {
                            "Authorization": `Bearer ${token}`
                        }
                    }
                );

                if (response.status === 401 || response.status === 403) {
                    // El token ya no sirve: volvemos al login
                    localStorage.removeItem("token");
                    router.replace("/login");
                    return;
                }

                if (!response.ok) {
                    setError("No pudimos cargar las vacantes. Intenta de nuevo en un momento.");
                    return;
                }

                const data = await response.json();
                setJobs(data);
            } catch {
                setError("No pudimos conectarnos. Revisa tu conexión e intenta otra vez.");
            }
        }

        loadJobs();
    }, [router]);

    // Modalidad en texto amigable (sin tecnicismos)
    function modalidadTexto(mode) {
        if (mode === "remote") return "Remoto";
        if (mode === "hybrid") return "Híbrido";
        if (mode === "onsite") return "Presencial";
        return "Modalidad no especificada";
    }

    return (
        <main style={{ padding: "2rem" }}>
            <h1>Vacantes disponibles</h1>
            <p>Estas son las oportunidades que tenemos para ti ahora mismo.</p>

            <p>
                <Link href="/dashboard">← Volver a mi inicio</Link>
            </p>

            {error && <p role="status">{error}</p>}

            {/* Estado: cargando */}
            {!jobs && !error && <p>Cargando vacantes...</p>}

            {/* Estado: no hay vacantes (lista vacía) */}
            {jobs && jobs.length === 0 && (
                <p>Por ahora no hay vacantes publicadas. ¡Vuelve pronto, estamos sumando nuevas!</p>
            )}

            {/* Listado de vacantes (SCRUM-65 / SCRUM-66) */}
            {jobs && jobs.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0 }}>
                    {jobs.map((job) => (
                        <li
                            key={job.id}
                            style={{
                                border: "1px solid #ccc",
                                borderRadius: "8px",
                                padding: "1rem",
                                marginBottom: "1rem"
                            }}
                        >
                            <h2 style={{ margin: "0 0 0.25rem" }}>{job.title}</h2>
                            <p style={{ margin: "0 0 0.5rem", fontWeight: "bold" }}>
                                {job.company || "Empresa confidencial"}
                            </p>
                            <p style={{ margin: "0 0 0.5rem" }}>{job.description}</p>
                            <p style={{ margin: 0 }}>
                                📍 {job.location || "Ubicación por confirmar"} ·
                                {" "}{modalidadTexto(job.work_mode)} ·
                                {" "}Experiencia mínima: {job.min_experience_years ?? 0} año(s)
                            </p>
                        </li>
                    ))}
                </ul>
            )}

            <LogoutButton />
        </main>
    );
}
