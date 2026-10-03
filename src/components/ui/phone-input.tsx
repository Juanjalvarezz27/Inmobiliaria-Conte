"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, Check, Globe } from "lucide-react";

export interface Pais {
  codigo: string;
  nombre: string;
  prefijo: string;
  bandera: string;
  placeholder: string;
}

export const PAISES: Pais[] = [
  { codigo: "VE", nombre: "Venezuela", prefijo: "+58", bandera: "🇻🇪", placeholder: "412 1234567" },
  { codigo: "CO", nombre: "Colombia", prefijo: "+57", bandera: "🇨🇴", placeholder: "300 1234567" },
  { codigo: "US", nombre: "Estados Unidos", prefijo: "+1", bandera: "🇺🇸", placeholder: "555 123-4567" },
  { codigo: "ES", nombre: "España", prefijo: "+34", bandera: "🇪🇸", placeholder: "612 345 678" },
  { codigo: "PA", nombre: "Panamá", prefijo: "+507", bandera: "🇵🇦", placeholder: "6123 4567" },
  { codigo: "CL", nombre: "Chile", prefijo: "+56", bandera: "🇨🇱", placeholder: "9 1234 5678" },
  { codigo: "PE", nombre: "Perú", prefijo: "+51", bandera: "🇵🇪", placeholder: "912 345 678" },
  { codigo: "AR", nombre: "Argentina", prefijo: "+54", bandera: "🇦🇷", placeholder: "11 1234-5678" },
  { codigo: "MX", nombre: "México", prefijo: "+52", bandera: "🇲🇽", placeholder: "55 1234 5678" },
  { codigo: "DO", nombre: "Rep. Dominicana", prefijo: "+1", bandera: "🇩🇴", placeholder: "809 123 4567" },
  { codigo: "EC", nombre: "Ecuador", prefijo: "+593", bandera: "🇪🇨", placeholder: "99 123 4567" },
  { codigo: "BR", nombre: "Brasil", prefijo: "+55", bandera: "🇧🇷", placeholder: "11 91234-5678" },
  { codigo: "CA", nombre: "Canadá", prefijo: "+1", bandera: "🇨🇦", placeholder: "555 123-4567" },
  { codigo: "CR", nombre: "Costa Rica", prefijo: "+506", bandera: "🇨🇷", placeholder: "8123 4567" },
  { codigo: "UY", nombre: "Uruguay", prefijo: "+598", bandera: "🇺🇾", placeholder: "91 234 567" },
  { codigo: "BO", nombre: "Bolivia", prefijo: "+591", bandera: "🇧🇴", placeholder: "7123 4567" },
  { codigo: "PY", nombre: "Paraguay", prefijo: "+595", bandera: "🇵🇾", placeholder: "981 123456" },
  { codigo: "FR", nombre: "Francia", prefijo: "+33", bandera: "🇫🇷", placeholder: "6 12 34 56 78" },
  { codigo: "DE", nombre: "Alemania", prefijo: "+49", bandera: "🇩🇪", placeholder: "151 12345678" },
  { codigo: "GB", nombre: "Reino Unido", prefijo: "+44", bandera: "🇬🇧", placeholder: "7911 123456" },
  { codigo: "IT", nombre: "Italia", prefijo: "+39", bandera: "🇮🇹", placeholder: "312 345 6789" },
  { codigo: "PT", nombre: "Portugal", prefijo: "+351", bandera: "🇵🇹", placeholder: "912 345 678" },
  { codigo: "CN", nombre: "China", prefijo: "+86", bandera: "🇨🇳", placeholder: "138 0000 0000" },
  { codigo: "JP", nombre: "Japón", prefijo: "+81", bandera: "🇯🇵", placeholder: "90 1234 5678" },
];

export interface PhoneInputProps {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  defaultCountryCode?: string; // "VE" por defecto
  disabled?: boolean;
  className?: string;
}

