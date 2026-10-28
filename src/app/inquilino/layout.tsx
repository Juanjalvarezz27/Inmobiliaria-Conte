import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/layout/page-transition";

export default async function InquilinoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/home/login");
  }

  // Permitir acceso a INQUILINO y ADMIN
  if (session.user.rol !== "INQUILINO" && session.user.rol !== "ADMIN") {
    redirect("/empleado/dashboard?unauthorized=inquilino");
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70">
      <Navbar user={session.user} />
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-6">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
