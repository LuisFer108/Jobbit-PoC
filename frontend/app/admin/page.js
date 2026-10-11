"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
    const router = useRouter();
    const [summary, setSummary] = useState(null);
    const [message, setMessage] = useState("Verificando permisos...");

    useEffect(() => {
        let cancelled = false;

        async function loadSummary() {
            const token = localStorage.getItem("token");

            if (!token) {
                router.replace("/login");
                return;
            }

            try {
                const response = await fetch("http://localhost:5001/api/admin/summary", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await response.json();

                if (cancelled) return;

                if (response.status === 401) {
                    localStorage.removeItem("token");
                    router.replace("/login");
                    return;
                }

                if (response.status === 403) {
                    setMessage("No tienes permisos para acceder al panel administrativo.");
                    return;
                }

                if (!response.ok) {
                    setMessage(data.message || "No fue posible cargar el panel.");
                    return;
                }

                setSummary(data.summary);
                setMessage("");
            } catch {
                if (!cancelled) setMessage("No fue posible conectar con el servidor.");
            }
        }

        loadSummary();
        return () => { cancelled = true; };
    }, [router]);

    function logout() {
        localStorage.removeItem("token");
        router.replace("/login");
    }

    return (
        <main style={{ padding: "2rem" }}>
            <h1>Panel administrativo</h1>
            {message && <p role="status">{message}</p>}
            {summary && (
                <section>
                    <p>Usuarios registrados: {summary.total_users}</p>
                    <p>Perfiles laborales: {summary.total_profiles}</p>
                </section>
            )}
            <button type="button" onClick={logout}>Cerrar sesión</button>
        </main>
    );
}
