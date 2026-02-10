import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ventaSchema } from "@/lib/validaciones/ventaSchema";
import { procesarVenta } from "@/lib/procesarVenta";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");

    const ventas = await prisma.venta.findMany({
      where: {
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
      },
      orderBy: { fecha: "desc" },
      take: 100,
    });
    return NextResponse.json(ventas);
  } catch (error) {
    console.error("Error listando ventas:", error);
    return NextResponse.json(
      { error: "Error al listar ventas" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = ventaSchema.parse(body);

    const session = await auth();
    const venta = await procesarVenta({
      clienteId: data.clienteId ?? null,
      clienteNombre: data.clienteNombre,
      items: data.items,
      descuento: data.descuento,
      metodoPago: data.metodoPago,
      notas: data.notas,
      usuarioId: session?.user?.id ?? null,
    });

    return NextResponse.json(venta, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Stock insuficiente") || error.message.includes("Producto no encontrado")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if ("issues" in error) {
        return NextResponse.json(
          { error: "Datos inválidos", details: error },
          { status: 400 }
        );
      }
    }
    console.error("Error creando venta:", error);
    return NextResponse.json(
      { error: "Error al procesar la venta" },
      { status: 500 }
    );
  }
}
