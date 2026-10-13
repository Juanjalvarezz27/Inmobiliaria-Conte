"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, Layers, type LucideIcon } from "lucide-react";

export interface FilterDropdownOption {
  value: string;
  label: string;
  subtitle?: string | null;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  count?: number;
  countBadgeClassName?: string;
  isGlobal?: boolean;
}

export interface FilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterDropdownOption[];
  placeholder?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  menuWidth?: string;
  align?: "left" | "right";
  disabled?: boolean;
  size?: "default" | "sm" | "responsive";
}

export function FilterDropdown({
  value,
  onChange,
  options,
  placeholder = "Seleccionar",
  icon: defaultIcon,
  iconClassName,
  ariaLabel,
  className = "w-full sm:w-auto",
  buttonClassName = "",
  menuWidth = "w-64 sm:w-68",
  align = "right",
  disabled = false,
  size = "responsive",
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Opción activa seleccionada
  const activeOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  const ActiveIcon = activeOption?.icon || defaultIcon || Layers;
  const activeLabel = activeOption?.label || placeholder;

  const heightClass =
    size === "sm" ? "h-10" : size === "default" ? "h-11" : "h-10 sm:h-11";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Capa táctil nativa para móviles (< md) */}
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(false);
        }}
        className="md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
        aria-label={ariaLabel || activeLabel}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
            {opt.subtitle ? ` (${opt.subtitle})` : ""}
            {typeof opt.count === "number" ? ` (${opt.count})` : ""}
          </option>
        ))}
      </select>

      {/* Disparador visual para escritorio y móvil */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 sm:px-3.5 ${heightClass} text-xs sm:text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate">
          <ActiveIcon
            className={`w-4 h-4 shrink-0 ${
              activeOption?.iconClassName || iconClassName || "text-slate-500"
            }`}
          />
          <span className="truncate">{activeLabel}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ml-1 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Menú flotante institucional Desktop (>= md) */}
      {isOpen && (
        <div
          className={`hidden md:block absolute ${
            align === "left" ? "left-0" : "right-0"
          } top-full mt-1.5 ${menuWidth} bg-white border border-slate-200/90 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100 max-h-72 overflow-y-auto`}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const OptionIcon = opt.icon || Layers;
            const showDividerAfter =
              opt.isGlobal ||
              (idx === 0 && (opt.value === "TODOS" || opt.value === "TODAS"));

            return (
              <React.Fragment key={opt.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-slate-50 text-slate-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <OptionIcon
                      className={`w-4 h-4 shrink-0 ${
                        opt.iconClassName || "text-slate-400"
                      }`}
                    />
                    <div className="truncate text-left">
                      <p className="truncate font-medium">{opt.label}</p>
                      {opt.subtitle && (
                        <p className="text-[10px] text-slate-400 truncate">
                          {opt.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    {typeof opt.count === "number" && (
                      <span
                        className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                          opt.countBadgeClassName || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {opt.count}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
                    )}
                  </div>
                </button>
                {showDividerAfter && idx < options.length - 1 && (
                  <div className="my-1 border-t border-slate-100" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
