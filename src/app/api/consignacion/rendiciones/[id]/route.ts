import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/consignacion/rendiciones/[id]
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
    return NextResponse.json(rendicion);
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
