import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardRedirectPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/home/login");
  }

  const { rol } = session.user;

  if (rol === "ADMIN") {
    redirect("/admin/dashboard");
  } else if (rol === "EMPLEADO") {
    redirect("/empleado/dashboard");
  } else if (rol === "INQUILINO") {
    redirect("/inquilino/dashboard");
  }

  redirect("/home/login");
}
