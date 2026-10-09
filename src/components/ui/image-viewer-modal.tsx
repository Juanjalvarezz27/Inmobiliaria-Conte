"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ExternalLink, Image as ImageIcon } from "lucide-react";

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

  const currentImg = images[activeIndex] || images[0];
  const tieneMultiples = images.length > 1;

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
          <div className="w-8 h-8 rounded-lg bg-white/10 text-emerald-400 flex items-center justify-center shrink-0 border border-white/10">
            <ImageIcon className="w-4 h-4" />
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
          {/* Indicador de Foto */}
          {tieneMultiples && (
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg bg-white/10 text-white text-xs font-bold font-mono border border-white/10">
              {activeIndex + 1} de {images.length}
            </span>
          )}

          {/* Enlace a Imagen Original */}
          <a
            href={currentImg}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
            title="Abrir imagen en alta resolución"
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

      {/* Área Central: Visualizador de Imagen */}
      <div className="flex-1 w-full min-h-0 flex items-center justify-center relative">
        {/* Botón Anterior */}
        {tieneMultiples && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/15 flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer shadow-xl hover:scale-105 active:scale-95"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Imagen Ampliada */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center p-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={currentImg}
            src={currentImg}
            alt={title ? `${title} - Foto ${activeIndex + 1}` : `Fotografía ${activeIndex + 1}`}
            className="max-w-full max-h-[72vh] sm:max-h-[76vh] object-contain rounded-2xl shadow-2xl transition-all duration-300 border border-white/10"
          />

          {/* Badge móvil de número de foto */}
          {tieneMultiples && (
            <div className="sm:hidden absolute bottom-4 right-4 bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-md border border-white/20">
              {activeIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Botón Siguiente */}
        {tieneMultiples && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/15 flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer shadow-xl hover:scale-105 active:scale-95"
            aria-label="Foto siguiente"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Tira Inferior de Miniaturas (si hay más de 1 imagen) */}
      {tieneMultiples && (
        <div
          className="w-full flex items-center justify-center gap-2 overflow-x-auto pt-3 pb-1 z-10 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, idx) => (
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={`Miniatura ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
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
