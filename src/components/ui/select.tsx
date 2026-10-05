"use client";

import React, { useState, useRef, useEffect, useId, useMemo } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";

export interface SelectOptionBadge {
  text: string;
  variant?: "emerald" | "amber" | "slate" | "blue" | "rose" | "purple";
}

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: SelectOptionBadge;
  metaRight?: string;
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
  searchable?: boolean;
  searchPlaceholder?: string;
  maxVisibleOptions?: number;
  dropdownWidth?: string;
  align?: "left" | "right";
}

// Normaliza texto para búsqueda insensible a mayúsculas, minúsculas y acentos
const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// Colores destacados para badges de estado institucional
const getBadgeStyles = (variant: SelectOptionBadge["variant"] = "slate") => {
  switch (variant) {
    case "emerald":
      return {
        pill: "bg-emerald-100 text-emerald-800 border-emerald-300/90",
        dot: "bg-[#175E38]",
      };
    case "amber":
      return {
        pill: "bg-amber-100 text-amber-900 border-amber-300/90",
        dot: "bg-amber-600",
      };
    case "blue":
      return {
        pill: "bg-blue-100 text-blue-800 border-blue-300/90",
        dot: "bg-blue-600",
      };
    case "rose":
      return {
        pill: "bg-rose-100 text-rose-800 border-rose-300/90",
        dot: "bg-[#CC1A22]",
      };
    case "purple":
      return {
        pill: "bg-purple-100 text-purple-800 border-purple-300/90",
        dot: "bg-purple-600",
      };
    case "slate":
    default:
      return {
        pill: "bg-slate-100 text-slate-700 border-slate-300/90",
        dot: "bg-slate-400",
      };
  }
};

