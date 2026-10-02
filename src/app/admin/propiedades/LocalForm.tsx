"use client";

import { useState } from "react";
import { Loader2, X, ImagePlus } from "lucide-react";
import Image from "next/image";
import { PropiedadesUploadButton } from "@/lib/uploadthing";
import type { LocalInput } from "@/lib/actions/locales";
import { EstadoLocal } from "@prisma/client";

interface CentroBasico {
  id: string;
  nombre: string;
}

interface Props {
  centros: CentroBasico[];
  initialData?: {
    codigo: string;
    centroComercialId: string;
    piso: string | null;
    areaMt2: number | null;
    precioAlquiler: number | null;
    descripcion: string | null;
    estado: EstadoLocal;
    imagenes: string[];
  };
  onSubmit: (data: LocalInput) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const ESTADOS: { value: EstadoLocal; label: string }[] = [
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "OCUPADO", label: "Ocupado" },
  { value: "MANTENIMIENTO", label: "Mantenimiento" },
  { value: "INACTIVO", label: "Inactivo" },
];

export function LocalForm({ centros, initialData, onSubmit, onCancel, isLoading }: Props) {
  const [codigo, setCodigo] = useState(initialData?.codigo ?? "");
  const [centroComercialId, setCentroComercialId] = useState(initialData?.centroComercialId ?? (centros[0]?.id ?? ""));
  const [piso, setPiso] = useState(initialData?.piso ?? "");
  const [areaMt2, setAreaMt2] = useState(initialData?.areaMt2?.toString() ?? "");
  const [precioAlquiler, setPrecioAlquiler] = useState(initialData?.precioAlquiler?.toString() ?? "");
  const [descripcion, setDescripcion] = useState(initialData?.descripcion ?? "");
  const [estado, setEstado] = useState<EstadoLocal>(initialData?.estado ?? "DISPONIBLE");
  const [imagenes, setImagenes] = useState<string[]>(initialData?.imagenes ?? []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !centroComercialId) return;
    onSubmit({
      codigo: codigo.trim(),
      centroComercialId,
      piso: piso.trim() || undefined,
      areaMt2: areaMt2 ? parseFloat(areaMt2) : undefined,
      precioAlquiler: precioAlquiler ? parseFloat(precioAlquiler) : undefined,
      descripcion: descripcion.trim() || undefined,
      estado,
      imagenes,
    });
  };

  const removeImagen = (url: string) => setImagenes((prev) => prev.filter((i) => i !== url));

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {/* Centro Comercial */}
      <div>
        <label htmlFor="local-centro" className="block text-xs font-semibold text-slate-700 mb-1">Centro Comercial *</label>
        <select
          id="local-centro"
          value={centroComercialId}
          onChange={(e) => setCentroComercialId(e.target.value)}
          required
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 focus:border-[#1C2539] transition-all bg-white"
        >
          {centros.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {/* Código y Piso */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="local-codigo" className="block text-xs font-semibold text-slate-700 mb-1">Código *</label>
          <input
            id="local-codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ej: Local 12-B"
            required
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 focus:border-[#1C2539] transition-all"
          />
        </div>
        <div>
          <label htmlFor="local-piso" className="block text-xs font-semibold text-slate-700 mb-1">Piso / Nivel</label>
          <input
            id="local-piso"
            value={piso}
            onChange={(e) => setPiso(e.target.value)}
            placeholder="Ej: Nivel 2"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 focus:border-[#1C2539] transition-all"
          />
        </div>
      </div>

      {/* Área y Precio */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="local-area" className="block text-xs font-semibold text-slate-700 mb-1">Área (m²)</label>
          <input
            id="local-area"
            type="number"
            min="0"
            step="0.01"
            value={areaMt2}
            onChange={(e) => setAreaMt2(e.target.value)}
            placeholder="Ej: 45.5"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 focus:border-[#1C2539] transition-all"
          />
        </div>
        <div>
          <label htmlFor="local-precio" className="block text-xs font-semibold text-slate-700 mb-1">Precio/mes (₡)</label>
          <input
            id="local-precio"
            type="number"
            min="0"
            step="1000"
            value={precioAlquiler}
            onChange={(e) => setPrecioAlquiler(e.target.value)}
            placeholder="Ej: 250000"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 focus:border-[#1C2539] transition-all"
          />
        </div>
      </div>

      {/* Estado */}
      <div>
        <label htmlFor="local-estado" className="block text-xs font-semibold text-slate-700 mb-1">Estado</label>
        <select
          id="local-estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoLocal)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 focus:border-[#1C2539] transition-all bg-white"
        >
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>
      </div>

      {/* Descripción */}
      <div>
        <label htmlFor="local-desc" className="block text-xs font-semibold text-slate-700 mb-1">Descripción</label>
        <textarea
          id="local-desc"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Características especiales, vista, ubicación dentro del centro..."
          rows={2}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 focus:border-[#1C2539] transition-all resize-none"
        />
      </div>

      {/* Fotos del local */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Fotos del Local</label>
        {imagenes.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {imagenes.map((url) => (
              <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 group">
                <Image src={url} alt="Foto local" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => removeImagen(url)}
                  className="absolute top-1 right-1 bg-white/90 hover:bg-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X className="w-3 h-3 text-slate-700" />
                </button>
              </div>
            ))}
          </div>
        )}
        {imagenes.length < 5 && (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 flex flex-col items-center gap-1.5 bg-slate-50">
            <ImagePlus className="w-5 h-5 text-slate-400" />
            <p className="text-xs text-slate-400">{5 - imagenes.length} foto(s) restante(s)</p>
            <PropiedadesUploadButton
              endpoint="fotosLocal"
              onClientUploadComplete={(res) => {
                if (res) setImagenes((prev) => [...prev, ...res.map((r) => r.ufsUrl || r.url)]);
              }}
              onUploadError={(e) => console.error("Error al subir:", e)}
              appearance={{
                button: "ut-ready:bg-[#1C2539] ut-uploading:bg-slate-400 text-xs font-semibold px-3 py-1.5 rounded-lg",
                allowedContent: "text-xs text-slate-400",
              }}
            />
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading || !codigo.trim() || !centroComercialId}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#175E38] rounded-xl hover:bg-[#0f4228] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {initialData ? "Guardar cambios" : "Crear Local"}
        </button>
      </div>
    </form>
  );
}
