import {
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import type { PropiedadesFileRouter } from "@/app/api/uploadthing/propiedades/core";
import type { OperacionesFileRouter } from "@/app/api/uploadthing/operaciones/core";

// Componentes para el router principal (legacy/fallback)
export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();

// Componentes para el bucket de propiedades (Catálogo oficial)
export const PropiedadesUploadButton = generateUploadButton<PropiedadesFileRouter>();
export const PropiedadesUploadDropzone = generateUploadDropzone<PropiedadesFileRouter>();

// Componentes para el bucket de operaciones (Tareas, tickets, recibos)
export const OperacionesUploadButton = generateUploadButton<OperacionesFileRouter>();
export const OperacionesUploadDropzone = generateUploadDropzone<OperacionesFileRouter>();
