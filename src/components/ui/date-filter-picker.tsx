"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { MESES, DIAS_ABREV, MESES_ABREV } from "@/lib/date-utils";

export interface DateFilterPickerProps {
  value: string; // Formato YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
  buttonClassName?: string;
  align?: "left" | "right";
  ariaLabel?: string;
}

// Helper para obtener la fecha de hoy en formato local YYYY-MM-DD
function getHoyFechaStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DIAS_CABECERA = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

export function DateFilterPicker({
  value,
  onChange,
  className = "",
  buttonClassName = "",
  align = "right",
  ariaLabel = "Filtrar por fecha",
}: DateFilterPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoyStr = useMemo(() => getHoyFechaStr(), []);

  // Fecha activa para navegar meses en el calendario flotante
  const [viewDate, setViewDate] = useState(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Sincronizar mes visible si cambia el valor externamente
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split("-").map(Number);
      setViewDate(new Date(y, m - 1, 1));
    }
  }, [value]);

  // Cerrar al hacer clic fuera o presionar Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const esHoy = value === hoyStr;

  // Formatear texto descriptivo de la fecha para el disparador
  const textoFecha = useMemo(() => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return "Seleccionar Fecha";
    }
    const [y, m, d] = value.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (isNaN(dateObj.getTime())) return value;
    const diaSem = DIAS_ABREV[dateObj.getDay()];
    const mesAbrev = MESES_ABREV[m - 1];
    return `${diaSem}, ${d} ${mesAbrev} ${y}`;
  }, [value]);

  // Navegación de mes anterior / siguiente
  const mesAnterior = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const mesSiguiente = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Calcular la cuadrícula de días del mes visualizado
  const { diasEnMes, diaInicioSemana, anioVisible, mesVisible } = useMemo(() => {
    const anio = viewDate.getFullYear();
    const mes = viewDate.getMonth();
    const primerDia = new Date(anio, mes, 1);
    const ultimoDia = new Date(anio, mes + 1, 0);

    return {
      diasEnMes: ultimoDia.getDate(),
      diaInicioSemana: primerDia.getDay(),
      anioVisible: anio,
      mesVisible: mes,
    };
  }, [viewDate]);

  const handleSelectDia = (dia: number) => {
    const nuevaFecha = `${anioVisible}-${String(mesVisible + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    onChange(nuevaFecha);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${isOpen ? "z-50" : "z-10"} ${className}`}
    >
      {/* 1. Capa Táctil Nativa para Móviles (< md): Invoca la rueda nativa de iOS / Android */}
      <input
        type="date"
        value={value}
        onChange={(e) => {
          if (e.target.value) {
            onChange(e.target.value);
          }
        }}
        className="md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        aria-label={ariaLabel}
      />

      {/* 2. Contenedor Visual (Trigger Box) */}
      <div
        className={`h-11 w-full px-3 rounded-xl border bg-white transition-all shadow-2xs flex items-center justify-between gap-2 select-none relative ${
          isOpen
            ? "border-[#175E38] ring-2 ring-[#175E38]/20 text-slate-900"
            : "border-slate-200 hover:border-slate-300 text-slate-700"
        } ${buttonClassName}`}
      >
        {/* Área clickeable principal para abrir el desplegable */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex-1 flex items-center gap-2 h-full text-left cursor-pointer min-w-0"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <CalendarIcon className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-xs font-bold text-slate-800 capitalize truncate">
            {textoFecha}
          </span>
        </button>

        {/* Acceso rápido a Hoy y Chevron */}
        <div className="flex items-center gap-1.5 shrink-0">
          {esHoy ? (
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#175E38] text-[11px] font-extrabold border border-emerald-200/70">
              Hoy
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(hoyStr);
                const d = new Date();
                setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
                setIsOpen(false);
              }}
              className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#175E38] hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold transition-all active:scale-95 cursor-pointer relative z-30"
              title="Volver al día de hoy"
            >
              Hoy
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
            tabIndex={-1}
            aria-label="Abrir calendario"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOpen ? "rotate-180 text-[#175E38]" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* 3. Calendario Desplegable Institucional para Desktop (>= md) */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Selector de calendario"
          className={`hidden md:block absolute ${
            align === "left" ? "left-0" : "right-0"
          } top-full mt-1.5 z-50 bg-white border border-slate-200/95 rounded-2xl shadow-2xl p-3.5 w-72 animate-in fade-in-0 zoom-in-95 duration-100 select-none`}
        >
          {/* Cabecera del Mes y Controles de Navegación */}
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={mesAnterior}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-black font-heading text-slate-900 capitalize">
              {MESES[mesVisible]} {anioVisible}
            </span>

            <button
              type="button"
              onClick={mesSiguiente}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Días de la Semana */}
          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {DIAS_CABECERA.map((d) => (
              <span
                key={d}
                className="text-[10px] font-bold text-slate-400 text-center uppercase"
              >
                {d}
              </span>
            ))}
          </div>

          {/* Cuadrícula de Días */}
          <div className="grid grid-cols-7 gap-1">
            {/* Espacios vacíos antes del día 1 */}
            {Array.from({ length: diaInicioSemana }).map((_, i) => (
              <div key={`empty-${i}`} className="w-8 h-8" />
            ))}

            {/* Días del Mes */}
            {Array.from({ length: diasEnMes }, (_, i) => i + 1).map((dia) => {
              const diaFechaStr = `${anioVisible}-${String(mesVisible + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
              const isSelected = diaFechaStr === value;
              const isToday = diaFechaStr === hoyStr;

              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => handleSelectDia(dia)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                    isSelected
                      ? "bg-[#175E38] text-white shadow-xs font-black scale-105"
                      : isToday
                      ? "border border-[#175E38] text-[#175E38] bg-emerald-50/70 hover:bg-emerald-100"
                      : "text-slate-700 hover:bg-slate-100 hover:text-black"
                  }`}
                >
                  {dia}
                </button>
              );
            })}
          </div>

          {/* Pie de Acciones */}
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onChange(hoyStr);
                const d = new Date();
                setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
                setIsOpen(false);
              }}
              className="text-[11px] font-bold text-[#175E38] hover:text-[#124b2d] bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200/80 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-2xs"
            >
              <Clock className="w-3 h-3 text-[#175E38]" />
              <span>Ir a Hoy</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 px-2 py-1 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
