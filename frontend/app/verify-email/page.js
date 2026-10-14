"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const alreadyCalled = useRef(false);

    const [status, setStatus] = useState("loading");
    const [message, setMessage] = useState("Verificando tu correo...");

    useEffect(() => {
        // Evita la segunda ejecución del efecto en desarrollo
        if (alreadyCalled.current) return;
        alreadyCalled.current = true;

        if (!token) {
            setStatus("error");
            setMessage("El enlace de verificación no es válido");
            return;
        }

        async function verify() {
            try {
                const response = await fetch(
                    `http://localhost:5001/api/auth/verify-email?token=${encodeURIComponent(token)}`
                );
                const data = await response.json();
                setStatus(response.ok ? "success" : "error");
                setMessage(data.message);
            } catch {
                setStatus("error");
                setMessage("No fue posible conectar con el servidor");
            }
        }

        verify();
    }, [token]);

    return (
        <main style={{ padding: "2rem", textAlign: "center" }}>
            <h1>Verificación de correo</h1>
            <p>{message}</p>
            {status === "success" && <Link href="/login">Ir a iniciar sesión</Link>}
            {status === "error" && <Link href="/register">Volver al registro</Link>}
        </main>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<p>Cargando...</p>}>
            <VerifyEmailContent />
        </Suspense>
    );
}