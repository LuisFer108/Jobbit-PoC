"use client";

import { useRouter } from "next/navigation";

/**
 * Botón de cierre de sesión reutilizable para el portal de candidatos
 * y el panel administrativo (SCRUM-15 / SCRUM-23).
 *
 * La autenticación de Jobbit usa JWT sin estado en el servidor, por lo que
 * eliminar el token del navegador e invalidar el estado en memoria de las
 * instancias abiertas cierra la sesión de forma completa y segura.
 */
export default function LogoutButton({ className, onLogout, label = "Cerrar sesión" }) {
    const router = useRouter();

    function handleLogout() {
        const confirmar = window.confirm(
            "¿Seguro que quieres salir? Guardaremos tu información para cuando vuelvas 👋"
        );
        if (!confirmar) return;

        // 1. Eliminar el token de sesión (SCRUM-137)
        localStorage.removeItem("token");

        // 2. Notificar a la instancia actual y limpiar estados sensibles si se provee callback (SCRUM-139)
        if (typeof onLogout === "function") {
            onLogout();
        }
        window.dispatchEvent(new Event("jobbit:logout"));

        // 3. Redireccionar al login reemplazando el historial (SCRUM-138 / SCRUM-139)
        router.replace("/login");
    }

    return (
        <button
            type="button"
            className={className}
            onClick={handleLogout}
            aria-label="Cerrar sesión de forma segura"
        >
            <span aria-hidden="true">⎋ </span>
            {label}
        </button>
    );
}
