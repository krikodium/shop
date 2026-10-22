import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ventaSchema } from "@/lib/validaciones/ventaSchema";
import { procesarVenta } from "@/lib/procesarVenta";

export async function GET(request: Request) {
  try {
    // Sin esto el listado es público: devuelve costos, ganancia y margen de las
    // últimas 100 ventas, o sea el esquema de costos del negocio.
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const incluirAnuladas = searchParams.get("incluirAnuladas") === "true";

    const ventas = await prisma.venta.findMany({
      where: {
        ...(incluirAnuladas ? {} : { anulada: false }),
        ...(fechaDesde || fechaHasta
          ? {
              fecha: {
                ...(fechaDesde ? { gte: new Date(fechaDesde) } : {}),
                ...(fechaHasta ? { lte: new Date(fechaHasta) } : {}),
              },
            }
          : {}),
      },
      include: {
        items: true,
        cliente: true,
        pagos: true,
        pedido: true,
      },
      orderBy: { fecha: "desc" },
      take: 100,
    });
    return NextResponse.json(ventas);
  } catch (error) {
    console.error("Error listando ventas:", error);
    return NextResponse.json(
      { error: "Error al listar ventas" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    // Antes de leer el cuerpo: sin sesión, un curl podía crear una venta real,
    // descontar stock y registrar plata cobrada sin nadie que responda por ella.
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (session.user.role === "VIEWER") {
      return NextResponse.json(
        { error: "Tu usuario es de solo lectura: no puede registrar ventas." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const data = ventaSchema.parse(body);
    const venta = await procesarVenta({ ...data, usuarioId: session.user.id });

    return NextResponse.json(venta, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (!("code" in error) && !("issues" in error)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if ("issues" in error) {
        return NextResponse.json(
          { error: "Datos inválidos", details: error },
          { status: 400 },
        );
      }
    }
    console.error("Error creando venta:", error);
    return NextResponse.json(
      { error: "Error al procesar la venta" },
      { status: 500 },
    );
  }
}
