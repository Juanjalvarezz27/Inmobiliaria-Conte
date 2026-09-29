import { Metadata } from "next";
import { LoginForm } from "@/components/login/login-form";

export const metadata: Metadata = {
  title: "Iniciar Sesión | Inmobiliaria Conté C.A",
  description: "Portal de acceso para administradores, empleados e inquilinos.",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 overflow-hidden">
      {/* Resplandores ambientales difusos con tonos de marca para aportar volumen */}
      <div className="absolute top-1/4 -left-24 w-96 h-96 rounded-full bg-[#175E38]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-24 w-96 h-96 rounded-full bg-[#1C2539]/10 blur-3xl pointer-events-none" />

      {/* Tarjeta de login con sombra suave y bordes refinados */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-xl shadow-slate-300/60 border border-slate-200/80">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
