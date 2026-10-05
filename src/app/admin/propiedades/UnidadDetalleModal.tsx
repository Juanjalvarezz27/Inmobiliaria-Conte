"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Store,
  ChevronLeft,
  ChevronRight,
  Camera,
  Pencil,
  UserCheck,
  User,
  ArrowUpRight,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, TIPO_UNIDAD_LABEL, WhatsAppIcon, getWhatsAppUrl } from "./constants";
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
                unoptimized
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
                      unoptimized
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
          {/* Mensualidad */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              {unidad.contratos && unidad.contratos.length > 0 ? "Mensualidad Acordada" : "Mensualidad"}
            </span>
            <p className="text-base sm:text-lg font-black text-slate-900 font-heading mt-0.5">
              {formatCurrency(
                unidad.contratos && unidad.contratos.length > 0
                  ? unidad.contratos[0].montoAlquiler
                  : unidad.precioAlquiler
              )}
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

        {/* Sección: Relación de Arrendatario y Contrato Vigente */}
        {(() => {
          const contratoActivo = unidad.contratos && unidad.contratos.length > 0 ? unidad.contratos[0] : null;

          if (contratoActivo) {
            const nombreInquilino = `${contratoActivo.inquilino.nombre} ${contratoActivo.inquilino.apellido ?? ""}`.trim();
            const fInicio = new Date(contratoActivo.fechaInicio).toLocaleDateString("es-VE", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            const fFin = new Date(contratoActivo.fechaFin).toLocaleDateString("es-VE", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });

            return (
              <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50/70 p-4 sm:p-5 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-2 border-b border-emerald-100/80 pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#175E38]/10 text-[#175E38] flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 font-heading">
                      Arrendatario y Contrato Vigente
                    </h4>
                  </div>

                  <Link
                    href={`/admin/contratos?search=${encodeURIComponent(contratoActivo.codigo)}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-[#175E38] text-white text-xs font-bold hover:bg-[#124b2d] shadow-xs transition-all active:translate-y-0.5 shrink-0"
                  >
                    <span>Ver Contrato</span>
                    <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Datos del Inquilino */}
                  <div className="bg-white/80 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Datos del Arrendatario
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-extrabold text-slate-900">
                        {nombreInquilino}
                      </p>
                      <p className="text-xs font-mono font-medium text-slate-500">
                        Doc: {contratoActivo.inquilino.documentoIdentidad}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
                      <a
                        href={getWhatsAppUrl(contratoActivo.inquilino.telefono)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                        <span>{contratoActivo.inquilino.telefono}</span>
                      </a>

                      {contratoActivo.inquilino.email && (
                        <span className="text-xs text-slate-500 truncate" title={contratoActivo.inquilino.email}>
                          {contratoActivo.inquilino.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Datos del Contrato */}
                  <div className="bg-white/80 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Datos del Contrato
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {contratoActivo.codigo}
                      </span>
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {contratoActivo.estado === "POR_VENCER" ? "Por Vencer" : "Activo"}
                      </span>
                    </div>

                    <div className="pt-1 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Mensualidad:</span>
                        <span className="font-extrabold text-slate-900 font-heading">
                          {formatCurrency(contratoActivo.montoAlquiler)} / mes
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Vigencia:</span>
                        <span className="font-medium text-slate-700">
                          {fInicio} al {fFin}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Sin contrato vigente
          return (
            <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 via-white to-slate-50/70 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-700">
                    {unidad.estado === "DISPONIBLE"
                      ? "Sin arrendatario asignado (Espacio Disponible)"
                      : "Sin contrato activo registrado"}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {unidad.estado === "DISPONIBLE"
                      ? "Puedes formalizar un nuevo contrato de alquiler para este espacio en cualquier momento."
                      : "Este espacio no se encuentra disponible actualmente."}
                  </p>
                </div>
              </div>

              {unidad.estado === "DISPONIBLE" && (
                <Link
                  href={`/admin/contratos?arrendarUnidadId=${unidad.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#175E38] text-white text-xs font-bold hover:bg-[#124b2d] shadow-xs transition-all active:translate-y-0.5 shrink-0"
                >
                  <span>Crear Contrato</span>
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </Link>
              )}
            </div>
          );
        })()}

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
