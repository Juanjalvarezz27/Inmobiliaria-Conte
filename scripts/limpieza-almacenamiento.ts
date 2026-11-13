import { purgarArchivosTransitorios } from "../src/lib/storage-cleanup";

// Script ejecutable desde terminal local para depurar archivos antiguos sin consumir recursos de Vercel
async function main() {
  const args = process.argv.slice(2);
  const esDryRun = args.includes("--dry-run");

  const diasArg = args.find((a) => a.startsWith("--dias="));
  const dias = diasArg ? parseInt(diasArg.split("=")[1], 10) : 90;

  console.log("==================================================");
  console.log(" Inmobiliaria Conte - Depuración de Almacenamiento");
  console.log("==================================================");
  console.log(`Modo: ${esDryRun ? "SIMULACIÓN (Dry Run - no borra nada)" : "EJECUCIÓN REAL (Borra en UploadThing y BD)"}`);
  console.log(`Ventana de retención: > ${dias} días`);
  console.log("Consultando base de datos...");

  const inicio = Date.now();
  const resultado = await purgarArchivosTransitorios({
    diasAntiguedad: dias,
    dryRun: esDryRun,
  });
  const duracion = ((Date.now() - inicio) / 1000).toFixed(2);

  console.log("\n--- RESULTADOS ---");
  console.log(`Fecha de corte: ${resultado.fechaCorte}`);
  console.log(`Comprobantes de Luz solventes: ${resultado.detalles.pagosLuzPurgados}`);
  console.log(`Comprobantes de Agua solventes: ${resultado.detalles.pagosAguaPurgados}`);
  console.log(`Novedades de Guardia (turnos entregados): ${resultado.detalles.novedadesMinutaPurgadas}`);
  console.log(`Tareas de Empleado (completadas/canceladas): ${resultado.detalles.tareasEmpleadoPurgadas}`);
  console.log(`Tickets de Mantenimiento (resueltos/cancelados): ${resultado.detalles.ticketsMantenimientoPurgados}`);
  console.log(`Total de archivos físicos detectados: ${resultado.archivosDetectados}`);
  console.log(`Archivos eliminados físicamente en UploadThing: ${resultado.archivosEliminadosFisicamente}`);

  if (resultado.errores.length > 0) {
    console.error("\nErrores encontrados:", resultado.errores);
  }

  console.log(`\nCompletado en ${duracion}s.`);
}

main().catch((err) => {
  console.error("Fallo crítico en el script de limpieza:", err);
  process.exit(1);
});
