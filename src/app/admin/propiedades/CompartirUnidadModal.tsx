"use client";

import React, { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Image as ImageIcon,
  Loader2,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { SmartImage } from "@/components/ui/smart-image";
import { WhatsAppIcon, TIPO_UNIDAD_LABEL, formatCurrency } from "./constants";
import {
  copiarImagenAlPortapapeles,
  descargarBlobArchivo,
  descargarBlobFoto,
  generarFlyerUnidadPng,
  generarMensajeFichaUnidad,
  prepararFotosUnidadParaCompartir,
  soportaCompartirArchivos,
  soportaCopiarImagenPortapapeles,
} from "./compartir-unidad";
import type { UnidadConPropiedad } from "./types";

interface CompartirUnidadModalProps {
  isOpen: boolean;
  onClose: () => void;
  unidad: UnidadConPropiedad | null;
  direccionPropiedad?: string | null;
  fotosPrecargadas?: File[];
}

interface CompartirUnidadContentProps {
  onClose: () => void;
  unidad: UnidadConPropiedad;
  direccionPropiedad?: string | null;
  fotosPrecargadas?: File[];
}

function CompartirUnidadModalContent({
  onClose,
  unidad,
  direccionPropiedad,
  fotosPrecargadas,
}: CompartirUnidadContentProps) {
  const [mensaje, setMensaje] = useState(() =>
    generarMensajeFichaUnidad(unidad, direccionPropiedad)
  );
  const [fotosListas, setFotosListas] = useState<File[]>(() => fotosPrecargadas ?? []);
  const [cargandoFotos, setCargandoFotos] = useState(
    () => !(fotosPrecargadas && fotosPrecargadas.length > 0) && (unidad.imagenes?.length ?? 0) > 0
  );
  const [generandoFlyer, setGenerandoFlyer] = useState(false);
  const [compartiendoNativo, setCompartiendoNativo] = useState(false);
  const [abriendoWhatsApp, setAbriendoWhatsApp] = useState(false);
  const [copiandoFoto, setCopiandoFoto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [copiadoFoto, setCopiadoFoto] = useState(false);

  // Descarga y convierte fotos directamente desde CDN si aún no están precargadas
  useEffect(() => {
    if ((fotosPrecargadas && fotosPrecargadas.length > 0) || !unidad.imagenes?.length) {
      return;
    }

    let cancelled = false;
    prepararFotosUnidadParaCompartir(unidad.imagenes, unidad.codigo)
      .then((files) => {
        if (!cancelled) setFotosListas(files);
      })
      .finally(() => {
        if (!cancelled) setCargandoFotos(false);
      });

    return () => {
      cancelled = true;
    };
  }, [unidad.id, unidad.imagenes, unidad.codigo, fotosPrecargadas]);

  const tieneImagenes = (unidad.imagenes?.length ?? 0) > 0;
  const esMovil =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const puedeCompartirNativo = esMovil && soportaCompartirArchivos(fotosListas);
  const puedeCopiarImagen = soportaCopiarImagenPortapapeles();
  const mostrarWebShareMovil =
    esMovil && (puedeCompartirNativo || (cargandoFotos && tieneImagenes));
  const urlWhatsApp = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

  const obtenerFotoPrincipal = async (): Promise<Blob | null> => {
    if (fotosListas[0]) return fotosListas[0];
    if (!unidad.imagenes?.[0]) return null;
    return await descargarBlobFoto(unidad.imagenes[0]);
  };

  const handleCompartirConFotos = async () => {
    if (!puedeCompartirNativo) return;
    setCompartiendoNativo(true);
    try {
      await navigator.share({
        title: `${TIPO_UNIDAD_LABEL[unidad.tipo] || "Espacio"} ${unidad.codigo}`,
        text: mensaje,
        files: fotosListas,
      });
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        toast.info("Usa WhatsApp Web o descarga las fotos para adjuntarlas manualmente.");
      }
    } finally {
      setCompartiendoNativo(false);
    }
  };

  // En escritorio copia la foto al portapapeles antes de abrir WhatsApp con el texto precargado
  const handleAbrirWhatsAppDesktop = async () => {
    setAbriendoWhatsApp(true);
    let fotoCopiada = false;
    try {
      if (puedeCopiarImagen && tieneImagenes) {
        fotoCopiada = await copiarImagenAlPortapapeles(obtenerFotoPrincipal);
      }
      const ventana = window.open(urlWhatsApp, "_blank", "noopener,noreferrer");
      if (!ventana) {
        toast.info(
          fotoCopiada
            ? "Imagen copiada. Permite las ventanas emergentes del navegador para abrir WhatsApp."
            : "Permite las ventanas emergentes del navegador para abrir WhatsApp."
        );
      } else if (fotoCopiada) {
        toast.success("Imagen copiada y texto listo. En WhatsApp presiona Ctrl+V para adjuntar la foto.");
      }
    } finally {
      setAbriendoWhatsApp(false);
    }
  };

  const handleCopiarMensaje = async () => {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      toast.success("Ficha copiada al portapapeles.");
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("No se pudo copiar el texto.");
    }
  };

  const handleCopiarFoto = async () => {
    if (!puedeCopiarImagen) {
      await handleDescargarFotos();
      return;
    }

    setCopiandoFoto(true);
    try {
      const ok = await copiarImagenAlPortapapeles(obtenerFotoPrincipal);
      if (ok) {
        setCopiadoFoto(true);
        toast.success("Foto copiada. Pégala con Ctrl+V en el chat de WhatsApp.");
        window.setTimeout(() => setCopiadoFoto(false), 2000);
      } else {
        toast.info("Tu navegador bloqueó copiar imágenes; descargando archivo...");
        await handleDescargarFotos();
      }
    } finally {
      setCopiandoFoto(false);
    }
  };

  const handleDescargarFotos = async () => {
    if (fotosListas.length > 0) {
      fotosListas.forEach((f, idx) => {
        window.setTimeout(() => descargarBlobArchivo(f, f.name), idx * 150);
      });
      toast.success(
        fotosListas.length === 1 ? "Foto descargada." : `${fotosListas.length} fotos descargadas.`
      );
      return;
    }

    if (!unidad.imagenes?.length) return;
    setCargandoFotos(true);
    try {
      const files = await prepararFotosUnidadParaCompartir(unidad.imagenes, unidad.codigo);
      setFotosListas(files);
      files.forEach((f, idx) => {
        window.setTimeout(() => descargarBlobArchivo(f, f.name), idx * 150);
      });
      if (files.length > 0) {
        toast.success("Foto(s) descargada(s).");
      } else {
        toast.error("No se pudieron descargar las imágenes.");
      }
    } finally {
      setCargandoFotos(false);
    }
  };

  const handleDescargarFicha = async () => {
    setGenerandoFlyer(true);
    try {
      const flyer = await generarFlyerUnidadPng(
        unidad,
        direccionPropiedad,
        fotosListas[0] ?? null
      );
      if (!flyer) {
        toast.error("No se pudo generar la ficha visual.");
        return;
      }

      if (esMovil && soportaCompartirArchivos([flyer])) {
        try {
          await navigator.share({
            title: `Ficha ${unidad.codigo}`,
            text: mensaje,
            files: [flyer],
          });
          return;
        } catch (err: unknown) {
          if ((err as Error)?.name === "AbortError") return;
        }
      }

      descargarBlobArchivo(flyer, flyer.name);
      toast.success("Ficha visual descargada (PNG).");
    } finally {
      setGenerandoFlyer(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Compartir Ficha del Espacio"
      subtitle={`${unidad.codigo} · ${unidad.propiedad.nombre}`}
      icon={Share2}
      headerVariant="green"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Resumen visual del espacio */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
          {unidad.imagenes && unidad.imagenes.length > 0 ? (
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200">
              <SmartImage
                src={unidad.imagenes[0]}
                alt={`Foto de ${unidad.codigo}`}
                fill
                sizes="80px"
                className="object-cover"
              />
              {unidad.imagenes.length > 1 && (
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-white text-[10px] font-bold">
                  +{unidad.imagenes.length - 1}
                </span>
              )}
            </div>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
              <ImageIcon className="w-6 h-6" />
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm sm:text-base font-black text-slate-900 font-heading">
                {unidad.codigo}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-[#175E38] border border-emerald-200">
                {TIPO_UNIDAD_LABEL[unidad.tipo] || unidad.tipo}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">
              {unidad.propiedad.nombre} · {unidad.propiedad.ciudad}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              {unidad.areaMt2 && (
                <span className="text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {unidad.areaMt2} m²
                </span>
              )}
              {unidad.piso && (
                <span className="text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {unidad.piso}
                </span>
              )}
              <span className="text-[#175E38] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {unidad.precioAlquiler ? `${formatCurrency(unidad.precioAlquiler)}/mes` : "Consultar"}
              </span>
            </div>
          </div>
        </div>

        {/* Botón principal móvil cuando Web Share soporta archivos */}
        {mostrarWebShareMovil && (
          <button
            type="button"
            disabled={cargandoFotos || compartiendoNativo || !puedeCompartirNativo}
            onClick={handleCompartirConFotos}
            className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] text-white font-bold text-xs sm:text-sm shadow-sm border-b-[3px] border-b-[#179948] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {cargandoFotos || compartiendoNativo ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Preparando {unidad.imagenes.length} foto(s)...</span>
              </>
            ) : (
              <>
                <WhatsAppIcon className="w-4 h-4 text-white" />
                <span>
                  Enviar {fotosListas.length}{" "}
                  {fotosListas.length === 1 ? "Foto + Ficha" : "Fotos + Ficha"} por WhatsApp
                </span>
              </>
            )}
          </button>
        )}

        {/* Vista previa editable del mensaje comercial */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="ficha-whatsapp-texto"
              className="text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Mensaje de la ficha (editable)
            </label>
            <button
              type="button"
              onClick={handleCopiarMensaje}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[11px] font-bold text-[#175E38] border border-emerald-200/80 transition-colors cursor-pointer"
            >
              {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiado ? "¡Copiado!" : "Copiar texto"}</span>
            </button>
          </div>
          <textarea
            id="ficha-whatsapp-texto"
            rows={7}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white p-3 text-xs text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#175E38]/25 focus:border-[#175E38] resize-y"
          />
        </div>

        {/* Acciones únicas sin duplicados según plataforma */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {!mostrarWebShareMovil && (
            <button
              type="button"
              disabled={abriendoWhatsApp}
              onClick={handleAbrirWhatsAppDesktop}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#175E38] hover:bg-[#124b2d] text-white text-xs sm:text-sm font-bold shadow-xs transition-all border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 cursor-pointer disabled:opacity-60 ${
                tieneImagenes ? "sm:col-span-2" : ""
              }`}
            >
              {abriendoWhatsApp ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
              )}
              <span>Abrir en WhatsApp</span>
            </button>
          )}

          {tieneImagenes && (
            <button
              type="button"
              disabled={cargandoFotos || copiandoFoto}
              onClick={mostrarWebShareMovil || !puedeCopiarImagen ? handleDescargarFotos : handleCopiarFoto}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
            >
              {cargandoFotos || copiandoFoto ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : copiadoFoto ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : !mostrarWebShareMovil && puedeCopiarImagen ? (
                <Copy className="w-4 h-4 text-slate-600" />
              ) : (
                <Download className="w-4 h-4 text-slate-600" />
              )}
              <span>
                {!mostrarWebShareMovil && puedeCopiarImagen
                  ? copiadoFoto
                    ? "¡Imagen Copiada!"
                    : "Copiar Imagen"
                  : `Descargar ${unidad.imagenes.length === 1 ? "Foto (JPG)" : `Fotos (${Math.min(3, unidad.imagenes.length)})`}`}
              </span>
            </button>
          )}

          <button
            type="button"
            disabled={generandoFlyer}
            onClick={handleDescargarFicha}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-60 ${
              !tieneImagenes && mostrarWebShareMovil ? "sm:col-span-2" : ""
            }`}
          >
            {generandoFlyer ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Descargar Ficha</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Modal de compartición comercial de espacio disponible con montaje limpio por unidad
export function CompartirUnidadModal({
  isOpen,
  onClose,
  unidad,
  direccionPropiedad,
  fotosPrecargadas,
}: CompartirUnidadModalProps) {
  if (!isOpen || !unidad) return null;

  return (
    <CompartirUnidadModalContent
      key={`${unidad.id}-${fotosPrecargadas?.length ?? 0}`}
      onClose={onClose}
      unidad={unidad}
      direccionPropiedad={direccionPropiedad}
      fotosPrecargadas={fotosPrecargadas}
    />
  );
}
