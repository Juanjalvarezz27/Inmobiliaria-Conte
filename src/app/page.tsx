import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginPage from "./home/login/page";

export default async function RootPage() {
  const session = await auth();

  // Si el usuario ya está autenticado, enviar al dashboard
  if (session?.user) {
    redirect("/home/dashboard");
  }

  // Renderizar la vista principal directamente en la ruta raíz
  return <LoginPage />;
}
