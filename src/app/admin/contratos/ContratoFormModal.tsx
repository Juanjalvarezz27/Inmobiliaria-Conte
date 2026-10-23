"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  User,
  Calendar,
  DollarSign,
  RefreshCw,
  FileCheck,
  Trash2,
  AlertTriangle,
  ChevronDown,
  UploadCloud,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { Select } from "@/components/ui/select";
import { EspacioSelectorMultiNivel } from "./EspacioSelectorMultiNivel";
import { useOperacionesUploadThing } from "@/lib/uploadthing";
import {
  comprimirDocumentoContrato,
  formatearBytes,
  type ProgresoCompresion,
} from "@/lib/file-compressor";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { EstadoUnidad, MetodoPago } from "@prisma/client";
import type {
  InquilinoSelector,
  UnidadDisponible,
  ContratoConRelaciones,
} from "./types";
import type { CreateContratoInput, UpdateContratoInput } from "@/lib/actions/contratos";
import { eliminarDocumentoContratoAction } from "@/lib/actions/contratos";
import { OPCIONES_METODO_PAGO } from "@/lib/constants/pagos";


interface ContratoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateContratoInput | UpdateContratoInput) => void;
  inquilinos: InquilinoSelector[];
  unidadesDisponibles: UnidadDisponible[];
  initialData?: ContratoConRelaciones | null;
  inquilinoIdPreseleccionado?: string;
  unidadIdPreseleccionada?: string;
  isLoading?: boolean;
}

