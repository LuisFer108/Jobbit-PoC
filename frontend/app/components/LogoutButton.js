"use client";

import { useRouter } from "next/navigation";

/**
 * Botón de cierre de sesión reutilizable.
 *
 * Decisión de diseño (SCRUM-15): el logout es SOLO en cliente.
 * La autenticación de Jobbit usa JWT sin estado en el servidor, por lo que
 * eliminar el token del navegador cierra la sesión de forma efectiva. No se
 * usa un endpoint de backend ni revocación de tokens: innecesario para la PoC.
 */
export default function LogoutButton({ className }) {
    const router = useRouter();

    function handleLogout() {
        const confirmar = window.confirm(
            "¿Seguro que quieres salir? Guardaremos tu información para cuando vuelvas 👋"
        );
        if (!confirmar) return;

        // Limpieza completa de la sesión: en Jobbit la "sesión" es únicamente
        // el token en localStorage. Sin token, ninguna petición protegida pasa
        // el middleware del backend.
        localStorage.removeItem("token");

        // Se usa replace (no push) para que el botón "atrás" del navegador no
        // regrese a una página privada después de cerrar sesión (SCRUM-71).
        router.replace("/login");
    }

    return (
        <button type="button" className={className} onClick={handleLogout}>
            Cerrar sesión
        </button>
    );
}
