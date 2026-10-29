"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Building2,
  Calendar,
  DollarSign,
  ShieldCheck,
  Clock,
  Download,
  Eye,
  ArrowRight,
  CreditCard,
  CheckCircle2,
  FileCheck,
  ImageIcon,
} from "lucide-react";
import { ImageViewerModal } from "@/components/ui/image-viewer-modal";
import type { InquilinoContratoDetalle } from "@/lib/actions/inquilinoPortal";

interface InquilinoContratoClientProps {
  contratos: InquilinoContratoDetalle[];
  esAdminModoSupervision: boolean;
  inquilinoNombre: string;
  documentoIdentidad: string;
}

export function InquilinoContratoClient({
  contratos,
  esAdminModoSupervision,
  inquilinoNombre,
  documentoIdentidad,
}: InquilinoContratoClientProps) {
  // Índice del contrato actualmente seleccionado en pantalla
  const [contratoActivoIdx, setContratoActivoIdx] = useState(0);

  // Estados para el visor de documentos e imágenes
  const [visorAbierto, setVisorAbierto] = useState(false);
  const [visorItems, setVisorItems] = useState<string[]>([]);
  const [visorTitulo, setVisorTitulo] = useState("");
  const [visorSubtitulo, setVisorSubtitulo] = useState("");

  const contratoActual = contratos[contratoActivoIdx] || null;

  const formatearFecha = (isoString?: string | null) => {
    if (!isoString) return "No registrada";
    try {
      const fecha = new Date(isoString);
      return new Intl.DateTimeFormat("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(fecha);
    } catch {
      return isoString;
    }
  };

  const handleAbrirVisorPdf = (url: string, codigoContrato: string) => {
    setVisorItems([url]);
    setVisorTitulo(`Contrato Legal Firmado (${codigoContrato})`);
    setVisorSubtitulo("Inmobiliaria Conté C.A. • Documento Oficial");
    setVisorAbierto(true);
  };

  const handleAbrirVisorFotos = (fotos: string[], codigoUnidad: string) => {
    if (!fotos || fotos.length === 0) return;
    setVisorItems(fotos);
    setVisorTitulo(`Galería del Inmueble (${codigoUnidad})`);
    setVisorSubtitulo(`${fotos.length} fotografía(s) registrada(s)`);
    setVisorAbierto(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* 1. Encabezado de la Sección */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1C2539] via-[#243049] to-[#1C2539] text-white p-5 sm:p-7 border border-white/10 border-b-[4px] border-b-[#0f1624] shadow-xl">
        <div className="absolute -top-16 -left-16 w-60 h-60 bg-[#175E38]/25 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Ficha Contractual
              </span>
              {esAdminModoSupervision && (
                <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Modo Supervisión Admin
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading tracking-tight text-white">
              Mis Contratos de Arrendamiento
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Arrendatario: <strong className="text-white">{inquilinoNombre}</strong> • {documentoIdentidad}
            </p>
          </div>

          <div className="self-start sm:self-center shrink-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs sm:text-sm text-slate-200 font-medium backdrop-blur-xs">
              <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {contratos.length} {contratos.length === 1 ? "contrato registrado" : "contratos registrados"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Si no existen contratos activos */}
      {contratos.length === 0 ? (
        <section className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 p-8 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4 border border-slate-200">
            <FileText className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 font-heading">
            No tienes contratos activos asignados
          </h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Si recientemente arrendaste un espacio con Inmobiliaria Conté C.A., la administración estará vinculando tu ficha contractual en breve.
          </p>
          <div className="mt-6">
            <Link
              href="/inquilino/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all cursor-pointer shadow-xs active:translate-y-0.5"
            >
              <span>Volver al Dashboard</span>
            </Link>
          </div>
        </section>
      ) : (
        <>
          {/* 2. Selector de Contratos si tiene más de 1 contrato registrado */}
          {contratos.length > 1 && (
            <section className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider px-1">
                Selecciona el espacio a inspeccionar:
              </label>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                {contratos.map((c, idx) => {
                  const activo = idx === contratoActivoIdx;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setContratoActivoIdx(idx)}
                      className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                        activo
                          ? "bg-[#175E38] text-white border-[#124b2d] shadow-sm border-b-[3px] border-b-[#0e3a23]"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Building2 className={`w-3.5 h-3.5 ${activo ? "text-emerald-300" : "text-slate-500"}`} />
                      <span>{c.unidad.codigo}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        activo ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        {c.codigo}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {contratoActual && (
            <div className="space-y-6">
              {/* Barra de Estatus Rápido del Contrato Activo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#175E38] border border-emerald-200/80 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {contratoActual.codigo}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          contratoActual.estado === "ACTIVO"
                            ? "bg-emerald-50 text-[#175E38] border-emerald-200"
                            : contratoActual.estado === "POR_VENCER"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {contratoActual.estado === "ACTIVO"
                          ? "CONTRATO VIGENTE"
                          : contratoActual.estado === "POR_VENCER"
                          ? "POR VENCER"
                          : contratoActual.estado}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      {contratoActual.unidad.codigo} • {contratoActual.unidad.propiedad.nombre}
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-auto shrink-0">
                  <Link
                    href="/inquilino/pagos"
                    className="w-full sm:w-auto h-10 sm:h-auto px-4 py-2 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Reportar Pago</span>
                  </Link>
                </div>
              </div>

              {/* Cuadrícula de Fichas Detalladas (Cards Grid Pattern con Efecto Sol) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                {/* 1. Ficha del Inmueble y Unidad Arrendada */}
                <div className="relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07)] flex flex-col justify-between group">
                  {/* Efecto Sol Azul */}
                  <div className="absolute -top-10 -left-10 w-32 h-32 pointer-events-none">
                    <div className="absolute inset-0 rounded-full blur-xl bg-blue-600/20" />
                    <div className="absolute inset-3 rounded-full border border-blue-500/25 bg-blue-500/[0.08]" />
                    <div className="absolute inset-6 rounded-full bg-gradient-to-br from-blue-500/25 to-transparent transition-transform duration-500 group-hover:scale-125" />
                  </div>

                  <div className="relative z-10 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-700 block truncate">
                            Espacio Arrendado
                          </span>
                          <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading truncate">
                            {contratoActual.unidad.codigo}
                          </h3>
                        </div>
                      </div>
                      <div className="self-start sm:self-center shrink-0">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {contratoActual.unidad.tipo}
                        </span>
                      </div>
                    </div>

                    {/* Datos del centro comercial y ubicación */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2 text-slate-700">
                        <Building2 className="w-4 h-4 shrink-0 text-slate-500 mt-0.5" />
                        <div>
                          <strong className="text-slate-900">{contratoActual.unidad.propiedad.nombre}</strong>
                          <span className="block text-slate-600 font-medium text-[11px]">
                            {contratoActual.unidad.propiedad.direccion}, {contratoActual.unidad.propiedad.ciudad}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 pt-2">
                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70">
                          <span className="text-[10px] sm:text-[11px] text-slate-600 uppercase font-bold tracking-wider block">Nivel / Piso</span>
                          <span className="font-bold text-slate-900 text-sm">
                            {contratoActual.unidad.piso ? `Piso ${contratoActual.unidad.piso}` : "Planta Principal"}
                          </span>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70">
                          <span className="text-[10px] sm:text-[11px] text-slate-600 uppercase font-bold tracking-wider block">Superficie</span>
                          <span className="font-bold text-slate-900 text-sm">
                            {contratoActual.unidad.areaMt2 !== null ? `${contratoActual.unidad.areaMt2} m²` : "No especificada"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acciones de la unidad (ver fotos si existen) */}
                  <div className="relative z-10 mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    {contratoActual.unidad.imagenes && contratoActual.unidad.imagenes.length > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleAbrirVisorFotos(
                            contratoActual.unidad.imagenes,
                            contratoActual.unidad.codigo
                          )
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Ver fotos del espacio ({contratoActual.unidad.imagenes.length})</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500 font-medium">Sin fotografías adjuntas</span>
                    )}
                    <span className="text-xs text-slate-600 font-semibold">Uso autorizado</span>
                  </div>
                </div>

                {/* 2. Ficha Económica y Cuotas de Alquiler */}
                <div className="relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07)] flex flex-col justify-between group">
                  {/* Efecto Sol Esmeralda */}
                  <div className="absolute -top-10 -left-10 w-32 h-32 pointer-events-none">
                    <div className="absolute inset-0 rounded-full blur-xl bg-emerald-600/20" />
                    <div className="absolute inset-3 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08]" />
                    <div className="absolute inset-6 rounded-full bg-gradient-to-br from-emerald-500/25 to-transparent transition-transform duration-500 group-hover:scale-125" />
                  </div>

                  <div className="relative z-10 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#175E38] border border-emerald-200/80 flex items-center justify-center shrink-0">
                          <DollarSign className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#175E38] block truncate">
                            Mensualidad
                          </span>
                          <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-heading whitespace-nowrap">
                            ${contratoActual.montoAlquiler.toFixed(2)} USD
                          </h3>
                        </div>
                      </div>
                      <div className="self-start sm:self-center shrink-0">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Mensual
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-semibold">Día de corte mensual:</span>
                          <span className="font-bold text-slate-900">Día {contratoActual.diaCobro} de cada mes</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-semibold">Meses solventados:</span>
                          <span className="font-bold text-[#175E38]">
                            {contratoActual.pagosResumen.totalPagados} cuota(s) pagada(s)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">Pagos directos al propietario</span>
                    <Link
                      href="/inquilino/pagos"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#175E38] hover:text-[#124b2d] cursor-pointer"
                    >
                      <span>Historial de Pagos</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* 3. Ficha de Vigencia y Tiempo Contractual */}
                <div className="relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07)] flex flex-col justify-between group">
                  {/* Efecto Sol Violeta */}
                  <div className="absolute -top-10 -left-10 w-32 h-32 pointer-events-none">
                    <div className="absolute inset-0 rounded-full blur-xl bg-purple-600/20" />
                    <div className="absolute inset-3 rounded-full border border-purple-500/25 bg-purple-500/[0.08]" />
                    <div className="absolute inset-6 rounded-full bg-gradient-to-br from-purple-500/25 to-transparent transition-transform duration-500 group-hover:scale-125" />
                  </div>

                  <div className="relative z-10 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-purple-700 block truncate">
                            Vigencia Contractual
                          </span>
                          <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading whitespace-nowrap">
                            {contratoActual.mesesRestantes} {contratoActual.mesesRestantes === 1 ? "mes restante" : "meses restantes"}
                          </h3>
                        </div>
                      </div>
                      <div className="self-start sm:self-center shrink-0">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200">
                          {contratoActual.mesesTotales} meses totales
                        </span>
                      </div>
                    </div>

                    {/* Fechas de inicio y fin */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70">
                        <span className="text-[10px] sm:text-[11px] text-slate-600 uppercase font-bold tracking-wider block">Fecha de Inicio</span>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {formatearFecha(contratoActual.fechaInicio)}
                        </span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70">
                        <span className="text-[10px] sm:text-[11px] text-slate-600 uppercase font-bold tracking-wider block">Fecha de Culminación</span>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {formatearFecha(contratoActual.fechaFin)}
                        </span>
                      </div>
                    </div>

                    {/* Barra de progreso visual del contrato */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1.5 font-bold">
                        <span className="text-slate-700 font-bold">Transcurso del contrato</span>
                        <span className="text-purple-700">{contratoActual.porcentajeTranscurrido}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
                        <div
                          className="h-full bg-[#175E38] rounded-full transition-all duration-500"
                          style={{ width: `${contratoActual.porcentajeTranscurrido}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Ficha del Depósito de Garantía en Custodia */}
                <div className="relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07)] flex flex-col justify-between group">
                  {/* Efecto Sol Ámbar / Esmeralda */}
                  <div className="absolute -top-10 -left-10 w-32 h-32 pointer-events-none">
                    <div className="absolute inset-0 rounded-full blur-xl bg-amber-500/20" />
                    <div className="absolute inset-3 rounded-full border border-amber-500/25 bg-amber-500/[0.08]" />
                    <div className="absolute inset-6 rounded-full bg-gradient-to-br from-amber-500/25 to-transparent transition-transform duration-500 group-hover:scale-125" />
                  </div>

                  <div className="relative z-10 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-800 block truncate">
                            Depósito de Garantía
                          </span>
                          <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-heading whitespace-nowrap">
                            {contratoActual.deposito.monto
                              ? `$${contratoActual.deposito.monto.toFixed(2)} USD`
                              : "No Aplica"}
                          </h3>
                        </div>
                      </div>

                      <div className="self-start sm:self-center shrink-0">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                            contratoActual.deposito.estado === "COBRADO"
                              ? "bg-emerald-50 text-[#175E38] border-emerald-200"
                              : contratoActual.deposito.estado === "PENDIENTE"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {contratoActual.deposito.estado === "COBRADO"
                            ? "EN CUSTODIA"
                            : contratoActual.deposito.estado === "PENDIENTE"
                            ? "PENDIENTE"
                            : "NO APLICA"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      {contratoActual.deposito.estado === "COBRADO" ? (
                        <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-200/70 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-700 font-semibold">Condición:</span>
                            <span className="font-bold text-[#175E38] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              En Custodia Oficial
                            </span>
                          </div>
                          {contratoActual.deposito.fechaCobro && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-700 font-semibold">Fecha de cobro:</span>
                              <span className="font-bold text-slate-800">
                                {formatearFecha(contratoActual.deposito.fechaCobro)}
                              </span>
                            </div>
                          )}
                          {contratoActual.deposito.metodoPago && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-700 font-semibold">Método registrado:</span>
                              <span className="font-bold text-slate-800 font-mono">
                                {contratoActual.deposito.metodoPago}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 text-slate-700 text-xs font-medium leading-relaxed">
                          Este contrato no contempla retención de depósito en garantía o su condición está pendiente de registro por la administración.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Tarjeta de Descarga y Visor del Contrato Legal Firmado (PDF) */}
              <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 p-5 sm:p-7 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="space-y-2.5 max-w-2xl">
                    {/* Cabecera con Icono y Título */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 text-[#175E38] border border-emerald-200 flex items-center justify-center shrink-0 shadow-xs">
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <h3 className="text-base sm:text-lg font-black font-heading text-slate-900">
                          Documento Legal Firmado (PDF)
                        </h3>
                        {!contratoActual.documentoUrl && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                            En Proceso
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Texto descriptivo a ancho completo aprovechando el espacio izquierdo */}
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {contratoActual.documentoUrl
                        ? "Dispones de la copia digital certificada del contrato suscrito entre las partes para su consulta o resguardo contable."
                        : "Tu contrato físico está actualmente en proceso de digitalización y archivo. Tan pronto esté disponible, podrás consultarlo aquí 24/7."}
                    </p>
                  </div>

                  {/* Acciones de descarga y visualización en Grid 50/50 móvil */}
                  {contratoActual.documentoUrl ? (
                    <div className="grid grid-cols-2 gap-2.5 shrink-0 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() =>
                          handleAbrirVisorPdf(
                            contratoActual.documentoUrl!,
                            contratoActual.codigo
                          )
                        }
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5"
                      >
                        <Eye className="w-3.5 h-3.5 shrink-0" />
                        <span>Ver Contrato</span>
                      </button>

                      <a
                        href={contratoActual.documentoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-[0_2px_8px_rgba(23,94,56,0.25)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                        <span>Descargar</span>
                      </a>
                    </div>
                  ) : (
                    <div className="shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300/80">
                        <Clock className="w-3.5 h-3.5 text-slate-600" />
                        Digitalización pendiente
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Visor Modal Oficial para PDFs y Fotografías */}
      <ImageViewerModal
        isOpen={visorAbierto}
        onClose={() => setVisorAbierto(false)}
        images={visorItems}
        title={visorTitulo}
        subtitle={visorSubtitulo}
      />
    </div>
  );
}
