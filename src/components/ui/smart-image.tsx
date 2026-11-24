"use client";

import React, { useEffect, useRef, useState } from "react";
import Image, { type ImageProps } from "next/image";
import { ImageOff } from "lucide-react";
import { Skeleton } from "./skeleton";

// Límite de imágenes descargando o decodificando en paralelo para evitar picos de memoria
const MAX_CONCURRENT_IMAGE_LOADS = 3;
const SLOT_TIMEOUT_MS = 10000;

let activeImageLoads = 0;
const pendingImageQueue: Array<() => void> = [];

function enqueueImageSlot(onGrant: () => void): () => void {
  let cancelled = false;
  let granted = false;

  const grant = () => {
    if (cancelled || granted) return;
    granted = true;
    activeImageLoads += 1;
    onGrant();
  };

  if (activeImageLoads < MAX_CONCURRENT_IMAGE_LOADS) {
    Promise.resolve().then(grant);
  } else {
    pendingImageQueue.push(grant);
  }

  return () => {
    if (cancelled) return;
    cancelled = true;
    if (!granted) {
      const idx = pendingImageQueue.indexOf(grant);
      if (idx !== -1) pendingImageQueue.splice(idx, 1);
      return;
    }
    activeImageLoads = Math.max(0, activeImageLoads - 1);
    while (activeImageLoads < MAX_CONCURRENT_IMAGE_LOADS && pendingImageQueue.length > 0) {
      const next = pendingImageQueue.shift();
      if (next) next();
    }
  };
}

export interface SmartImageProps extends Omit<ImageProps, "src" | "onLoad" | "onError"> {
  src: string;
  progressive?: boolean;
  containerClassName?: string;
  fallbackLabel?: string;
}

function SmartImageInner({
  src,
  alt,
  progressive = false,
  containerClassName = "",
  className = "",
  fallbackLabel = "Sin vista previa",
  loading,
  decoding = "async",
  fetchPriority,
  unoptimized = true,
  ...rest
}: SmartImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const releaseSlotRef = useRef<(() => void) | null>(null);

  const [isInView, setIsInView] = useState(!progressive);
  const [canLoad, setCanLoad] = useState(!progressive);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Observa visibilidad cercana al viewport antes de encolar la descarga
  useEffect(() => {
    if (!progressive || isInView) return;
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      Promise.resolve().then(() => setIsInView(true));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [progressive, isInView]);

  // Solicita turno en la cola de concurrencia una vez visible
  useEffect(() => {
    if (!progressive || !isInView) return;

    const release = enqueueImageSlot(() => {
      setCanLoad(true);
    });
    releaseSlotRef.current = release;

    const timeoutId = window.setTimeout(() => {
      releaseSlotRef.current?.();
      releaseSlotRef.current = null;
    }, SLOT_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
      releaseSlotRef.current?.();
      releaseSlotRef.current = null;
    };
  }, [progressive, isInView]);

  const liberarTurno = () => {
    if (releaseSlotRef.current) {
      releaseSlotRef.current();
      releaseSlotRef.current = null;
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full h-full ${containerClassName}`}>
      {!isLoaded && !hasError && (
        <Skeleton className="absolute inset-0 w-full h-full rounded-none bg-slate-200/75" />
      )}

      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-100 text-slate-400 p-2 text-center">
          <ImageOff className="w-5 h-5 stroke-1.5" />
          <span className="text-[10px] font-medium">{fallbackLabel}</span>
        </div>
      ) : canLoad ? (
        <Image
          src={src}
          alt={alt}
          loading={loading ?? (progressive ? "lazy" : undefined)}
          decoding={decoding}
          fetchPriority={fetchPriority ?? (progressive ? "low" : undefined)}
          unoptimized={unoptimized}
          onLoad={() => {
            setIsLoaded(true);
            liberarTurno();
          }}
          onError={() => {
            setHasError(true);
            liberarTurno();
          }}
          className={`${className} transition-opacity duration-200 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          {...rest}
        />
      ) : null}
    </div>
  );
}

// Imagen con carga progresiva por viewport, cola de concurrencia y descarga directa desde CDN
export function SmartImage(props: SmartImageProps) {
  return <SmartImageInner key={props.src} {...props} />;
}
