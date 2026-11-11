import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTasaBcvOficial, getTasaBcvPorFecha } from "@/lib/bcv";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "No autorizado. Se requiere una sesión activa." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get("fecha");

    const data = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)
      ? await getTasaBcvPorFecha(fecha)
      : await getTasaBcvOficial();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error en API /api/bcv:", error);
    return NextResponse.json(
      { success: false, error: "Error al consultar la tasa oficial BCV." },
      { status: 500 }
    );
  }
}
