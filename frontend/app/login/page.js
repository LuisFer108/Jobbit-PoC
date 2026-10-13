"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    // ===== LÓGICA SIN CAMBIOS (no tocar) =====
    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");
        setLoading(true);

        try {
            const response = await fetch("http://localhost:5001/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (!response.ok) {
                setMessage(data.message);
                return;
            }

            localStorage.setItem("token", data.token);

            if (data.user.role === "admin") {
                router.push("/admin");
            } else if (!data.hasProfile) {
                router.push("/profile");
            } else {
                router.push("/dashboard");
            }
        } catch {
            setMessage("No fue posible conectar con el servidor");
        } finally {
            setLoading(false);
        }
    }

    // ===== PRESENTACIÓN NUEVA =====
    return (
        <main className={styles.page}>
            <div className={styles.card}>

                {/* Barra superior con logo + título */}
                <header className={styles.topbar}>
                    <div className={styles.brand}>
                        {/* Chip claro detrás del logo: el texto "JOBBIT" del SVG es azul noche
                            (#16182e) y sobre la barra azul noche quedaría ilegible. El fondo claro
                            lo hace resaltar. */}
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
                        Iniciar sesión
                    </div>
                </header>

                {/* Cuerpo */}
                <div className={styles.body}>
                    <h1 className={styles.welcome}>¡Bienvenid@ de nuevo!</h1>
                    <p className={styles.subtitle}>Qué bueno contar contigo por aquí.</p>

                    <p className={styles.hint}>Ingresa tus datos para continuar</p>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <label className={styles.label} htmlFor="email">Correo electrónico</label>
                        <input
                            id="email"
                            className={styles.input}
                            type="email"
                            placeholder="tucorreo@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <label className={styles.label} htmlFor="password">Contraseña</label>
                        <input
                            id="password"
                            className={styles.input}
                            type="password"
                            placeholder="Tu contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <div className={styles.actions}>
                            {/* Enlace visual inactivo: la pantalla /recuperar aún no existe.
                                Se deja como texto no navegable para no mostrar un 404 en la demo. */}
                            <span className={styles.linkDisabled} aria-disabled="true">
                                ¿Olvidaste tu contraseña?
                            </span>
                            <button className={styles.primaryButton} type="submit" disabled={loading}>
                                {loading ? "Ingresando..." : "Ingresar"}
                            </button>
                        </div>

                        <p className={styles.registerLine}>
                            ¿No tienes una cuenta?{" "}
                            <Link href="/register" className={styles.link}>Regístrate</Link>
                        </p>
                    </form>

                    {message && <p className={styles.message} role="status">{message}</p>}

                    <Link href="/" className={styles.goback}>← Volver a inicio</Link>
                </div>
            </div>
        </main>
    );
}
