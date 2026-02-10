import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularPreviewRendicion } from "@/lib/calculadores/consignacionCalculator";
import { itemsNoRendidos } from "@/lib/consignacionHelpers";

/**
 * POST /api/consignacion/rendiciones/preview
 * Devuelve el preview de una rendición sin crearla.
 * Excluye ventas que ya fueron incluidas en rendiciones anteriores.
 * Body: { proveedorId, fechaDesde, fechaHasta }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { proveedorId, fechaDesde, fechaHasta } = body;

    if (!proveedorId || !fechaDesde || !fechaHasta) {
      return NextResponse.json(
        { error: "proveedorId, fechaDesde y fechaHasta son requeridos" },
        { status: 400 }
      );
    }

    const fDesde = new Date(fechaDesde);
    const fHasta = new Date(fechaHasta);

    const items = await itemsNoRendidos(proveedorId, fDesde, fHasta);

    const hayVentasEnPeriodo = await prisma.itemVenta.count({
      where: {
        esConsignacion: true,
        proveedorId,
        venta: { fecha: { gte: fDesde, lte: fHasta } },
      },
    });

    const itemsParaPreview = items.map((i) => ({
      ventaId: i.ventaId,
      productoNombre: i.productoNombre,
      productoSku: i.productoSku,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario,
      subtotal: i.subtotal,
      comisionShop: i.comisionShop,
      deudaProveedor: i.deudaProveedor,
    }));

    const preview = calcularPreviewRendicion(itemsParaPreview);

    const proveedor = await prisma.proveedor.findUnique({
      where: { id: proveedorId },
      select: { nombre: true },
    });

    return NextResponse.json({
      ...preview,
      proveedorNombre: proveedor?.nombre ?? "",
      fechaDesde: fDesde.toISOString(),
      fechaHasta: fHasta.toISOString(),
      todasRendidas: hayVentasEnPeriodo > 0 && items.length === 0,
    });
  } catch (error) {
    console.error("Error en preview de rendición:", error);
    return NextResponse.json(
      { error: "Error al calcular preview" },
      { status: 500 }
    );
  }
}
