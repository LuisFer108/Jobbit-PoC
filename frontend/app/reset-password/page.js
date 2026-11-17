"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        if (!token) {
            setValidating(false);
            setTokenValid(false);
            setError("No se proporcionó ningún token de recuperación.");
            return;
        }

        async function verifyToken() {
            try {
                const response = await fetch(
                    `http://localhost:5001/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`
                );
                const data = await response.json();

                if (response.ok && data.valid) {
                    setTokenValid(true);
                } else {
                    setTokenValid(false);
                    setError(data.message || "El enlace de recuperación es inválido o ha expirado.");
                }
            } catch {
                setTokenValid(false);
                setError("No pudimos verificar la validez del enlace. Revisa tu conexión.");
            } finally {
                setValidating(false);
            }
        }

        verifyToken();
    }, [token]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (password.length < 8) {
            setError("La nueva contraseña debe tener al menos 8 caracteres.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden. Por favor verifícalas.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("http://localhost:5001/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "No fue posible restablecer la contraseña.");
                return;
            }

            setSuccessMessage(data.message || "¡Tu contraseña ha sido restablecida exitosamente!");
        } catch {
            setError("Error de conexión al restablecer la contraseña.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className={styles.page}>
            <div className={styles.card}>
                {/* Cabecera */}
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
                        <span className={styles.shieldIcon} aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4Zm-1 15-4-4 1.41-1.41L11 13.17l5.59-5.59L18 9l-7 7Z"/>
                            </svg>
                        </span>
                        Nueva contraseña
                    </div>
                </header>

                <div className={styles.body}>
                    {validating ? (
                        <div className={styles.statusBox}>
                            <p>Verificando enlace de recuperación...</p>
                        </div>
                    ) : successMessage ? (
                        <div className={styles.successCard}>
                            <div className={styles.checkCircle}>✓</div>
                            <h1 className={styles.welcome}>¡Contraseña actualizada!</h1>
                            <p className={styles.subtitle}>{successMessage}</p>
                            <Link href="/login" className={styles.primaryButton}>
                                Ir a Iniciar sesión
                            </Link>
                        </div>
                    ) : !tokenValid ? (
                        <div className={styles.invalidCard}>
                            <div className={styles.errorCircle}>✕</div>
                            <h1 className={styles.welcome}>Enlace no disponible</h1>
                            <p className={styles.subtitle}>{error}</p>
                            <div className={styles.actionsRow}>
                                <Link href="/forgot-password" className={styles.primaryButton}>
                                    Solicitar nuevo enlace
                                </Link>
                                <Link href="/login" className={styles.goback}>
                                    ← Volver al login
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h1 className={styles.welcome}>Crea tu nueva contraseña</h1>
                            <p className={styles.subtitle}>
                                Ingresa una contraseña segura de al menos 8 caracteres.
                            </p>

                            <form onSubmit={handleSubmit} className={styles.form}>
                                <label className={styles.label} htmlFor="password">
                                    Nueva contraseña
                                </label>
                                <input
                                    id="password"
                                    className={styles.input}
                                    type="password"
                                    required
                                    placeholder="Mínimo 8 caracteres"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />

                                <label className={styles.label} htmlFor="confirmPassword">
                                    Confirmar nueva contraseña
                                </label>
                                <input
                                    id="confirmPassword"
                                    className={styles.input}
                                    type="password"
                                    required
                                    placeholder="Repite tu nueva contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />

                                {error && (
                                    <p className={styles.errorMessage} role="alert">
                                        {error}
                                    </p>
                                )}

                                <button
                                    className={styles.primaryButton}
                                    type="submit"
                                    disabled={loading}
                                >
                                    {loading ? "Actualizando..." : "Restablecer contraseña"}
                                </button>
                            </form>

                            <div className={styles.backRow}>
                                <Link href="/login" className={styles.goback}>
                                    ← Cancelar y volver al inicio de sesión
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <main className={styles.page}>
                <div className={styles.card}>
                    <div className={styles.body}>
                        <p>Cargando...</p>
                    </div>
                </div>
            </main>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
