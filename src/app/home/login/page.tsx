import { Metadata } from "next";
import { LoginForm } from "@/components/login/login-form";

export const metadata: Metadata = {
  title: "Iniciar Sesión | Inmobiliaria Conte",
  description: "Portal de acceso para administradores, empleados e inquilinos.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Elemento decorativo de fondo */}
      <div className="absolute inset-0 bg-[radial-gradient(#1C2539_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none" />

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        <LoginForm />

        <p className="mt-6 text-center text-xs text-brand-gray">
          &copy; {new Date().getFullYear()} Inmobiliaria Conte. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
