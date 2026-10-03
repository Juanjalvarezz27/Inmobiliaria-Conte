"use client";

import { useState } from "react";
import {
  Loader2,
  Building2,
  Store,
  Home,
  Building,
  Warehouse,
  MapPin,
  Layers,
  Check,
  Sparkles,
  Tag,
  DollarSign,
  Maximize2,
  Ruler,
  Layers3,
  Trees,
  UserCheck,
} from "lucide-react";
import { TipoPropiedad } from "@prisma/client";
import type { CreatePropiedadInput, UpdatePropiedadInput } from "@/lib/actions/propiedades";
import { PhoneInput } from "@/components/ui";

interface Props {
  initialData?: {
    id: string;
    nombre: string;
    tipo: TipoPropiedad;
    direccion: string;
    ciudad: string;
    descripcion: string | null;
    numPisos: number | null;
    areaTotalM2: number | null;
    propietario: string | null;
    telefonoContacto: string | null;
  };
  defaultTipo?: TipoPropiedad;
  onSubmit: (data: CreatePropiedadInput | UpdatePropiedadInput) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const OPCIONES_TIPO = [
  {
    value: TipoPropiedad.CENTRO_COMERCIAL,
    label: "Centro Comercial",
    icon: Store,
    accent: "text-blue-600 bg-blue-50 border-blue-200",
    sun: {
      glow: "bg-blue-500/18",
      ring: "bg-blue-500/[0.06] border-blue-400/25",
      center: "from-blue-600/25 to-transparent",
    },
  },
  {
    value: TipoPropiedad.EDIFICIO,
    label: "Edificio",
    icon: Building2,
    accent: "text-indigo-600 bg-indigo-50 border-indigo-200",
    sun: {
      glow: "bg-indigo-500/18",
      ring: "bg-indigo-500/[0.06] border-indigo-400/25",
      center: "from-indigo-600/25 to-transparent",
    },
  },
  {
    value: TipoPropiedad.CASA,
    label: "Casa Sola",
    icon: Home,
    accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
    sun: {
      glow: "bg-emerald-500/18",
      ring: "bg-emerald-500/[0.06] border-emerald-400/25",
      center: "from-[#175E38]/30 to-transparent",
    },
  },
  {
    value: TipoPropiedad.APARTAMENTO,
    label: "Apartamento Solo",
    icon: Building,
    accent: "text-violet-600 bg-violet-50 border-violet-200",
    sun: {
      glow: "bg-violet-500/18",
      ring: "bg-violet-500/[0.06] border-violet-400/25",
      center: "from-violet-600/25 to-transparent",
    },
  },
  {
    value: TipoPropiedad.LOCAL,
    label: "Local Solo",
    icon: Store,
    accent: "text-amber-700 bg-amber-50 border-amber-200",
    sun: {
      glow: "bg-amber-500/18",
      ring: "bg-amber-500/[0.06] border-amber-400/25",
      center: "from-amber-600/25 to-transparent",
    },
  },
  {
    value: TipoPropiedad.GALPON,
    label: "Galpón / Depósito",
    icon: Warehouse,
    accent: "text-slate-700 bg-slate-100 border-slate-200",
    sun: {
      glow: "bg-slate-500/18",
      ring: "bg-slate-500/[0.06] border-slate-400/25",
      center: "from-slate-600/25 to-transparent",
    },
  },
  {
    value: TipoPropiedad.TERRENO,
    label: "Terreno / Lote",
    icon: MapPin,
    accent: "text-teal-700 bg-teal-50 border-teal-200",
    sun: {
      glow: "bg-teal-500/18",
      ring: "bg-teal-500/[0.06] border-teal-400/25",
      center: "from-teal-600/25 to-transparent",
    },
  },
  {
    value: TipoPropiedad.OTRO,
    label: "Otro",
    icon: Layers,
    accent: "text-purple-700 bg-purple-50 border-purple-200",
    sun: {
      glow: "bg-purple-500/18",
      ring: "bg-purple-500/[0.06] border-purple-400/25",
      center: "from-purple-600/25 to-transparent",
    },
  },
];

// Clasificaciones por comportamiento del formulario
const TIPOS_GRANDES: TipoPropiedad[] = [TipoPropiedad.GALPON, TipoPropiedad.TERRENO];
const TIPOS_INDIVIDUALES: TipoPropiedad[] = [
  TipoPropiedad.CASA,
  TipoPropiedad.APARTAMENTO,
  TipoPropiedad.LOCAL,
  TipoPropiedad.GALPON,
  TipoPropiedad.TERRENO,
];

// Configuración contextual de campos por tipo
const METADATA_CONFIG: Record<string, { label: string; pisos?: boolean; areaTotal?: boolean; areaTotalLabel?: string }> = {
  [TipoPropiedad.CENTRO_COMERCIAL]: {
    label: "Características del Complejo",
    pisos: true,
    areaTotal: true,
    areaTotalLabel: "Área Total Construida (m²)",
  },
  [TipoPropiedad.EDIFICIO]: {
    label: "Características del Edificio",
    pisos: true,
    areaTotal: true,
    areaTotalLabel: "Área Total de Construcción (m²)",
  },
  [TipoPropiedad.GALPON]: {
    label: "Dimensiones del Inmueble",
    pisos: false,
    areaTotal: true,
    areaTotalLabel: "Área Total (m²)",
  },
  [TipoPropiedad.TERRENO]: {
    label: "Dimensiones del Terreno",
    pisos: false,
    areaTotal: true,
    areaTotalLabel: "Área Total del Terreno (m²)",
  },
};

export function PropiedadForm({ initialData, defaultTipo, onSubmit, onCancel, isLoading }: Props) {
  const [nombre, setNombre] = useState(initialData?.nombre ?? "");
  const [tipo, setTipo] = useState<TipoPropiedad>(
    initialData?.tipo ?? defaultTipo ?? TipoPropiedad.CENTRO_COMERCIAL
  );
  const [direccion, setDireccion] = useState(initialData?.direccion ?? "");
  const [ciudad, setCiudad] = useState(initialData?.ciudad ?? "");
  const [descripcion, setDescripcion] = useState(initialData?.descripcion ?? "");

  // Campos de contacto y titularidad
  const [propietario, setPropietario] = useState<string>(
    initialData?.propietario ?? ""
  );
  const [telefonoContacto, setTelefonoContacto] = useState<string>(
    initialData?.telefonoContacto ?? ""
  );

  // Campos de metadata estructural del inmueble
  const [numPisos, setNumPisos] = useState<string>(
    initialData?.numPisos?.toString() ?? ""
  );
  const [areaTotalM2, setAreaTotalM2] = useState<string>(
    initialData?.areaTotalM2?.toString() ?? ""
  );

  // Campos para autogenerar la unidad de propiedades individuales
  const [areaMt2, setAreaMt2] = useState<string>("");
  const [precioAlquiler, setPrecioAlquiler] = useState<string>("");

  const esGrande = TIPOS_GRANDES.includes(tipo);
  const esIndividual = TIPOS_INDIVIDUALES.includes(tipo);
  const metaConfig = METADATA_CONFIG[tipo];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !direccion.trim() || !ciudad.trim()) return;

