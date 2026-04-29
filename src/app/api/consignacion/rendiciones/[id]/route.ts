import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { totalesPendientesPosterioresACierre } from "@/lib/consignacionHelpers";

/**
 * GET /api/consignacion/rendiciones/[id]
 * Incluye `contexto`: deuda por ventas posteriores al período y otras rendiciones del mismo mes (fecha de generación).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rendicion = await prisma.rendicion.findUnique({
      where: { id },
      include: { proveedor: true },
    });
    if (!rendicion) {
      return NextResponse.json(
        { error: "Rendición no encontrada" },
        { status: 404 }
      );
    }

    const [posteriores, otrasMismoMes] = await Promise.all([
      totalesPendientesPosterioresACierre(
        rendicion.proveedorId,
        rendicion.fechaHasta
      ),
      (() => {
        const fr = new Date(rendicion.fechaRendicion);
        const y = fr.getFullYear();
        const m = fr.getMonth();
        const inicioMes = new Date(y, m, 1, 0, 0, 0, 0);
        const finMes = new Date(y, m + 1, 0, 23, 59, 59, 999);
        return prisma.rendicion.findMany({
          where: {
            proveedorId: rendicion.proveedorId,
            id: { not: id },
            fechaRendicion: { gte: inicioMes, lte: finMes },
          },
          select: {
            id: true,
            numeroRendicion: true,
            fechaDesde: true,
            fechaHasta: true,
            fechaRendicion: true,
            totalARendir: true,
          },
          orderBy: { fechaRendicion: "asc" },
        });
      })(),
    ]);

    return NextResponse.json({
      ...rendicion,
      contexto: {
        deudaPendientePosterior: posteriores.deudaPendiente,
        totalVendidoBrutoPosterior: posteriores.totalVendidoBruto,
        otrasRendicionesMismoMesGeneracion: otrasMismoMes.map((r) => ({
          id: r.id,
          numeroRendicion: r.numeroRendicion,
          fechaDesde: r.fechaDesde.toISOString(),
          fechaHasta: r.fechaHasta.toISOString(),
          fechaRendicion: r.fechaRendicion.toISOString(),
          totalARendir: Number(r.totalARendir),
        })),
      },
    });
  } catch (error) {
    console.error("Error obteniendo rendición:", error);
    return NextResponse.json(
      { error: "Error al obtener rendición" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/consignacion/rendiciones/[id]
 * Marcar como pagada.
 * Body: { estado: "PAGADO", metodoPago?, fechaPago? }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { estado, metodoPago, fechaPago } = body;

    const rendicion = await prisma.rendicion.update({
      where: { id },
      data: {
        ...(estado && { estado: estado as "PENDIENTE" | "PAGADO" | "PARCIAL" }),
        ...(metodoPago && { metodoPago: metodoPago as "EFECTIVO" | "TARJETA_DEBITO" | "TARJETA_CREDITO" | "TRANSFERENCIA" | "MERCADOPAGO" | "MULTIPLE" }),
        ...(fechaPago && { fechaPago: new Date(fechaPago) }),
      },
      include: { proveedor: true },
    });

    return NextResponse.json(rendicion);
  } catch (error) {
    console.error("Error actualizando rendición:", error);
    return NextResponse.json(
      { error: "Error al actualizar rendición" },
      { status: 500 }
    );
  }
}
