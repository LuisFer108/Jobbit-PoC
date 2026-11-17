"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [previewLink, setPreviewLink] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");
        setError("");
        setPreviewLink("");
        setLoading(true);

        try {
            const response = await fetch("http://localhost:5001/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Ocurrió un error al procesar tu solicitud.");
                return;
            }

            setMessage(data.message);
            if (data.resetLink) {
                setPreviewLink(data.resetLink);
            }
        } catch {
            setError("No fue posible conectar con el servidor. Revisa tu conexión.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className={styles.page}>
            <div className={styles.card}>
                {/* Barra superior con logo */}
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
                        <span className={styles.keyIcon} aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                <path d="M7 14a5 5 0 1 1 4.58-7H21v4h-2v2h-2v-2h-3.42A5 5 0 0 1 7 14Zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/>
                            </svg>
                        </span>
                        Recuperar acceso
                    </div>
                </header>

                <div className={styles.body}>
                    <h1 className={styles.welcome}>¿Olvidaste tu contraseña?</h1>
                    <p className={styles.subtitle}>
                        No te preocupes. Escribe tu correo electrónico y te enviaremos un enlace para que crees una nueva.
                    </p>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <label className={styles.label} htmlFor="email">
                            Correo electrónico registrado
                        </label>
                        <input
                            id="email"
                            className={styles.input}
                            type="email"
                            required
                            placeholder="tucorreo@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <button className={styles.primaryButton} type="submit" disabled={loading}>
                            {loading ? "Enviando..." : "Enviar enlace de recuperación"}
                        </button>
                    </form>

                    {message && (
                        <div className={styles.successBox} role="alert">
                            <span className={styles.alertIcon}>✓</span>
                            <div>
                                <p className={styles.successText}>{message}</p>
                                {previewLink && (
                                    <div className={styles.previewContainer}>
                                        <p className={styles.previewLabel}>Enlace directo de prueba (desarrollo):</p>
                                        <a href={previewLink} className={styles.previewButton}>
                                            🔑 Ir a restablecer contraseña directamente
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {error && (
                        <p className={styles.errorMessage} role="alert">
                            {error}
                        </p>
                    )}

                    <div className={styles.backRow}>
                        <Link href="/login" className={styles.goback}>
                            ← Volver a Iniciar sesión
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
