import {
  PrismaClient,
  Rol,
  TipoPropiedad,
  TipoUnidad,
  EstadoUnidad,
  TipoPersona,
  EstadoContrato,
  EstadoDeposito,
  EstadoPago,
  MetodoPago,
  MonedaTransaccion,
  TipoTransaccionFinanciera,
  CategoriaTransaccion,
  CargoEmpleado,
  EstadoAsistencia,
  PrioridadTarea,
  EstadoTarea,
  TipoTurnoGuardia,
  EstadoTurnoGuardia,
  CategoriaNovedad,
  UrgenciaTicket,
  CategoriaTicket,
  EstadoTicket,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Limpiando base de datos para presentacion ejecutiva...");

  // 1. Eliminación en orden estricto de dependencias foráneas
  await prisma.novedadMinuta.deleteMany();
  await prisma.minutaGuardia.deleteMany();
  await prisma.ticketMantenimiento.deleteMany();
  await prisma.tareaEmpleado.deleteMany();
  await prisma.registroAsistencia.deleteMany();
  await prisma.transaccionPago.deleteMany();
  await prisma.pago.deleteMany();
  await prisma.contrato.deleteMany();
  await prisma.transaccionFinanciera.deleteMany();
  await prisma.unidad.deleteMany();
  await prisma.inquilino.deleteMany();
  await prisma.empleado.deleteMany();
  await prisma.propiedad.deleteMany();
  await prisma.usuario.deleteMany();

  console.log("Tablas purgadas con exito.");

  // 2. Hash estandar de contrasena para el entorno demo
  const passwordHash = await bcrypt.hash("123456", 10);

  // 3. Crear Usuario Administrador Principal solicitado
  const admin = await prisma.usuario.create({
    data: {
      email: "jjsa610@gmail.com",
      passwordHash: passwordHash,
      nombre: "Juan",
      apellido: "Álvarez",
      cedula: "V-10203040",
      telefono: "+58 412 1234567",
      direccion: "Oficina Administrativa Central, Valera",
      ubicacion: "Sede Principal",
      rol: Rol.ADMIN,
      activo: true,
      mustChangePassword: false,
    },
  });

  // Usuario Inquilino para demostración del Portal del Inquilino
  const usuarioInquilino = await prisma.usuario.create({
    data: {
      email: "inquilino@conte.com",
      passwordHash: passwordHash,
      nombre: "Farmacia & Variedades",
      apellido: "La Salud C.A.",
      cedula: "J-30987654-1",
      telefono: "+58 414 7654321",
      direccion: "Local PB-01, CC Gran Bazar, Valera",
      ubicacion: "CC Gran Bazar",
      rol: Rol.INQUILINO,
      activo: true,
      mustChangePassword: false,
    },
  });

  // Usuario Vigilante para demostración de Guardias y Novedades de Seguridad
  const usuarioSeguridad = await prisma.usuario.create({
    data: {
      email: "seguridad@conte.com",
      passwordHash: passwordHash,
      nombre: "Héctor",
      apellido: "Paredes",
      cedula: "V-20112233",
      telefono: "+58 414 5556677",
      direccion: "Sector Morón",
      ubicacion: "Valera",
      rol: Rol.EMPLEADO,
      activo: true,
      mustChangePassword: false,
    },
  });

  // Usuario Empleado para demostración del Portal del Trabajador y Asistencia GPS
  const usuarioTecnico = await prisma.usuario.create({
    data: {
      email: "carlos.mendoza@inmobiliariaconte.com",
      passwordHash: passwordHash,
      nombre: "Carlos",
      apellido: "Mendoza",
      cedula: "V-18304050",
      telefono: "+58 414 7654321",
      direccion: "Sector La Beatriz, Calle 5",
      ubicacion: "Valera",
      rol: Rol.EMPLEADO,
      activo: true,
      mustChangePassword: false,
    },
  });

  // 4. Crear Propiedad Insignia: Centro Comercial Gran Bazar con GPS configurado (Fase 35)
  const ccGranBazar = await prisma.propiedad.create({
    data: {
      nombre: "Centro Comercial Gran Bazar",
      tipo: TipoPropiedad.CENTRO_COMERCIAL,
      direccion: "Avenida Bolívar con Calle 10, Sector Centro",
      ciudad: "Valera, Edo. Trujillo",
      descripcion: "Complejo comercial de 3 niveles con locales comerciales, feria de comida, oficinas corporativas y estacionamiento privado.",
      numPisos: 3,
      areaTotalM2: 4500,
      propietario: "Inmobiliaria Conte C.A.",
      telefonoContacto: "+58 412 1234567",
      latitud: 9.313387,
      longitud: -70.607134,
      radioMetros: 200,
    },
  });

  // 5. Unidades Comerciales en CC Gran Bazar
  const localPB01 = await prisma.unidad.create({
    data: {
      codigo: "Local PB-01",
      tipo: TipoUnidad.LOCAL,
      piso: "Planta Baja",
      areaMt2: 65,
      precioAlquiler: 450,
      descripcion: "Local comercial a pie de pasillo principal con vitrina panorámica de cristal templado.",
      estado: EstadoUnidad.OCUPADO,
      imagenes: [],
      propiedadId: ccGranBazar.id,
    },
  });

  const localPB02 = await prisma.unidad.create({
    data: {
      codigo: "Local PB-02",
      tipo: TipoUnidad.LOCAL,
      piso: "Planta Baja",
      areaMt2: 48,
      precioAlquiler: 320,
      descripcion: "Excelente punto comercial cercano al acceso peatonal oeste.",
      estado: EstadoUnidad.DISPONIBLE,
      imagenes: [],
      propiedadId: ccGranBazar.id,
    },
  });

  const localP108 = await prisma.unidad.create({
    data: {
      codigo: "Local P1-08",
      tipo: TipoUnidad.LOCAL,
      piso: "Piso 1",
      areaMt2: 85,
      precioAlquiler: 550,
      descripcion: "Local espacioso acondicionado para boutique, tienda tecnológica o retail.",
      estado: EstadoUnidad.OCUPADO,
      imagenes: [],
      propiedadId: ccGranBazar.id,
    },
  });

  const oficinaP215 = await prisma.unidad.create({
    data: {
      codigo: "Oficina P2-15",
      tipo: TipoUnidad.OFICINA,
      piso: "Piso 2",
      areaMt2: 35,
      precioAlquiler: 250,
      descripcion: "Oficina corporativa con baño privado, área de recepción y climatización integral.",
      estado: EstadoUnidad.DISPONIBLE,
      imagenes: [],
      propiedadId: ccGranBazar.id,
    },
  });

  // 6. Inquilinos Profesionales
  const inquilinoFarmacia = await prisma.inquilino.create({
    data: {
      nombre: "Farmacia & Variedades La Salud C.A.",
      tipoPersona: TipoPersona.JURIDICA,
      documentoIdentidad: "J-30987654-1",
      telefono: "+58 414 7654321",
      email: "inquilino@conte.com",
      direccion: "Local PB-01, CC Gran Bazar, Valera",
      usuarioId: usuarioInquilino.id,
      activo: true,
    },
  });

  const inquilinoMorales = await prisma.inquilino.create({
    data: {
      nombre: "Alejandro",
      apellido: "Morales",
      tipoPersona: TipoPersona.NATURAL,
      documentoIdentidad: "V-19876543",
      telefono: "+58 424 9123456",
      email: "alejandro.morales.tech@gmail.com",
      direccion: "Local P1-08, CC Gran Bazar, Valera",
      activo: true,
    },
  });

  // 7. Contratos con fechaInicioCobranza (Fase 33) y Depósitos en Garantía
  const fechaInicioContrato1 = new Date(2026, 0, 1); // 1 Ene 2026
  const fechaFinContrato1 = new Date(2026, 11, 31); // 31 Dic 2026

  const contrato1 = await prisma.contrato.create({
    data: {
      codigo: "CTR-2026-001",
      inquilinoId: inquilinoFarmacia.id,
      unidadId: localPB01.id,
      fechaInicio: fechaInicioContrato1,
      fechaInicioCobranza: fechaInicioContrato1,
      fechaFin: fechaFinContrato1,
      diaCobro: 5,
      montoAlquiler: 450,
      depositoGarantia: 900,
      depositoEstado: EstadoDeposito.COBRADO,
      depositoFechaCobro: fechaInicioContrato1,
      depositoMetodoPago: MetodoPago.TRANSFERENCIA,
      depositoReferencia: "DEP-GAR-9941",
      moneda: "USD",
      estado: EstadoContrato.ACTIVO,
      notas: "Contrato comercial corporativo con 2 meses de canon en garantía.",
    },
  });

  const fechaInicioContrato2 = new Date(2026, 1, 1); // 1 Feb 2026
  const fechaFinContrato2 = new Date(2027, 0, 31); // 31 Ene 2027

  const contrato2 = await prisma.contrato.create({
    data: {
      codigo: "CTR-2026-002",
      inquilinoId: inquilinoMorales.id,
      unidadId: localP108.id,
      fechaInicio: fechaInicioContrato2,
      fechaInicioCobranza: fechaInicioContrato2,
      fechaFin: fechaFinContrato2,
      diaCobro: 10,
      montoAlquiler: 550,
      depositoGarantia: 1100,
      depositoEstado: EstadoDeposito.COBRADO,
      depositoFechaCobro: fechaInicioContrato2,
      depositoMetodoPago: MetodoPago.TRANSFERENCIA,
      depositoReferencia: "DEP-GAR-1022",
      moneda: "USD",
      estado: EstadoContrato.ACTIVO,
      notas: "Contrato retail de tienda tecnológica.",
    },
  });

  // 8. Registro de Cobranza y Control de Servicios Públicos (Fase 27)
  // Pago solvente del mes corriente (Noviembre 2026) para Contrato 1
  await prisma.pago.create({
    data: {
      contratoId: contrato1.id,
      periodoMes: 11,
      periodoAno: 2026,
      montoEsperado: 450,
      montoPagado: 450,
      monedaOriginal: MonedaTransaccion.USD,
      montoOriginal: 450,
      fechaVencimiento: new Date(2026, 10, 5),
      fechaPago: new Date(2026, 10, 4),
      metodoPago: MetodoPago.ZELLE,
      referencia: "ZLL-88301",
      estado: EstadoPago.PAGADO,
      notas: "Transferencia Zelle recibida y confirmada en cuenta.",
      luzSolvente: true,
      luzNumeroFactura: "CORPOELEC-993821",
      aguaSolvente: true,
      aguaNumeroFactura: "HIDRO-44912",
      serviciosObservaciones: "Servicios solventes y verificados con comprobante.",
      fechaRevisionServicios: new Date(2026, 10, 4),
    },
  });

  // Pago pendiente para Contrato 2 (activa badge en navbar y panel de cobranza)
  await prisma.pago.create({
    data: {
      contratoId: contrato2.id,
      periodoMes: 11,
      periodoAno: 2026,
      montoEsperado: 550,
      montoPagado: 0,
      monedaOriginal: MonedaTransaccion.USD,
      fechaVencimiento: new Date(2026, 10, 10),
      estado: EstadoPago.PENDIENTE,
      notas: "Notificación de corte enviada al inquilino vía WhatsApp.",
      luzSolvente: false,
      aguaSolvente: false,
    },
  });

  // 9. Personal y Colaboradores Asignados al CC Gran Bazar
  const empleadoMendoza = await prisma.empleado.create({
    data: {
      nombre: "Carlos",
      apellido: "Mendoza",
      cedula: "V-18304050",
      telefono: "+58 414 7654321",
      email: "carlos.mendoza@inmobiliariaconte.com",
      cargo: CargoEmpleado.TECNICO_MANTENIMIENTO,
      salarioMensual: 450,
      propiedadId: ccGranBazar.id,
      usuarioId: usuarioTecnico.id,
      activo: true,
    },
  });

  const empleadoParedes = await prisma.empleado.create({
    data: {
      nombre: "Héctor",
      apellido: "Paredes",
      cedula: "V-20112233",
      telefono: "+58 414 5556677",
      email: "seguridad@conte.com",
      cargo: CargoEmpleado.SEGURIDAD,
      salarioMensual: 420,
      propiedadId: ccGranBazar.id,
      usuarioId: usuarioSeguridad.id,
      activo: true,
    },
  });

  const empleadoRivas = await prisma.empleado.create({
    data: {
      nombre: "José",
      apellido: "Rivas",
      cedula: "V-15890123",
      telefono: "+58 412 9876543",
      cargo: CargoEmpleado.CONSERJE,
      salarioMensual: 350,
      propiedadId: ccGranBazar.id,
      activo: true,
    },
  });

  // 10. Asistencias GPS: Demostración de Presencia en Sede y Marcaje Externo (Fase 35)
  const hoy = new Date();
  const fechaHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const fechaAyer = new Date(fechaHoy.getTime() - 86400000);

  // Asistencia de Ayer: Marcaje Fuera de Sede Justificado (para mostrar badge de auditoría en ficha)
  await prisma.registroAsistencia.create({
    data: {
      empleadoId: empleadoMendoza.id,
      fecha: fechaAyer,
      horaEntrada: new Date(fechaAyer.getTime() + 8.5 * 3600000), // 08:30 AM
      horaSalida: new Date(fechaAyer.getTime() + 17 * 3600000),   // 05:00 PM
      estado: EstadoAsistencia.PRESENTE,
      ubicacionEntrada: "Sector Las Acacias, Ferretería Central",
      latitudEntrada: 9.325000,
      longitudEntrada: -70.620000,
      distanciaMetros: 2150,
      esMarcajeExterno: true,
      motivoExterno: "Compra de repuestos de tubería y válvulas de bronce en ferretería",
      observaciones: "Autorizado por administración para diligencia de compras.",
    },
  });

  // Asistencia de Hoy: Jornada en Curso en Sede (dentro del radio de 200m)
  await prisma.registroAsistencia.create({
    data: {
      empleadoId: empleadoMendoza.id,
      fecha: fechaHoy,
      horaEntrada: new Date(fechaHoy.getTime() + 8.25 * 3600000), // 08:15 AM
      estado: EstadoAsistencia.PRESENTE,
      ubicacionEntrada: "Centro Comercial Gran Bazar",
      latitudEntrada: 9.313410,
      longitudEntrada: -70.607150,
      distanciaMetros: 18,
      esMarcajeExterno: false,
      observaciones: "Entrada puntual dentro del perímetro asignado.",
    },
  });

  // 11. Tareas Operativas del Personal (Fase 24 y Fase 32)
  await prisma.tareaEmpleado.create({
    data: {
      titulo: "Revisión preventiva del sistema hidroneumático",
      descripcion: "Verificar presiones de bombas 1 y 2, purgar pulmón y comprobar flotadores del tanque principal.",
      prioridad: PrioridadTarea.ALTA,
      estado: EstadoTarea.EN_PROCESO,
      empleadoId: empleadoMendoza.id,
      propiedadId: ccGranBazar.id,
      fechaLimite: new Date(fechaHoy.getTime() + 2 * 86400000),
      requiereEvidencia: true,
      evidencias: [],
    },
  });

  await prisma.tareaEmpleado.create({
    data: {
      titulo: "Mantenimiento y pulido de pasillos principales",
      descripcion: "Aplicar sellador antideslizante en áreas de alto tráfico de planta baja y escaleras de acceso.",
      prioridad: PrioridadTarea.NORMAL,
      estado: EstadoTarea.COMPLETADA,
      empleadoId: empleadoRivas.id,
      propiedadId: ccGranBazar.id,
      fechaLimite: fechaAyer,
      fechaCompletada: fechaAyer,
      notasResolucion: "Completado en jornada vespertina con insumos de limpieza corporativos.",
      evidencias: [],
    },
  });

  // 12. Libro de Novedades de Seguridad / Minuta de Guardia (Fases 30 y 31)
  const minutaHoy = await prisma.minutaGuardia.create({
    data: {
      empleadoId: empleadoParedes.id,
      propiedadId: ccGranBazar.id,
      fecha: fechaHoy,
      tipoTurno: TipoTurnoGuardia.DIURNO,
      horaInicio: new Date(fechaHoy.getTime() + 7 * 3600000), // 07:00 AM
      estado: EstadoTurnoGuardia.EN_CURSO,
      inventarioRecibido: "1 Radio Motorola con cargador, Llaves maestras de pasillos y estacionamiento, Monitor CCTV operativo en los 8 canales, Linterna recargable.",
    },
  });

  await prisma.novedadMinuta.create({
    data: {
      minutaId: minutaHoy.id,
      hora: new Date(fechaHoy.getTime() + 7.2 * 3600000),
      titulo: "Apertura de portón de estacionamiento y accesos peatonales",
      descripcion: "Se verificó candado y cerradura de reja norte. Acceso habilitado sin novedades mecánicas.",
      categoria: CategoriaNovedad.RONDA_DE_RUTINA,
      fotos: [],
    },
  });

  await prisma.novedadMinuta.create({
    data: {
      minutaId: minutaHoy.id,
      hora: new Date(fechaHoy.getTime() + 8.75 * 3600000),
      titulo: "Recepción de camión de suministros Farmacia La Salud",
      descripcion: "Ingreso de vehículo NPR placa A44BC9D para descarga de insumos médicos. Zona de carga despejada.",
      categoria: CategoriaNovedad.ACCESO_VEHICULAR,
      fotos: [],
    },
  });

  // 13. Tickets de Mantenimiento Correctivo / Preventivo (Fases 24 y 29)
  await prisma.ticketMantenimiento.create({
    data: {
      codigo: "TCK-2026-001",
      titulo: "Sustitución de balastro y tubos LED en pasillo central PB",
      descripcion: "Luminarias parpadeando sobre vitrina de locales centrales. Requiere cambio a tecnología LED de 18W.",
      categoria: CategoriaTicket.ELECTRICIDAD,
      urgencia: UrgenciaTicket.MEDIA,
      estado: EstadoTicket.RESUELTO,
      propiedadId: ccGranBazar.id,
      unidadId: localPB01.id,
      empleadoId: empleadoMendoza.id,
      fechaAsignacion: new Date(fechaAyer.getTime() - 86400000),
      fechaInicio: new Date(fechaAyer.getTime() - 86400000),
      fechaFiniquito: fechaAyer,
      notasCierre: "Se instalaron 4 tubos LED de 18W y se balanceó la línea de breakers sin anomalías.",
      fotosAveria: [],
      fotosFiniquito: [],
    },
  });

  await prisma.ticketMantenimiento.create({
    data: {
      codigo: "TCK-2026-002",
      titulo: "Ajuste de brazo hidráulico en puerta de vidrio este",
      descripcion: "La puerta no cierra suavemente y golpea con corrientes de aire.",
      categoria: CategoriaTicket.AREAS_COMUNES,
      urgencia: UrgenciaTicket.BAJA,
      estado: EstadoTicket.EN_PROCESO,
      propiedadId: ccGranBazar.id,
      empleadoId: empleadoMendoza.id,
      fechaAsignacion: fechaHoy,
      fechaInicio: fechaHoy,
      notasAdmin: "Priorizar antes del mediodía para evitar roturas del cristal.",
      fotosAveria: [],
      fotosFiniquito: [],
    },
  });

  // 14. Gastos Operativos y Transacciones Financieras del Complejo
  await prisma.transaccionFinanciera.create({
    data: {
      concepto: "Servicio Eléctrico Corpoelec - Áreas Comunes CC Gran Bazar",
      tipo: TipoTransaccionFinanciera.EGRESO,
      categoria: CategoriaTransaccion.SERVICIOS_PUBLICOS,
      monto: 185.00,
      monedaOriginal: MonedaTransaccion.USD,
      montoOriginal: 185.00,
      periodoMes: 10,
      periodoAno: 2026,
      metodoPago: MetodoPago.PAGO_MOVIL,
      referencia: "F-CORP-48821",
      beneficiario: "Corpoelec Trujillo",
      propiedadId: ccGranBazar.id,
      activo: true,
      notas: "Factura eléctrica correspondiente al consumo de octubre.",
    },
  });

  await prisma.transaccionFinanciera.create({
    data: {
      concepto: "Honorarios de Vigilancia y Custodia Integral - Octubre",
      tipo: TipoTransaccionFinanciera.EGRESO,
      categoria: CategoriaTransaccion.NOMINA_PERSONAL,
      monto: 420.00,
      monedaOriginal: MonedaTransaccion.USD,
      montoOriginal: 420.00,
      periodoMes: 10,
      periodoAno: 2026,
      metodoPago: MetodoPago.TRANSFERENCIA,
      referencia: "TRF-NOM-202610",
      beneficiario: "Héctor Paredes",
      propiedadId: ccGranBazar.id,
      activo: true,
      notas: "Servicio de vigilancia diurna completado con solvencia.",
    },
  });

  // 15. Tasa Oficial BCV de Referencia
  await prisma.historialTasaBcv.upsert({
    where: { fechaStr: "2026-11-14" },
    update: { tasa: 82.50 },
    create: {
      fechaStr: "2026-11-14",
      tasa: 82.50,
      fuente: "Banco Central de Venezuela",
      esOficial: true,
    },
  });

  console.log("=========================================================");
  console.log("SISTEMA PREPARADO Y LIMPIO PARA REUNION CON CLIENTE:");
  console.log("=========================================================");
  console.log(`ADMINISTRADOR:`);
  console.log(`- Correo: ${admin.email}`);
  console.log(`- Clave:  123456`);
  console.log(`---------------------------------------------------------`);
  console.log(`EMPLEADOS DEMO DISPONIBLES:`);
  console.log(`- Tecnico Mantenimiento: carlos.mendoza@inmobiliariaconte.com (Clave: 123456)`);
  console.log(`- Vigilante Seguridad:   hector.seguridad@inmobiliariaconte.com (Clave: 123456)`);
  console.log(`---------------------------------------------------------`);
  console.log(`PROPIEDAD: Centro Comercial Gran Bazar (GPS: 9.313387, -70.607134)`);
  console.log(`LOCALES: 4 locales (2 ocupados, 2 disponibles)`);
  console.log(`CONTRATOS: 2 contratos activos con depositos en garantia y fechaInicioCobranza`);
  console.log(`COBRANZA: 1 pago solvente (luz/agua) + 1 cobro pendiente para badge`);
  console.log(`ASISTENCIA GPS: Jornada en curso + Auditoria externa justificada`);
  console.log(`SEGURIDAD: Minuta de guardia diurna con 2 novedades registradas`);
  console.log(`MANTENIMIENTO: 2 tickets (1 resuelto, 1 en proceso) + 2 tareas operativas`);
  console.log(`FINANZAS: 2 gastos de operacion registrados`);
  console.log("=========================================================");
}

main()
  .catch((e) => {
    console.error("Error al ejecutar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
