"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/lib/actions/auth-actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    null
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Helper para autocompletar credenciales de prueba con un clic
  const fillCredentials = (testEmail: string, testPass: string) => {
    setEmail(testEmail);
    setPassword(testPass);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Tarjeta principal del formulario */}
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8">
        {/* Cabecera del formulario */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-navy text-white font-heading font-bold text-2xl shadow-md mb-4">
            C
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy font-heading">
            Inmobiliaria Conte
          </h1>
          <p className="text-sm text-brand-gray mt-1 font-sans">
            Ingresa tus credenciales para acceder al sistema
          </p>
        </div>

        {/* Mensaje de error si falla la autenticación */}
        {state?.error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-brand-red/30 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-brand-red shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-xs font-medium text-brand-red">{state.error}</p>
          </div>
        )}

        <form action={formAction} className="space-y-5">
          {/* Campo Correo Electrónico */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-brand-navy mb-2"
            >
              Correo Electrónico
            </label>
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@conte.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy transition-all"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-brand-navy"
              >
                Contraseña
              </label>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Botón de acción principal con Verde Inmobiliaria */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 px-4 rounded-xl font-heading font-medium text-sm text-white bg-brand-green hover:opacity-95 active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-brand-green/20 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Iniciando sesión...
              </>
            ) : (
              "Ingresar al Sistema"
            )}
          </button>
        </form>

        {/* Sección interactiva con credenciales de prueba */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-3 text-center">
            Usuarios de prueba rápidos
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials("admin@conte.com", "admin123")}
              className="p-2.5 rounded-lg border border-slate-200 hover:border-brand-navy hover:bg-slate-50 transition-all text-center cursor-pointer group"
            >
              <span className="block text-xs font-bold text-brand-navy group-hover:text-brand-navy">
                Admin
              </span>
              <span className="block text-[10px] text-brand-gray truncate">
                admin@conte.com
              </span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("empleado@conte.com", "empleado123")}
              className="p-2.5 rounded-lg border border-slate-200 hover:border-brand-navy hover:bg-slate-50 transition-all text-center cursor-pointer group"
            >
              <span className="block text-xs font-bold text-brand-navy group-hover:text-brand-navy">
                Empleado
              </span>
              <span className="block text-[10px] text-brand-gray truncate">
                empleado@conte.com
              </span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("inquilino@conte.com", "inquilino123")}
              className="p-2.5 rounded-lg border border-slate-200 hover:border-brand-navy hover:bg-slate-50 transition-all text-center cursor-pointer group"
            >
              <span className="block text-xs font-bold text-brand-navy group-hover:text-brand-navy">
                Inquilino
              </span>
              <span className="block text-[10px] text-brand-gray truncate">
                inquilino@conte.com
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
