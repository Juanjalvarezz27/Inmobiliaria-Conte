"use client";

import React, { useState, useEffect } from "react";
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
  History,
  Calendar,
  RotateCw,
  CheckCircle2,
  ExternalLink,
  PowerOff,
  Maximize2,
  Layers,
  AlertCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { ExpandirInquilinoModal } from "./ExpandirInquilinoModal";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, TIPO_UNIDAD_LABEL, WhatsAppIcon, getWhatsAppUrl } from "./constants";
import type { UnidadConPropiedad } from "./types";
import {
  getHistorialInquilinosUnidadAction,
  type DiagnosticoSubdivision,
} from "@/lib/actions/unidades";
import { EstadoUnidad } from "@prisma/client";

interface UnidadDetalleModalProps {
  isOpen: boolean;
  unidad: UnidadConPropiedad | null;
  onClose: () => void;
  onEditar: () => void;
  onCambiarEstado?: (
    unidad: UnidadConPropiedad,
    nuevoEstado: EstadoUnidad
  ) => Promise<boolean | void> | void;
  onExpandirInquilino?: (
    matrizId: string,
    contratoId: string,
    nuevoCanon: number
  ) => Promise<boolean | void> | void;
  onReunificarMatriz?: (matrizId: string) => Promise<boolean | void> | void;
}

interface ContratoHistorialItem {
  id: string;
  codigo: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  montoAlquiler: number;
  moneda: string;
  documentoUrl: string | null;
  notas: string | null;
  unidad?: {
    id: string;
    codigo: string;
  };
  inquilino: {
    id: string;
    nombre: string;
    apellido: string | null;
    tipoPersona: string;
    documentoIdentidad: string;
    telefono: string;
    email: string | null;
  };
}

