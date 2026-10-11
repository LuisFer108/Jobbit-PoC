"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import Link from "next/link";

export default function LoginPage() {

    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

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

            // Guardar token
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

    return (
        <main className={styles.container}>
            <div className={styles.card}>
                <Link href="./" className={styles.goback}>Volver a inicio</Link>
                <h1 className={styles.title}>Iniciar sesión</h1>

                <form onSubmit={handleSubmit}>

                    <input
                        className={styles.input}
                        type="email"
                        placeholder="Correo"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <br />

                    <input
                        className={styles.input}
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <br />

                    <button className={styles.button} type="submit">
                        Iniciar sesión
                    </button>
                    

                </form>
                
                {message && <p>{message}</p>}

            </div>
        </main>
    );
}