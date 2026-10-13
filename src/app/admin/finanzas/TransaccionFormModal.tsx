"use client";

import React, { useState } from "react";
import {
  Building2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { Select } from "@/components/ui/select";
import {
  TipoTransaccionFinanciera,
  CategoriaTransaccion,
  MetodoPago,
} from "@prisma/client";
import type { TransaccionFinancieraItem, PropiedadFinanzasOpcion } from "./types";
import type { TransaccionInput } from "@/lib/actions/finanzas";
import { METODO_PAGO_CONFIG } from "./constants";

interface TransaccionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaccionAEditar?: TransaccionFinancieraItem | null;
  propiedades: PropiedadFinanzasOpcion[];
  onSubmit: (data: TransaccionInput) => Promise<boolean>;
  isLoading?: boolean;
}

export function TransaccionFormModal({
  isOpen,
  onClose,
  transaccionAEditar,
  propiedades,
  onSubmit,
  isLoading = false,
}: TransaccionFormModalProps) {
  const hoyStr = new Date().toISOString().split("T")[0];

  const [tipo, setTipo] = useState<TipoTransaccionFinanciera>(
    transaccionAEditar?.tipo || TipoTransaccionFinanciera.EGRESO
  );
  const [categoria, setCategoria] = useState<CategoriaTransaccion>(
    transaccionAEditar?.categoria || CategoriaTransaccion.OTRO
  );
  const [concepto, setConcepto] = useState<string>(transaccionAEditar?.concepto || "");
  const [monto, setMonto] = useState<string>(
    transaccionAEditar ? transaccionAEditar.monto.toString() : ""
  );
  const [fecha, setFecha] = useState<string>(
    transaccionAEditar ? transaccionAEditar.fecha.split("T")[0] : hoyStr
  );
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(
    transaccionAEditar?.metodoPago || MetodoPago.EFECTIVO_USD
  );
  const [referencia, setReferencia] = useState<string>(
    transaccionAEditar?.referencia || ""
  );
  const [beneficiario, setBeneficiario] = useState<string>(
    transaccionAEditar?.beneficiario || ""
  );
  const [propiedadId, setPropiedadId] = useState<string>(
    transaccionAEditar?.propiedadId || "GENERAL"
  );
  const [comprobanteUrl, setComprobanteUrl] = useState<string>(
    transaccionAEditar?.comprobanteUrl || ""
  );
  const [notas, setNotas] = useState<string>(transaccionAEditar?.notas || "");

  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Sincronizar formulario durante render al abrir modal o cambiar transacción
  const [prevTarget, setPrevTarget] = useState<{ id?: string; isOpen: boolean }>({
    id: transaccionAEditar?.id,
    isOpen,
  });

  if (prevTarget.id !== transaccionAEditar?.id || prevTarget.isOpen !== isOpen) {
    setPrevTarget({ id: transaccionAEditar?.id, isOpen });
    if (transaccionAEditar) {
      setTipo(transaccionAEditar.tipo);
      setCategoria(transaccionAEditar.categoria);
      setConcepto(transaccionAEditar.concepto);
      setMonto(transaccionAEditar.monto.toString());
      setFecha(transaccionAEditar.fecha.split("T")[0]);
      setMetodoPago(transaccionAEditar.metodoPago);
      setReferencia(transaccionAEditar.referencia || "");
      setBeneficiario(transaccionAEditar.beneficiario || "");
      setPropiedadId(transaccionAEditar.propiedadId || "GENERAL");
      setComprobanteUrl(transaccionAEditar.comprobanteUrl || "");
      setNotas(transaccionAEditar.notas || "");
    } else {
      setTipo(TipoTransaccionFinanciera.EGRESO);
      setCategoria(CategoriaTransaccion.OTRO);
      setConcepto("");
      setMonto("");
      setFecha(hoyStr);
      setMetodoPago(MetodoPago.EFECTIVO_USD);
      setReferencia("");
      setBeneficiario("");
      setPropiedadId("GENERAL");
      setComprobanteUrl("");
      setNotas("");
    }
    setErrorLocal(null);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const montoNum = parseFloat(monto);
    if (!concepto.trim()) {
      setErrorLocal("Indica el concepto o descripción del movimiento.");
      return;
    }
    if (isNaN(montoNum) || montoNum <= 0) {
      setErrorLocal("El monto debe ser un número mayor a 0.");
      return;
    }
    if (!fecha) {
      setErrorLocal("Selecciona la fecha del movimiento.");
      return;
    }

    const inputData: TransaccionInput = {
      tipo,
      categoria,
      concepto: concepto.trim(),
      monto: montoNum,
      fecha,
      metodoPago,
      referencia: referencia.trim() || null,
      beneficiario: beneficiario.trim() || null,
      comprobanteUrl: comprobanteUrl || null,
      propiedadId: propiedadId === "GENERAL" ? null : propiedadId,
      unidadId: null,
      notas: notas.trim() || null,
    };

    const exito = await onSubmit(inputData);
    if (exito) {
      onClose();
    }
  };

  // Opciones de métodos de pago
  const opcionesMetodoPago = Object.entries(METODO_PAGO_CONFIG).map(
    ([key, config]) => ({
      value: key,
      label: config.label,
    })
  );

  // Opciones de propiedades con formato limpio para el selector
  const opcionesPropiedades = [
    {
      value: "GENERAL",
      label: "Inmobiliaria General",
      sublabel: "Gasto Corporativo",
      icon: Building2,
    },
    ...propiedades.map((p) => ({
      value: p.id,
      label: p.nombre,
      sublabel: p.ciudad || undefined,
      icon: Building2,
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        transaccionAEditar
          ? "Editar Movimiento Financiero"
          : "Registrar Movimiento Financiero"
      }
      headerVariant="green"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
        {/* Toggle de Tipo: Egreso vs Ingreso Extra */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Tipo de Movimiento
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setTipo(TipoTransaccionFinanciera.EGRESO)}
              className={`h-10 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tipo === TipoTransaccionFinanciera.EGRESO
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Gasto Operativo (Egreso)
            </button>
            <button
              type="button"
              onClick={() => setTipo(TipoTransaccionFinanciera.INGRESO)}
              className={`h-10 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tipo === TipoTransaccionFinanciera.INGRESO
                  ? "bg-[#175E38] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Ingreso Extraordinario
            </button>
          </div>
        </div>

        {/* Sección 1: Datos Principales */}
        <div className="space-y-4">
          <FormSectionHeader
            step={1}
            title="Datos Principales del Movimiento"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Concepto / Descripción */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Concepto o Descripción <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  placeholder={
                    tipo === TipoTransaccionFinanciera.EGRESO
                      ? "Ej: Pago mensual Corpoelec - CC Las Américas"
                      : "Ej: Alquiler de plazoleta para feria de fin de semana"
                  }
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
                />
              </div>
            </div>

            {/* Monto en USD */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Monto ($ USD) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full h-11 pl-8 pr-3.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
                />
              </div>
            </div>

            {/* Fecha del Movimiento */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Fecha del Movimiento <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white cursor-pointer"
                />
              </div>
            </div>

            {/* Método de Pago */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Método de Pago <span className="text-rose-500">*</span>
              </label>
              <Select
                value={metodoPago}
                onChange={(val) => setMetodoPago(val as MetodoPago)}
                options={opcionesMetodoPago}
                placeholder="Seleccionar método"
              />
            </div>
          </div>
        </div>

        {/* Sección 2: Imputación y Soporte */}
        <div className="space-y-4">
          <FormSectionHeader
            step={2}
            title="Centro de Costos y Referencia"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Propiedad / Centro de costo */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Inmueble / Centro de Costo Asignado
              </label>
              <Select
                value={propiedadId}
                onChange={(val) => setPropiedadId(val)}
                options={opcionesPropiedades}
                placeholder="Seleccionar inmueble"
                searchable={true}
                searchPlaceholder="Buscar por nombre o ciudad..."
                pageSize={10}
                icon={<Building2 className="w-4 h-4 text-slate-400" />}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Asigna el gasto a una propiedad para calcular su rentabilidad individual en el Cierre de Mes.
              </p>
            </div>

            {/* Beneficiario / Proveedor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {tipo === TipoTransaccionFinanciera.EGRESO
                  ? "Proveedor o Beneficiario"
                  : "Cliente o Pagador"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={beneficiario}
                  onChange={(e) => setBeneficiario(e.target.value)}
                  placeholder={
                    tipo === TipoTransaccionFinanciera.EGRESO
                      ? "Ej: Corpoelec, Ferretería El Ancla"
                      : "Ej: Juan Pérez, Eventos C.A."
                  }
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
                />
              </div>
            </div>

            {/* Referencia o Nro de Factura */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nro. de Factura o Referencia
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ej: FACT-00941 / REF-98124"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
                />
              </div>
            </div>



            {/* Observaciones o Notas */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Observaciones o Notas
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                placeholder="Detalles adicionales sobre este movimiento..."
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
              />
            </div>
          </div>
        </div>

        {/* Error local si existe */}
        {errorLocal && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorLocal}</span>
          </div>
        )}

        {/* Botones de Acción Inferiores */}
        <div className="pt-2 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[120px] h-11 px-4 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer flex items-center justify-center"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[180px] h-11 px-5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] hover:brightness-105 border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 transition-all shadow-[0_2px_8px_rgba(23,94,56,0.25)] flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>
                {transaccionAEditar ? "Actualizar Movimiento" : "Guardar Movimiento"}
              </span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