export function PhoneInput({
  id = "phone-input",
  value = "",
  onChange,
  defaultCountryCode = "VE",
  disabled = false,
  className = "",
}: PhoneInputProps) {
  // Encontrar país inicial según prefijo en el valor o default VE
  const parsedInitial = useMemo(() => {
    if (!value) {
      const def = PAISES.find((p) => p.codigo === defaultCountryCode) || PAISES[0];
      return { pais: def, localNumber: "" };
    }

    const cleanVal = value.trim();
    // Si viene con prefijo internacional "+..."
    if (cleanVal.startsWith("+")) {
      // 1. Verificar si coincide con alguno de la lista (ordenados de mayor longitud a menor)
      const sorted = [...PAISES].sort((a, b) => b.prefijo.length - a.prefijo.length);
      for (const p of sorted) {
        if (cleanVal.startsWith(p.prefijo)) {
          const rest = cleanVal.slice(p.prefijo.length).trim();
          return { pais: p, localNumber: rest };
        }
      }

      // 2. Si no coincide con ninguno de la lista, extraer el código manual (ej: "+352 123456")
      const match = cleanVal.match(/^(\+\d{1,4})\s*(.*)$/);
      if (match) {
        const customPref = match[1];
        const rest = match[2];
        return {
          pais: {
            codigo: "MANUAL",
            nombre: `Manual (${customPref})`,
            prefijo: customPref,
            bandera: "🌐",
            placeholder: "Número telefónico",
          },
          localNumber: rest,
        };
      }
    }

    // Si viene sin prefijo (ej: "04129164371" o "4121234567")
    const def = PAISES.find((p) => p.codigo === defaultCountryCode) || PAISES[0];
    let local = cleanVal;
    // Si es Venezuela y empieza por 0, quitamos el 0 líder para formato internacional
    if (def.codigo === "VE" && local.startsWith("0")) {
      local = local.slice(1);
    }
    return { pais: def, localNumber: local };
  }, [value, defaultCountryCode]);

  const [paisSeleccionado, setPaisSeleccionado] = useState<Pais>(parsedInitial.pais);
  const [numeroLocal, setNumeroLocal] = useState<string>(parsedInitial.localNumber);
  const [prevValue, setPrevValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [busquedaPais, setBusquedaPais] = useState("");
  const [mostrarFormManual, setMostrarFormManual] = useState(false);
  const [codigoManualInput, setCodigoManualInput] = useState("");
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Sincronización oficial de React cuando la prop value cambia externamente
  if (value !== prevValue) {
    setPrevValue(value);
    setPaisSeleccionado(parsedInitial.pais);
    setNumeroLocal(parsedInitial.localNumber);
  }

  // Cerrar al hacer click afuera o Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setMostrarFormManual(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setMostrarFormManual(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Selección de país de la lista
  const handleSelectPais = (pais: Pais) => {
    setPaisSeleccionado(pais);
    setIsOpen(false);
    setBusquedaPais("");
    setMostrarFormManual(false);

    if (numeroLocal.trim()) {
      onChange(`${pais.prefijo} ${numeroLocal.trim()}`);
    }
  };

  // Aplicación de código manual personalizado
  const aplicarCodigoManual = (codigoRaw: string) => {
    const soloNumeros = codigoRaw.replace(/\D/g, "");
    if (!soloNumeros) return;

    const prefijo = `+${soloNumeros}`;
    // Verificar si coincide con alguno existente en la lista
    const existente = PAISES.find((p) => p.prefijo === prefijo);
    if (existente) {
      handleSelectPais(existente);
      return;
    }

    const nuevoPaisManual: Pais = {
      codigo: `CUSTOM_${soloNumeros}`,
      nombre: `Personalizado (${prefijo})`,
      prefijo,
      bandera: "🌐",
      placeholder: "Número telefónico",
    };

    setPaisSeleccionado(nuevoPaisManual);
    setIsOpen(false);
    setBusquedaPais("");
    setMostrarFormManual(false);
    setCodigoManualInput("");

    if (numeroLocal.trim()) {
      onChange(`${prefijo} ${numeroLocal.trim()}`);
    }
  };

  // Manejo de cambio de número local
  const handleNumeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputVal = e.target.value;

    // Si es Venezuela y escribe 0 al inicio (ej: 0412...), remover el 0 líder
    if (paisSeleccionado.codigo === "VE" && inputVal.startsWith("0")) {
      inputVal = inputVal.replace(/^0+/, "");
    }

    setNumeroLocal(inputVal);

    if (inputVal.trim()) {
      onChange(`${paisSeleccionado.prefijo} ${inputVal.trim()}`);
    } else {
      onChange("");
    }
  };

  // Filtrado de países en búsqueda
  const paisesFiltrados = useMemo(() => {
    if (!busquedaPais.trim()) return PAISES;
    const q = busquedaPais.toLowerCase().trim();
    return PAISES.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.prefijo.includes(q) ||
        p.codigo.toLowerCase().includes(q)
    );
  }, [busquedaPais]);

  // Si la búsqueda contiene números y no coincide exactamente
  const searchDigits = busquedaPais.replace(/\D/g, "");

  return (
    <div
      ref={dropdownRef}
      className={`relative flex items-center w-full bg-white border border-slate-200/90 rounded-xl focus-within:ring-2 focus-within:ring-[#175E38]/20 focus-within:border-[#175E38] transition-all shadow-2xs ${className}`}
    >
      {/* ─── Selector Híbrido de País ─── */}
      <div className="relative shrink-0">
        {/* Selector nativo transparente en móvil */}
        <select
          value={paisSeleccionado.codigo}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "MANUAL_PROMPT") {
              const res = window.prompt("Ingresa el código internacional (ej: +44 para Reino Unido, +33 para Francia):", "+");
              if (res) aplicarCodigoManual(res);
              return;
            }
            const p = PAISES.find((item) => item.codigo === val);
            if (p) handleSelectPais(p);
          }}
          disabled={disabled}
          className="md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          aria-label="Seleccionar código de país"
        >
          {PAISES.map((p) => (
            <option key={p.codigo} value={p.codigo}>
              {p.bandera} {p.nombre} ({p.prefijo})
            </option>
          ))}
          <option value="MANUAL_PROMPT">🌐 Ingresar otro código manual...</option>
        </select>

        {/* Botón trigger Desktop / Visual */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="h-10 px-2.5 sm:px-3 flex items-center gap-1.5 hover:bg-slate-50/80 rounded-l-xl transition-colors cursor-pointer select-none disabled:opacity-50"
          title={`País: ${paisSeleccionado.nombre} (${paisSeleccionado.prefijo})`}
        >
          <span className="text-base sm:text-lg leading-none select-none">
            {paisSeleccionado.bandera}
          </span>
          <span className="text-xs font-bold text-slate-800">
            {paisSeleccionado.prefijo}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* ─── Menú Flotante Personalizado en Desktop ─── */}
        {isOpen && (
          <div className="hidden md:block absolute left-0 top-full mt-1.5 w-68 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 overflow-hidden p-1.5 animate-in fade-in-0 zoom-in-95 duration-100">
            {/* Buscador de países */}
            <div className="relative mb-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={busquedaPais}
                onChange={(e) => setBusquedaPais(e.target.value)}
                placeholder="Buscar país o prefijo..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#175E38]/30 font-medium text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Opción rápida si escribe números en el buscador (ej: "44" o "+44") */}
            {searchDigits && (
              <button
                type="button"
                onClick={() => aplicarCodigoManual(searchDigits)}
                className="w-full text-left px-2.5 py-1.5 mb-1 rounded-lg bg-emerald-50 text-[#175E38] text-xs font-bold hover:bg-emerald-100/80 transition-colors flex items-center justify-between cursor-pointer border border-emerald-200/70"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-base leading-none">🌐</span>
                  <span className="truncate">Usar código manual &quot;+{searchDigits}&quot;</span>
                </div>
                <span className="text-[10px] bg-[#175E38] text-white px-1.5 py-0.5 rounded font-bold shrink-0">
                  Usar
                </span>
              </button>
            )}

            {/* Lista scrollable de países */}
            <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
              {paisesFiltrados.length === 0 && !searchDigits ? (
                <div className="p-3 text-center text-xs text-slate-400">
                  No se encontraron países
                </div>
              ) : (
                paisesFiltrados.map((p) => {
                  const isSelected = p.codigo === paisSeleccionado.codigo;
                  return (
                    <button
                      key={p.codigo}
                      type="button"
                      onClick={() => handleSelectPais(p)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50 text-[#175E38] font-bold"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base leading-none">{p.bandera}</span>
                        <span className="truncate">{p.nombre}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="font-semibold text-slate-400">
                          {p.prefijo}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#175E38]" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* ─── Sección Inferior: Ingresar Código Manual ─── */}
            <div className="pt-1.5 mt-1 border-t border-slate-100">
              {!mostrarFormManual ? (
                <button
                  type="button"
                  onClick={() => {
                    setMostrarFormManual(true);
                    setTimeout(() => manualInputRef.current?.focus(), 50);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-500" />
                    <span>Ingresar código manual</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">+...</span>
                </button>
              ) : (
                <div className="p-2 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200/80 animate-in fade-in-0 duration-100">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                    <span>Escribir prefijo manual:</span>
                    <button
                      type="button"
                      onClick={() => setMostrarFormManual(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">+</span>
                      <input
                        ref={manualInputRef}
                        type="tel"
                        value={codigoManualInput}
                        onChange={(e) => setCodigoManualInput(e.target.value.replace(/\D/g, ""))}
                        placeholder="Ej: 44, 33, 49"
                        className="w-full pl-6 pr-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#175E38] font-bold text-slate-800"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            aplicarCodigoManual(codigoManualInput);
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => aplicarCodigoManual(codigoManualInput)}
                      disabled={!codigoManualInput.trim()}
                      className="px-3 py-1.5 text-xs font-bold bg-[#175E38] text-white rounded-lg hover:bg-[#124b2d] disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                    >
                      Listo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Separador vertical sutil */}
      <div className="w-px h-5 bg-slate-200 shrink-0" />

      {/* ─── Input del Número Local ─── */}
      <div className="relative flex-1">
        <input
          id={id}
          type="tel"
          inputMode="tel"
          value={numeroLocal}
          onChange={handleNumeroChange}
          disabled={disabled}
          placeholder={`Ej: ${paisSeleccionado.placeholder}`}
          className="w-full px-3 py-2.5 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400 disabled:opacity-50"
        />
      </div>
    </div>
  );
}