export function UnidadDetalleModal({
  isOpen,
  unidad,
  onClose,
  onEditar,
  onCambiarEstado,
  onExpandirInquilino,
  onReunificarMatriz,
}: UnidadDetalleModalProps) {
  const [tabActiva, setTabActiva] = useState<"info" | "historial">("info");
  const [fotoActivaIndex, setFotoActivaIndex] = useState<number>(0);
  const [prevUnidadId, setPrevUnidadId] = useState(unidad?.id);

  // Estados de historial y diagnóstico de subdivisión
  const [historial, setHistorial] = useState<ContratoHistorialItem[]>([]);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoSubdivision | null>(null);
  const [isLoadingHistorial, setIsLoadingHistorial] = useState<boolean>(false);
  const [historialCargadoPara, setHistorialCargadoPara] = useState<string | null>(null);

  // Estados de modales interactivos
  const [confirmEstadoModal, setConfirmEstadoModal] = useState<EstadoUnidad | null>(null);
  const [openExpandirModal, setOpenExpandirModal] = useState<boolean>(false);
  const [openReunificarModal, setOpenReunificarModal] = useState<boolean>(false);
  const [isProcessingAccion, setIsProcessingAccion] = useState<boolean>(false);

  // Resetear al cambiar de unidad
  if (unidad?.id !== prevUnidadId) {
    setPrevUnidadId(unidad?.id);
    setFotoActivaIndex(0);
    setTabActiva("info");
    setConfirmEstadoModal(null);
    setOpenExpandirModal(false);
    setOpenReunificarModal(false);
  }

  // Carga automática del historial de contratos y diagnóstico de subdivisión
  useEffect(() => {
    if (isOpen && unidad?.id && historialCargadoPara !== unidad.id) {
      setIsLoadingHistorial(true);
      getHistorialInquilinosUnidadAction(unidad.id)
        .then((res) => {
          if (res.success && res.contratos) {
            setHistorial(res.contratos as unknown as ContratoHistorialItem[]);
            setDiagnostico(res.diagnostico || null);
            setHistorialCargadoPara(unidad.id);
          }
        })
        .finally(() => {
          setIsLoadingHistorial(false);
        });
    }
  }, [isOpen, unidad?.id, historialCargadoPara]);

  if (!unidad) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Espacio: ${unidad.codigo}`}
        subtitle={`${unidad.propiedad.nombre} · ${unidad.propiedad.ciudad}`}
        icon={Store}
        headerVariant="green"
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {/* Selector de Pestañas Institucional */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setTabActiva("info")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                tabActiva === "info"
                  ? "bg-[#175E38] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Información General</span>
            </button>

            <button
              type="button"
              onClick={() => setTabActiva("historial")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                tabActiva === "historial"
                  ? "bg-[#175E38] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historial de Ocupación</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  tabActiva === "historial" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {historialCargadoPara === unidad.id ? historial.length : (unidad._count?.contratos ?? 0)}
              </span>
            </button>
          </div>

          {/* CONTENIDO TAB 1: Información General */}
          {tabActiva === "info" && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Sección Galería de Fotos */}
              {unidad.imagenes && unidad.imagenes.length > 0 ? (
                <div className="space-y-2.5">
                  {/* Foto Principal */}
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

                    {unidad.imagenes.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setFotoActivaIndex((prev) =>
                              prev === 0 ? unidad.imagenes.length - 1 : prev - 1
                            )
                          }
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer shadow-lg active:scale-95"
                          aria-label="Foto anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFotoActivaIndex((prev) =>
                              prev === unidad.imagenes.length - 1 ? 0 : prev + 1
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer shadow-lg active:scale-95"
                          aria-label="Foto siguiente"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        <div className="absolute bottom-2.5 right-2.5 bg-slate-950/80 text-white text-[11px] font-semibold px-2 py-0.5 rounded-lg backdrop-blur-xs">
                          {fotoActivaIndex + 1} de {unidad.imagenes.length}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Tira de Miniaturas */}
                  {unidad.imagenes.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {unidad.imagenes.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFotoActivaIndex(idx)}
                          className={`relative w-16 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
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
                <div className="w-full py-8 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                  <Camera className="w-8 h-8 stroke-1 text-slate-300 mb-1" />
                  <p className="text-xs font-medium">Este espacio aún no cuenta con fotografías</p>
                </div>
              )}

              {/* Fila de Métricas Principales */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Tipología
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 truncate font-heading">
                    {TIPO_UNIDAD_LABEL[unidad.tipo] || unidad.tipo}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Área Aproximada
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 font-heading">
                    {unidad.areaMt2 ? `${unidad.areaMt2} m²` : "N/D"}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Canon Sugerido
                  </span>
                  <p className="text-xs sm:text-sm font-black text-[#175E38] mt-0.5 font-heading">
                    {formatCurrency(unidad.precioAlquiler)}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Estado
                  </span>
                  <div className="mt-0.5">
                    <Badge variant={unidad.estado}>
                      {unidad.estado}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* SECCIÓN ESPECIAL: Diagnóstico de Subdivisión y Opciones de Expansión / Reunificación */}
              {unidad.estado === "INACTIVO" && diagnostico?.esMatriz && (
                <>
                  {/* CASO 1: Subunidad ocupada con opción de expansión */}
                  {diagnostico.puedeExpandir && diagnostico.inquilinoParaExpandir && (
                    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/40 p-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#175E38] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0">
                            <Maximize2 className="w-4 h-4 stroke-[2.5]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#175E38] bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200">
                                Opción de Expansión
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                Espacio contiguo disponible
                              </span>
                            </div>
                            <h4 className="text-sm font-black text-slate-900 mt-1 font-heading">
                              {diagnostico.inquilinoParaExpandir.inquilinoNombre}
                            </h4>
                            <p className="text-xs text-slate-600 mt-0.5">
                              Arrienda <strong className="text-slate-800">{diagnostico.inquilinoParaExpandir.subunidadCodigo}</strong> (${diagnostico.inquilinoParaExpandir.canonActual}/mes) y puede expandir su contrato para ocupar el local completo ({unidad.codigo}, {unidad.areaMt2} m²).
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setOpenExpandirModal(true)}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#175E38] hover:bg-[#124b2d] text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 border-b-[3px] border-b-[#0e3a23] transition-all shrink-0 self-end sm:self-center"
                        >
                          <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Expandir Arrendatario</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CASO 2: Todas las subunidades libres (Reunificación posible) */}
                  {diagnostico.todasSubunidadesLibres && (
                    <div className="rounded-2xl border border-blue-200/90 bg-blue-50/50 p-4 shadow-2xs">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            Subunidades Desocupadas
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 mt-1 font-heading">
                            Todas las subunidades están libres (
                            {diagnostico.subunidades.map((s) => s.codigo).join(", ")})
                          </h4>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Puedes reunificar el espacio físico y reactivar este local matriz como
                            DISPONIBLE para arrendarlo completo. Al reactivarlo, sus subunidades
                            pasarán a estado INACTIVO.
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-blue-200/50 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setOpenReunificarModal(true)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#175E38] hover:bg-[#124b2d] text-white flex items-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5 border-b-[2px] border-b-[#0e3a23]"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Reunificar y Reactivar Local</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CASO 3: Múltiples subunidades ocupadas por distintos arrendatarios */}
                  {!diagnostico.puedeExpandir && !diagnostico.todasSubunidadesLibres && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-2xs flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-amber-950 font-heading">
                          Subunidades ocupadas por distintos arrendatarios
                        </h4>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Existen múltiples contratos de arrendamiento vigentes en las subunidades. Este
                          local matriz permanecerá inactivo hasta la culminación de dichos contratos para
                          preservar la coherencia física y contable del inmueble.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Sección Arrendatario Actual */}
              {(() => {
                const contratoActivo = unidad.contratos && unidad.contratos[0];
                const inquilino = contratoActivo?.inquilino;

                if (inquilino) {
                  const urlWp = inquilino.telefono ? getWhatsAppUrl(inquilino.telefono) : null;
                  return (
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-[#175E38]" />
                          <h4 className="text-xs font-bold text-slate-800 font-heading">
                            Arrendatario Actual
                          </h4>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          Contrato {contratoActivo.codigo}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
                        <div>
                          <p className="text-sm font-black text-slate-900 font-heading">
                            {inquilino.nombre} {inquilino.apellido || ""}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {inquilino.documentoIdentidad} • Tel: {inquilino.telefono}
                          </p>
                        </div>

                        {urlWp && (
                          <a
                            href={urlWp}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold hover:bg-emerald-200 transition-colors w-fit"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                            <span>Contactar WhatsApp</span>
                          </a>
                        )}
                      </div>

                      {/* Oportunidad de expansión mostrada desde la propia subunidad */}
                      {diagnostico?.esSubunidad &&
                        diagnostico.puedeExpandir &&
                        diagnostico.inquilinoParaExpandir?.subunidadId === unidad.id && (
                          <div className="mt-3 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                            <div>
                              <span className="text-[10px] font-black text-[#175E38] uppercase tracking-wider block">
                                Oportunidad de Expansión Comercial
                              </span>
                              <p className="text-xs text-slate-700 mt-0.5">
                                La otra parte del local se encuentra disponible. Puedes formalizar la
                                expansión al local completo{" "}
                                <strong>{diagnostico.inquilinoParaExpandir.matrizCodigo}</strong> (
                                {diagnostico.inquilinoParaExpandir.areaTotalMatriz} m²).
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setOpenExpandirModal(true)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#175E38] hover:bg-[#124b2d] text-white shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5 border-b-[2px] border-b-[#0e3a23]"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span>Expandir</span>
                            </button>
                          </div>
                        )}
                    </div>
                  );
                }

                return (
                  <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-700">
                          {unidad.estado === "DISPONIBLE"
                            ? "Sin arrendatario asignado (Espacio Disponible)"
                            : "Sin contrato activo registrado"}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {unidad.estado === "DISPONIBLE"
                            ? "Puedes formalizar un nuevo contrato de alquiler en cualquier momento."
                            : "Este espacio no se encuentra disponible actualmente."}
                        </p>
                      </div>
                    </div>

                    {unidad.estado === "DISPONIBLE" && (
                      <Link
                        href={`/admin/contratos?arrendarUnidadId=${unidad.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#175E38] text-white text-xs font-bold hover:bg-[#124b2d] shadow-xs transition-all active:translate-y-0.5 shrink-0"
                      >
                        <span>Arrendar</span>
                        <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </Link>
                    )}
                  </div>
                );
              })()}

              {/* Descripción si existe */}
              {unidad.descripcion && (
                <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-200/80">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Descripción y Especificaciones
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {unidad.descripcion}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* CONTENIDO TAB 2: Historial de Ocupación */}
          {tabActiva === "historial" && (
            <div className="space-y-3 animate-in fade-in-50 duration-150">
              {isLoadingHistorial ? (
                <div className="py-14 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <RotateCw className="w-5 h-5 animate-spin text-[#175E38]" />
                  <p>Cargando historial de contratos...</p>
                </div>
              ) : historial.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                  Este espacio aún no cuenta con contratos históricos registrados en el sistema.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
                  {historial.map((c) => {
                    const inicio = new Date(c.fechaInicio).toLocaleDateString("es-VE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });
                    const fin = new Date(c.fechaFin).toLocaleDateString("es-VE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });
                    const esActivo = c.estado === "ACTIVO" || c.estado === "POR_VENCER";
                    const inq = c.inquilino;

                    return (
                      <div
                        key={c.id}
                        className={`relative rounded-2xl border p-3.5 transition-all ${
                          esActivo
                            ? "bg-emerald-50/40 border-emerald-300 shadow-2xs"
                            : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                              Contrato {c.codigo}
                            </span>
                            {c.unidad && c.unidad.id !== unidad.id && (
                              <span className="font-mono font-bold text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                                {c.unidad.codigo}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                c.estado === "ACTIVO"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : c.estado === "POR_VENCER"
                                  ? "bg-amber-100 text-amber-800"
                                  : c.estado === "FINALIZADO"
                                  ? "bg-slate-100 text-slate-700"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {c.estado === "ACTIVO"
                                ? "Vigente"
                                : c.estado === "POR_VENCER"
                                ? "Por Vencer"
                                : c.estado === "FINALIZADO"
                                ? "Finalizado"
                                : "Rescindido"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {inicio} — {fin}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h5 className="text-sm font-black text-slate-900 font-heading">
                              {inq.nombre} {inq.apellido || ""}
                            </h5>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {inq.documentoIdentidad} • Tel: {inq.telefono}
                            </p>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <div className="text-left sm:text-right mr-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Canon Pactado
                              </span>
                              <span className="text-sm font-black text-slate-900 font-heading">
                                ${c.montoAlquiler.toFixed(2)} USD
                              </span>
                            </div>

                            {/* Botón WhatsApp */}
                            {inq.telefono && (
                              <a
                                href={getWhatsAppUrl(inq.telefono)}
                                target="_blank"
                                rel="noreferrer"
                                className="h-8 px-2.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95"
                                title="Contactar al inquilino por WhatsApp"
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                                <span className="hidden sm:inline">WhatsApp</span>
                              </a>
                            )}

                            {/* Botón Contrato PDF */}
                            {c.documentoUrl && (
                              <a
                                href={c.documentoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="h-8 px-2.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95"
                                title="Ver contrato firmado en PDF"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">PDF</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer de Acciones del Modal */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            <div className="flex items-center gap-2">
              {/* Si es matriz inactiva con opción de expansión: Botón Principal Expandir */}
              {unidad.estado === "INACTIVO" && diagnostico?.esMatriz && diagnostico.puedeExpandir && (
                <button
                  type="button"
                  onClick={() => setOpenExpandirModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#175E38] hover:bg-[#124b2d] rounded-xl transition-all cursor-pointer shadow-[0_2px_8px_rgba(23,94,56,0.3)] active:translate-y-0.5 border-b-[3px] border-b-[#0e3a23]"
                  title="Expandir el contrato del arrendatario para que ocupe todo el espacio matriz"
                >
                  <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Expandir a Local Completo</span>
                </button>
              )}

              {/* Si es matriz inactiva y todas sus subunidades están libres: Reunificar */}
              {unidad.estado === "INACTIVO" &&
                diagnostico?.esMatriz &&
                diagnostico.todasSubunidadesLibres && (
                  <button
                    type="button"
                    onClick={() => setOpenReunificarModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#175E38] hover:bg-[#124b2d] rounded-xl transition-all cursor-pointer shadow-xs active:translate-y-0.5 border-b-[3px] border-b-[#0e3a23]"
                    title="Reunificar las subunidades y reactivar el local completo"
                  >
                    <Layers className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Reunificar y Reactivar</span>
                  </button>
                )}

              {/* Si es una unidad inactiva normal (sin subunidades asociadas): Reactivar genérico */}
              {onCambiarEstado &&
                unidad.estado === "INACTIVO" &&
                !diagnostico?.esMatriz && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmEstadoModal(EstadoUnidad.DISPONIBLE);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#175E38] hover:bg-[#124b2d] rounded-xl transition-all cursor-pointer shadow-xs active:translate-y-0.5 border-b-[3px] border-b-[#0e3a23]"
                    title="Reactivar este espacio y ponerlo disponible para arrendar"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Reactivar Espacio</span>
                  </button>
                )}

              {/* Inactivar espacio disponible con Confirmación */}
              {onCambiarEstado && unidad.estado === "DISPONIBLE" && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmEstadoModal(EstadoUnidad.INACTIVO);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer border border-slate-200 shadow-2xs"
                  title="Poner en inactivo sin eliminar su historial"
                >
                  <PowerOff className="w-3.5 h-3.5 text-slate-500" />
                  <span>Inactivar</span>
                </button>
              )}

              <button
                type="button"
                onClick={onEditar}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-[#1C2539] rounded-xl hover:bg-[#2a3754] transition-all shadow-xs cursor-pointer active:translate-y-0.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Editar Espacio</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmación Institucional para Reactivar / Inactivar Espacio */}
      <ConfirmActionModal
        isOpen={!!confirmEstadoModal}
        onClose={() => setConfirmEstadoModal(null)}
        onConfirm={async () => {
          if (!confirmEstadoModal || !unidad || !onCambiarEstado) return;
          setIsProcessingAccion(true);
          try {
            await onCambiarEstado(unidad, confirmEstadoModal);
            setConfirmEstadoModal(null);
          } finally {
            setIsProcessingAccion(false);
          }
        }}
        title={
          confirmEstadoModal === EstadoUnidad.DISPONIBLE
            ? `¿Reactivar espacio ${unidad.codigo}?`
            : `¿Inactivar espacio ${unidad.codigo}?`
        }
        subtitle={`${unidad.propiedad.nombre} · ${unidad.propiedad.ciudad}`}
        variant={confirmEstadoModal === EstadoUnidad.DISPONIBLE ? "green" : "warning"}
        icon={confirmEstadoModal === EstadoUnidad.DISPONIBLE ? CheckCircle2 : PowerOff}
        description={
          confirmEstadoModal === EstadoUnidad.DISPONIBLE
            ? "El espacio pasará a estado DISPONIBLE y volverá a figurar en el catálogo de espacios disponibles para formalizar nuevos contratos."
            : "El espacio pasará a estado INACTIVO. Su historial contable, recibos y contratos pasados permanecerán 100% seguros e intactos, pero no aparecerá disponible para alquilar."
        }
        itemDetails={[
          { label: "Espacio", value: unidad.codigo },
          { label: "Tipología", value: TIPO_UNIDAD_LABEL[unidad.tipo] || unidad.tipo },
          { label: "Área", value: unidad.areaMt2 ? `${unidad.areaMt2} m²` : "N/D" },
          { label: "Canon Sugerido", value: formatCurrency(unidad.precioAlquiler) },
        ]}
        confirmButtonText={
          confirmEstadoModal === EstadoUnidad.DISPONIBLE
            ? "Sí, Reactivar Espacio"
            : "Sí, Inactivar Espacio"
        }
        cancelButtonText="Cancelar"
        isLoading={isProcessingAccion}
      />

      {/* Modal Institucional de Expansión de Arrendatario a Local Completo */}
      <ExpandirInquilinoModal
        isOpen={openExpandirModal}
        onClose={() => setOpenExpandirModal(false)}
        expansionInfo={diagnostico?.inquilinoParaExpandir || null}
        onConfirm={async (nuevoCanon) => {
          if (!diagnostico?.inquilinoParaExpandir || !onExpandirInquilino) return;
          setIsProcessingAccion(true);
          try {
            const ok = await onExpandirInquilino(
              diagnostico.inquilinoParaExpandir.matrizId,
              diagnostico.inquilinoParaExpandir.contratoId,
              nuevoCanon
            );
            if (ok !== false) {
              setOpenExpandirModal(false);
              onClose();
            }
          } finally {
            setIsProcessingAccion(false);
          }
        }}
        isLoading={isProcessingAccion}
      />

      {/* Modal Institucional de Confirmación para Reunificar y Reactivar Matriz */}
      <ConfirmActionModal
        isOpen={openReunificarModal}
        onClose={() => setOpenReunificarModal(false)}
        onConfirm={async () => {
          if (!onReunificarMatriz || !unidad) return;
          setIsProcessingAccion(true);
          try {
            const ok = await onReunificarMatriz(unidad.id);
            if (ok !== false) {
              setOpenReunificarModal(false);
              onClose();
            }
          } finally {
            setIsProcessingAccion(false);
          }
        }}
        title={`¿Reunificar y reactivar espacio ${unidad.codigo}?`}
        subtitle={`${unidad.propiedad.nombre} · ${unidad.propiedad.ciudad}`}
        variant="green"
        icon={Layers}
        description="El espacio matriz pasará a estado DISPONIBLE para formalizar un contrato por la totalidad del local. Sus subunidades asociadas se marcarán automáticamente como INACTIVAS para no ofertarse por duplicado."
        itemDetails={[
          { label: "Espacio Matriz", value: unidad.codigo },
          { label: "Área Total", value: unidad.areaMt2 ? `${unidad.areaMt2} m²` : "N/D" },
          { label: "Canon Sugerido", value: formatCurrency(unidad.precioAlquiler) },
          {
            label: "Subunidades a inactivar",
            value: diagnostico?.subunidades.map((s) => s.codigo).join(", ") || "Todas",
          },
        ]}
        confirmButtonText="Sí, Reunificar y Reactivar"
        cancelButtonText="Cancelar"
        isLoading={isProcessingAccion}
      />
    </>
  );
}
