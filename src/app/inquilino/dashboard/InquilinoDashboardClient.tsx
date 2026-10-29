"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  FileText,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  CalendarDays,
  Lock,
  Eye,
  EyeOff,
  Check,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Building2,
  DollarSign,
  Clock,
  Info,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { StatCard } from "@/components/ui/stat-card";
import { notify } from "@/lib/notifications";
import { cambiarPasswordPrimerAcceso } from "@/lib/actions/inquilinosAcceso";
import { useRouter } from "next/navigation";
import type { ResumenFinancieroInquilino, LocalArrendadoResumen } from "@/lib/actions/inquilinoPortal";

interface InquilinoDashboardClientProps {
  nombre: string;
  email: string;
  mustChangePasswordInitial: boolean;
  fechaFormateada: string;
  resumen: ResumenFinancieroInquilino;
  locales: LocalArrendadoResumen[];
}

export function InquilinoDashboardClient({
  nombre,
  email,
  mustChangePasswordInitial,
  fechaFormateada,
  resumen,
  locales,
}: InquilinoDashboardClientProps) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tieneClaveProvisional, setTieneClaveProvisional] = useState(mustChangePasswordInitial);

  // Estados del formulario modal de cambio de contraseña
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmacion, setPasswordConfirmacion] = useState("");
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Validación en tiempo real
  const cumpleLongitud = passwordNueva.length >= 6;
  const coinciden = passwordNueva.length > 0 && passwordNueva === passwordConfirmacion;
  const formularioValido = cumpleLongitud && coinciden;

  const handleCerrarModal = () => {
    if (isPending) return;
    setModalAbierto(false);
    setPasswordNueva("");
    setPasswordConfirmacion("");
  };

  const handleGuardarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formularioValido || isPending) return;

    setIsPending(true);
    try {
      const res = await cambiarPasswordPrimerAcceso({
        passwordNueva,
        passwordConfirmacion,
      });

      if (res.success) {
        notify.success("¡Contraseña actualizada!", res.message);
        setTieneClaveProvisional(false);
        setModalAbierto(false);
        setPasswordNueva("");
        setPasswordConfirmacion("");
        router.refresh();
      } else {
        notify.error("Error", res.message);
      }
    } catch {
      notify.error("Error", "Ocurrió un error inesperado al actualizar la contraseña.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* 1. Banner Institucional de Bienvenida */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1C2539] via-[#243049] to-[#1C2539] text-white p-5 sm:p-7 border border-white/10 border-b-[4px] border-b-[#0f1624] shadow-xl">
        {/* Resplandor ambiental de marca verde esmeralda */}
        <div className="absolute -top-16 -left-16 w-60 h-60 bg-[#175E38]/25 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Portal del Inquilino
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
                resumen.semaforoEstado === "AL_DIA"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                  : resumen.semaforoEstado === "POR_PAGAR"
                  ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
                  : resumen.semaforoEstado === "EN_MORA"
                  ? "bg-rose-500/20 text-rose-300 border-rose-400/30"
                  : "bg-slate-500/20 text-slate-300 border-slate-400/30"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  resumen.semaforoEstado === "AL_DIA"
                    ? "bg-emerald-400"
                    : resumen.semaforoEstado === "POR_PAGAR"
                    ? "bg-amber-400"
                    : resumen.semaforoEstado === "EN_MORA"
                    ? "bg-rose-400 animate-pulse"
                    : "bg-slate-400"
                }`} />
                {resumen.semaforoEstado === "AL_DIA"
                  ? "Solvente • Al Día"
                  : resumen.semaforoEstado === "POR_PAGAR"
                  ? "Cuota Por Pagar"
                  : resumen.semaforoEstado === "EN_MORA"
                  ? "En Mora"
                  : "Sin Contrato"}
              </span>
              {resumen.esAdminModoSupervision && (
                <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Modo Supervisión Admin
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black font-heading tracking-tight text-white">
              Bienvenido, {nombre}
            </h1>
          </div>

          {/* Fecha del Día */}
          <div className="self-start sm:self-center shrink-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs sm:text-sm text-slate-200 font-medium backdrop-blur-xs">
              <CalendarDays className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{fechaFormateada}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Banner de Alerta de Contraseña Provisional (Clave 123456 por defecto) */}
      {tieneClaveProvisional && (
        <section className="relative overflow-hidden bg-gradient-to-r from-amber-50 via-amber-50/80 to-orange-50/60 border border-amber-200/90 border-b-[3px] border-b-amber-300/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in-50 duration-300">
          <div className="flex items-start gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300/60 shadow-2xs">
              <ShieldAlert className="w-5 h-5 text-amber-700 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-slate-900 font-heading">
                  Contraseña Provisional Activa (123456)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                  Recomendado
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
                Tu cuenta está utilizando la contraseña estándar inicial. Te sugerimos personalizarla para mayor privacidad y control de tus recibos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="w-full sm:w-auto shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer relative z-10"
          >
            <KeyRound className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Personalizar Contraseña</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      )}

      {/* 3. Notificación de Acción Prioritaria (Solo visible en MORA o POR PAGAR) */}
      {resumen.semaforoEstado === "EN_MORA" && (
        <section className="relative overflow-hidden rounded-2xl border border-rose-200/90 border-b-[3px] border-b-[#CC1A22] bg-gradient-to-r from-rose-50/90 via-white to-rose-50/40 p-4 sm:p-5 shadow-sm transition-all">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-[#CC1A22] border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2.3]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#CC1A22] animate-pulse" />
                    CUOTA EN MORA
                  </span>
                  <span className="text-xs font-bold text-rose-700">
                    {resumen.periodoVencidoTexto || `${resumen.cuotasVencidasCount} mensualidad(es) adeudada(s)`}
                  </span>
                </div>
                <p className="text-xs text-rose-800 font-medium mt-1">
                  Saldo vencido de <strong className="text-slate-900 font-black">{resumen.periodoVencidoTexto || "período adeudado"}</strong>: <strong className="text-slate-900 font-black text-sm">${resumen.montoDeudaVencida.toFixed(2)} USD</strong>. Regulariza tu pago para evitar restricciones en tus espacios.
                </p>
              </div>
            </div>

            <Link
              href="/inquilino/pagos"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-[#CC1A22] text-white hover:bg-[#a81219] border-b-[3px] border-b-[#850b11] active:translate-y-0.5 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Reportar Pago Urgente</span>
            </Link>
          </div>
        </section>
      )}

      {resumen.semaforoEstado === "POR_PAGAR" && (
        <section className="relative overflow-hidden rounded-2xl border border-amber-200/90 border-b-[3px] border-b-amber-500 bg-gradient-to-r from-amber-50/90 via-white to-amber-50/40 p-4 sm:p-5 shadow-sm transition-all">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 stroke-[2.3]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                    CUOTA POR PAGAR
                  </span>
                  <span className="text-xs font-bold text-amber-800">
                    {resumen.periodoProximoVencimiento || "Próxima cuota"} • {resumen.diasParaVencer !== null && resumen.diasParaVencer > 0
                      ? `Vence en ${resumen.diasParaVencer} día(s)`
                      : "Vence hoy"}
                  </span>
                </div>
                <p className="text-xs text-amber-900 font-medium mt-1">
                  Mensualidad de <strong className="text-slate-900 font-bold">{resumen.periodoProximoVencimiento}</strong> (${resumen.montoPorPagar.toFixed(2)} USD) con corte el día {resumen.proximoDiaCorte || 10} del mes.
                </p>
              </div>
            </div>

            <Link
              href="/inquilino/pagos"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Reportar Pago</span>
            </Link>
          </div>
        </section>
      )}

      {/* 4. Métricas Clave de la Cuenta (2x2 en Móvil, 4 en Desktop) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Mensualidad Regular */}
        <StatCard
          title="Mensualidad"
          value={`$${resumen.montoMensualidadTotal.toFixed(2)} USD`}
          subtitle="Compromiso mensual regular"
          icon={DollarSign}
          color="emerald"
        />

        {/* Card 2: Estado de Cuenta */}
        <StatCard
          title="Estado de Cuenta"
          value={
            resumen.semaforoEstado === "AL_DIA"
              ? "Al día"
              : resumen.semaforoEstado === "POR_PAGAR"
              ? "Por Pagar"
              : resumen.semaforoEstado === "EN_MORA"
              ? "En Mora"
              : "Sin Contrato"
          }
          subtitle={
            resumen.semaforoEstado === "AL_DIA"
              ? (resumen.ultimoPeriodoPagado ? `${resumen.ultimoPeriodoPagado}: Solvente` : "Solvencia impecable")
              : resumen.semaforoEstado === "POR_PAGAR"
              ? (resumen.periodoProximoVencimiento ? `${resumen.periodoProximoVencimiento} (en ${resumen.diasParaVencer}d)` : "Vence hoy")
              : (resumen.periodoVencidoTexto ? `${resumen.periodoVencidoTexto} vencido` : `${resumen.cuotasVencidasCount} cuota(s) en mora`)
          }
          icon={resumen.semaforoEstado === "AL_DIA" ? ShieldCheck : resumen.semaforoEstado === "POR_PAGAR" ? Clock : AlertTriangle}
          color={resumen.semaforoEstado === "AL_DIA" ? "emerald" : resumen.semaforoEstado === "POR_PAGAR" ? "amber" : "rose"}
        />

        {/* Card 3: Espacios en Posesión */}
        <StatCard
          title="Espacios en Posesión"
          value={`${resumen.totalLocalesActivos} ${resumen.totalLocalesActivos === 1 ? "unidad" : "unidades"}`}
          subtitle={resumen.detalleEspacioPrincipal || "Locales o apartamentos"}
          icon={Building2}
          color="navy"
        />

        {/* Card 4: Vigencia Contractual */}
        <StatCard
          title="Vigencia Contractual"
          value={
            resumen.mesesRestantesContrato !== null
              ? `${resumen.mesesRestantesContrato} ${resumen.mesesRestantesContrato === 1 ? "mes" : "meses"}`
              : "Vigente"
          }
          subtitle={
            resumen.codigoContratoPrincipal
              ? `${resumen.codigoContratoPrincipal} • Activo`
              : "Sin contratos vigentes"
          }
          icon={CalendarDays}
          color="blue"
        />
      </section>

      {/* 5. Cuerpo Principal: Distribución Equilibrada y Completa */}
      {locales.length === 0 ? (
        <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Sin Contratos Activos Registrados
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Actualmente no tienes locales o apartamentos vigentes asignados a tu cuenta. Si acabas de firmar, la administración estará asociando tu ficha en breve.
              </p>
            </div>
          </div>
        </section>
      ) : locales.length === 1 ? (
        /* Layout de 2 Columnas Equilibrado para inquilinos con 1 espacio */
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {/* Columna Izquierda: Ficha Ejecutiva del Espacio Arrendado */}
          <div className="relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07)] p-5 sm:p-6 space-y-4 group">
            {/* Efecto Sol Azul */}
            <div className="absolute -top-10 -left-10 w-32 h-32 pointer-events-none">
              <div className="absolute inset-0 rounded-full blur-xl bg-blue-500/20" />
              <div className="absolute inset-3 rounded-full border border-blue-400/25 bg-blue-500/[0.08]" />
              <div className="absolute inset-6 rounded-full bg-gradient-to-br from-blue-600/25 to-transparent transition-transform duration-500 group-hover:scale-125" />
            </div>

            <div className="space-y-4 relative z-10">
              {/* Cabecera del Espacio Arrendado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block truncate">
                      Espacio Arrendado
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-heading truncate">
                      {locales[0].codigoLocal}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-center shrink-0">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                    {locales[0].tipoUnidad}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {locales[0].contratoCodigo}
                  </span>
                </div>
              </div>

              {/* Ubicación */}
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{locales[0].propiedadNombre}</span>
              </div>

              {/* Ficha métrica vertical: una debajo de otra */}
              <div className="grid grid-cols-1 gap-2 sm:gap-2.5 pt-1">
                <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs text-slate-600 uppercase font-bold tracking-wider">Nivel / Piso</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {locales[0].piso ? `Piso ${locales[0].piso}` : "Planta Principal"}
                  </span>
                </div>
                <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs text-slate-600 uppercase font-bold tracking-wider">Superficie</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {locales[0].areaMt2 !== null ? `${locales[0].areaMt2} m²` : "No especificada"}
                  </span>
                </div>
                <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs text-slate-600 uppercase font-bold tracking-wider">Mensualidad</span>
                  <span className="font-bold text-[#175E38] text-sm">
                    ${locales[0].mensualidad.toFixed(2)} USD
                  </span>
                </div>
                <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs text-slate-600 uppercase font-bold tracking-wider">Día de Corte</span>
                  <span className="font-bold text-slate-900 text-sm">
                    Día {locales[0].diaCobro} de cada mes
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Estado de Cuenta & Facturación Inmediata */}
          <div className="relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07)] p-5 sm:p-6 space-y-4 group">
            {/* Efecto Sol Esmeralda */}
            <div className="absolute -top-10 -left-10 w-32 h-32 pointer-events-none">
              <div className="absolute inset-0 rounded-full blur-xl bg-emerald-600/20" />
              <div className="absolute inset-3 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08]" />
              <div className="absolute inset-6 rounded-full bg-gradient-to-br from-emerald-500/25 to-transparent transition-transform duration-500 group-hover:scale-125" />
            </div>

            <div className="space-y-4 relative z-10">
              {/* Cabecera de Estado de Cuenta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    resumen.semaforoEstado === "AL_DIA"
                      ? "bg-emerald-50 text-[#175E38] border-emerald-200"
                      : resumen.semaforoEstado === "POR_PAGAR"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}>
                    {resumen.semaforoEstado === "AL_DIA" ? (
                      <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                    ) : resumen.semaforoEstado === "POR_PAGAR" ? (
                      <Clock className="w-5 h-5 stroke-[2.2]" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block truncate">
                      Estado de Cuenta
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-heading truncate">
                      {resumen.semaforoEstado === "AL_DIA"
                        ? "Al día • Solvente"
                        : resumen.semaforoEstado === "POR_PAGAR"
                        ? "Cuota Pendiente"
                        : "Saldo en Mora"}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center self-start sm:self-center shrink-0">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                    resumen.semaforoEstado === "AL_DIA"
                      ? "bg-emerald-50 text-[#175E38] border-emerald-200"
                      : resumen.semaforoEstado === "POR_PAGAR"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}>
                    {resumen.semaforoEstado === "AL_DIA"
                      ? (resumen.ultimoPeriodoPagado ? `${resumen.ultimoPeriodoPagado}: Solvente` : "Solvente")
                      : resumen.semaforoEstado === "POR_PAGAR"
                      ? "Por Pagar"
                      : "En Mora"}
                  </span>
                </div>
              </div>

              {/* Sublínea contextual */}
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Facturación regular y registro contable</span>
              </div>

              {/* Ficha métrica vertical: una debajo de otra (sincronizada con la tarjeta izquierda) */}
              <div className="grid grid-cols-1 gap-2 sm:gap-2.5 pt-1">
                {resumen.semaforoEstado === "EN_MORA" ? (
                  <>
                    <div className="bg-rose-50/80 rounded-xl p-3 border border-rose-200/80 flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs text-rose-900 uppercase font-bold tracking-wider">
                        Saldo Vencido
                      </span>
                      <span className="font-black text-[#CC1A22] text-sm">
                        ${resumen.montoDeudaVencida.toFixed(2)} USD
                      </span>
                    </div>

                    <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs text-slate-600 uppercase font-bold tracking-wider">
                        Período en Mora
                      </span>
                      <span className="font-black text-rose-950 text-sm">
                        {resumen.periodoVencidoTexto || "Cuota vencida"}
                      </span>
                    </div>

                    <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs text-slate-600 uppercase font-bold tracking-wider">
                        Cuotas Pendientes
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {resumen.cuotasVencidasCount} mensualidad(es)
                      </span>
                    </div>

                    <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs text-slate-600 uppercase font-bold tracking-wider">
                        Último Período
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {resumen.ultimoPeriodoPagado ? `${resumen.ultimoPeriodoPagado} (Solvente)` : "Sin registros previos"}
                      </span>
                    </div>
                  </>
                ) : resumen.semaforoEstado === "POR_PAGAR" ? (
                  <>
                    <div className="bg-amber-50/80 rounded-xl p-3 border border-amber-200/80 flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs text-amber-900 uppercase font-bold tracking-wider">
                        Cuota Pendiente
                      </span>
                      <span className="font-black text-amber-800 text-sm">
                        ${resumen.montoPorPagar.toFixed(2)} USD
                      </span>
                    </div>

                    <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs text-slate-600 uppercase font-bold tracking-wider">
                        Período por Pagar
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {resumen.periodoProximoVencimiento}
                      </span>
                    </div>

                    <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs text-slate-600 uppercase font-bold tracking-wider">
                        Fecha de Corte
                      </span>
                      <span className="font-bold text-[#175E38] text-sm">
                        Día {resumen.proximoDiaCorte || 10} del mes {resumen.diasParaVencer !== null ? `(en ${resumen.diasParaVencer}d)` : ""}
                      </span>
                    </div>

                    <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs text-slate-600 uppercase font-bold tracking-wider">
                        Último Período
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {resumen.ultimoPeriodoPagado ? `${resumen.ultimoPeriodoPagado} (Solvente)` : "Sin registros previos"}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs text-slate-600 uppercase font-bold tracking-wider">
                        Último Período
                      </span>
                      <span className="font-bold text-[#175E38] text-sm">
                        {resumen.ultimoPeriodoPagado ? `${resumen.ultimoPeriodoPagado} (Solvente)` : "Sin registros previos"}
                      </span>
                    </div>

                    <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs text-slate-600 uppercase font-bold tracking-wider">
                        Total Solventadas
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {resumen.cuotasPagadasCount} cuota(s) al día
                      </span>
                    </div>

                    {resumen.periodoProximoVencimiento && (
                      <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 flex items-center justify-between">
                        <span className="text-[11px] sm:text-xs text-slate-600 uppercase font-bold tracking-wider">
                          Próxima Cuota
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {resumen.periodoProximoVencimiento} (${resumen.montoMensualidadTotal.toFixed(2)} USD)
                        </span>
                      </div>
                    )}

                    <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs text-slate-600 uppercase font-bold tracking-wider">
                        Fecha de Corte
                      </span>
                      <span className="font-bold text-[#175E38] text-sm">
                        Día {resumen.proximoDiaCorte || 10} del mes {resumen.diasParaVencer !== null ? `(en ${resumen.diasParaVencer}d)` : ""}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Multi-inmueble: Estado de cuenta destacado + Grid de Espacios */
        <section className="space-y-6">
          {/* Ficha consolidada de estado de cuenta */}
          <div className="relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#175E38] border border-emerald-200 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                      resumen.semaforoEstado === "AL_DIA"
                        ? "bg-emerald-50 text-[#175E38] border border-emerald-200"
                        : resumen.semaforoEstado === "POR_PAGAR"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                      {resumen.semaforoEstado === "AL_DIA" ? "Solvente" : resumen.semaforoEstado === "POR_PAGAR" ? "Por Pagar" : "En Mora"}
                    </span>
                    {resumen.semaforoEstado === "EN_MORA" && resumen.periodoVencidoTexto ? (
                      <span className="text-xs font-bold text-rose-700">
                        {resumen.periodoVencidoTexto} en mora
                      </span>
                    ) : resumen.semaforoEstado === "POR_PAGAR" && resumen.periodoProximoVencimiento ? (
                      <span className="text-xs font-bold text-amber-800">
                        {resumen.periodoProximoVencimiento} pendiente
                      </span>
                    ) : resumen.ultimoPeriodoPagado ? (
                      <span className="text-xs font-bold text-slate-700">
                        {resumen.ultimoPeriodoPagado}: Solvente
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    Posees {locales.length} inmuebles arrendados. Próximo corte general: Día {resumen.proximoDiaCorte || 10} del mes.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 shrink-0">
                <Link
                  href="/inquilino/pagos"
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5"
                >
                  <CreditCard className="w-3.5 h-3.5 shrink-0" />
                  <span>Mis Recibos</span>
                </Link>
                <Link
                  href="/inquilino/pagos"
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-[0_2px_8px_rgba(23,94,56,0.25)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Reportar Pago</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Cuadrícula de Todos los Espacios Arrendados */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full bg-[#1C2539]" />
                <h2 className="text-sm sm:text-base font-black font-heading text-slate-900 tracking-tight truncate">
                  Tus Espacios en Posesión
                </h2>
              </div>
              <span className="shrink-0 text-xs font-semibold text-slate-500 bg-slate-100/90 border border-slate-200/90 px-2.5 py-0.5 rounded-full shadow-2xs">
                {locales.length} inmuebles
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locales.map((local) => (
                <div
                  key={local.id}
                  className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {local.tipoUnidad}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {local.contratoCodigo}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 font-heading group-hover:text-[#175E38] transition-colors">
                      {local.codigoLocal}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mt-1">
                      <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                      <span className="truncate">{local.propiedadNombre}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-slate-100 text-xs">
                      <div className="bg-slate-50 rounded-xl p-2 border border-slate-200/70">
                        <span className="text-[10px] text-slate-600 uppercase font-bold tracking-wider block">Área</span>
                        <span className="font-bold text-slate-900">
                          {local.areaMt2 !== null ? `${local.areaMt2} m²` : "N/D"}
                        </span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2 border border-slate-200/70">
                        <span className="text-[10px] text-slate-600 uppercase font-bold tracking-wider block">Mensualidad</span>
                        <span className="font-bold text-[#175E38]">${local.mensualidad.toFixed(2)} USD</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">
                      Corte mensual: Día {local.diaCobro}
                    </span>
                    <Link
                      href="/inquilino/contrato"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#175E38] hover:text-[#124b2d] group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Ficha Contractual</span>
                      <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Modal Institucional de Cambio de Contraseña In-Situ */}
      <Modal
        isOpen={modalAbierto}
        onClose={handleCerrarModal}
        title="Personalizar Contraseña"
        subtitle="Actualiza tu clave de acceso al portal del inquilino"
        icon={KeyRound}
        headerVariant="green"
        maxWidth="md"
        backdropBlur={true}
      >
        <form onSubmit={handleGuardarPassword} className="space-y-4 pt-1">
          {/* Mensaje Informativo */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 leading-relaxed">
            Hola <strong className="text-slate-900">{nombre}</strong> ({email}). Introduce tu nueva clave personal para proteger el acceso a tus recibos y contratos.
          </div>

          {/* Nueva Contraseña */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nueva Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showNueva ? "text" : "password"}
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={isPending}
                required
                minLength={6}
                className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowNueva(!showNueva)}
                disabled={isPending}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordNueva.length > 0 && !cumpleLongitud && (
              <p className="text-[11px] text-rose-600 mt-1">
                Debe contener al menos 6 caracteres.
              </p>
            )}
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showConfirm ? "text" : "password"}
                value={passwordConfirmacion}
                onChange={(e) => setPasswordConfirmacion(e.target.value)}
                placeholder="Repite la nueva clave"
                disabled={isPending}
                required
                minLength={6}
                className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                disabled={isPending}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordConfirmacion.length > 0 && !coinciden && (
              <p className="text-[11px] text-rose-600 mt-1">
                Las contraseñas no coinciden.
              </p>
            )}
          </div>

          {/* Botones de acción inferiores 50/50 móvil */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2.5 sm:flex sm:justify-end">
            <button
              type="button"
              onClick={handleCerrarModal}
              disabled={isPending}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!formularioValido || isPending}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Actualizar Clave</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
