import { redirect } from "next/navigation";

// La raíz redirige al login rediseñado: al abrir http://localhost:3000 el
// usuario cae directamente en /login (redirección en servidor, sin flash).
export default function Home() {
  redirect("/login");
}
