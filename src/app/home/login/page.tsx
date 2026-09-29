import { Metadata } from "next";
import { LoginForm } from "@/components/login/login-form";

export const metadata: Metadata = {
  title: "Iniciar Sesión | Inmobiliaria CONTÉ C.A",
  description: "Portal de acceso para administradores, empleados e inquilinos.",
};

export default function LoginPage() {
  return (
    <main className="flex-1 relative flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans bg-slate-100 overflow-hidden">
      {/* Tarjeta de login en blanco puro con sombra pronunciada para despegarla del fondo */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-2xl shadow-slate-300/50 border border-slate-200/80">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
