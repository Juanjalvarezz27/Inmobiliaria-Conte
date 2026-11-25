import { limpiarArchivosHuerfanosUploadThing, purgarArchivosTransitorios } from "../src/lib/storage-cleanup";

// Carga automática de .env al ejecutar vía npm/tsx sin --env-file
if (!process.env.DATABASE_URL && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env");
  } catch {
    // Ignora si no existe .env local (por ejemplo en CI/producción)
  }
}

// Script ejecutable desde terminal local para depurar archivos antiguos y huérfanos sin consumir recursos de Vercel
async function main() {
  const args = process.argv.slice(2);
  const esDryRun = args.includes("--dry-run");
  const soloHuerfanos = args.includes("--solo-huerfanos");
  const sinHuerfanos = args.includes("--sin-huerfanos");

  const diasArg = args.find((a) => a.startsWith("--dias="));
  const dias = diasArg ? parseInt(diasArg.split("=")[1], 10) : 90;

  const horasArg = args.find((a) => a.startsWith("--horas="));
  const horas = horasArg ? parseInt(horasArg.split("=")[1], 10) : 24;

  console.log("==================================================");
  console.log(" Inmobiliaria Conte - Depuración de Almacenamiento");
  console.log("==================================================");
  console.log(`Modo: ${esDryRun ? "SIMULACIÓN (Dry Run - no borra nada)" : "EJECUCIÓN REAL (Borra en UploadThing y BD)"}`);

  const inicio = Date.now();
  let hayErrores = false;

  if (!soloHuerfanos) {
    console.log(`Ventana de retención transitoria: > ${dias} días`);
    console.log("Consultando base de datos...");

    const resultado = await purgarArchivosTransitorios({
      diasAntiguedad: dias,
      dryRun: esDryRun,
    });

    console.log("\n--- ARCHIVOS TRANSITORIOS (> " + dias + " días) ---");
    console.log(`Fecha de corte: ${resultado.fechaCorte}`);
    console.log(`Comprobantes de Luz solventes: ${resultado.detalles.pagosLuzPurgados}`);
    console.log(`Comprobantes de Agua solventes: ${resultado.detalles.pagosAguaPurgados}`);
    console.log(`Novedades de Guardia (turnos entregados): ${resultado.detalles.novedadesMinutaPurgadas}`);
    console.log(`Tareas de Empleado (completadas/canceladas): ${resultado.detalles.tareasEmpleadoPurgadas}`);
    console.log(`Tickets de Mantenimiento (resueltos/cancelados): ${resultado.detalles.ticketsMantenimientoPurgados}`);
    console.log(`Total de archivos físicos detectados: ${resultado.archivosDetectados}`);
    console.log(`Archivos eliminados físicamente en UploadThing: ${resultado.archivosEliminadosFisicamente}`);

    if (resultado.errores.length > 0) {
      hayErrores = true;
      console.error("\nErrores en transitorios:", resultado.errores);
    }
  }

  if (!sinHuerfanos) {
    console.log(`\nConciliando huérfanos en UploadThing (antigüedad mínima: ${horas}h)...`);
    const resHuerfanos = await limpiarArchivosHuerfanosUploadThing({
      dryRun: esDryRun,
      minAntiguedadHoras: horas,
    });

    console.log("\n--- CONCILIACIÓN DE HUÉRFANOS ---");
    console.log(`Archivos en uso en BD: ${resHuerfanos.archivosEnUsoBD}`);
    for (const app of resHuerfanos.porApp) {
      console.log(
        `[${app.app}] Total: ${app.totalArchivos} | Huérfanos: ${app.huerfanosDetectados} (${(app.bytesHuerfanos / 1024 / 1024).toFixed(2)} MB) | Eliminados: ${app.huerfanosEliminados}`
      );
    }
    console.log(`Total huérfanos detectados: ${resHuerfanos.huerfanosDetectados}`);
    console.log(`Total huérfanos eliminados: ${resHuerfanos.huerfanosEliminados} (${(resHuerfanos.bytesLiberados / 1024 / 1024).toFixed(2)} MB liberados)`);

    if (resHuerfanos.errores.length > 0) {
      hayErrores = true;
      console.error("\nErrores en conciliación de huérfanos:", resHuerfanos.errores);
    }
  }

  const duracion = ((Date.now() - inicio) / 1000).toFixed(2);
  console.log(`\nCompletado en ${duracion}s.`);
  if (hayErrores) process.exit(1);
}

main().catch((err) => {
  console.error("Fallo crítico en el script de limpieza:", err);
  process.exit(1);
});
