import { PrismaClient, CargoEmpleado, EstadoAsistencia } from "@prisma/client";

const prisma = new PrismaClient();

async function resetTestGuards() {
  const hector = await prisma.empleado.findFirst({
    where: { email: "seguridad@conte.com" },
  });

  const luis = await prisma.empleado.findFirst({
    where: { email: "seguridad2@conte.com" },
  });

  if (!hector || !luis) {
    console.error("No se encontraron los empleados de seguridad.");
    return;
  }

  // Cerrar cualquier turno abierto previo de Luis
  await prisma.registroAsistencia.updateMany({
    where: {
      empleadoId: luis.id,
      horaSalida: null,
    },
    data: {
      horaSalida: new Date(),
      observaciones: "Turno cerrado para preparación de pruebas",
    },
  });

  // Cerrar turnos abiertos previos de Héctor
  await prisma.registroAsistencia.updateMany({
    where: {
      empleadoId: hector.id,
      horaSalida: null,
    },
    data: {
      horaSalida: new Date(),
      observaciones: "Turno cerrado para preparación de pruebas",
    },
  });

  // Crear una guardia activa de 24 horas para Héctor (iniciada hace 24 horas)
  const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const guardiaHector = await prisma.registroAsistencia.create({
    data: {
      empleadoId: hector.id,
      fecha: hace24Horas,
      horaEntrada: hace24Horas,
      horaSalida: null,
      estado: EstadoAsistencia.PRESENTE,
      ubicacionEntrada: "Gran Bazar 5 - Puesto de Seguridad",
      observaciones: "Inicio de Guardia de Seguridad (24 Horas)",
    },
  });

  console.log("Guardia activa preparada para Héctor Paredes:", {
    id: guardiaHector.id,
    horaEntrada: guardiaHector.horaEntrada,
    horaSalida: guardiaHector.horaSalida,
  });

  console.log("Luis Gómez listo para recibir relevo (sin guardia activa).");
}

resetTestGuards()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

