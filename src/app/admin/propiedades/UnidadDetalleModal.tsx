"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Store,
  ChevronLeft,
  ChevronRight,
  Camera,
  Pencil,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, TIPO_UNIDAD_LABEL } from "./constants";
import type { UnidadConPropiedad } from "./types";

interface UnidadDetalleModalProps {
  isOpen: boolean;
  unidad: UnidadConPropiedad | null;
  onClose: () => void;
  onEditar: () => void;
}

// Modal de detalle y galería fotográfica de un espacio
export function UnidadDetalleModal({
  isOpen,
  unidad,
  onClose,
  onEditar,
}: UnidadDetalleModalProps) {
  const [fotoActivaIndex, setFotoActivaIndex] = useState<number>(0);
  const [prevUnidadId, setPrevUnidadId] = useState(unidad?.id);

  // Resetear la imagen activa si cambia la unidad seleccionada
  if (unidad?.id !== prevUnidadId) {
    setPrevUnidadId(unidad?.id);
    setFotoActivaIndex(0);
  }

  if (!unidad) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Espacio: ${unidad.codigo}`}
      subtitle={`${unidad.propiedad.nombre} · ${unidad.propiedad.ciudad}`}
      icon={Store}
      headerVariant="green"
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Sección Galería de Fotos */}
        {unidad.imagenes && unidad.imagenes.length > 0 ? (
          <div className="space-y-3">
            {/* Foto Principal Ampliada con Visor */}
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-inner flex items-center justify-center">
              <Image
                src={unidad.imagenes[fotoActivaIndex] || unidad.imagenes[0]}
                alt={`Foto ${fotoActivaIndex + 1} de ${unidad.codigo}`}
                fill
                sizes="(max-width: 1024px) 100vw, 800px"
                priority
                className="object-contain"
              />

              {/* Controles de Navegación Anterior / Siguiente */}
              {unidad.imagenes.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setFotoActivaIndex((prev) =>
                        prev === 0 ? unidad.imagenes.length - 1 : prev - 1
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer shadow-lg active:scale-95"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFotoActivaIndex((prev) =>
                        prev === unidad.imagenes.length - 1 ? 0 : prev + 1
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer shadow-lg active:scale-95"
                    aria-label="Foto siguiente"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Badge indicador de número de foto */}
                  <div className="absolute bottom-3 right-3 bg-slate-950/80 text-white text-xs font-semibold px-2.5 py-1 rounded-lg backdrop-blur-xs shadow-md">
                    {fotoActivaIndex + 1} de {unidad.imagenes.length}
                  </div>
                </>
              )}
            </div>

            {/* Tira de Miniaturas si hay más de 1 foto */}
            {unidad.imagenes.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {unidad.imagenes.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFotoActivaIndex(idx)}
                    className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      fotoActivaIndex === idx
                        ? "border-[#175E38] ring-2 ring-[#175E38]/20 scale-102"
                        : "border-slate-200 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`Miniatura ${idx + 1}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Estado sin fotos */
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-2 shadow-2xs">
              <Camera className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-700">Sin fotografías registradas</p>
            <p className="text-xs text-slate-400 mt-0.5">Puedes editar este espacio para añadir fotos del inmueble.</p>
          </div>
        )}

        {/* Tarjetas de Datos Clave */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Precio Mensual */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Alquiler Mensual
            </span>
            <p className="text-base sm:text-lg font-black text-slate-900 font-heading mt-0.5">
              {formatCurrency(unidad.precioAlquiler)}
            </p>
          </div>

          {/* Estado */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Estado
            </span>
            <div className="mt-1">
              <Badge variant={unidad.estado} dot size="sm">
                {unidad.estado === "DISPONIBLE"
                  ? "Disponible"
                  : unidad.estado === "OCUPADO"
                  ? "Ocupado"
                  : unidad.estado === "MANTENIMIENTO"
                  ? "Mantenimiento"
                  : "Inactivo"}
              </Badge>
            </div>
          </div>

          {/* Tipo de Espacio */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Tipo
            </span>
            <p className="text-xs sm:text-sm font-bold text-slate-800 mt-1 truncate">
              {TIPO_UNIDAD_LABEL[unidad.tipo]}
            </p>
          </div>

          {/* Área y Piso */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Área / Piso
            </span>
            <p className="text-xs sm:text-sm font-bold text-slate-800 mt-1">
              {unidad.areaMt2 ? `${unidad.areaMt2} m²` : "—"}{" "}
              {unidad.piso ? `· ${unidad.piso}` : ""}
            </p>
          </div>
        </div>

        {/* Descripción si existe */}
        {unidad.descripcion && (
          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Descripción y Especificaciones
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {unidad.descripcion}
            </p>
          </div>
        )}

        {/* Botones de Acción al pie del Modal */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={onEditar}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#175E38] rounded-xl hover:bg-[#124b2d] transition-all shadow-xs cursor-pointer active:translate-y-0.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Editar Espacio</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
