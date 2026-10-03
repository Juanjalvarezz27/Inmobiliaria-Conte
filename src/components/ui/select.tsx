"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
}

export interface SelectProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  icon?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

/**
 * Componente Select Híbrido (Design System Inmobiliaria Conté)
 * - En Desktop (>= md): Menú flotante personalizado, bordes estilizados, foco esmeralda y checks.
 * - En Móvil / Touch (< md): Capa nativa invisible sobrepuesta que dispara el picker nativo (iOS Wheel / Android Dialog).
 */
export function Select({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  disabled = false,
  required = false,
  icon,
  className = "",
  ariaLabel,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  // Encontrar opción actualmente seleccionada
  const selectedOption = options.find((opt) => opt.value === value);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Icono decorativo izquierdo */}
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 z-10">
          {icon}
        </div>
      )}

      {/* 
        CAPA MÓVIL (iOS / Android / Pantallas táctiles < md)
        El elemento nativo se sobrepone de forma transparente. Al tocarlo en móviles,
        el sistema operativo intercepta el toque y abre el picker nativo de iOS o Android.
      */}
      <select
        id={selectId}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        aria-label={ariaLabel || placeholder}
        className="md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 disabled:cursor-not-allowed"
      >
        {!value && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* 
        BOTÓN TRIGGER VISUAL (Desktop y base visual en Mobile)
        En Desktop abre el menú personalizado. En Móvil sirve de presentación visual.
      */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between text-left h-11 text-sm font-medium border rounded-xl bg-white transition-all shadow-2xs cursor-pointer ${
          icon ? "pl-10" : "pl-3.5"
        } pr-3.5 ${
          isOpen
            ? "border-[#175E38] ring-2 ring-[#175E38]/20 text-slate-900"
            : "border-slate-200/90 text-slate-900 hover:border-slate-300"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ml-2 ${
            isOpen ? "rotate-180 text-[#175E38]" : ""
          }`}
        />
      </button>

      {/* 
        MENÚ DESPLEGABLE PERSONALIZADO (Solo en Desktop >= md)
        Diseño premium acorde a la guía de estilo institucional.
      */}
      {isOpen && (
        <div
          role="listbox"
          className="hidden md:block absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-slate-200/90 shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            const OptionIcon = opt.icon;

            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-emerald-50/80 text-[#175E38] font-bold"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {OptionIcon && (
                    <OptionIcon className={`w-4 h-4 shrink-0 ${isSelected ? "text-[#175E38]" : "text-slate-400"}`} />
                  )}
                  <div className="truncate">
                    <span className="block truncate">{opt.label}</span>
                    {opt.description && (
                      <span className="block text-[11px] text-slate-400 font-normal truncate">
                        {opt.description}
                      </span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-[#175E38] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
