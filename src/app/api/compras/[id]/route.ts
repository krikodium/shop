import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

class BadRequestError extends Error {}

/**
 * GET /api/compras/[id]
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orden = await prisma.ordenCompra.findUnique({
      where: { id },
      include: {
        proveedor: true,
        items: { include: { producto: true } },
      },
    });
    if (!orden) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }
    return NextResponse.json(orden);
  } catch (error) {
    console.error("Error obteniendo orden:", error);
    return NextResponse.json(
      { error: "Error al obtener orden" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/compras/[id]
 * Recibir mercadería: body: { recibir: [{ itemId, cantidadRecibida }] }
 * O cancelar: body: { estado: "CANCELADO" }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.estado === "CANCELADO") {
      const orden = await prisma.ordenCompra.update({
        where: { id },
        data: { estado: "CANCELADO" },
        include: { proveedor: true, items: { include: { producto: true } } },
      });
      return NextResponse.json(orden);
    }

    const recibir = body.recibir as Array<{ itemId: string; cantidadRecibida: number }> | undefined;
    if (!recibir || !Array.isArray(recibir)) {
      return NextResponse.json(
        { error: "recibir: [{ itemId, cantidadRecibida }] es requerido" },
        { status: 400 }
      );
    }

    const orden = await prisma.$transaction(async (tx) => {
      const ordenActual = await tx.ordenCompra.findUniqueOrThrow({
        where: { id },
        include: { items: true },
      });

      if (ordenActual.estado === "CANCELADO") {
        throw new BadRequestError("No se puede recibir una orden cancelada");
      }

      const itemIdsOrden = new Set(ordenActual.items.map((item) => item.id));
      const itemIdsInvalidos = recibir
        .map((item) => item.itemId)
        .filter((itemId) => !itemIdsOrden.has(itemId));

      if (itemIdsInvalidos.length > 0) {
        throw new BadRequestError("Hay items que no pertenecen a esta orden");
      }

      for (const r of recibir) {
        const item = ordenActual.items.find((i) => i.id === r.itemId);
        if (!item) continue;
        const pendiente = item.cantidad - item.cantidadRecibida;
        const cant = Math.min(Math.max(0, r.cantidadRecibida), pendiente);
        const cantActual = item.cantidadRecibida;
        const nuevaCantRecibida = cantActual + cant;

        await tx.itemOrdenCompra.update({
          where: { id: r.itemId },
          data: { cantidadRecibida: nuevaCantRecibida },
        });

        if (cant > 0) {
          const producto = await tx.producto.findUniqueOrThrow({
            where: { id: item.productoId },
          });
          const stockAnterior = producto.stockActual;
          const stockNuevo = stockAnterior + cant;
          const precioCompra = Number(item.precioUnitario);

          await tx.producto.update({
            where: { id: item.productoId },
            data: {
              stockActual: stockNuevo,
              precioCompra: new Prisma.Decimal(precioCompra),
            },
          });

          await tx.movimientoStock.create({
            data: {
              productoId: item.productoId,
              tipo: "ENTRADA_COMPRA",
              cantidad: cant,
              stockAnterior,
              stockNuevo,
              motivo: `Recepción orden ${ordenActual.numeroOrden}`,
              referencia: ordenActual.id,
            },
          });
        }
      }

      const ordenActualizada = await tx.ordenCompra.findUniqueOrThrow({
        where: { id },
        include: { items: true },
      });

      const todosRecibidos = ordenActualizada.items.every(
        (i) => i.cantidadRecibida >= i.cantidad
      );
      const algunoRecibido = ordenActualizada.items.some(
        (i) => i.cantidadRecibida > 0
      );

      let nuevoEstado: "PENDIENTE" | "PARCIAL" | "RECIBIDO" = "PENDIENTE";
      if (todosRecibidos) nuevoEstado = "RECIBIDO";
      else if (algunoRecibido) nuevoEstado = "PARCIAL";

      await tx.ordenCompra.update({
        where: { id },
        data: {
          estado: nuevoEstado,
          fechaRecepcion:
            nuevoEstado === "RECIBIDO" ? new Date() : ordenActualizada.fechaRecepcion,
        },
      });

      return tx.ordenCompra.findUniqueOrThrow({
        where: { id },
        include: {
          proveedor: true,
          items: { include: { producto: true } },
        },
      });
    });

    return NextResponse.json(orden);
  } catch (error) {
    console.error("Error recibiendo orden:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al recibir" },
      { status: error instanceof BadRequestError ? 400 : 500 }
    );
  }
}
