"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Loader2,
  Pencil,
  RefreshCw,
  Coins,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  TipoTransaccionFinanciera,
  CategoriaTransaccion,
  MetodoPago,
  MonedaTransaccion,
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

  // Moneda y montos
  const [monedaOriginal, setMonedaOriginal] = useState<MonedaTransaccion>(
    transaccionAEditar ? (transaccionAEditar.monedaOriginal || MonedaTransaccion.USD) : MonedaTransaccion.VES
  );
  const [montoUsd, setMontoUsd] = useState<string>(
    transaccionAEditar ? transaccionAEditar.monto.toString() : ""
  );
  const [montoBs, setMontoBs] = useState<string>(
    transaccionAEditar?.montoOriginal && transaccionAEditar.monedaOriginal === MonedaTransaccion.VES
      ? transaccionAEditar.montoOriginal.toString()
      : ""
  );

  // Tasa BCV
  const [tasaBcv, setTasaBcv] = useState<string>(
    transaccionAEditar?.tasaBcv ? transaccionAEditar.tasaBcv.toString() : "899.27"
  );
  const [tasaBcvOficial, setTasaBcvOficial] = useState<number | null>(null);
  const [cargandoTasa, setCargandoTasa] = useState(false);
  const [editandoTasaManual, setEditandoTasaManual] = useState(false);
  const [esTasaFallback, setEsTasaFallback] = useState(false);

  const [fecha, setFecha] = useState<string>(
    transaccionAEditar ? transaccionAEditar.fecha.split("T")[0] : hoyStr
  );
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(
    transaccionAEditar?.metodoPago || MetodoPago.TRANSFERENCIA
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

  // Consultar la tasa BCV oficial (del día o histórica según fecha)
  const consultarTasaBcv = async (fechaParam?: string) => {
    setCargandoTasa(true);
    try {
      const fechaAUsar = fechaParam ?? fecha;
      const url = fechaAUsar ? `/api/bcv?fecha=${fechaAUsar}` : "/api/bcv";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data?.tasa) {
        setTasaBcvOficial(json.data.tasa);
        setEsTasaFallback(!!json.data.esFallback);
        if (!transaccionAEditar?.tasaBcv || fechaParam) {
          setTasaBcv(json.data.tasa.toString());
        }
      }
    } catch (e) {
      console.warn("No se pudo cargar la tasa BCV:", e);
    } finally {
      setCargandoTasa(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      consultarTasaBcv(fecha);
    }
  }, [isOpen]);

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
      setMonedaOriginal(transaccionAEditar.monedaOriginal || MonedaTransaccion.USD);
      setMontoUsd(transaccionAEditar.monto.toString());
      setMontoBs(
        transaccionAEditar.montoOriginal && transaccionAEditar.monedaOriginal === MonedaTransaccion.VES
          ? transaccionAEditar.montoOriginal.toString()
          : ""
      );
      if (transaccionAEditar.tasaBcv) {
        setTasaBcv(transaccionAEditar.tasaBcv.toString());
      }
      setFecha(transaccionAEditar.fecha.split("T")[0]);
      setMetodoPago(transaccionAEditar.metodoPago);
      setReferencia(transaccionAEditar.referencia || "");
      setBeneficiario(transaccionAEditar.beneficiario || "");
      setPropiedadId(transaccionAEditar.propiedadId || "GENERAL");
      setComprobanteUrl(transaccionAEditar.comprobanteUrl || "");
      setNotas(transaccionAEditar.notas || "");
      setEditandoTasaManual(false);
    } else {
      setTipo(TipoTransaccionFinanciera.EGRESO);
      setCategoria(CategoriaTransaccion.OTRO);
      setConcepto("");
      setMonedaOriginal(MonedaTransaccion.VES);
      setMontoUsd("");
      setMontoBs("");
      setFecha(hoyStr);
      setMetodoPago(MetodoPago.TRANSFERENCIA);
      setReferencia("");
      setBeneficiario("");
      setPropiedadId("GENERAL");
      setComprobanteUrl("");
      setNotas("");
      setEditandoTasaManual(false);
    }
  }

  // Cálculo en vivo del contravalor en USD cuando se usa moneda VES
  const tasaNum = parseFloat(tasaBcv) || 1;
  const montoBsNum = parseFloat(montoBs) || 0;
  const equivalenteUsdEnBs = montoBsNum > 0 && tasaNum > 0 ? (montoBsNum / tasaNum).toFixed(2) : "0.00";

  // Manejo de cambio de moneda (actualiza métodos de pago sugeridos)
  const handleCambioMoneda = (nuevaMoneda: MonedaTransaccion) => {
    setMonedaOriginal(nuevaMoneda);
    if (nuevaMoneda === MonedaTransaccion.VES) {
      if (metodoPago === MetodoPago.EFECTIVO_USD || metodoPago === MetodoPago.ZELLE) {
        setMetodoPago(MetodoPago.TRANSFERENCIA);
      }
    } else {
      if (metodoPago === MetodoPago.PAGO_MOVIL) {
        setMetodoPago(MetodoPago.EFECTIVO_USD);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!concepto.trim()) {
      toast.error("Indica el concepto o descripción del movimiento.");
      return;
    }

    let montoFinal = 0;
    let montoOriginalFinal: number | null = null;
    let tasaBcvFinal: number | null = null;

    if (monedaOriginal === MonedaTransaccion.VES) {
      const bsNum = parseFloat(montoBs);
      const tasa = parseFloat(tasaBcv);
      if (isNaN(bsNum) || bsNum <= 0) {
        toast.error("El monto en Bolívares debe ser mayor a 0.");
        return;
      }
      if (isNaN(tasa) || tasa <= 0) {
        toast.error("La tasa BCV debe ser un número válido mayor a 0.");
        return;
      }
      montoFinal = Number((bsNum / tasa).toFixed(2));
      montoOriginalFinal = Number(bsNum.toFixed(2));
      tasaBcvFinal = Number(tasa.toFixed(4));
    } else {
      const usdNum = parseFloat(montoUsd);
      if (isNaN(usdNum) || usdNum <= 0) {
        toast.error("El monto en Dólares debe ser mayor a 0.");
        return;
      }
      montoFinal = Number(usdNum.toFixed(2));
      montoOriginalFinal = montoFinal;
      tasaBcvFinal = tasaBcvOficial || (parseFloat(tasaBcv) > 0 ? parseFloat(tasaBcv) : null);
    }

    if (!fecha) {
      toast.error("Selecciona la fecha del movimiento.");
      return;
    }

    const inputData: TransaccionInput = {
      tipo,
      categoria,
      concepto: concepto.trim(),
      monto: montoFinal,
      monedaOriginal,
      montoOriginal: montoOriginalFinal,
      tasaBcv: tasaBcvFinal,
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

  // Opciones de métodos de pago filtradas por moneda
  const opcionesMetodoPago = Object.entries(METODO_PAGO_CONFIG)
    .filter(([key]) => {
      if (monedaOriginal === MonedaTransaccion.VES) {
        return key === MetodoPago.TRANSFERENCIA || key === MetodoPago.PAGO_MOVIL || key === MetodoPago.OTRO;
      }
      return key === MetodoPago.EFECTIVO_USD || key === MetodoPago.ZELLE || key === MetodoPago.TRANSFERENCIA || key === MetodoPago.OTRO;
    })
    .map(([key, config]) => ({
      value: key,
      label: config.label,
    }));

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
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
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

        {/* Sección 1: Datos Principales y Multimoneda */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Paso 1</p>
            <h4 className="text-sm font-bold text-slate-800 mt-0.5">Importe y Moneda de Operación</h4>
          </div>

          {/* Selector 50/50 de Moneda (Bolívares por defecto) */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              Moneda de la Transacción <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleCambioMoneda(MonedaTransaccion.VES)}
                className={`h-10 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  monedaOriginal === MonedaTransaccion.VES
                    ? "bg-[#175E38] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Bolívares (Bs. VES)</span>
              </button>
              <button
                type="button"
                onClick={() => handleCambioMoneda(MonedaTransaccion.USD)}
                className={`h-10 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  monedaOriginal === MonedaTransaccion.USD
                    ? "bg-[#1C2539] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Dólares ($ USD)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Concepto / Descripción */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
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

            {/* Caso 1: Moneda en USD */}
            {monedaOriginal === MonedaTransaccion.USD ? (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
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
                    value={montoUsd}
                    onChange={(e) => setMontoUsd(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full h-11 pl-8 pr-3.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
                  />
                </div>
              </div>
            ) : (
              /* Caso 2: Moneda en VES (Bolívares) */
              <>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                    Monto en Bolívares (Bs.) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs font-mono">
                      Bs.
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={montoBs}
                      onChange={(e) => setMontoBs(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
                    />
                  </div>
                </div>

                {/* Tasa BCV aplicada con opción de edición */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Tasa Oficial BCV <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditandoTasaManual(!editandoTasaManual)}
                      className="text-[11px] font-bold text-[#175E38] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>{editandoTasaManual ? "Automática" : "Ajustar Tasa"}</span>
                    </button>
                  </div>

                  {editandoTasaManual ? (
                    <div className="relative">
                      <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        value={tasaBcv}
                        onChange={(e) => setTasaBcv(e.target.value)}
                        placeholder="Tasa en Bs/USD"
                        required
                        className="w-full h-11 px-3.5 rounded-xl border border-amber-300 bg-amber-50/50 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
                      />
                    </div>
                  ) : (
                    <div className="h-11 px-3.5 bg-emerald-50/50 border border-emerald-200/70 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {cargandoTasa ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#175E38]" />
                        ) : (
                          <Coins className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
                        )}
                        <span className="font-mono font-bold text-slate-900 truncate">
                          {parseFloat(tasaBcv).toLocaleString("es-VE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}{" "}
                          Bs/USD
                        </span>
                        {esTasaFallback && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold shrink-0">
                            Caché
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => consultarTasaBcv(fecha)}
                        disabled={cargandoTasa}
                        title="Consultar tasa BCV de esta fecha"
                        className="text-slate-400 hover:text-[#175E38] transition-colors p-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${cargandoTasa ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Banner de Contravalor en USD en vivo */}
                <div className="sm:col-span-2 p-3 bg-slate-50/50 border border-slate-200/70 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Equivalente Registrado en Balance:</span>
                  </span>
                  <span className="font-heading font-black text-slate-900 text-sm sm:text-base">
                    $ {equivalenteUsdEnBs} USD
                  </span>
                </div>
              </>
            )}

            {/* Fecha del Movimiento */}
            <div className={monedaOriginal === MonedaTransaccion.VES ? "sm:col-span-1" : ""}>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Fecha del Movimiento <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => {
                    const nuevaFecha = e.target.value;
                    setFecha(nuevaFecha);
                    if (nuevaFecha && !editandoTasaManual) {
                      consultarTasaBcv(nuevaFecha);
                    }
                  }}
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white cursor-pointer"
                />
              </div>
            </div>

            {/* Método de Pago */}
            <div className={monedaOriginal === MonedaTransaccion.VES ? "sm:col-span-1" : "sm:col-span-2"}>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
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
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Paso 2</p>
            <h4 className="text-sm font-bold text-slate-800 mt-0.5">Centro de Costos y Referencia</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Propiedad / Centro de costo */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
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
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
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
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
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
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
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

        {/* Botones de Acción Inferiores */}
        <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto sm:min-w-[120px] px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto sm:min-w-[180px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white text-xs sm:text-sm font-bold shadow-[0_2px_8px_rgba(23,94,56,0.3)] border-b-[3px] border-b-[#0e3a23] hover:from-[#145231] hover:to-[#0f3d25] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
