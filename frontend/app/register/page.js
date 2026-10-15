"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import Link from "next/link";
import Image from "next/image";

export default function RegisterPage() {

    const router = useRouter();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: ""
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

        const response = await fetch(
            "http://localhost:5001/api/auth/register",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(form)
            }
        );

        const data = await response.json();

        if (response.ok) {
            router.push("/login");
        } else {
            setMessage(data.message);
        }
    }

    // ===== PRESENTACIÓN NUEVA =====
    return (
        <main className={styles.page}>
            <div className={styles.card}>
                <header className={styles.topbar}>
                    <div className={styles.brand}>
                        <Image src="/Logo-jobbit.svg" alt="Jobbit" width={130} height={40} priority unoptimized />
                    </div>
                    <div className={styles.topbarTitle}>
                        <span className={styles.userIcon} aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                                <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6Z"/>
                            </svg>
                        </span>
                        Crear cuenta
                    </div>
                </header>

                <div className={styles.body}>
                    <h1 className={styles.welcome}>¡Bienvenid@ a Jobbit!</h1>
                    <p className={styles.subtitle}>Crea tu cuenta para empezar a encontrar tu próxima oportunidad.</p>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <label className={styles.label} htmlFor="name">Nombre</label>
                        <input
                            id="name"
                            className={styles.input}
                            type="text"
                            name="name"
                            placeholder="Tu nombre"
                            value={form.name}
                            onChange={handleChange}
                        />

                        <label className={styles.label} htmlFor="email">Correo electrónico</label>
                        <input
                            id="email"
                            className={styles.input}
                            type="email"
                            name="email"
                            placeholder="tucorreo@ejemplo.com"
                            value={form.email}
                            onChange={handleChange}
                        />

                        <label className={styles.label} htmlFor="password">Contraseña</label>
                        <input
                            id="password"
                            className={styles.input}
                            type="password"
                            name="password"
                            placeholder="Crea una contraseña"
                            value={form.password}
                            onChange={handleChange}
                        />

                        <div className={styles.actions}>
                            <button type="submit" className={styles.primaryButton}>
                                Registrarse
                            </button>
                        </div>

                        <p className={styles.loginLine}>
                            ¿Ya tienes una cuenta?{" "}
                            <Link href="/login" className={styles.link}>Inicia sesión</Link>
                        </p>
                    </form>

                    {message && <p className={styles.message} role="status">{message}</p>}

                    <Link href="./" className={styles.goback}>← Volver a inicio</Link>
                </div>
            </div>
        </main>
    );
}
