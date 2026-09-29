"use client";

import { useActionState, useState, useEffect } from "react";
import Image from "next/image";
import { loginAction, type LoginState } from "@/lib/actions/auth-actions";
import { notify } from "@/lib/notifications";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    null
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDevHelperOpen, setIsDevHelperOpen] = useState(true);

  // Notificación reactiva con título y causa ante errores de autenticación
  useEffect(() => {
    if (state?.error) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("just_logged_in");
      }
      notify.error("Error al iniciar sesión", state.error);
    }
  }, [state?.error]);

  // Notificación reactiva ante estado de sesión, redirecciones protegidas o errores en URL
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const hasLogoutParam = urlParams.get("status") === "logged_out" || urlParams.get("logout") === "true";
    const hasLogoutStorage = sessionStorage.getItem("just_logged_out") === "true";

    // 1. Notificación de Cierre de Sesión Exitoso
    if (hasLogoutParam || hasLogoutStorage) {
      sessionStorage.removeItem("just_logged_out");
      notify.success(
        "Sesión cerrada correctamente",
        "Has salido del sistema de forma segura. ¡Hasta pronto!"
      );
      if (window.location.search) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      return;
    }

    // 2. Notificación si intentó entrar a una ruta privada sin sesión
    const callbackUrl = urlParams.get("callbackUrl");
    if (callbackUrl && !callbackUrl.includes("/home/login")) {
      notify.warning(
        "Acceso restringido",
        "Debes iniciar sesión con tus credenciales para acceder a la sección solicitada."
      );
      return;
    }

    // 3. Notificación ante errores directos del proveedor de autenticación
    const authError = urlParams.get("error");
    if (authError) {
      if (authError === "SessionRequired") {
        notify.warning(
          "Sesión requerida",
          "Tu sesión ha caducado. Por favor ingresa tus credenciales nuevamente."
        );
      } else if (authError === "AccessDenied") {
        notify.error(
          "Acceso denegado",
          "No dispones de las autorizaciones requeridas para acceder con esta cuenta."
        );
      } else {
        notify.error(
          "Error de autenticación",
          "Ocurrió un problema de comunicación con el servicio de autenticación."
        );
      }
    }
  }, []);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!email.trim() || !password.trim()) {
      e.preventDefault();
      notify.warning(
        "Campos incompletos",
        "Por favor ingresa tanto tu correo electrónico como tu contraseña antes de continuar."
      );
      return;
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem("just_logged_in", "true");
    }
  };

  // Helper para autocompletar credenciales de prueba con notificación de feedback
  const fillCredentials = (testEmail: string, testPass: string, roleName?: string) => {
    setEmail(testEmail);
    setPassword(testPass);
    if (roleName) {
      notify.info(
        `Credenciales de ${roleName} cargadas`,
        `Se autocompletaron los datos de acceso para ${testEmail}.`
      );
    }
  };

  return (
    <>
      <div className="w-full max-w-md mx-auto">
      {/* Cabecera del formulario con el logotipo oficial */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Image
            src="/Logo.png"
            alt="Inmobiliaria CONTÉ C.A"
            width={160}
            height={153}
            priority
            className="h-20 w-auto object-contain"
          />
        </div>
        <h2 className="text-2xl font-bold font-heading text-slate-900">
          Iniciar Sesión
        </h2>
        <p className="text-sm text-slate-500 mt-1 font-sans">
          Ingresa tus credenciales para acceder a la plataforma
        </p>
      </div>

      {/* Mensaje de error si falla la autenticación */}
      {state?.error && (
        <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5">
          <svg
            className="w-5 h-5 text-red-600 shrink-0 mt-0.5"
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
          <p className="text-xs font-medium text-red-700">{state.error}</p>
        </div>
      )}

      {/* Formulario */}
      <form action={formAction} onSubmit={handleFormSubmit} className="space-y-4">
        {/* Campo Correo */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
          >
            Correo Electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@conte.com"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#175E38] focus:ring-1 focus:ring-[#175E38] transition-colors"
          />
        </div>

        {/* Campo Contraseña */}
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
          >
            Contraseña
          </label>
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
              className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#175E38] focus:ring-1 focus:ring-[#175E38] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full mt-2 py-2.5 px-4 rounded-lg font-heading font-medium text-sm text-white bg-[#175E38] hover:bg-[#134D2E] active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-sm"
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
              Ingresando...
            </>
          ) : (
            "Ingresar al Sistema"
          )}
        </button>
      </form>
    </div>

    {/* Widget flotante temporal a la derecha con accesos de prueba */}
    {isDevHelperOpen ? (
      <aside
        aria-label="Credenciales de prueba para desarrollo"
        className="fixed bottom-6 right-6 z-50 bg-[#1C2539]/95 backdrop-blur-md border border-[#2D4166] rounded-2xl p-4 shadow-2xl w-72 text-white animate-fadeIn"
      >
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Accesos Demo</span>
          </div>
          <button
            type="button"
            onClick={() => setIsDevHelperOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Minimizar panel demo"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-[11px] text-slate-300 mb-2.5 leading-snug">
          Clic para rellenar credenciales automáticamente:
        </p>

        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => fillCredentials("admin@conte.com", "admin123", "Administrador")}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-[#253758] border border-white/10 hover:border-[#3C588A]/60 transition-all text-left cursor-pointer group"
          >
            <div>
              <span className="block text-xs font-bold text-amber-300">Admin</span>
              <span className="block text-[11px] text-slate-400 font-mono">admin@conte.com</span>
            </div>
            <span className="text-[10px] bg-amber-400/10 text-amber-300 px-2 py-0.5 rounded border border-amber-400/30 font-semibold">Auto</span>
          </button>

          <button
            type="button"
            onClick={() => fillCredentials("empleado@conte.com", "empleado123", "Personal")}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-[#253758] border border-white/10 hover:border-[#3C588A]/60 transition-all text-left cursor-pointer group"
          >
            <div>
              <span className="block text-xs font-bold text-sky-300">Personal</span>
              <span className="block text-[11px] text-slate-400 font-mono">empleado@conte.com</span>
            </div>
            <span className="text-[10px] bg-sky-400/10 text-sky-300 px-2 py-0.5 rounded border border-sky-400/30 font-semibold">Auto</span>
          </button>

          <button
            type="button"
            onClick={() => fillCredentials("inquilino@conte.com", "inquilino123", "Inquilino")}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-[#253758] border border-white/10 hover:border-[#3C588A]/60 transition-all text-left cursor-pointer group"
          >
            <div>
              <span className="block text-xs font-bold text-emerald-300">Inquilino</span>
              <span className="block text-[11px] text-slate-400 font-mono">inquilino@conte.com</span>
            </div>
            <span className="text-[10px] bg-emerald-400/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-400/30 font-semibold">Auto</span>
          </button>
        </div>
      </aside>
    ) : (
      <button
        type="button"
        onClick={() => setIsDevHelperOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-[#1C2539] hover:bg-[#253758] border border-[#2D4166] text-white text-xs font-semibold px-3.5 py-2.5 rounded-full shadow-xl flex items-center gap-2 cursor-pointer transition-all animate-fadeIn"
        title="Ver credenciales de prueba"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Accesos Demo</span>
      </button>
    )}
  </>
);
}
