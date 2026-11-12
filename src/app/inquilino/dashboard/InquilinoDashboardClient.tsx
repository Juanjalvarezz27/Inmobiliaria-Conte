"use client";

import Link from "next/link";
import {
  CreditCard,
  ArrowRight,
  CalendarDays,
  ShieldCheck,
  AlertTriangle,
  Building2,
  DollarSign,
  Clock,
  Info,
  Zap,
  Droplets,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import type { ResumenFinancieroInquilino, LocalArrendadoResumen } from "@/lib/actions/inquilinoPortal";

interface InquilinoDashboardClientProps {
  nombre: string;
  email: string;
  mustChangePasswordInitial?: boolean;
  fechaFormateada: string;
  resumen: ResumenFinancieroInquilino;
  locales: LocalArrendadoResumen[];
}

export function InquilinoDashboardClient({
  nombre,
  email: _email,
  mustChangePasswordInitial: _mustChangePasswordInitial,
  fechaFormateada,
  resumen,
  locales,
}: InquilinoDashboardClientProps) {
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

      {/* 2. Notificación de Acción Prioritaria (Solo visible en MORA o POR PAGAR) */}
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

      {/* 3. Notificación de Solvencia de Servicios Públicos (Luz y Agua) */}
      {(resumen.totalServiciosPendientes ?? 0) > 0 && (
        <section className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 border-b-[3px] border-b-slate-300/90 p-4 sm:p-5 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.06)] group">
          {/* Resplandor ambiental sutil de marca */}
          <div className="absolute -top-8 -left-8 w-28 h-28 bg-[#175E38]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                <div className="flex items-center -space-x-0.5">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <Droplets className="w-4 h-4 text-blue-500 fill-blue-500" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-slate-900 tracking-tight font-heading">
                    Solvencia de Servicios Públicos
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {resumen.serviciosLuzPendientesCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80">
                        <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                        {resumen.serviciosLuzPendientesCount} {resumen.serviciosLuzPendientesCount === 1 ? "mes" : "meses"} Luz
                      </span>
                    )}
                    {resumen.serviciosAguaPendientesCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200/80">
                        <Droplets className="w-3 h-3 text-blue-600 fill-blue-500" />
                        {resumen.serviciosAguaPendientesCount} {resumen.serviciosAguaPendientesCount === 1 ? "mes" : "meses"} Agua
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1 sm:line-clamp-none">
                  Comprobantes de Corpoelec o Hidroandes sin adjuntar. Consigna tus recibos para evitar restricciones.
                </p>
              </div>
            </div>

            <Link
              href="/inquilino/pagos"
              className="w-full sm:w-auto h-10 px-4 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-[0_2px_8px_rgba(23,94,56,0.2)] transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Adjuntar Recibos</span>
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
              ? ((resumen.totalServiciosPendientes ?? 0) > 0
                  ? "Al día en canon • Servicios pendientes"
                  : (resumen.ultimoPeriodoPagado ? `${resumen.ultimoPeriodoPagado}: Solvente` : "Solvencia impecable"))
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
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 flex items-center justify-center shrink-0">
                    <Building2 className="w-4.5 h-4.5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 block truncate">
                      Espacio Arrendado
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading truncate">
                      {locales[0].codigoLocal}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-center shrink-0">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                    {locales[0].tipoUnidad}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {locales[0].contratoCodigo}
                  </span>
                </div>
              </div>

              {/* Ubicación */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{locales[0].propiedadNombre}</span>
              </div>

              {/* Ficha métrica vertical: una debajo de otra */}
              <div className="grid grid-cols-1 gap-2 pt-1">
                <div className="bg-slate-50/70 rounded-xl px-3 py-2.5 border border-slate-200/70 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Nivel / Piso</span>
                  <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                    {locales[0].piso ? `Piso ${locales[0].piso}` : "Planta Principal"}
                  </span>
                </div>
                <div className="bg-slate-50/70 rounded-xl px-3 py-2.5 border border-slate-200/70 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Superficie</span>
                  <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                    {locales[0].areaMt2 !== null ? `${locales[0].areaMt2} m²` : "No especificada"}
                  </span>
                </div>
                <div className="bg-slate-50/70 rounded-xl px-3 py-2.5 border border-slate-200/70 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Mensualidad</span>
                  <span className="font-bold text-[#175E38] text-xs sm:text-sm">
                    ${locales[0].mensualidad.toFixed(2)} USD
                  </span>
                </div>
                <div className="bg-slate-50/70 rounded-xl px-3 py-2.5 border border-slate-200/70 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Día de corte</span>
                  <span className="font-semibold text-slate-800 text-xs sm:text-sm">
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
                    <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 block truncate">
                      Estado de Cuenta
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading truncate">
                      {resumen.semaforoEstado === "AL_DIA"
                        ? "Al día • Solvente"
                        : resumen.semaforoEstado === "POR_PAGAR"
                        ? "Cuota Pendiente"
                        : "Saldo en Mora"}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center self-start sm:self-center shrink-0">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${
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
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Facturación regular y registro contable</span>
              </div>

              {/* Ficha métrica vertical: una debajo de otra (sincronizada con la tarjeta izquierda) */}
              <div className="grid grid-cols-1 gap-2 pt-1">
                {resumen.semaforoEstado === "EN_MORA" ? (
                  <>
                    <div className="bg-rose-50/70 rounded-xl px-3 py-2.5 border border-rose-200/80 flex items-center justify-between">
                      <span className="text-xs text-rose-900 font-medium">
                        Saldo Vencido
                      </span>
                      <span className="font-bold text-[#CC1A22] text-xs sm:text-sm">
                        ${resumen.montoDeudaVencida.toFixed(2)} USD
                      </span>
                    </div>

                    <div className="bg-slate-50/70 rounded-xl px-3 py-2.5 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
                        Período en Mora
                      </span>
                      <span className="font-bold text-rose-950 text-xs sm:text-sm">
                        {resumen.periodoVencidoTexto || "Cuota vencida"}
                      </span>
                    </div>

                    <div className="bg-slate-50/70 rounded-xl px-3 py-2.5 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
                        Cuotas Pendientes
                      </span>
                      <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                        {resumen.cuotasVencidasCount} mensualidad(es)
                      </span>
                    </div>

                    <div className="bg-slate-50/70 rounded-xl px-3 py-2.5 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
                        Último Período
                      </span>
                      <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                        {resumen.ultimoPeriodoPagado ? `${resumen.ultimoPeriodoPagado} (Solvente)` : "Sin registros previos"}
                      </span>
                    </div>
                  </>
                ) : resumen.semaforoEstado === "POR_PAGAR" ? (
                  <>
                    <div className="bg-amber-50/70 rounded-xl px-3 py-2.5 border border-amber-200/80 flex items-center justify-between">
                      <span className="text-xs text-amber-900 font-medium">
                        Cuota Pendiente
                      </span>
                      <span className="font-bold text-amber-800 text-xs sm:text-sm">
                        ${resumen.montoPorPagar.toFixed(2)} USD
                      </span>
                    </div>

                    <div className="bg-slate-50/70 rounded-xl px-3 py-2.5 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
                        Período por Pagar
                      </span>
                      <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                        {resumen.periodoProximoVencimiento}
                      </span>
                    </div>

                    <div className="bg-slate-50/70 rounded-xl px-3 py-2.5 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
                        Fecha de Corte
                      </span>
                      <span className="font-bold text-[#175E38] text-xs sm:text-sm">
                        Día {resumen.proximoDiaCorte || 10} del mes {resumen.diasParaVencer !== null ? `(en ${resumen.diasParaVencer}d)` : ""}
                      </span>
                    </div>

                    <div className="bg-slate-50/70 rounded-xl px-3 py-2.5 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
                        Último Período
                      </span>
                      <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                        {resumen.ultimoPeriodoPagado ? `${resumen.ultimoPeriodoPagado} (Solvente)` : "Sin registros previos"}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-slate-50/70 rounded-xl px-3 py-2.5 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
                        Último Período
                      </span>
                      <span className="font-bold text-[#175E38] text-xs sm:text-sm">
                        {resumen.ultimoPeriodoPagado ? `${resumen.ultimoPeriodoPagado} (Solvente)` : "Sin registros previos"}
                      </span>
                    </div>

                    <div className="bg-slate-50/70 rounded-xl px-3 py-2.5 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
                        Total Solventadas
                      </span>
                      <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                        {resumen.cuotasPagadasCount} cuota(s) al día
                      </span>
                    </div>

                    {resumen.periodoProximoVencimiento && (
                      <div className="bg-slate-50/70 rounded-xl px-3 py-2.5 border border-slate-200/70 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">
                          Próxima Cuota
                        </span>
                        <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                          {resumen.periodoProximoVencimiento} (${resumen.montoMensualidadTotal.toFixed(2)} USD)
                        </span>
                      </div>
                    )}

                    <div className="bg-slate-50/70 rounded-xl px-3 py-2.5 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
                        Fecha de Corte
                      </span>
                      <span className="font-semibold text-slate-800 text-xs sm:text-sm">
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
    </div>
  );
}
