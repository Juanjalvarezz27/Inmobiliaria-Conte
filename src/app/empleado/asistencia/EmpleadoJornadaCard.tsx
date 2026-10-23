"use client";

import {
  Clock,
  LogIn,
  LogOut,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import type { RegistroAsistenciaItem } from "@/app/admin/personal/types";
import { EstadoAsistencia } from "@prisma/client";
import { formatearHora12, formatearFechaEspanol } from "@/lib/date-utils";

interface EmpleadoJornadaCardProps {
  registro: RegistroAsistenciaItem;
  propiedadNombre: string | null;
}

// Detectar si el registro fue cerrado por olvido a medianoche
function esCierrePorOlvido(reg: RegistroAsistenciaItem): boolean {
  return (
    reg.ubicacionSalida?.includes("Cierre Automático") ||
    reg.observaciones?.includes("Cierre automático") ||
    false
  );
}

// Cálculo de tiempo laborado con soporte para cierres forzados
function calcularHoras(
  entradaStr: string | null,
  salidaStr: string | null,
  esOlvido: boolean
): string {
  if (esOlvido) return "Incompleta";
  if (!entradaStr || !salidaStr) return "En curso";

  const entrada = new Date(entradaStr).getTime();
  const salida = new Date(salidaStr).getTime();
  if (isNaN(entrada) || isNaN(salida) || salida < entrada) return "---";

  const diffMs = salida - entrada;
  const horas = Math.floor(diffMs / (1000 * 60 * 60));
  const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (horas === 0) return `${minutos}m`;
  return minutos > 0 ? `${horas}h ${minutos}m` : `${horas}h`;
}

// Tarjeta individual de jornada histórica para el portal del empleado
export function EmpleadoJornadaCard({
  registro,
  propiedadNombre,
}: EmpleadoJornadaCardProps) {
  const esOlvido = esCierrePorOlvido(registro);
  const horas = calcularHoras(registro.horaEntrada, registro.horaSalida, esOlvido);
  const isInasistencia =
    registro.estado === EstadoAsistencia.FALTA_JUSTIFICADA ||
    registro.estado === EstadoAsistencia.FALTA_INJUSTIFICADA;

  const d = new Date(registro.fecha);
  const diasSemana = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
  const diaSemanaAbrev = !isNaN(d.getTime()) ? diasSemana[d.getDay()] : "---";
  const diaNumero = !isNaN(d.getTime()) ? String(d.getDate()).padStart(2, "0") : "--";

  const sunTokens =
    registro.estado === EstadoAsistencia.PRESENTE || registro.estado === EstadoAsistencia.RETARDO
      ? {
          glowBg: "bg-emerald-500/25",
          glowBorder: "border-emerald-400/30",
          glowGrad: "from-[#175E38]/30",
        }
      : registro.estado === EstadoAsistencia.FALTA_JUSTIFICADA ||
        registro.estado === EstadoAsistencia.PERMISO
      ? {
          glowBg: "bg-blue-500/25",
          glowBorder: "border-blue-400/30",
          glowGrad: "from-blue-600/30",
        }
      : {
          glowBg: "bg-rose-500/25",
          glowBorder: "border-rose-400/30",
          glowGrad: "from-rose-600/30",
        };

  return (
    <div className="group relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/70 rounded-2xl p-5 border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_18px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_14px_30px_-4px_rgba(28,37,57,0.12),0_4px_10px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between min-h-[250px]">
      {/* Sol decorativo en esquina superior izquierda (3 capas concéntricas) */}
      <div className="absolute -top-7 -left-7 w-20 h-20 sm:w-24 sm:h-24 pointer-events-none overflow-hidden rounded-full">
        <div className={`absolute inset-0 rounded-full blur-lg ${sunTokens.glowBg}`} />
        <div className={`absolute inset-2 rounded-full bg-white/5 border ${sunTokens.glowBorder}`} />
        <div
          className={`absolute inset-5 rounded-full bg-gradient-to-br to-transparent transition-transform duration-500 group-hover:scale-125 ${sunTokens.glowGrad}`}
        />
      </div>

      <div>
        {/* Cabecera de la Card del Día */}
        <div className="flex items-start justify-between gap-3 relative z-10 mb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            {/* Caja de Fecha Calendario */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col items-center justify-center shrink-0 shadow-2xs">
              <span className="text-[10px] font-black uppercase text-slate-400 leading-tight">
                {diaSemanaAbrev}
              </span>
              <span className="font-heading font-black text-base sm:text-lg text-slate-900 leading-none">
                {diaNumero}
              </span>
            </div>

            <div className="min-w-0">
              <h4 className="font-heading font-black text-sm sm:text-base text-slate-900 truncate">
                {formatearFechaEspanol(registro.fecha)}
              </h4>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    isInasistencia
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  {isInasistencia ? registro.estado : "PRESENTE"}
                </span>
                {esOlvido && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>Olvido</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Horas Trabajadas / Badge Estado */}
          <div className="shrink-0 text-right">
            {esOlvido ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-200 shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Auto</span>
              </span>
            ) : !registro.horaSalida ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>En curso</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black text-slate-700 bg-slate-100 border border-slate-200/70 shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-[#175E38]" />
                <span>{horas}</span>
              </span>
            )}
          </div>
        </div>

        {/* Cuerpo: 2 Cajas de Datos (Entrada y Salida) */}
        <div className="grid grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-slate-100 relative z-10">
          {/* Entrada */}
          <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/70 shadow-2xs">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              <LogIn className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
              <span>Entrada</span>
            </div>
            <span suppressHydrationWarning className="font-heading font-black text-sm sm:text-base text-slate-900 block leading-tight">
              {formatearHora12(registro.horaEntrada)}
            </span>
            <span className="text-[11px] text-slate-500 truncate block mt-1">
              {registro.ubicacionEntrada || propiedadNombre || "Sede Principal"}
            </span>
          </div>

          {/* Salida */}
          <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/70 shadow-2xs">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              <LogOut
                className={`w-3.5 h-3.5 shrink-0 ${
                  esOlvido ? "text-amber-600" : "text-slate-400"
                }`}
              />
              <span>Salida</span>
            </div>
            <span
              suppressHydrationWarning
              className={`font-heading font-black text-sm sm:text-base block leading-tight ${
                esOlvido ? "text-amber-800" : "text-slate-900"
              }`}
            >
              {esOlvido
                ? "11:59 p. m."
                : registro.horaSalida
                ? formatearHora12(registro.horaSalida)
                : "En curso..."}
            </span>
            <span className="text-[11px] text-slate-500 truncate block mt-1">
              {esOlvido
                ? "Cierre automático"
                : registro.ubicacionSalida || (registro.horaSalida ? "Marcaje Móvil" : "Pendiente")}
            </span>
          </div>
        </div>
      </div>

      {/* Franja Inferior: Advertencia u Observaciones */}
      {esOlvido ? (
        <div className="mt-3 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/70 flex items-center gap-2 text-xs text-amber-800 font-medium relative z-10">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="truncate">Cerrada automáticamente a medianoche</span>
        </div>
      ) : registro.observaciones ? (
        <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2 text-xs text-slate-600 relative z-10">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{registro.observaciones}</span>
        </div>
      ) : null}
    </div>
  );
}
