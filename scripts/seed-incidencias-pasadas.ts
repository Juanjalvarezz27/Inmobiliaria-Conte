import { PrismaClient, CategoriaNovedad } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando registro de incidencias históricas (ayer y antier)...");

  const propiedadGranBazar = await prisma.propiedad.findFirst({
    where: { nombre: { contains: "Gran Bazar" } },
  });

  const propiedadCascada = await prisma.propiedad.findFirst({
    where: { nombre: { contains: "cascada", mode: "insensitive" } },
  });

  const hectorParedes = await prisma.empleado.findFirst({
    where: { cedula: "V-20112233" },
  });

  const joseRivas = await prisma.empleado.findFirst({
    where: { nombre: { contains: "José" } },
  });

  if (!propiedadGranBazar || !hectorParedes) {
    throw new Error("No se encontraron Gran Bazar o Héctor Paredes");
  }

  // Incidencias a sembrar
  const listaIncidencias = [
    // --- AYER (2026-10-25) ---
    {
      propiedadId: propiedadGranBazar.id,
      empleadoId: hectorParedes.id,
      fechaMinuta: new Date(2026, 9, 25, 0, 0, 0), // 25 Oct 2026
      hora: new Date("2026-10-25T13:30:00.000Z"), // 09:30 AM local
      categoria: CategoriaNovedad.RONDA_DE_RUTINA,
      titulo: "Recorrido perimetral y apertura de acceso peatonal",
      descripcion:
        "Se realizó apertura de las rejas peatonales a las 09:00 AM. Durante la primera ronda de supervisión matutina no se observaron anomalías en cerraduras ni vitrinas del nivel mezzanina. Todos los extintores y mangueras contra incendios cuentan con sus precintos en regla.",
      fotos: [
        "https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=800&q=80",
      ],
    },
    {
      propiedadId: propiedadGranBazar.id,
      empleadoId: hectorParedes.id,
      fechaMinuta: new Date(2026, 9, 25, 0, 0, 0), // 25 Oct 2026
      hora: new Date("2026-10-25T20:45:00.000Z"), // 04:45 PM local
      categoria: CategoriaNovedad.FALLA_INFRAESTRUCTURA,
      titulo: "Falla de luminaria y bajante en pasillo este",
      descripcion:
        "Se reportó parpadeo constante y apagón de dos lámparas LED en el pasillo este frente al local B-12. Adicionalmente se constató pequeña filtración en la junta del bajante de aguas de lluvia. Se acordonó la zona con conos de precaución y se reportó a la administración para coordinar electricista.",
      fotos: [
        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
      ],
    },
    // --- ANTIER (2026-10-24) ---
    {
      propiedadId: propiedadGranBazar.id,
      empleadoId: hectorParedes.id,
      fechaMinuta: new Date(2026, 9, 24, 0, 0, 0), // 24 Oct 2026
      hora: new Date("2026-10-24T16:10:00.000Z"), // 12:10 PM local
      categoria: CategoriaNovedad.ACCESO_VEHICULAR,
      titulo: "Retención preventiva de camión de carga",
      descripcion:
        "Se presentó camión 350 blanco con placa A82BB9X intentando ingresar al sótano sin orden de descarga autorizada por ningún arrendatario. Se retuvo en la entrada de garita y se comunicó con el local C-04 para confirmar el despacho. Tras confirmación del encargado se permitió el paso a la bahía de carga con tiempo límite de 45 minutos.",
      fotos: [],
    },
    {
      propiedadId: propiedadGranBazar.id,
      empleadoId: hectorParedes.id,
      fechaMinuta: new Date(2026, 9, 24, 0, 0, 0), // 24 Oct 2026
      hora: new Date("2026-10-24T23:50:00.000Z"), // 07:50 PM local
      categoria: CategoriaNovedad.INCIDENCIA_SEGURIDAD,
      titulo: "Candado forzado en caseta de transformadores",
      descripcion:
        "En la ronda nocturna previa al cierre de persianas se constató que el candado secundario de la caseta eléctrica exterior presentaba marcas de forcejeo y corte superficial. No se registraron pérdidas ni manipulación de tableros. Se procedió a sustituir el candado por uno de alta seguridad CISA de dotación y se reforzó el monitoreo con la cámara 04 de circuito cerrado.",
      fotos: [
        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
      ],
    },
  ];

  // Si existe La Cascada y José Rivas, añadir una más de ayer
  if (propiedadCascada && joseRivas) {
    listaIncidencias.push({
      propiedadId: propiedadCascada.id,
      empleadoId: joseRivas.id,
      fechaMinuta: new Date(2026, 9, 25, 0, 0, 0),
      hora: new Date("2026-10-25T18:15:00.000Z"), // 02:15 PM local
      categoria: CategoriaNovedad.RONDA_DE_RUTINA,
      titulo: "Ronda de inspección de áreas comunes",
      descripcion:
        "Recorrido por pasillos centrales y área de escaleras mecánicas. Sistema contra incendios con presión óptima y áreas de circulación despejadas.",
      fotos: [],
    });
  }

  for (const item of listaIncidencias) {
    const inicioDia = new Date(
      item.fechaMinuta.getFullYear(),
      item.fechaMinuta.getMonth(),
      item.fechaMinuta.getDate(),
      0,
      0,
      0
    );
    const finDia = new Date(
      item.fechaMinuta.getFullYear(),
      item.fechaMinuta.getMonth(),
      item.fechaMinuta.getDate() + 1,
      0,
      0,
      0
    );

    // Buscar o crear minuta del día
    let minuta = await prisma.minutaGuardia.findFirst({
      where: {
        propiedadId: item.propiedadId,
        fecha: {
          gte: inicioDia,
          lt: finDia,
        },
      },
    });

    if (!minuta) {
      minuta = await prisma.minutaGuardia.create({
        data: {
          propiedadId: item.propiedadId,
          empleadoId: item.empleadoId,
          fecha: inicioDia,
          horaInicio: item.hora,
        },
      });
      console.log(`Minuta creada para día ${inicioDia.toDateString()} (ID: ${minuta.id})`);
    }

    // Comprobar si ya existe una novedad con ese mismo título y hora
    const existente = await prisma.novedadMinuta.findFirst({
      where: {
        minutaId: minuta.id,
        titulo: item.titulo,
      },
    });

    if (existente) {
      console.log(`Novedad ya existe: "${item.titulo}", omitiendo.`);
      continue;
    }

    const novedad = await prisma.novedadMinuta.create({
      data: {
        minutaId: minuta.id,
        hora: item.hora,
        categoria: item.categoria,
        titulo: item.titulo,
        descripcion: item.descripcion,
        fotos: item.fotos,
      },
    });

    console.log(`+ Novedad creada: "${novedad.titulo}" [${item.categoria}] en fecha ${item.hora.toISOString()}`);
  }

  console.log("Proceso completado exitosamente.");

  // Mostrar resumen final de todas las incidencias
  const todas = await prisma.novedadMinuta.findMany({
    include: {
      minuta: {
        include: {
          propiedad: true,
          empleado: true,
        },
      },
    },
    orderBy: { hora: "desc" },
  });

  console.log(`\n=== TOTAL INCIDENCIAS: ${todas.length} ===`);
  for (const n of todas) {
    const fStr = n.hora.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    console.log(`- [${fStr}] [${n.categoria}] ${n.titulo} | Inmueble: ${n.minuta?.propiedad?.nombre} | Personal: ${n.minuta?.empleado?.nombre} ${n.minuta?.empleado?.apellido}`);
  }
}

main()
  .catch((e) => {
    console.error("Error al registrar incidencias:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

