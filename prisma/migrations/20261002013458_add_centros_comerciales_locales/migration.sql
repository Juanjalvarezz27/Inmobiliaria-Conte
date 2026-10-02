-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'EMPLEADO', 'INQUILINO');

-- CreateEnum
CREATE TYPE "EstadoLocal" AS ENUM ('DISPONIBLE', 'OCUPADO', 'MANTENIMIENTO', 'INACTIVO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT,
    "cedula" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "ubicacion" TEXT,
    "rol" "Rol" NOT NULL DEFAULT 'INQUILINO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centros_comerciales" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "descripcion" TEXT,
    "imagenUrl" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "centros_comerciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locales" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "piso" TEXT,
    "areaMt2" DOUBLE PRECISION,
    "precioAlquiler" DOUBLE PRECISION,
    "descripcion" TEXT,
    "estado" "EstadoLocal" NOT NULL DEFAULT 'DISPONIBLE',
    "imagenes" TEXT[],
    "centroComercialId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_cedula_key" ON "usuarios"("cedula");

-- AddForeignKey
ALTER TABLE "locales" ADD CONSTRAINT "locales_centroComercialId_fkey" FOREIGN KEY ("centroComercialId") REFERENCES "centros_comerciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
