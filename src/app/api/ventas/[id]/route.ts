import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { serializable, dinero } from "@/lib/calculadores/finanzasServidor";
import { z } from "zod";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // El detalle expone costo y margen por producto: no puede ser público.
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const venta = await prisma.venta.findUnique({
      where: { id },
      include: {
        items: true,
        cliente: true,
        pedido: { select: { id: true } },
      },
    });
    if (!venta) {
      return NextResponse.json(
        { error: "Venta no encontrada" },
        { status: 404 },
      );
    }
    return NextResponse.json(venta);
  } catch (error) {
    console.error("Error obteniendo venta:", error);
    return NextResponse.json(
      { error: "Error al obtener venta" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo administradores pueden anular ventas" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = z
      .object({
        accion: z.literal("anular"),
        motivo: z.string().trim().min(5).max(1000),
      })
      .parse(await request.json());
    const accion = body.accion;

    if (accion !== "anular") {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    await serializable(async (tx) => {
      const venta = await tx.venta.findUnique({
        where: { id },
        include: { items: true, cliente: true, pagos: true, pedido: true },
      });
      if (!venta) throw new Error("Venta no encontrada");
      if (venta.anulada) throw new Error("La venta ya está anulada");
      if (venta.pedido)
        throw new Error(
          "Los pedidos requieren cancelación por ítem y devolución trazable; no pueden anularse como venta inmediata",
        );
      if (venta.pagos.length)
        throw new Error(
          "No se puede anular una venta cobrada sin registrar antes su devolución",
        );
      // 1. Marcar venta como anulada
      await tx.venta.update({
        where: { id },
        data: {
          anulada: true,
          notas: `${venta.notas ?? ""}\nAnulada por ${session.user.id}: ${body.motivo}`,
        },
      });

      // 2. Devolver stock y crear movimientos
      for (const item of venta.items) {
        const producto = await tx.producto.findUniqueOrThrow({
          where: { id: item.productoId },
        });
        const stockAnterior = producto.stockActual;
        const stockNuevo = stockAnterior + item.cantidad;

        await tx.producto.update({
          where: { id: item.productoId },
          data: { stockActual: stockNuevo },
        });

        await tx.movimientoStock.create({
          data: {
            productoId: item.productoId,
            tipo: "ENTRADA_DEVOLUCION",
            cantidad: item.cantidad,
            stockAnterior,
            stockNuevo,
            motivo: `Anulación venta ${venta.numeroVenta}`,
            referencia: venta.id,
            usuario: session.user?.name ?? session.user?.email ?? null,
          },
        });
      }

      // 3. Revertir estadísticas del cliente
      if (venta.clienteId) {
        const cliente = await tx.cliente.findUnique({
          where: { id: venta.clienteId },
        });
        if (cliente) {
          const nuevoTotal = Prisma.Decimal.max(
            0,
            cliente.totalCompras.minus(venta.total),
          );
          const nuevaCantidad = Math.max(0, cliente.cantidadCompras - 1);
          const nuevoTicketProm =
            nuevaCantidad > 0
              ? dinero(nuevoTotal.div(nuevaCantidad))
              : dinero(0);

          let ultimaCompra: Date | null = cliente.ultimaCompra;
          if (cliente.ultimaCompra && venta.fecha) {
            const fechaVenta = new Date(venta.fecha);
            if (
              fechaVenta.getTime() >= new Date(cliente.ultimaCompra).getTime()
            ) {
              const otrasVentas = await tx.venta.findMany({
                where: {
                  clienteId: venta.clienteId,
                  id: { not: venta.id },
                  anulada: false,
                },
                orderBy: { fecha: "desc" },
                take: 1,
                select: { fecha: true },
              });
              ultimaCompra = otrasVentas[0]?.fecha ?? null;
            }
          }

          await tx.cliente.update({
            where: { id: venta.clienteId },
            data: {
              totalCompras: new Prisma.Decimal(nuevoTotal),
              cantidadCompras: nuevaCantidad,
              ticketPromedio: new Prisma.Decimal(nuevoTicketProm),
              ultimaCompra,
            },
          });
        }
      }
    });

    return NextResponse.json({
      ok: true,
      mensaje: "Venta anulada correctamente",
    });
  } catch (error) {
    if (error instanceof Error && !("code" in error))
      return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Error anulando venta:", error);
    return NextResponse.json(
      { error: "Error al anular la venta" },
      { status: 500 },
    );
  }
}
