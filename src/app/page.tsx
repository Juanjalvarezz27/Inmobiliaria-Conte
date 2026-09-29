import { redirect } from "next/navigation";

export default function RootPage() {
  // Redirigir el index global directamente al hub central de la aplicación
  redirect("/home");
}
