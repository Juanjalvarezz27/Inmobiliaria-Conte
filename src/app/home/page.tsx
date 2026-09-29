import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  // Redirección inteligente según estado de autenticación
  if (session?.user) {
    redirect("/home/dashboard");
  }

  redirect("/home/login");
}