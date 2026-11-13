import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { purgarArchivosTransitorios } from "@/lib/storage-cleanup";

// Función para validar autorización por CRON_SECRET o sesión de Administrador
async function validarAutorizacion(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Validación mediante token Bearer (para invocaciones de cron jobs automatizados)
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Validación mediante sesión activa de usuario con rol ADMIN
  const session = await auth();
  if (session?.user?.rol === "ADMIN") {
    return true;
  }

  return false;
}

// Handler GET para monitoreo, pruebas de simulación (dryRun) o cron jobs programados
export async function GET(req: NextRequest) {
  const autorizado = await validarAutorizacion(req);
  if (!autorizado) {
    return NextResponse.json(
      { error: "No autorizado para ejecutar la limpieza de almacenamiento." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const diasParam = searchParams.get("dias");
  const dryRunParam = searchParams.get("dryRun");

  const dias = diasParam ? parseInt(diasParam, 10) : 90;
  const dryRun = dryRunParam === "true";

  if (isNaN(dias) || dias < 7) {
    return NextResponse.json(
      { error: "El parámetro 'dias' debe ser un número entero mayor o igual a 7." },
      { status: 400 }
    );
  }

  const resultado = await purgarArchivosTransitorios({
    diasAntiguedad: dias,
    dryRun,
  });

  if (resultado.errores.length > 0) {
    return NextResponse.json(resultado, { status: 500 });
  }

  return NextResponse.json(resultado);
}

// Handler POST para ejecuciones programadas vía Webhook o script
export async function POST(req: NextRequest) {
  const autorizado = await validarAutorizacion(req);
  if (!autorizado) {
    return NextResponse.json(
      { error: "No autorizado para ejecutar la limpieza de almacenamiento." },
      { status: 401 }
    );
  }

  let dias = 90;
  let dryRun = false;

  try {
    const body = await req.json().catch(() => ({}));
    if (body.dias && typeof body.dias === "number") dias = body.dias;
    if (typeof body.dryRun === "boolean") dryRun = body.dryRun;
  } catch {
    // Continuar con valores por defecto si no hay cuerpo JSON
  }

  if (dias < 7) {
    return NextResponse.json(
      { error: "El parámetro 'dias' debe ser mayor o igual a 7 días." },
      { status: 400 }
    );
  }

  const resultado = await purgarArchivosTransitorios({
    diasAntiguedad: dias,
    dryRun,
  });

  if (resultado.errores.length > 0) {
    return NextResponse.json(resultado, { status: 500 });
  }

  return NextResponse.json(resultado);
}
