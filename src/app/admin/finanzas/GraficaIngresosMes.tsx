"use client";

import React, { useState, useMemo, useRef } from "react";
import { TrendingUp, ArrowUpRight } from "lucide-react";
import type { DiaFinancieroMes } from "./types";
import { MESES, formatearMontoUSD } from "./constants";

interface GraficaIngresosMesProps {
  totalIngresos: number;
  totalAlquiler: number;
  totalExtra: number;
  conteoCobranzas: number;
  conteoExtra: number;
  mes: number;
  ano: number;
  diasDelMes: DiaFinancieroMes[];
  diasEnMes: number;
}

type PuntoGrafica = DiaFinancieroMes & { x: number; y: number };

export function GraficaIngresosMes({
  totalIngresos,
  totalAlquiler,
  totalExtra,
  mes,
  ano,
  diasDelMes,
  diasEnMes,
}: GraficaIngresosMesProps) {
  const [hoveredDia, setHoveredDia] = useState<PuntoGrafica | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const nombreMes = MESES.find((m) => m.value === String(mes))?.label || `Mes ${mes}`;

  // Dimensiones ampliadas y optimizadas para visualización móvil y desktop
  const width = 500;
  const height = 200;
  const padLeft = 28;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 26;
  const graphWidth = width - padLeft - padRight;
  const graphHeight = height - padTop - padBottom;

  // Monto máximo diario (al menos 1 para evitar división por 0)
  const maxMonto = Math.max(...diasDelMes.map((d) => d.ingresos), 1);

  // Calcular coordenadas (x, y) de cada día
  const puntos = useMemo(() => {
    return diasDelMes.map((d) => {
      const x = padLeft + ((d.dia - 1) / Math.max(diasEnMes - 1, 1)) * graphWidth;
      const y = padTop + graphHeight - (d.ingresos / maxMonto) * graphHeight;
      return { ...d, x, y };
    });
  }, [diasDelMes, diasEnMes, maxMonto, graphWidth, graphHeight]);

  // Construir el path de la curva SVG suavizada
  const pathData = useMemo(() => {
    if (puntos.length === 0) return "";
    let d = `M ${puntos[0].x} ${puntos[0].y}`;
    for (let i = 1; i < puntos.length; i++) {
      const prev = puntos[i - 1];
      const curr = puntos[i];
      const midX = (prev.x + curr.x) / 2;
      d += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [puntos]);

  // Construir el área sombreada cerrada
  const areaData = useMemo(() => {
    if (puntos.length === 0) return "";
    const firstX = puntos[0].x;
    const lastX = puntos[puntos.length - 1].x;
    const baselineY = padTop + graphHeight;
    return `${pathData} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  }, [pathData, puntos, graphHeight]);

  // Día pico con mayor recaudación
  const diaTop = diasDelMes.reduce(
    (max, d) => (d.ingresos > max.ingresos ? d : max),
    diasDelMes[0] || { dia: 1, ingresos: 0 }
  );

  // Rastreo continuo del cursor/touch sin saltos ni parpadeos (60 FPS)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || puntos.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const svgX = (relativeX / rect.width) * width;

    // Calcular el índice del punto más cercano con límite de bordes
    const clampedX = Math.max(padLeft, Math.min(padLeft + graphWidth, svgX));
    const progress = (clampedX - padLeft) / graphWidth;
    const targetIndex = Math.round(progress * (diasEnMes - 1));
    const safeIndex = Math.max(0, Math.min(diasEnMes - 1, targetIndex));

    if (puntos[safeIndex]) {
      setHoveredDia(puntos[safeIndex]);
    }
  };

  const handlePointerLeave = () => {
    setHoveredDia(null);
  };

  return (
    <div className="group relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/70 rounded-2xl p-3 sm:p-4 lg:p-4.5 border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_18px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_14px_30px_-4px_rgba(28,37,57,0.12),0_4px_10px_-2px_rgba(28,37,57,0.06)] transition-all duration-300 flex flex-col justify-between">
      {/* Sol decorativo institucional en verde esmeralda */}
      <div className="absolute -top-10 -left-10 w-24 h-24 pointer-events-none overflow-hidden rounded-full">
        <div className="absolute inset-0 rounded-full blur-xl bg-emerald-500/18" />
        <div className="absolute inset-2 rounded-full bg-white/5 border border-emerald-400/25" />
        <div className="absolute inset-5 rounded-full bg-gradient-to-br from-[#175E38]/30 to-transparent transition-transform duration-500 group-hover:scale-125" />
      </div>

      <div className="relative z-10 space-y-2">
        {/* Cabecera del Panel Compacta */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl bg-emerald-50 border border-emerald-200/90 flex items-center justify-center shrink-0 shadow-2xs">
              <TrendingUp className="w-4 h-4 text-[#175E38]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-heading font-black text-slate-900 text-xs sm:text-sm lg:text-base leading-tight">
                  Evolución de Ingresos
                </h3>
                <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  {nombreMes} {ano}
                </span>
              </div>
              <p className="hidden sm:block text-[10px] sm:text-[11px] text-slate-500 truncate max-w-[200px] sm:max-w-none">
                Flujo diario de cobranzas de alquiler e ingresos extra
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Total Ingresado:
            </p>
            <p className="text-base sm:text-xl font-black font-heading text-[#175E38] leading-tight">
              {formatearMontoUSD(totalIngresos)}
            </p>
          </div>
        </div>

        {/* Contenedor Interactivo con Tooltip Flotante Dinámico */}
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="relative w-full cursor-crosshair select-none touch-pan-y pt-1"
        >
          {/* Tooltip Flotante */}
          {hoveredDia && (
            <div
              className="absolute z-30 pointer-events-none transition-transform duration-75 ease-out"
              style={{
                left: `${(hoveredDia.x / width) * 100}%`,
                top: `${(hoveredDia.y / height) * 100}%`,
                transform: `translate(${
                  hoveredDia.dia <= 3 ? "0%" : hoveredDia.dia >= diasEnMes - 2 ? "-100%" : "-50%"
                }, -100%) translateY(-10px)`,
              }}
            >
              <div className="bg-[#1C2539] text-white text-[10px] sm:text-[11px] px-2.5 py-1.5 rounded-xl shadow-xl border border-slate-700/60 flex flex-col items-center whitespace-nowrap min-w-[105px] text-center backdrop-blur-xs">
                <span className="text-[10px] text-slate-300 font-medium leading-tight">
                  Día {hoveredDia.dia} de {nombreMes}
                </span>
                <span className="text-xs sm:text-sm font-black font-heading text-emerald-300 leading-tight mt-0.5">
                  {formatearMontoUSD(hoveredDia.ingresos)}
                </span>
                {hoveredDia.conteoIngresos > 0 && (
                  <span className="text-[9px] bg-white/15 px-1.5 py-0.2 rounded text-slate-200 font-semibold mt-0.5">
                    {hoveredDia.conteoIngresos} cobro{hoveredDia.conteoIngresos > 1 ? "s" : ""}
                  </span>
                )}
                {/* Triángulo indicador apuntador */}
                <div
                  className={`absolute top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#1C2539] ${
                    hoveredDia.dia <= 3 ? "left-4" : hoveredDia.dia >= diasEnMes - 2 ? "right-4" : "left-1/2 -translate-x-1/2"
                  }`}
                />
              </div>
            </div>
          )}

          {/* Gráfica SVG Fluida */}
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto block overflow-visible select-none pointer-events-none"
          >
            <defs>
              <linearGradient id="gradienteIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#175E38" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#175E38" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Guías horizontales sutiles */}
            <line
              x1={padLeft}
              y1={padTop}
              x2={width - padRight}
              y2={padTop}
              stroke="#F1F5F9"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <line
              x1={padLeft}
              y1={padTop + graphHeight / 2}
              x2={width - padRight}
              y2={padTop + graphHeight / 2}
              stroke="#F1F5F9"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <line
              x1={padLeft}
              y1={padTop + graphHeight}
              x2={width - padRight}
              y2={padTop + graphHeight}
              stroke="#E2E8F0"
              strokeWidth="1"
            />

            {/* Área bajo la curva */}
            <path d={areaData} fill="url(#gradienteIngresos)" />

            {/* Línea de tendencia */}
            <path
              d={pathData}
              fill="none"
              stroke="#175E38"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Puntos estáticos con monto */}
            {puntos
              .filter((p) => p.ingresos > 0 && p.dia !== hoveredDia?.dia)
              .map((p) => (
                <circle
                  key={`punto-${p.dia}`}
                  cx={p.x}
                  cy={p.y}
                  r="4.2"
                  fill="#175E38"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              ))}

            {/* Línea guía vertical y punto activo al interactuar */}
            {hoveredDia && (
              <g>
                <line
                  x1={hoveredDia.x}
                  y1={padTop}
                  x2={hoveredDia.x}
                  y2={padTop + graphHeight}
                  stroke="#175E38"
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                />
                <circle
                  cx={hoveredDia.x}
                  cy={hoveredDia.y}
                  r="9"
                  fill="#175E38"
                  fillOpacity="0.2"
                  className="animate-pulse"
                />
                <circle
                  cx={hoveredDia.x}
                  cy={hoveredDia.y}
                  r="5"
                  fill="#175E38"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <circle cx={hoveredDia.x} cy={hoveredDia.y} r="2" fill="#FFFFFF" />
              </g>
            )}

            {/* Eje X de días simplificado y legible */}
            {[1, 10, 20, diasEnMes].map((diaNum) => {
              const xPos =
                padLeft + ((diaNum - 1) / Math.max(diasEnMes - 1, 1)) * graphWidth;
              return (
                <text
                  key={`eje-x-${diaNum}`}
                  x={xPos}
                  y={height - 5}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="#94A3B8"
                >
                  Día {diaNum}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Footer con Resumen Desglosado Adaptativo */}
      <div className="relative z-10 pt-2 sm:pt-2.5 mt-1 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-2.5 text-[10px] sm:text-[11px]">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#175E38] shrink-0" />
            <span className="text-slate-500">Alquiler:</span>
            <span className="font-bold text-slate-900">{formatearMontoUSD(totalAlquiler)}</span>
          </div>

          {totalExtra > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-slate-500">Extra:</span>
              <span className="font-bold text-slate-900">{formatearMontoUSD(totalExtra)}</span>
            </div>
          )}
        </div>

        {diaTop && diaTop.ingresos > 0 && (
          <div className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
            <ArrowUpRight className="w-3 h-3 shrink-0" />
            <span>Pico: Día {diaTop.dia} ({formatearMontoUSD(diaTop.ingresos)})</span>
          </div>
        )}
      </div>
    </div>
  );
}
