import { auth } from "@/auth";
import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  Users,
  FileText,
  CircleDollarSign,
  TrendingUp,
  Wrench,
  UserCheck,
  CalendarDays,
  ArrowRight,
} from "lucide-react";

// Tipos para las tarjetas de navegación del Hub de Administrador
interface ModuleCard {
  title: string;
  category: string;
  badge: string;
  description: string;
  href: string;
  actionText: string;
  icon: React.ComponentType<{ className?: string }>;
  colorTokens: {
    glow: string;
    ringBorder: string;
    ringBg: string;
    gradient: string;
    iconBox: string;
    badgeStyle: string;
    buttonHover: string;
  };
}

export default async function AdminDashboardPage() {
  const session = await auth();

  // Fecha actual formateada en español institucional
  const fechaHoy = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const fechaFormateada = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);

  // Módulos institucionales del sistema
  const modules: ModuleCard[] = [
    {
      title: "Propiedades & Espacios",
      category: "Inmuebles & Contratos",
      badge: "Inmuebles",
      description: "Catálogo maestro de centros comerciales, locales, oficinas y niveles de ocupación.",
      href: "/admin/propiedades",
      actionText: "Explorar Inmuebles",
      icon: Building2,
      colorTokens: {
        glow: "bg-blue-600/20",
        ringBorder: "border-blue-500/25",
        ringBg: "bg-blue-500/[0.08]",
        gradient: "from-blue-500/25",
        iconBox: "bg-blue-50 text-blue-700 border-blue-200/90",
        badgeStyle: "bg-blue-50 text-blue-700 border-blue-200",
        buttonHover: "hover:bg-[#124b2d]",
      },
    },
    {
      title: "Directorio de Inquilinos",
      category: "Inmuebles & Contratos",
      badge: "Arrendatarios",
      description: "Padrón de personas naturales y jurídicas con contacto directo y contratos vinculados.",
      href: "/admin/inquilinos",
      actionText: "Ver Inquilinos",
      icon: Users,
      colorTokens: {
        glow: "bg-[#175E38]/20",
        ringBorder: "border-[#175E38]/25",
        ringBg: "bg-[#175E38]/[0.08]",
        gradient: "from-[#175E38]/25",
        iconBox: "bg-emerald-50 text-[#175E38] border-emerald-200/90",
        badgeStyle: "bg-emerald-50 text-[#175E38] border-emerald-200",
        buttonHover: "hover:bg-[#124b2d]",
      },
    },
    {
      title: "Contratos de Arrendamiento",
      category: "Inmuebles & Contratos",
      badge: "Marco Legal",
      description: "Gestión de canones en divisas/Bs, depósitos en garantía, plazos y PDF oficial firmado.",
      href: "/admin/contratos",
      actionText: "Revisar Contratos",
      icon: FileText,
      colorTokens: {
        glow: "bg-indigo-600/20",
        ringBorder: "border-indigo-500/25",
        ringBg: "bg-indigo-500/[0.08]",
        gradient: "from-indigo-500/25",
        iconBox: "bg-indigo-50 text-indigo-700 border-indigo-200/90",
        badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-200",
        buttonHover: "hover:bg-[#124b2d]",
      },
    },
    {
      title: "Panel de Cobranza",
      category: "Cobranza & Finanzas",
      badge: "Cobranzas",
      description: "Conciliación de pagos mensuales, cuotas vencidas, tasa BCV y emisión de recibos oficiales.",
      href: "/admin/cobranza",
      actionText: "Gestionar Cobranzas",
      icon: CircleDollarSign,
      colorTokens: {
        glow: "bg-emerald-600/20",
        ringBorder: "border-emerald-500/25",
        ringBg: "bg-emerald-500/[0.08]",
        gradient: "from-emerald-500/25",
        iconBox: "bg-emerald-50 text-[#175E38] border-emerald-200/90",
        badgeStyle: "bg-emerald-50 text-[#175E38] border-emerald-200",
        buttonHover: "hover:bg-[#124b2d]",
      },
    },
    {
      title: "Finanzas & Balance General",
      category: "Cobranza & Finanzas",
      badge: "Tesorería",
      description: "Flujo de caja, libro diario interactivo, 12 tipologías de egresos y cierre contable en PDF.",
      href: "/admin/finanzas",
      actionText: "Abrir Finanzas",
      icon: TrendingUp,
      colorTokens: {
        glow: "bg-teal-600/20",
        ringBorder: "border-teal-500/25",
        ringBg: "bg-teal-500/[0.08]",
        gradient: "from-teal-500/25",
        iconBox: "bg-teal-50 text-teal-700 border-teal-200/90",
        badgeStyle: "bg-teal-50 text-teal-700 border-teal-200",
        buttonHover: "hover:bg-[#124b2d]",
      },
    },
    {
      title: "Tickets de Mantenimiento",
      category: "Operaciones",
      badge: "Operaciones",
      description: "Recepción y asignación de averías en locales con supervisión técnica y evidencias.",
      href: "/admin/mantenimiento",
      actionText: "Ver Mantenimiento",
      icon: Wrench,
      colorTokens: {
        glow: "bg-amber-600/20",
        ringBorder: "border-amber-500/25",
        ringBg: "bg-amber-500/[0.08]",
        gradient: "from-amber-500/25",
        iconBox: "bg-amber-50 text-amber-700 border-amber-200/90",
        badgeStyle: "bg-amber-50 text-amber-700 border-amber-200",
        buttonHover: "hover:bg-[#124b2d]",
      },
    },
    {
      title: "Personal & Asistencia",
      category: "Operaciones",
      badge: "Recursos Humanos",
      description: "Control de equipo operativo, marcajes de jornada laboral y asignación de tareas en campo.",
      href: "/admin/personal",
      actionText: "Control de Personal",
      icon: UserCheck,
      colorTokens: {
        glow: "bg-sky-600/20",
        ringBorder: "border-sky-500/25",
        ringBg: "bg-sky-500/[0.08]",
        gradient: "from-sky-500/25",
        iconBox: "bg-sky-50 text-sky-700 border-sky-200/90",
        badgeStyle: "bg-sky-50 text-sky-700 border-sky-200",
        buttonHover: "hover:bg-[#124b2d]",
      },
    },
    {
      title: "Agenda & Alertas",
      category: "Operaciones",
      badge: "Programación",
      description: "Calendario de cobros, vencimientos de contratos a 90/30 días y recordatorios automáticos.",
      href: "/admin/agenda",
      actionText: "Consultar Agenda",
      icon: CalendarDays,
      colorTokens: {
        glow: "bg-purple-600/20",
        ringBorder: "border-purple-500/25",
        ringBg: "bg-purple-500/[0.08]",
        gradient: "from-purple-500/25",
        iconBox: "bg-purple-50 text-purple-700 border-purple-200/90",
        badgeStyle: "bg-purple-50 text-purple-700 border-purple-200",
        buttonHover: "hover:bg-[#124b2d]",
      },
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* 1. Banner Hero Ejecutivo de Bienvenida */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1C2539] via-[#243049] to-[#1C2539] text-white p-5 sm:p-7 border border-white/10 border-b-[4px] border-b-[#0f1624] shadow-xl">
        {/* Resplandor ambiental de marca */}
        <div className="absolute -top-16 -left-16 w-60 h-60 bg-[#175E38]/25 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Logo, Nombre Institucional y Saludo */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0 border border-white/20">
              <Image
                src="/Logo.png"
                alt="Inmobiliaria Conté"
                width={64}
                height={64}
                priority
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-extrabold text-emerald-400 uppercase tracking-widest font-heading">
                Inmobiliaria Conté
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading tracking-tight text-white">
                Bienvenido, {session?.user?.nombre || "Administrador"}
              </h1>
            </div>
          </div>

          {/* Fecha */}
          <div className="self-start sm:self-center shrink-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs sm:text-sm text-slate-200 font-medium backdrop-blur-xs">
              <CalendarDays className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{fechaFormateada}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Cuadrícula de Tarjetas 3D de los Módulos del Sistema */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 text-[#1C2539] shrink-0" />
            <h2 className="text-sm sm:text-base font-black font-heading text-slate-900 tracking-tight truncate">
              Módulos del Sistema
            </h2>
          </div>
          <span className="shrink-0 text-xs font-semibold text-slate-500 bg-slate-100/90 border border-slate-200/90 px-2.5 py-0.5 rounded-full shadow-2xs">
            8 módulos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="group relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between p-5 sm:p-5.5 cursor-pointer"
              >
                {/* Efecto Sol / Resplandor Ambiental en Esquina Superior Izquierda */}
                <div className="absolute -top-10 -left-10 w-32 h-32 pointer-events-none">
                  <div className={`absolute inset-0 rounded-full blur-xl ${mod.colorTokens.glow}`} />
                  <div className={`absolute inset-3 rounded-full border ${mod.colorTokens.ringBorder} ${mod.colorTokens.ringBg}`} />
                  <div className={`absolute inset-6 rounded-full bg-gradient-to-br ${mod.colorTokens.gradient} to-transparent transition-transform duration-500 group-hover:scale-125`} />
                </div>

                {/* Cabecera y Contenido de la Tarjeta */}
                <div className="relative z-10 space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    {/* Caja de Icono Institucional */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-2xs group-hover:scale-105 transition-transform duration-200 shrink-0 ${mod.colorTokens.iconBox}`}>
                      <Icon className="w-5 h-5 stroke-[2.2]" />
                    </div>

                    {/* Badge de Categoría */}
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider ${mod.colorTokens.badgeStyle}`}>
                      {mod.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black font-heading text-slate-900 group-hover:text-[#175E38] transition-colors leading-snug">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                      {mod.description}
                    </p>
                  </div>
                </div>

                {/* Botón de Entrada 3D */}
                <div className="relative z-10 mt-5 pt-3 border-t border-slate-100">
                  <div className="w-full h-11 rounded-xl text-xs sm:text-sm font-bold bg-[#175E38] text-white group-hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-[0_2px_8px_rgba(23,94,56,0.25)] flex items-center justify-center gap-2 transition-all">
                    <span>{mod.actionText}</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

    </div>
  );
}
