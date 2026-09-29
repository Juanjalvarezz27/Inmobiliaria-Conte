import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth-actions";
import { Rol } from "@prisma/client";

export default async function DashboardPage() {
  const session = await auth();

  // Si no hay sesión válida, redirigir a login
  if (!session?.user) {
    redirect("/home/login");
  }

  const { user } = session;

  // Estilos de badge según el rol del usuario
  const roleBadgeStyles: Record<Rol, { label: string; badgeClass: string; desc: string }> = {
    ADMIN: {
      label: "Administrador General",
      badgeClass: "bg-brand-navy text-white",
      desc: "Control total sobre propiedades, finanzas y usuarios.",
    },
    EMPLEADO: {
      label: "Personal de Campo",
      badgeClass: "bg-slate-700 text-white",
      desc: "Gestión de tareas operativas, asistencia y tickets de mantenimiento.",
    },
    INQUILINO: {
      label: "Arrendatario / Inquilino",
      badgeClass: "bg-brand-green text-white",
      desc: "Visualización de contratos, recibos de pago y solicitud de mantenimiento.",
    },
  };

  const userRoleInfo = roleBadgeStyles[user.rol as Rol] || {
    label: user.rol,
    badgeClass: "bg-brand-navy text-white",
    desc: "Usuario del sistema.",
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Barra superior de navegación */}
      <header className="bg-brand-navy text-white px-6 lg:px-12 py-4 shadow-sm flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-brand-navy flex items-center justify-center font-heading font-black text-lg shadow-sm">
            C
          </div>
          <div>
            <span className="font-heading font-bold text-lg tracking-tight block leading-tight">
              Inmobiliaria Conte
            </span>
            <span className="text-[11px] text-slate-300 font-medium tracking-wide">
              Panel del Sistema
            </span>
          </div>
        </div>

        {/* Acciones del usuario autenticado */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-semibold text-white">
              {user.nombre} {user.apellido || ""}
            </span>
            <span className="text-xs text-slate-300">{user.email}</span>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-white text-xs font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Cerrar Sesión
            </button>
          </form>
        </div>
      </header>

      {/* Contenedor principal */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-6 lg:p-10 space-y-8">
        {/* Banner de bienvenida y confirmación de rol */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-navy font-heading">
                ¡Bienvenido, {user.nombre}!
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${userRoleInfo.badgeClass}`}
              >
                {userRoleInfo.label}
              </span>
            </div>
            <p className="text-sm text-brand-gray max-w-2xl font-sans">
              Has iniciado sesión exitosamente con tu cuenta verificada. {userRoleInfo.desc}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200/80 px-4 py-3 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-green animate-pulse"></span>
            <span className="text-xs font-medium text-emerald-900">
              Sesión Activa Segura
            </span>
          </div>
        </section>

        {/* Ficha de datos del usuario actual */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 md:col-span-1">
            <h2 className="text-base font-bold text-brand-navy font-heading mb-4 pb-2 border-b border-slate-100">
              Datos del Perfil
            </h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-brand-gray uppercase">
                  Nombre Completo
                </dt>
                <dd className="font-semibold text-slate-800">
                  {user.nombre} {user.apellido || ""}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-brand-gray uppercase">
                  Cédula / Documento
                </dt>
                <dd className="font-semibold text-slate-800">
                  {user.cedula || "No registrada"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-brand-gray uppercase">
                  Correo Electrónico
                </dt>
                <dd className="font-semibold text-slate-800 truncate">
                  {user.email}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-brand-gray uppercase">
                  Rol Asignado
                </dt>
                <dd className="font-semibold text-slate-800">
                  {user.rol}
                </dd>
              </div>
            </dl>
          </div>

          {/* Información del estado del sistema */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 md:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-brand-navy font-bold text-xs">
                  ℹ️
                </span>
                <h2 className="text-base font-bold text-brand-navy font-heading">
                  Ruta Unificada Temporal
                </h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Tal como se definió, todos los roles (<strong className="text-brand-navy">ADMIN</strong>,{" "}
                <strong className="text-brand-navy">EMPLEADO</strong> e{" "}
                <strong className="text-brand-navy">INQUILINO</strong>) son dirigidos a esta misma
                página tras autenticarse con éxito.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mt-2">
                En las próximas etapas, el sistema redirigirá automáticamente a cada usuario a su portal exclusivo con las vistas y permisos correspondientes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 mt-6 border-t border-slate-100">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                <span className="text-xs font-semibold text-brand-navy block">Fase 4</span>
                <span className="text-[11px] text-brand-gray">Gestión de Propiedades</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                <span className="text-xs font-semibold text-brand-navy block">Fase 5</span>
                <span className="text-[11px] text-brand-gray">Inquilinos y Contratos</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                <span className="text-xs font-semibold text-brand-navy block">Fase 6</span>
                <span className="text-[11px] text-brand-gray">Panel de Cobranza</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
