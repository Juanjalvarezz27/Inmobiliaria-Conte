import {
  generateUploadButton,
  generateUploadDropzone,
  generateReactHelpers,
} from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import type { PropiedadesFileRouter } from "@/app/api/uploadthing/propiedades/core";
import type { OperacionesFileRouter } from "@/app/api/uploadthing/operaciones/core";

// Componentes para el router principal (legacy/fallback)
export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();

// Componentes y hooks para el bucket de propiedades (Catálogo oficial)
export const PropiedadesUploadButton = generateUploadButton<PropiedadesFileRouter>({
  url: "/api/uploadthing/propiedades",
});
export const PropiedadesUploadDropzone = generateUploadDropzone<PropiedadesFileRouter>({
  url: "/api/uploadthing/propiedades",
});
export const { useUploadThing: usePropiedadesUploadThing } = generateReactHelpers<PropiedadesFileRouter>({
  url: "/api/uploadthing/propiedades",
});

// Componentes y hooks para el bucket de operaciones (Tareas, tickets, recibos)
export const OperacionesUploadButton = generateUploadButton<OperacionesFileRouter>({
  url: "/api/uploadthing/operaciones",
});
export const OperacionesUploadDropzone = generateUploadDropzone<OperacionesFileRouter>({
  url: "/api/uploadthing/operaciones",
});
export const { useUploadThing: useOperacionesUploadThing } = generateReactHelpers<OperacionesFileRouter>({
  url: "/api/uploadthing/operaciones",
});
