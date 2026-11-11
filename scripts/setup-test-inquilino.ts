import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const password = "Inquilino2026*";
  const passwordHash = await bcrypt.hash(password, 10);

  // 1. Actualizar usuario inquilino LEYMA C.A
  const user = await prisma.usuario.upsert({
    where: { email: "jjsa6109+inquilino@gmail.com" },
    update: {
      passwordHash,
      mustChangePassword: false,
      activo: true,
      rol: "INQUILINO",
    },
    create: {
      email: "jjsa6109+inquilino@gmail.com",
      nombre: "LEYMA C.A",
      passwordHash,
      mustChangePassword: false,
      activo: true,
      rol: "INQUILINO",
    },
  });

  console.log("Usuario inquilino listo:", user.email);

  // 2. Asegurarse que el perfil Inquilino esté vinculado al usuarioId
  let inquilino = await prisma.inquilino.findFirst({
    where: { email: "jjsa6109+inquilino@gmail.com" },
  });

  if (inquilino) {
    await prisma.inquilino.update({
      where: { id: inquilino.id },
      data: { usuarioId: user.id },
    });
    console.log("Perfil inquilino vinculado a usuario:", inquilino.nombre);
  }

  // 3. Simular en la cuota de Octubre 2026 (ya PAGADA) un snapshot histórico en Bs
  // para que se aprecie la diferencia entre cuota pagada en el pasado vs cuota por pagar hoy
  const pagoOctubre = await prisma.pago.findFirst({
    where: {
      contrato: { inquilinoId: inquilino?.id },
      periodoMes: 10,
      periodoAno: 2026,
      estado: "PAGADO",
    },
  });

  if (pagoOctubre) {
    const tasaHistorica = 48.5; // Tasa histórica simulada de octubre
    const montoBsHistorico = Number((pagoOctubre.montoPagado * tasaHistorica).toFixed(2));
    await prisma.pago.update({
      where: { id: pagoOctubre.id },
      data: {
        tasaBcv: tasaHistorica,
        montoBs: montoBsHistorico,
        monedaOriginal: "VES",
        montoOriginal: montoBsHistorico,
      },
    });
    console.log(`Cuota de Octubre 2026 actualizada con snapshot histórico: Bs. ${montoBsHistorico} @ ${tasaHistorica} Bs/$`);
  }

  console.log("\n=== CREDENCIALES DE ACCESO PARA PRUEBAS ===");
  console.log("URL de Inicio de Sesión: http://localhost:3000/home/login");
  console.log("Email:    jjsa6109+inquilino@gmail.com");
  console.log("Password: Inquilino2026*");
  console.log("Rol:      INQUILINO (LEYMA C.A)");
}

main().catch(console.error).finally(() => prisma.$disconnect());

