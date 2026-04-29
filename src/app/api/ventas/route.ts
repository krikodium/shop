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
    const ignorarStock = body.ignorarStock === true;

    const subtotal = data.items.reduce((s, i) => s + i.subtotal, 0);
    const totalVenta = Math.max(0, subtotal - data.descuento);

    if (data.metodoPagoSecundario) {
      if (data.metodoPago === "MULTIPLE") {
        return NextResponse.json(
          { error: "Con dos pagos, elegí un método concreto en el primer tramo (no «Múltiple»)" },
          { status: 400 }
        );
      }
      if (data.montoPago1Ars == null || data.montoPago2Ars == null) {
        return NextResponse.json(
          { error: "Indicá el monto en pesos de cada pago" },
          { status: 400 }
        );
      }
      const suma = data.montoPago1Ars + data.montoPago2Ars;
      if (Math.abs(suma - totalVenta) > 0.05) {
        return NextResponse.json(
          {
            error: `Los montos deben sumar el total de la venta (${totalVenta.toFixed(2)} ARS). Suma actual: ${suma.toFixed(2)}`,
          },
          { status: 400 }
        );
      }
      const hayUsd =
        (data.usdPago1 != null && data.usdPago1 > 0) ||
        (data.usdPago2 != null && data.usdPago2 > 0);
      if (hayUsd && (!data.cotizacionUsd || data.cotizacionUsd <= 0)) {
        return NextResponse.json(
          { error: "Indicá la cotización (ARS por USD) cuando registrás montos en dólares" },
          { status: 400 }
        );
      }
    }

    const session = await auth();
    const venta = await procesarVenta({
      clienteId: data.clienteId ?? null,
      clienteNombre: data.clienteNombre,
      items: data.items,
      descuento: data.descuento,
      metodoPago: data.metodoPago,
      notas: data.notas,
      usuarioId: session?.user?.id ?? null,
      ignorarStock,
      metodoPagoSecundario: data.metodoPagoSecundario ?? null,
      montoPago1Ars: data.montoPago1Ars ?? null,
      montoPago2Ars: data.montoPago2Ars ?? null,
      usdPago1: data.usdPago1 ?? null,
      usdPago2: data.usdPago2 ?? null,
      cotizacionUsd: data.cotizacionUsd ?? null,
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