    if (initialData) {
      onSubmit({
        nombre: nombre.trim(),
        tipo,
        direccion: direccion.trim(),
        ciudad: ciudad.trim(),
        descripcion: descripcion.trim() || undefined,
        numPisos: numPisos ? parseInt(numPisos) : null,
        areaTotalM2: areaTotalM2 ? parseFloat(areaTotalM2) : null,
        propietario: propietario.trim() || null,
        telefonoContacto: telefonoContacto.trim() || null,
      });
    } else {
      const inputData: CreatePropiedadInput = {
        nombre: nombre.trim(),
        tipo,
        direccion: direccion.trim(),
        ciudad: ciudad.trim(),
        descripcion: descripcion.trim() || undefined,
        numPisos: numPisos ? parseInt(numPisos) : undefined,
        areaTotalM2: areaTotalM2 ? parseFloat(areaTotalM2) : undefined,
        propietario: propietario.trim() || undefined,
        telefonoContacto: telefonoContacto.trim() || undefined,
      };

      if (esIndividual && (areaMt2 || precioAlquiler)) {
        inputData.unidadInicial = {
          areaMt2: areaMt2 ? parseFloat(areaMt2) : undefined,
          precioAlquiler: precioAlquiler ? parseFloat(precioAlquiler) : undefined,
        };
      }

      onSubmit(inputData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ─── 1. Selector de Tipo de Propiedad ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 pb-0.5">
          <div className="w-6 h-6 rounded-lg bg-[#175E38] text-white inline-flex items-center justify-center text-xs font-black shadow-xs shrink-0">
            1
          </div>
          <h4 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
            Tipo de Inmueble <span className="text-[#175E38]">*</span>
          </h4>
        </div>

        {/* Cuadrícula 4x2 sin scrollbar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {OPCIONES_TIPO.map((opt) => {
            const Icon = opt.icon;
            const isSelected = tipo === opt.value;
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => {
                  setTipo(opt.value);
                  // Reset metadata al cambiar tipo
                  setNumPisos("");
                  setAreaTotalM2("");
                }}
                className={`group relative overflow-hidden text-left p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[74px] sm:min-h-[78px] ${
                  isSelected
                    ? "border-[#175E38] bg-emerald-50/70 shadow-sm ring-2 ring-[#175E38]/20 border-b-[3px] border-b-[#175E38]"
                    : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70 border-b-[2px] border-b-slate-200"
                }`}
              >
                {/* Sol decorativo en esquina superior izquierda */}
                <div className="absolute -top-7 -left-7 w-20 h-20 sm:w-22 sm:h-22 pointer-events-none overflow-hidden rounded-full">
                  <div className={`absolute inset-0 rounded-full ${isSelected ? "bg-emerald-500/20" : opt.sun.glow} blur-lg`} />
                  <div className={`absolute inset-2 rounded-full ${isSelected ? "bg-emerald-500/[0.08] border-emerald-400/30" : opt.sun.ring} border`} />
                  <div className={`absolute inset-5 rounded-full bg-gradient-to-br ${isSelected ? "from-[#175E38]/30 to-transparent" : opt.sun.center} transition-transform duration-500 group-hover:scale-125`} />
                </div>

                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#175E38] text-white flex items-center justify-center shadow-xs z-10">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}

                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 border shrink-0 relative z-10 ${
                    isSelected
                      ? "bg-[#175E38] text-white border-transparent shadow-xs"
                      : opt.accent
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="mt-2 min-w-0 pr-1 relative z-10">
                  <div
                    className={`text-xs sm:text-[13px] font-bold leading-tight truncate ${
                      isSelected ? "text-[#175E38]" : "text-slate-900 group-hover:text-black"
                    }`}
                  >
                    {opt.label}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 2. Información General del Inmueble ─── */}
      <div className="space-y-4 pt-1">
        {/* Divisor delimitador más oscuro y definido */}
        <div className="h-px w-full bg-gradient-to-r from-slate-200/40 via-slate-400 to-slate-200/40" />

        <div className="flex items-center gap-2.5 pt-1">
          <div className="w-6 h-6 rounded-lg bg-[#175E38] text-white inline-flex items-center justify-center text-xs font-black shadow-xs shrink-0">
            2
          </div>
          <h4 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
            Información de la Propiedad
          </h4>
        </div>

        {/* Nombre */}
        <div>
          <label htmlFor="prop-nombre" className="block text-xs font-bold text-slate-700 mb-1.5">
            Nombre de la Propiedad *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Tag className="w-4 h-4" />
            </div>
            <input
              id="prop-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={
                tipo === TipoPropiedad.CENTRO_COMERCIAL
                  ? "Ej: Gran Bazar"
                  : tipo === TipoPropiedad.EDIFICIO
                  ? "Ej: Torre Las Palmas"
                  : tipo === TipoPropiedad.CASA
                  ? "Ej: Quinta Esmeralda"
                  : tipo === TipoPropiedad.APARTAMENTO
                  ? "Ej: Res. El Sol"
                  : tipo === TipoPropiedad.GALPON
                  ? "Ej: Galpón Central"
                  : tipo === TipoPropiedad.TERRENO
                  ? "Ej: Parcela Norte"
                  : "Ej: Local Principal"
              }
              required
              className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] font-medium text-slate-900 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Ciudad y Dirección */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="prop-ciudad" className="block text-xs font-bold text-slate-700 mb-1.5">
              Ciudad *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                id="prop-ciudad"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="Ej: Caracas"
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] font-medium text-slate-900 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="prop-direccion" className="block text-xs font-bold text-slate-700 mb-1.5">
              Dirección Detallada *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                id="prop-direccion"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Av. Principal"
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] font-medium text-slate-900 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Teléfono de Contacto y Propietario */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="prop-telefono" className="block text-xs font-bold text-slate-700">
                Teléfono de Contacto
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
            </div>
            <PhoneInput
              id="prop-telefono"
              value={telefonoContacto}
              onChange={(val) => setTelefonoContacto(val)}
              disabled={isLoading}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="prop-propietario" className="block text-xs font-bold text-slate-700">
                Propietario / Arrendador
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <UserCheck className="w-4 h-4" />
              </div>
              <input
                id="prop-propietario"
                type="text"
                value={propietario}
                onChange={(e) => setPropietario(e.target.value)}
                placeholder="Ej: Inmobiliaria Conte"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] font-medium text-slate-900 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="prop-descripcion" className="block text-xs font-bold text-slate-700 mb-1.5">
            Descripción o Referencias (Opcional)
          </label>
          <textarea
            id="prop-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Observaciones o notas adicionales..."
            rows={2}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] text-slate-900 transition-all placeholder:text-slate-400 resize-none font-normal"
          />
        </div>
      </div>

      {/* ─── 3. Características Técnicas (para complejos y grandes inmuebles) ─── */}
      {metaConfig && (
        <div className="space-y-4 pt-1">
          {/* Divisor delimitador más oscuro y definido */}
          <div className="h-px w-full bg-gradient-to-r from-slate-200/40 via-slate-400 to-slate-200/40" />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[#175E38] text-white inline-flex items-center justify-center text-xs font-black shadow-xs shrink-0">
                3
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                {metaConfig.label}
              </h4>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 shadow-2xs">
              Opcional
            </span>
          </div>

          <div className={`grid grid-cols-1 ${metaConfig.pisos ? "sm:grid-cols-2" : ""} gap-3.5`}>
            {/* Número de pisos — solo para complejos y edificios */}
            {metaConfig.pisos && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Número de Pisos / Niveles
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Layers3 className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    step="1"
                    value={numPisos}
                    onChange={(e) => setNumPisos(e.target.value)}
                    placeholder={tipo === TipoPropiedad.EDIFICIO ? "Ej: 12" : "Ej: 2"}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] font-medium text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* Área total */}
            {metaConfig.areaTotal && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {metaConfig.areaTotalLabel}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    {tipo === TipoPropiedad.TERRENO ? (
                      <Trees className="w-4 h-4" />
                    ) : (
                      <Ruler className="w-4 h-4" />
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={areaTotalM2}
                    onChange={(e) => setAreaTotalM2(e.target.value)}
                    placeholder={
                      tipo === TipoPropiedad.TERRENO ? "Ej: 5000" :
                      tipo === TipoPropiedad.GALPON ? "Ej: 2500" : "Ej: 8500"
                    }
                    className="w-full pl-10 pr-12 py-2.5 text-sm bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] font-medium text-slate-900"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-bold text-slate-400">
                    m²
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Ficha de Alquiler Inicial para Propiedades Individuales ─── */}
      {!initialData && esIndividual && !esGrande && (
        <div className="space-y-4 pt-1">
          {/* Divisor delimitador más oscuro y definido */}
          <div className="h-px w-full bg-gradient-to-r from-slate-200/40 via-slate-400 to-slate-200/40" />

          <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-slate-50/50 to-emerald-50/40 border border-emerald-200/90 space-y-3">
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#175E38]/10 text-[#175E38] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                    Ficha de Alquiler Inicial
                  </h5>
                </div>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#175E38]/10 text-[#175E38] border border-[#175E38]/20 shrink-0">
                Opcional
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Área del Inmueble
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={areaMt2}
                    onChange={(e) => setAreaMt2(e.target.value)}
                    placeholder="Ej: 120"
                    className="w-full pl-9 pr-12 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] font-medium text-slate-900"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-bold text-slate-400">
                    m²
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Precio Mensual de Alquiler
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precioAlquiler}
                    onChange={(e) => setPrecioAlquiler(e.target.value)}
                    placeholder="Ej: 850"
                    className="w-full pl-9 pr-16 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] font-medium text-slate-900"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[11px] font-semibold text-slate-400">
                    / mes
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Botones de Acción (Mismo tamaño en mobile, centrados en desktop) ─── */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 w-full sm:flex sm:items-center sm:justify-center pt-4 sm:pt-6 pb-1">
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto sm:min-w-[130px] h-11 px-3 sm:px-6 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center text-center"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading || !nombre.trim() || !direccion.trim() || !ciudad.trim()}
          className="w-full sm:w-auto sm:min-w-[180px] h-11 px-3 sm:px-8 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] hover:from-[#145331] hover:to-[#0f3d24] rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 flex items-center justify-center text-center whitespace-nowrap"
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5 justify-center">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Guardando...</span>
            </span>
          ) : (
            <span>{initialData ? "Guardar Cambios" : "Registrar Propiedad"}</span>
          )}
        </button>
      </div>
    </form>
  );
}
