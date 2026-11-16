import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginPage from "./home/login/page";

export default async function RootPage() {
  const session = await auth();

  // Redirección directa según rol sin saltos intermedios
  if (session?.user) {
    const rol = session.user.rol;
    if (rol === "ADMIN") redirect("/admin/dashboard");
    if (rol === "EMPLEADO") redirect("/empleado/dashboard");
    if (rol === "INQUILINO") redirect("/inquilino/dashboard");
    redirect("/home/login");
  }

  // Renderizado directo del formulario en la raíz
  return <LoginPage />;
}
