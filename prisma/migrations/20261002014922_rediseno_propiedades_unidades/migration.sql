/*
  Warnings:

  - You are about to drop the `centros_comerciales` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `locales` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoPropiedad" AS ENUM ('CENTRO_COMERCIAL', 'EDIFICIO', 'CASA', 'APARTAMENTO', 'LOCAL', 'TERRENO', 'GALPON', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoUnidad" AS ENUM ('LOCAL', 'APARTAMENTO', 'OFICINA', 'DEPOSITO', 'CASA', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoUnidad" AS ENUM ('DISPONIBLE', 'OCUPADO', 'MANTENIMIENTO', 'INACTIVO');

-- DropForeignKey
ALTER TABLE "locales" DROP CONSTRAINT "locales_centroComercialId_fkey";

-- DropTable
DROP TABLE "centros_comerciales";

-- DropTable
DROP TABLE "locales";

-- DropEnum
DROP TYPE "EstadoLocal";

-- CreateTable
CREATE TABLE "propiedades" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoPropiedad" NOT NULL DEFAULT 'CENTRO_COMERCIAL',
    "direccion" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "propiedades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "TipoUnidad" NOT NULL DEFAULT 'LOCAL',
    "piso" TEXT,
    "areaMt2" DOUBLE PRECISION,
    "precioAlquiler" DOUBLE PRECISION,
    "descripcion" TEXT,
    "estado" "EstadoUnidad" NOT NULL DEFAULT 'DISPONIBLE',
    "imagenes" TEXT[],
    "propiedadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "propiedades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
