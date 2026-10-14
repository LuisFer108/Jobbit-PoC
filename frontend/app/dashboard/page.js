"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "../components/LogoutButton";

export default function DashboardPage() {

    

    const router = useRouter();

    const [profile, setProfile] = useState(null);

    useEffect(() => {

        async function getProfile() {

            const token = localStorage.getItem("token");

            if (!token) {
                router.push("/login");
                return;
            }

            const response = await fetch(
                "http://localhost:5001/api/profile",
                {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                router.push("/profile");
                return;
            }

            const data = await response.json();

            setProfile(data);
        }

        getProfile();

    }, [router]);

    if (!profile) {
        return <p>Cargando...</p>;
    }

    return (
        <main>

            <h1>Bienvenido/a</h1> {profile.name}

            <h2>Tu perfil laboral</h2>

            {profile.is_complete ? (
                <p style={{ color: "#16a34a", fontWeight: "bold" }}>
                    ✓ Estado del perfil: Completo (Habilitado para postulación asistida)
                </p>
            ) : (
                <p style={{ color: "#d97706", fontWeight: "bold" }}>
                    ⚠️ Estado del perfil: Incompleto (Debes completarlo para postularte a vacantes)
                </p>
            )}

            <p>
                <strong>Campo:</strong> {profile.field}
            </p>

            <p>
                <strong>Experiencia:</strong> {profile.experience}
            </p>

            <p>
                <strong>Años:</strong> {profile.experience_years}
            </p>

            <p>
                <strong>Educación:</strong> {profile.education}
            </p>

            <p>
                <strong>Preferencias:</strong> {profile.work_preferences}
            </p>

            <p>
                <strong>Modalidad:</strong> {profile.work_mode}
            </p>

            <p>
                <Link href="/profile/edit">
                    Actualizar perfil laboral
                </Link>
            </p>

            <p>
                <Link href="/jobs">
                    Ver vacantes disponibles
                </Link>
            </p>

            <p>
                <Link href="/applications">
                    📋 Ver mis postulaciones y su estado
                </Link>
            </p>

            <LogoutButton />

        </main>
    );
}