/**
 * Componente Select Híbrido (Design System Inmobiliaria Conté)
 * - Soporte Combobox con buscador integrado (searchable) para listas extensas.
 * - Soporte para badges de estado altamente visibles y metadatos secundarios.
 * - Ancho expandible y alineación configurables para no apretar la información.
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
  searchable = false,
  searchPlaceholder = "Buscar...",
  maxVisibleOptions = 8,
  dropdownWidth,
  align = "left",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  // Encontrar opción actualmente seleccionada
  const selectedOption = options.find((opt) => opt.value === value);

  // Autoenfocar input de búsqueda al abrir
  useEffect(() => {
    if (isOpen && searchable) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, searchable]);

  // Cerrar al hacer clic fuera del componente o presionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setSearchQuery("");
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
    setSearchQuery("");
  };

  // Filtrar opciones según la búsqueda (busca en label, sublabel, description, badge y metaRight)
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const queryNorm = normalizeText(searchQuery.trim());
    return options.filter((opt) => {
      const labelNorm = normalizeText(opt.label);
      const sublabelNorm = opt.sublabel ? normalizeText(opt.sublabel) : "";
      const descNorm = opt.description ? normalizeText(opt.description) : "";
      const badgeNorm = opt.badge?.text ? normalizeText(opt.badge.text) : "";
      const metaNorm = opt.metaRight ? normalizeText(opt.metaRight) : "";
      return (
        labelNorm.includes(queryNorm) ||
        sublabelNorm.includes(queryNorm) ||
        descNorm.includes(queryNorm) ||
        badgeNorm.includes(queryNorm) ||
        metaNorm.includes(queryNorm)
      );
    });
  }, [options, searchable, searchQuery]);

  // Limitar opciones visibles para evitar sobrecargar el DOM
  const visibleOptions = useMemo(() => {
    if (!maxVisibleOptions || maxVisibleOptions <= 0) return filteredOptions;
    return filteredOptions.slice(0, maxVisibleOptions);
  }, [filteredOptions, maxVisibleOptions]);

  const hasMoreOptions = filteredOptions.length > visibleOptions.length;

  const alignClass = align === "right" ? "right-0" : "left-0";
  const widthClass = dropdownWidth ? dropdownWidth : "w-full";

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Icono decorativo izquierdo */}
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 z-10">
          {icon}
        </div>
      )}

      {/* CAPA MÓVIL NATIVA (< md) */}
      {!searchable && (
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
      )}

      {/* BOTÓN TRIGGER VISUAL */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => {
              if (prev) setSearchQuery("");
              return !prev;
            });
          }
        }}
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
        <div className="flex items-center gap-2 truncate min-w-0 pr-1">
          {selectedOption ? (
            <>
              <span className="text-slate-900 font-semibold truncate">
                {selectedOption.label}
                {selectedOption.sublabel && (
                  <span className="font-normal text-slate-500 ml-1.5">
                    · {selectedOption.sublabel}
                  </span>
                )}
              </span>
              {selectedOption.badge && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border shrink-0 uppercase tracking-wider ${
                    getBadgeStyles(selectedOption.badge.variant).pill
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getBadgeStyles(selectedOption.badge.variant).dot}`} />
                  {selectedOption.badge.text}
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ml-2 ${
            isOpen ? "rotate-180 text-[#175E38]" : ""
          }`}
        />
      </button>

      {/* MENÚ DESPLEGABLE PERSONALIZADO */}
      {isOpen && (
        <div
          role="listbox"
          className={`${
            searchable ? "block" : "hidden md:block"
          } absolute ${alignClass} top-full mt-1.5 z-50 bg-white rounded-2xl border border-slate-200/95 shadow-2xl overflow-hidden py-1 max-h-96 flex flex-col animate-in fade-in zoom-in-95 duration-100 ${widthClass}`}
        >
          {/* Input de Búsqueda si es searchable */}
          {searchable && (
            <div className="p-2.5 border-b border-slate-100 bg-slate-50/70 sticky top-0 z-10">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-7 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#175E38] focus:ring-2 focus:ring-[#175E38]/20 transition-all"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setIsOpen(false);
                      setSearchQuery("");
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Lista de opciones scrolleable */}
          <div className="overflow-y-auto max-h-64 divide-y divide-slate-100/80">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400">
                No se encontraron resultados para &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              visibleOptions.map((opt) => {
                const isSelected = opt.value === value;
                const OptionIcon = opt.icon;
                const badgeStyles = opt.badge ? getBadgeStyles(opt.badge.variant) : null;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-4 py-3 transition-colors cursor-pointer border-b border-slate-100/90 last:border-b-0 ${
                      isSelected
                        ? "bg-emerald-50/70"
                        : "hover:bg-slate-50/90 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Columna Izquierda: Información Principal */}
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {OptionIcon && (
                          <div
                            className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-[#175E38]/10 text-[#175E38]"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <OptionIcon className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          {/* Título Principal y Subtítulo */}
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span
                              className={`text-xs sm:text-sm font-extrabold ${
                                isSelected ? "text-[#175E38]" : "text-slate-900"
                              }`}
                            >
                              {opt.label}
                            </span>
                            {opt.sublabel && (
                              <span className="text-xs font-semibold text-slate-500 truncate">
                                · {opt.sublabel}
                              </span>
                            )}
                          </div>

                          {/* Descripción / Especificaciones */}
                          {opt.description && (
                            <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-1 leading-normal">
                              {opt.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Columna Derecha: Badge de Estado y Renta con separación amplia y ordenada */}
                      <div className="flex flex-col items-end justify-center shrink-0 pl-2 gap-2.5">
                        {/* Fila superior: Badge de Estado + Check si está seleccionado */}
                        <div className="flex items-center gap-1.5">
                          {opt.badge && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border uppercase tracking-wider shadow-2xs ${
                                badgeStyles?.pill
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${badgeStyles?.dot}`}
                              />
                              {opt.badge.text}
                            </span>
                          )}
                          {isSelected && (
                            <Check className="w-4 h-4 text-[#175E38] stroke-[2.5]" />
                          )}
                        </div>

                        {/* Fila inferior: Renta / Meta derecho con pastilla legible y separada */}
                        {opt.metaRight && (
                          <span className="font-extrabold text-slate-800 bg-slate-100/90 px-2 py-0.5 rounded-md text-[11px] sm:text-xs border border-slate-200/80 shadow-2xs font-heading">
                            {opt.metaRight}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Pie informativo si hay más opciones ocultas */}
          {hasMoreOptions && (
            <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 text-center font-medium">
              Mostrando {visibleOptions.length} de {filteredOptions.length} opciones. Escribe para filtrar...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
