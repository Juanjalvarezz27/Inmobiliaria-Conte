"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileText,
  Download,
} from "lucide-react";

const emptySubscribe = () => () => {};
const useIsMounted = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

export interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  title?: string;
  subtitle?: string;
}

interface ImageViewerContentProps extends ImageViewerModalProps {
  initialIndex: number;
}

// Comprueba si una URL corresponde a un archivo PDF por extensión o ruta
function isPdfUrl(url?: string): boolean {
  if (!url) return false;
  const cleanUrl = url.split("?")[0].toLowerCase();
  return cleanUrl.endsWith(".pdf") || cleanUrl.includes(".pdf");
}

// Comprueba si una URL corresponde a una imagen tradicional por extensión
function isImageUrl(url?: string): boolean {
  if (!url) return false;
  const cleanUrl = url.split("?")[0].toLowerCase();
  return /\.(jpe?g|png|webp|gif|svg|avif|bmp|ico)$/i.test(cleanUrl);
}

function ImageViewerContent({
  onClose,
  images = [],
  initialIndex,
  title,
  subtitle,
}: ImageViewerContentProps) {
  const [activeIndex, setActiveIndex] = useState(
    Math.max(0, Math.min(initialIndex, images.length - 1))
  );

  const currentImg = images[activeIndex] || images[0];
  const tieneMultiples = images.length > 1;

  const [isPdf, setIsPdf] = useState<boolean>(() => isPdfUrl(currentImg));
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Detectar formato del archivo actual (imagen vs PDF, incluyendo endpoints de CDN como UploadThing sin extensión)
  const checkFileType = async (url: string) => {
    if (!url) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    if (isPdfUrl(url)) {
      setIsPdf(true);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    if (isImageUrl(url)) {
      setIsPdf(false);
      setIsLoading(true);
      setHasError(false);
      return;
    }

    // URL sin extensión directa (ej: UploadThing ufs.sh/f/...)
    setIsLoading(true);
    setHasError(false);

    try {
      const res = await fetch(url, { method: "HEAD" });
      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      const contentDisposition = (res.headers.get("content-disposition") || "").toLowerCase();

      if (contentType.includes("application/pdf") || contentDisposition.includes(".pdf")) {
        setIsPdf(true);
        setIsLoading(false);
        setHasError(false);
      } else {
        setIsPdf(false);
      }
    } catch {
      // En caso de fallo de red en HEAD, asumir imagen para que el elemento intente cargarla
      setIsPdf(false);
    }
  };

  useEffect(() => {
    checkFileType(currentImg);
  }, [currentImg]);

  // Manejo de error cuando el elemento <img> no puede decodificar el archivo
  const handleImageError = async () => {
    // Si falló como imagen, verificar rápidamente si en realidad es un PDF (ej: subido sin extensión)
    try {
      const res = await fetch(currentImg, { method: "HEAD" });
      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      const contentDisposition = (res.headers.get("content-disposition") || "").toLowerCase();

      if (contentType.includes("application/pdf") || contentDisposition.includes(".pdf")) {
        setIsPdf(true);
        setIsLoading(false);
        setHasError(false);
        return;
      }
    } catch {
      // Fallo silencioso
    }

    setIsLoading(false);
    setHasError(true);
  };

  // Manejo de teclado (Escape, Flechas) y bloqueo de scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === "ArrowRight") {
        setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [images.length, onClose]);

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex flex-col bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200 select-none p-3 sm:p-5"
      onClick={onClose}
    >
      {/* Barra Superior con Metadatos y Controles */}
      <div
        className="w-full flex items-center justify-between gap-4 z-10 shrink-0 pb-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/10 ${
              isPdf ? "bg-rose-500/15 text-rose-400" : "bg-white/10 text-emerald-400"
            }`}
          >
            {isPdf ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm sm:text-base font-extrabold text-white truncate font-heading">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 truncate font-medium">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Indicador de Archivo */}
          {tieneMultiples && (
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg bg-white/10 text-white text-xs font-bold font-mono border border-white/10">
              {activeIndex + 1} de {images.length}
            </span>
          )}

          {/* Botón Descargar (especialmente útil en PDFs) */}
          <a
            href={currentImg}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 sm:h-10 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-all cursor-pointer border border-white/10 text-xs font-bold"
            title="Descargar archivo comprobante"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Descargar</span>
          </a>

          {/* Enlace a Archivo Original */}
          <a
            href={currentImg}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
            title={isPdf ? "Abrir PDF en pestaña completa" : "Abrir imagen en alta resolución"}
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Botón Cerrar */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 active:scale-95"
            title="Cerrar visor (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Área Central: Visualizador de Imagen o PDF */}
      <div className="flex-1 w-full min-h-0 flex items-center justify-center relative">
        {/* Botón Anterior */}
        {tieneMultiples && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/15 flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer shadow-xl hover:scale-105 active:scale-95"
            aria-label="Archivo anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Renderizado condicional: PDF con iframe vs Imagen tradicional */}
        {isPdf ? (
          <div
            className="w-full max-w-5xl h-[75vh] sm:h-[80vh] flex flex-col bg-slate-900 border border-white/15 rounded-2xl overflow-hidden shadow-2xl relative animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del visor PDF */}
            <div className="px-3.5 py-2.5 sm:px-4 sm:py-2.5 bg-slate-950/90 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/25 text-[11px] font-bold shrink-0">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>Documento PDF</span>
                </span>
                <span className="text-xs text-slate-300 font-medium truncate hidden sm:inline">
                  {title || "Comprobante oficial"}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={currentImg}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/10"
                  title="Descargar comprobante PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Descargar</span>
                </a>
                <a
                  href={currentImg}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-2.5 rounded-lg bg-[#175E38] hover:bg-[#124b2d] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:translate-y-0.5"
                  title="Abrir en pestaña completa del navegador"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir PDF</span>
                </a>
              </div>
            </div>

            {/* Iframe del PDF */}
            <div className="flex-1 w-full h-full relative bg-slate-950">
              <iframe
                src={`${currentImg}#toolbar=1&navpanes=0`}
                className="w-full h-full border-none bg-white"
                title={title || "Comprobante PDF"}
              />
            </div>

            {/* Asistente táctil móvil para navegadores móviles */}
            <div className="sm:hidden px-3 py-2 bg-slate-950/90 border-t border-white/10 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] text-slate-400 truncate">
                ¿Problemas al ver el PDF?
              </span>
              <a
                href={currentImg}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline shrink-0"
              >
                Abrir en pantalla completa
              </a>
            </div>
          </div>
        ) : (
          <div
            className="relative max-w-full max-h-full flex items-center justify-center p-2 min-h-[200px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Spinner mientras descarga el archivo */}
            {isLoading && !hasError && (
              <div className="flex flex-col items-center justify-center gap-2.5 text-white py-12">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                <span className="text-xs font-semibold text-slate-300">
                  Cargando comprobante...
                </span>
              </div>
            )}

            {/* Fallback amigable si el recurso falla */}
            {hasError && (
              <div className="flex flex-col items-center justify-center p-6 bg-slate-900/90 border border-slate-700/80 rounded-2xl max-w-md text-center space-y-3.5 shadow-2xl animate-in fade-in duration-200">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white font-heading">
                    No se pudo renderizar la vista previa directa
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    El comprobante está alojado de forma segura en los servidores de almacenamiento. Puedes abrirlo directamente en alta resolución.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setHasError(false);
                      setIsLoading(true);
                      checkFileType(currentImg);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reintentar</span>
                  </button>
                  <a
                    href={currentImg}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#175E38] hover:bg-[#124b2d] text-white transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver Comprobante</span>
                  </a>
                </div>
              </div>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={currentImg}
              src={currentImg}
              alt={title ? `${title} - Foto ${activeIndex + 1}` : `Fotografía ${activeIndex + 1}`}
              onLoad={() => setIsLoading(false)}
              onError={handleImageError}
              className={`max-w-full max-h-[74vh] sm:max-h-[78vh] object-contain rounded-2xl shadow-2xl transition-all duration-300 border border-white/10 ${
                isLoading || hasError ? "hidden" : "block animate-in fade-in duration-200"
              }`}
            />

            {/* Badge móvil de número de foto */}
            {tieneMultiples && !isLoading && !hasError && (
              <div className="sm:hidden absolute bottom-4 right-4 bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-md border border-white/20">
                {activeIndex + 1} / {images.length}
              </div>
            )}
          </div>
        )}

        {/* Botón Siguiente */}
        {tieneMultiples && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/15 flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer shadow-xl hover:scale-105 active:scale-95"
            aria-label="Archivo siguiente"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Tira Inferior de Miniaturas (si hay más de 1 imagen o archivo) */}
      {tieneMultiples && (
        <div
          className="w-full flex items-center justify-center gap-2 overflow-x-auto pt-3 pb-1 z-10 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, idx) => {
            const esThumbPdf = isPdfUrl(img) || (idx === activeIndex && isPdf);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`relative w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                  activeIndex === idx
                    ? "border-[#175E38] ring-2 ring-[#175E38]/50 scale-105 shadow-lg"
                    : "border-white/20 opacity-40 hover:opacity-100 hover:border-white/50"
                }`}
              >
                {esThumbPdf ? (
                  <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center gap-0.5 text-rose-400">
                    <FileText className="w-4 h-4" />
                    <span className="text-[9px] font-bold uppercase tracking-wider font-mono">
                      PDF
                    </span>
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={img}
                    alt={`Miniatura ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>,
    document.body
  );
}

export function ImageViewerModal({
  isOpen,
  onClose,
  images = [],
  initialIndex = 0,
  title,
  subtitle,
}: ImageViewerModalProps) {
  const mounted = useIsMounted();

  if (!isOpen || !mounted || images.length === 0) return null;

  return (
    <ImageViewerContent
      key={`${title}-${initialIndex}`}
      isOpen={isOpen}
      onClose={onClose}
      images={images}
      initialIndex={initialIndex}
      title={title}
      subtitle={subtitle}
    />
  );
}
