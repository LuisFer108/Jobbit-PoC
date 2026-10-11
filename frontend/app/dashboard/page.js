"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

            <h1>Bienvenido</h1>

            <h2>Tu perfil laboral</h2>

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
                <strong>Preferencias:</strong> {profile.work_preferences}
            </p>

            <p>
                <strong>Modalidad:</strong> {profile.work_mode}
            </p>

            <Link href="./">
            Volver a inicio
            </Link>

        </main>
    );
}