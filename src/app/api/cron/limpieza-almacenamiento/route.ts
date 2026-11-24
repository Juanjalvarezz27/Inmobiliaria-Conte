import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { purgarArchivosTransitorios } from "@/lib/storage-cleanup";

export const dynamic = "force-dynamic";

// Función para validar autorización por CRON_SECRET o sesión de Administrador
async function validarAutorizacion(req: NextRequest): Promise<{ ok: boolean; status: 200 | 401 | 403 }> {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Validación mediante token Bearer (para invocaciones de cron jobs automatizados)
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { ok: true, status: 200 };
  }

  // Validación mediante sesión activa de usuario con rol ADMIN
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401 };
  }
  if (session.user.rol !== "ADMIN") {
    return { ok: false, status: 403 };
  }

  return { ok: true, status: 200 };
}

// Handler GET para monitoreo, pruebas de simulación (dryRun) o cron jobs programados
export async function GET(req: NextRequest) {
  try {
    const authRes = await validarAutorizacion(req);
    if (!authRes.ok) {
      return NextResponse.json(
        { error: "No autorizado para ejecutar la limpieza de almacenamiento." },
        { status: authRes.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const diasParam = searchParams.get("dias");
    const dryRunParam = searchParams.get("dryRun");

    const dias = diasParam !== null ? Number(diasParam) : 90;
    const dryRun = dryRunParam === "true";

    if (!Number.isInteger(dias) || dias < 7) {
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
  } catch (error) {
    console.error("Error en GET /api/cron/limpieza-almacenamiento:", error);
    return NextResponse.json(
      { error: "Error interno al ejecutar limpieza de almacenamiento." },
      { status: 500 }
    );
  }
}

// Handler POST para ejecuciones programadas vía Webhook o script
export async function POST(req: NextRequest) {
  try {
    const authRes = await validarAutorizacion(req);
    if (!authRes.ok) {
      return NextResponse.json(
        { error: "No autorizado para ejecutar la limpieza de almacenamiento." },
        { status: authRes.status }
      );
    }

    let dias = 90;
    let dryRun = false;

    const rawText = await req.text();
    if (rawText.trim()) {
      let body: unknown;
      try {
        body = JSON.parse(rawText);
      } catch {
        return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
      }
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return NextResponse.json({ error: "El cuerpo debe ser un objeto JSON válido." }, { status: 400 });
      }
      const record = body as Record<string, unknown>;
      if (record.dias !== undefined) {
        if (typeof record.dias !== "number") {
          return NextResponse.json({ error: "El parámetro 'dias' debe ser numérico." }, { status: 400 });
        }
        dias = record.dias;
      }
      if (typeof record.dryRun === "boolean") {
        dryRun = record.dryRun;
      }
    }

    if (!Number.isInteger(dias) || dias < 7) {
      return NextResponse.json(
        { error: "El parámetro 'dias' debe ser un entero mayor o igual a 7 días." },
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
  } catch (error) {
    console.error("Error en POST /api/cron/limpieza-almacenamiento:", error);
    return NextResponse.json(
      { error: "Error interno al ejecutar limpieza de almacenamiento." },
      { status: 500 }
    );
  }
}
