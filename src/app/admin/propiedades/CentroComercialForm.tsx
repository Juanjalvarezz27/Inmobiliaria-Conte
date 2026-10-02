"use client";

import { useState, useTransition } from "react";
import { Loader2, ImagePlus, X } from "lucide-react";
import { PropiedadesUploadButton } from "@/lib/uploadthing";
import type { CentroComercialInput } from "@/lib/actions/centros-comerciales";
import Image from "next/image";

interface Props {
  initialData?: {
    nombre: string;
    direccion: string;
    ciudad: string;
    descripcion: string | null;
    imagenUrl: string | null;
  };
  onSubmit: (data: CentroComercialInput) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function CentroComercialForm({ initialData, onSubmit, onCancel, isLoading }: Props) {
  const [nombre, setNombre] = useState(initialData?.nombre ?? "");
  const [direccion, setDireccion] = useState(initialData?.direccion ?? "");
  const [ciudad, setCiudad] = useState(initialData?.ciudad ?? "");
  const [descripcion, setDescripcion] = useState(initialData?.descripcion ?? "");
  const [imagenUrl, setImagenUrl] = useState<string | null>(initialData?.imagenUrl ?? null);
  const [isUploading, startUpload] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !direccion.trim() || !ciudad.trim()) return;
    onSubmit({ nombre: nombre.trim(), direccion: direccion.trim(), ciudad: ciudad.trim(), descripcion: descripcion.trim() || undefined, imagenUrl: imagenUrl ?? undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Foto del centro */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Foto del Centro</label>
        {imagenUrl ? (
          <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200">
            <Image src={imagenUrl} alt="Foto del centro" fill className="object-cover" />
            <button
              type="button"
              onClick={() => setImagenUrl(null)}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow-sm transition-colors"
            >
              <X className="w-4 h-4 text-slate-700" />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center gap-2 bg-slate-50">
            <ImagePlus className="w-7 h-7 text-slate-400" />
            <PropiedadesUploadButton
              endpoint="fotocentroComercial"
              onUploadBegin={() => startUpload(() => {})}
              onClientUploadComplete={(res) => {
                if (res?.[0]) setImagenUrl(res[0].ufsUrl || res[0].url);
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

      {/* Campos del formulario */}
      <div className="space-y-3">
        <div>
          <label htmlFor="cc-nombre" className="block text-xs font-semibold text-slate-700 mb-1">Nombre *</label>
          <input
            id="cc-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Centro Comercial Plaza Mayor"
            required
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 focus:border-[#1C2539] transition-all"
          />
        </div>
        <div>
          <label htmlFor="cc-ciudad" className="block text-xs font-semibold text-slate-700 mb-1">Ciudad *</label>
          <input
            id="cc-ciudad"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            placeholder="Ej: San José"
            required
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 focus:border-[#1C2539] transition-all"
          />
        </div>
        <div>
          <label htmlFor="cc-direccion" className="block text-xs font-semibold text-slate-700 mb-1">Dirección *</label>
          <input
            id="cc-direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Ej: 200m norte del Parque Central"
            required
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 focus:border-[#1C2539] transition-all"
          />
        </div>
        <div>
          <label htmlFor="cc-descripcion" className="block text-xs font-semibold text-slate-700 mb-1">Descripción</label>
          <textarea
            id="cc-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción breve del centro comercial..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 focus:border-[#1C2539] transition-all resize-none"
          />
        </div>
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
          disabled={isLoading || isUploading || !nombre.trim() || !direccion.trim() || !ciudad.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#175E38] rounded-xl hover:bg-[#0f4228] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {initialData ? "Guardar cambios" : "Crear Centro"}
        </button>
      </div>
    </form>
  );
}