// Modal de creación y edición de contratos de arrendamiento
export function ContratoFormModal({
  isOpen,
  onClose,
  onSubmit,
  inquilinos,
  unidadesDisponibles,
  initialData,
  inquilinoIdPreseleccionado,
  unidadIdPreseleccionada,
  isLoading = false,
}: ContratoFormModalProps) {
  // Fechas por defecto: hoy y 1 año después
  const hoyStr = new Date().toISOString().split("T")[0];
  const unAnoDespues = new Date();
  unAnoDespues.setFullYear(unAnoDespues.getFullYear() + 1);
  const unAnoStr = unAnoDespues.toISOString().split("T")[0];

  const unidadInicialId =
    initialData?.unidad.id ??
    unidadIdPreseleccionada ??
    "";

  const unidadPreseleccionadaObj = unidadesDisponibles.find(
    (u) => u.id === unidadInicialId
  );

  const [inquilinoId, setInquilinoId] = useState(
    initialData?.inquilino.id ?? inquilinoIdPreseleccionado ?? ""
  );
  const [unidadId, setUnidadId] = useState(unidadInicialId);
  const [fechaInicio, setFechaInicio] = useState(
    initialData ? new Date(initialData.fechaInicio).toISOString().split("T")[0] : hoyStr
  );
  const [fechaFin, setFechaFin] = useState(
    initialData ? new Date(initialData.fechaFin).toISOString().split("T")[0] : unAnoStr
  );
  const [diaCobro, setDiaCobro] = useState<string>(
    initialData?.diaCobro ? String(initialData.diaCobro) : ""
  );
  const [montoAlquiler, setMontoAlquiler] = useState<string>(
    initialData?.montoAlquiler
      ? String(initialData.montoAlquiler)
      : unidadPreseleccionadaObj?.precioAlquiler
      ? String(unidadPreseleccionadaObj.precioAlquiler)
      : ""
  );
  const [depositoGarantia, setDepositoGarantia] = useState<string>(
    initialData?.depositoGarantia ? String(initialData.depositoGarantia) : ""
  );
  const [documentoUrl, setDocumentoUrl] = useState<string>(
    initialData?.documentoUrl ?? ""
  );
  const [notas, setNotas] = useState<string>(initialData?.notas ?? "");
  const [depositoCobradoAlFirmar, setDepositoCobradoAlFirmar] = useState(false);
  const [depositoMetodoPago, setDepositoMetodoPago] = useState<MetodoPago>(MetodoPago.TRANSFERENCIA);
  const [depositoReferencia, setDepositoReferencia] = useState("");

  const [calendarioDiaAbierto, setCalendarioDiaAbierto] = useState(false);
  const calendarioRef = useRef<HTMLDivElement>(null);

  const [isCompressing, setIsCompressing] = useState(false);
  const [progresoCompresion, setProgresoCompresion] = useState<ProgresoCompresion | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [statsCompresion, setStatsCompresion] = useState<{
    original: string;
    final: string;
    ahorroPct: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cancela la compresión activa y restablece el estado del formulario
  const cancelarCompresion = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsCompressing(false);
    setProgresoCompresion(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("Optimización cancelada.");
  };

  // Limpia el archivo adjunto, errores y resetea el input nativo
  const limpiarArchivo = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const urlAEliminar = documentoUrl;
    setDocumentoUrl("");
    setStatsCompresion(null);
    setProgresoCompresion(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Si era un archivo recién subido en esta sesión, liberarlo de UploadThing (cuenta conte)
    if (urlAEliminar && (!initialData?.documentoUrl || urlAEliminar !== initialData.documentoUrl)) {
      eliminarDocumentoContratoAction(urlAEliminar).catch(() => {});
    }
  };

  // Hook directo de UploadThing para carga de contrato con control total de UI
  const { startUpload, isUploading } = useOperacionesUploadThing("documentoOperativo", {
    onClientUploadComplete: (res) => {
      if (res && res[0]) {
        const url = res[0].ufsUrl || res[0].url;
        setDocumentoUrl(url);
        setUploadError(null);
        toast.success("Documento PDF firmado cargado exitosamente.");
      }
    },
    onUploadError: (error) => {
      const rawMsg = error.message.toLowerCase();
      let errorHumano = `Error al subir documento: ${error.message}`;

      if (
        rawMsg.includes("filesizemismatch") ||
        rawMsg.includes("file size") ||
        rawMsg.includes("exceeds")
      ) {
        errorHumano =
          "El archivo supera el tamaño máximo permitido de 8 MB. Por favor selecciona un documento más liviano o con menos páginas.";
      }

      setUploadError(errorHumano);
      toast.error(errorHumano);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsCompressing(false);
      setProgresoCompresion(null);
    },
  });

  // Procesa, comprime y optimiza el archivo antes de enviarlo a UploadThing
  const handleFileSelect = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsCompressing(true);
    setUploadError(null);
    setProgresoCompresion({
      porcentaje: 5,
      etapa: "Iniciando compresión inteligente...",
    });

    const LIMITE_MAX_BYTES = 8 * 1024 * 1024; // 8 MB

    try {
      const { file: pdfComprimido, pesoOriginal, pesoFinal, ahorroPct } =
        await comprimirDocumentoContrato(
          fileArray,
          (progreso) => {
            setProgresoCompresion(progreso);
          },
          controller.signal
        );

      // Validación preventiva: no enviar a la red si supera el límite de 8 MB
      if (pdfComprimido.size > LIMITE_MAX_BYTES) {
        const pesoFinalStr = formatearBytes(pdfComprimido.size);
        const pesoOriginalStr = formatearBytes(pesoOriginal);
        const mensaje = `El documento pesa ${pesoFinalStr} tras compresión (original: ${pesoOriginalStr}) y supera el límite permitido de 8 MB. Por favor divide las páginas o utiliza un archivo más liviano.`;
        setUploadError(mensaje);
        toast.error(mensaje);
        setIsCompressing(false);
        setProgresoCompresion(null);
        return;
      }

      setStatsCompresion({
        original: formatearBytes(pesoOriginal),
        final: formatearBytes(pesoFinal),
        ahorroPct,
      });

      if (ahorroPct >= 5) {
        toast.info(
          `Documento optimizado: ${formatearBytes(pesoOriginal)} → ${formatearBytes(pesoFinal)} (−${ahorroPct}% de peso)`
        );
      }

      setIsCompressing(false);
      setProgresoCompresion(null);
      await startUpload([pdfComprimido]);
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        return;
      }
      const rawMsg = err instanceof Error ? err.message : "Error al procesar el archivo";
      const errorLegible =
        rawMsg.toLowerCase().includes("filesizemismatch") ||
        rawMsg.toLowerCase().includes("file size") ||
        rawMsg.toLowerCase().includes("exceeds")
          ? "El archivo supera el tamaño máximo permitido de 8 MB. Selecciona un documento más liviano."
          : rawMsg;

      setUploadError(errorLegible);
      toast.error(errorLegible);
    } finally {
      setIsCompressing(false);
      setProgresoCompresion(null);
      abortControllerRef.current = null;
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Cerrar popover del calendario de cobro al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarioRef.current && !calendarioRef.current.contains(e.target as Node)) {
        setCalendarioDiaAbierto(false);
      }
    };
    if (calendarioDiaAbierto) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [calendarioDiaAbierto]);

  // Al seleccionar una unidad, cargar automáticamente el precio registrado de esa unidad
  const handleSeleccionarUnidad = (nuevaUnidadId: string) => {
    setUnidadId(nuevaUnidadId);
    const u = unidadesDisponibles.find((item) => item.id === nuevaUnidadId);
    if (u?.precioAlquiler && (!montoAlquiler || montoAlquiler === "0" || !initialData)) {
      setMontoAlquiler(String(u.precioAlquiler));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inquilinoId) {
      toast.error("Debes seleccionar un inquilino.");
      return;
    }
    if (!unidadId && !initialData) {
      toast.error("Debes seleccionar un espacio para alquilar.");
      return;
    }

    if (new Date(fechaFin) <= new Date(fechaInicio)) {
      toast.error("La fecha de fin del contrato debe ser posterior a la fecha de inicio.");
      return;
    }

    const mensualidadNum = parseFloat(montoAlquiler);
    if (!montoAlquiler || isNaN(mensualidadNum) || mensualidadNum <= 0) {
      toast.error("Debes ingresar una mensualidad válida mayor a 0.");
      return;
    }

    const diaNum = parseInt(diaCobro, 10);
    if (!diaCobro || isNaN(diaNum) || diaNum < 1 || diaNum > 31) {
      toast.error("El día de cobro del mes debe ser un número entero entre 1 y 31.");
      return;
    }

    const payload: CreateContratoInput = {
      inquilinoId,
      unidadId,
      fechaInicio,
      fechaFin,
      diaCobro: diaNum,
      montoAlquiler: mensualidadNum,
      depositoGarantia: depositoGarantia ? parseFloat(depositoGarantia) : null,
      depositoCobradoAlFirmar: !isEditing && depositoCobradoAlFirmar,
      depositoFechaCobro: !isEditing && depositoCobradoAlFirmar ? fechaInicio : null,
      depositoMetodoPago: !isEditing && depositoCobradoAlFirmar ? depositoMetodoPago : null,
      depositoReferencia: !isEditing && depositoCobradoAlFirmar && depositoReferencia.trim() ? depositoReferencia.trim() : null,
      moneda: "USD",
      documentoUrl: documentoUrl || null,
      notas: notas.trim() || null,
    };

    onSubmit(payload);
  };

  const isEditing = !!initialData;
  const unidadSeleccionada = unidadesDisponibles.find((u) => u.id === unidadId);

  const getEstadoTexto = (estado: EstadoUnidad) => {
    switch (estado) {
      case EstadoUnidad.DISPONIBLE:
        return "Disponible";
      case EstadoUnidad.MANTENIMIENTO:
        return "En Mantenimiento";
      case EstadoUnidad.INACTIVO:
        return "Inactivo";
      default:
        return estado;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Editar Contrato: ${initialData.codigo}` : "Registrar Nuevo Contrato"}
      icon={FileText}
      headerVariant="green"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Paso 1: Partes del Contrato */}
        <div className="space-y-3.5">
          <FormSectionHeader step={1} title="Partes y Espacio Inmobiliario" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Selector de Inquilino */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Inquilino / Arrendatario <span className="text-[#CC1A22]">*</span>
              </label>
              {isEditing ? (
                <div className="px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-100 rounded-xl border border-slate-200">
                  {initialData.inquilino.nombre} {initialData.inquilino.apellido ?? ""} (
                  {initialData.inquilino.documentoIdentidad})
                </div>
              ) : (
                <Select
                  value={inquilinoId}
                  onChange={setInquilinoId}
                  icon={<User className="w-4 h-4" />}
                  placeholder="Selecciona un inquilino..."
                  searchable
                  searchPlaceholder="Buscar por nombre, cédula o RIF..."
                  maxVisibleOptions={8}
                  dropdownWidth="w-full sm:w-[460px]"
                  align="left"
                  options={inquilinos.map((inq) => ({
                    value: inq.id,
                    label: `${inq.nombre} ${inq.apellido ?? ""}`.trim(),
                    sublabel: inq.documentoIdentidad,
                    description: inq.tipoPersona === "JURIDICA" ? "Persona Jurídica · Empresa" : "Persona Natural",
                    badge: {
                      text: inq.tipoPersona === "JURIDICA" ? "Empresa" : "Natural",
                      variant: inq.tipoPersona === "JURIDICA" ? "blue" : "emerald",
                    },
                    metaRight: inq.telefono,
                  }))}
                />
              )}
            </div>

            {/* Selector de Espacio Disponible */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Espacio en Alquiler <span className="text-[#CC1A22]">*</span>
              </label>
              {isEditing ? (
                <div className="px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-100 rounded-xl border border-slate-200">
                  {initialData.unidad.codigo} · {initialData.unidad.propiedad.nombre}
                </div>
              ) : unidadesDisponibles.length === 0 ? (
                <div className="px-3 py-2 text-xs text-amber-800 bg-amber-50 rounded-xl border border-amber-200">
                  ⚠️ No hay espacios disponibles. Registra o libera un espacio primero.
                </div>
              ) : (
                <div className="space-y-1.5">
                  <EspacioSelectorMultiNivel
                    unidades={unidadesDisponibles}
                    value={unidadId}
                    onChange={handleSeleccionarUnidad}
                    placeholder="Selecciona un espacio libre..."
                  />
                  {unidadSeleccionada && unidadSeleccionada.estado !== EstadoUnidad.DISPONIBLE && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200/90 rounded-xl text-xs text-amber-900 flex items-start gap-2 shadow-2xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        Este espacio figura como <strong>{getEstadoTexto(unidadSeleccionada.estado)}</strong>. Al guardar el contrato, su estado pasará automáticamente a <strong>Ocupado</strong>.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Paso 2: Vigencia y Condiciones Económicas */}
        <div className="space-y-4">
          <FormSectionHeader step={2} title="Vigencia y Condiciones Económicas" />

          {/* Fila 1: Período del Contrato (2 columnas simétricas 50 / 50) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Fecha de Inicio */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Fecha de Inicio <span className="text-[#CC1A22]">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full pl-9 pr-3 h-11 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
                />
              </div>
            </div>

            {/* Fecha de Fin */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Fecha de Fin <span className="text-[#CC1A22]">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full pl-9 pr-3 h-11 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Fila 2: Condiciones Económicas (3 columnas simétricas y limpias) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Mensualidad (USD) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mensualidad (USD) <span className="text-[#CC1A22]">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={montoAlquiler}
                  onChange={(e) => setMontoAlquiler(e.target.value)}
                  placeholder={
                    unidadSeleccionada?.precioAlquiler
                      ? `Ej: ${unidadSeleccionada.precioAlquiler}`
                      : "Ej: 350"
                  }
                  className="w-full pl-9 pr-3 h-11 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
                />
              </div>
              {unidadSeleccionada?.precioAlquiler !== null &&
                unidadSeleccionada?.precioAlquiler !== undefined &&
                unidadSeleccionada.precioAlquiler > 0 && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Precio registrado del espacio:{" "}
                    <span className="font-semibold text-slate-800">
                      ${unidadSeleccionada.precioAlquiler}/mes
                    </span>
                  </p>
                )}
            </div>

            {/* Día de Cobro del Mes (1 a 31) con Calendario */}
            <div ref={calendarioRef} className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Día de Cobro del Mes <span className="text-[#CC1A22]">*</span>
              </label>
              <button
                type="button"
                onClick={() => setCalendarioDiaAbierto((prev) => !prev)}
                className={`w-full flex items-center justify-between px-3.5 h-11 text-xs sm:text-sm border rounded-xl bg-slate-50 transition-all shadow-2xs cursor-pointer ${
                  calendarioDiaAbierto
                    ? "border-[#175E38] ring-2 ring-[#175E38]/20 bg-white text-slate-900"
                    : "border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className={diaCobro ? "font-bold text-slate-900" : "text-slate-400 font-normal"}>
                    {diaCobro ? `Día ${diaCobro} de cada mes` : "Seleccionar día (1-31)"}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ml-1 shrink-0 ${
                    calendarioDiaAbierto ? "rotate-180 text-[#175E38]" : ""
                  }`}
                />
              </button>

              {/* Popover con Cuadrícula de Calendario (1 al 31) */}
              {calendarioDiaAbierto && (
                <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-1.5 z-40 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 w-64 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Día de cobro mensual
                    </span>
                    {diaCobro && (
                      <span className="text-[11px] font-extrabold text-[#175E38] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Día {diaCobro}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => {
                      const isSelected = diaCobro === String(dia);
                      return (
                        <button
                          key={dia}
                          type="button"
                          onClick={() => {
                            setDiaCobro(String(dia));
                            setCalendarioDiaAbierto(false);
                          }}
                          className={`h-7 w-7 text-xs font-semibold rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#175E38] text-white font-black shadow-xs scale-105"
                              : "text-slate-700 hover:bg-emerald-50 hover:text-[#175E38]"
                          }`}
                        >
                          {dia}
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center leading-tight">
                    En meses con menos días (ej: 28 o 30), el cobro se ajusta al último día del mes.
                  </p>
                </div>
              )}
            </div>

            {/* Depósito en Garantía (Opcional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Depósito en Garantía (USD)
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={depositoGarantia}
                  onChange={(e) => setDepositoGarantia(e.target.value)}
                  placeholder="Ej: 700 (Opcional)"
                  className="w-full pl-9 pr-3 h-11 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
                />
              </div>
            </div>

            {/* Opción de registrar cobro del depósito al firmar (Solo al crear) */}
            {!isEditing && parseFloat(depositoGarantia || "0") > 0 && (
              <div className="sm:col-span-2 p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2.5 animate-in fade-in-50 duration-200">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={depositoCobradoAlFirmar}
                    onChange={(e) => setDepositoCobradoAlFirmar(e.target.checked)}
                    className="w-4 h-4 rounded text-[#175E38] focus:ring-[#175E38]/20 accent-[#175E38] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    ¿El depósito en garantía ({formatCurrency(parseFloat(depositoGarantia || "0"))}) ya fue cobrado al firmar este contrato?
                  </span>
                </label>

                {depositoCobradoAlFirmar && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Método de Pago del Depósito <span className="text-[#CC1A22]">*</span>
                      </label>
                      <Select
                        value={depositoMetodoPago}
                        onChange={(val) => setDepositoMetodoPago(val as MetodoPago)}
                        options={OPCIONES_METODO_PAGO}
                        placeholder="Método..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Nro. de Referencia (Opcional)
                      </label>
                      <input
                        type="text"
                        value={depositoReferencia}
                        onChange={(e) => setDepositoReferencia(e.target.value)}
                        placeholder="Ej: REF-765432 / Banesco"
                        className="w-full px-3 h-11 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Banner de Ajuste Económico y Preservación Histórica */}
          {isEditing && initialData && (
            (parseFloat(montoAlquiler) !== initialData.montoAlquiler && !isNaN(parseFloat(montoAlquiler))) ||
            (parseInt(diaCobro, 10) !== initialData.diaCobro && !isNaN(parseInt(diaCobro, 10)))
          ) && (
            <div className="p-3.5 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl space-y-1.5 text-xs text-emerald-950 shadow-2xs animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-[#175E38] shrink-0" />
                <span>Preservación Histórica de Pagos Garantizada</span>
              </div>
              <p className="text-emerald-800 leading-relaxed">
                Todas las mensualidades que ya fueron pagadas mantendrán intacto su valor histórico original (${initialData.montoAlquiler.toFixed(2)} USD). El nuevo canon (${parseFloat(montoAlquiler || "0").toFixed(2)} USD) y día de corte (Día {diaCobro || initialData.diaCobro}) se aplicarán automáticamente a las cuotas pendientes y a los períodos futuros por cobrar.
              </p>
            </div>
          )}
        </div>

        {/* Paso 3: Documento Firmado y Observaciones */}
        <div className="space-y-3.5">
          <FormSectionHeader step={3} title="Documento PDF Firmado y Cláusulas" />

          {/* Subida o visor de PDF firmado */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Copia Digital del Contrato Firmado (PDF, máx. 4 MB)
            </label>

            {/* Input oculto de archivos */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files) {
                  handleFileSelect(e.target.files);
                }
              }}
              accept=".pdf,image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
            />

            {documentoUrl ? (
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 truncate">
                  <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 text-[#175E38] flex items-center justify-center shrink-0 shadow-2xs">
                    <FileCheck className="w-5 h-5 text-[#175E38]" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      Contrato firmado adjunto
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <a
                        href={documentoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-[#175E38] hover:underline truncate"
                      >
                        Ver archivo en la nube
                      </a>
                      {statsCompresion && (
                        <span className="text-[10px] text-slate-500">
                          ({statsCompresion.final})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDocumentoUrl("");
                    setStatsCompresion(null);
                  }}
                  className="p-2 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                  title="Eliminar y subir otro archivo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files) {
                    handleFileSelect(e.dataTransfer.files);
                  }
                }}
                onClick={() => {
                  if (!isUploading && !isCompressing) {
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    fileInputRef.current?.click();
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-5 sm:p-6 transition-all flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer ${
                  isDragOver
                    ? "border-[#175E38] bg-emerald-50/50"
                    : uploadError
                    ? "border-rose-300 bg-rose-50/30 hover:bg-rose-50/50"
                    : "border-slate-300 bg-slate-50/60 hover:bg-emerald-50/20 hover:border-[#175E38]/60"
                } ${isUploading ? "opacity-75 cursor-not-allowed pointer-events-none" : isCompressing ? "cursor-default" : "cursor-pointer"}`}
              >
                {isCompressing ? (
                  <div className="flex flex-col items-center gap-3 text-slate-800 py-3 w-full max-w-sm mx-auto px-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/90 text-[#175E38] flex items-center justify-center shadow-2xs">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                    <div className="text-center w-full space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span className="truncate">
                          {progresoCompresion?.etapa || "Optimizando documento..."}
                        </span>
                        <span className="text-[#175E38] font-black shrink-0 ml-2">
                          {progresoCompresion?.porcentaje ?? 10}%
                        </span>
                      </div>
                      {/* Barra de progreso interactiva */}
                      <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden p-0.5">
                        <div
                          className="bg-gradient-to-r from-[#175E38] to-[#25a260] h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(23,94,56,0.3)]"
                          style={{
                            width: `${Math.max(5, Math.min(100, progresoCompresion?.porcentaje ?? 10))}%`,
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {progresoCompresion?.paginaActual && progresoCompresion?.totalPaginas
                          ? `Página ${progresoCompresion.paginaActual} de ${progresoCompresion.totalPaginas} · Reduciendo tamaño al mínimo`
                          : "Reduciendo tamaño para que suba pesando lo mínimo posible"}
                      </p>
                      <button
                        type="button"
                        onClick={cancelarCompresion}
                        className="mt-2 px-3 py-1 rounded-lg text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer shadow-2xs active:scale-95"
                      >
                        Cancelar optimización
                      </button>
                    </div>
                  </div>
                ) : isUploading ? (
                  <div className="flex flex-col items-center gap-3 text-slate-800 py-3 w-full max-w-sm mx-auto px-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/90 text-blue-700 flex items-center justify-center shadow-2xs">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                    <div className="text-center w-full space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span className="truncate">Subiendo a la nube de UploadThing...</span>
                        <span className="text-blue-700 font-black shrink-0 ml-2">95%</span>
                      </div>
                      {/* Barra de progreso de subida */}
                      <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden p-0.5">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500 animate-pulse"
                          style={{ width: "95%" }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Guardando copia digital segura en la nube
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center shadow-2xs group-hover:text-[#175E38]">
                      <UploadCloud className="w-6 h-6 text-[#175E38]" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-800">
                        Haz clic para seleccionar el contrato o arrástralo aquí
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        PDF o fotos de las páginas (JPG, PNG) · Compresión automática integrada
                      </p>
                    </div>
                    <span className="mt-1 px-3 py-1 text-[11px] font-semibold text-[#175E38] bg-emerald-50 border border-emerald-200/80 rounded-lg">
                      Explorar archivos
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Banner de error y limpieza en caso de archivo rechazado */}
            {uploadError && (
              <div className="mt-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start justify-between gap-2 shadow-2xs animate-in fade-in duration-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
                <button
                  type="button"
                  onClick={limpiarArchivo}
                  className="text-rose-700 hover:text-rose-900 text-[11px] font-bold underline cursor-pointer shrink-0 ml-2"
                >
                  Limpiar y reintentar
                </button>
              </div>
            )}
          </div>

          {/* Observaciones y Cláusulas Especiales */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Observaciones o Cláusulas Especiales
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Contrato con cláusula de aumento semestral del 5%. Incluye servicio de agua."
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] resize-none transition-all"
            />
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[120px] px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading || isUploading || isCompressing || (!initialData && unidadesDisponibles.length === 0)}
            className="w-full sm:w-auto min-w-[170px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white text-xs sm:text-sm font-bold shadow-[0_2px_8px_rgba(23,94,56,0.3)] border-b-[3px] border-b-[#0e3a23] hover:from-[#145231] hover:to-[#0f3d25] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <span>{isEditing ? "Guardar Cambios" : "Crear y Activar Contrato"}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
