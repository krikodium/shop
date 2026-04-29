/**
 * Procesa una venta completa: crea registro, items, actualiza stock y movimientos.
 * Usa transacción para garantizar consistencia.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface ItemVentaInput {
  productoId: string;
  productoNombre: string;
  productoSku: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  costoUnitario: number;
  costoTotal: number;
  esConsignacion: boolean;
  deudaProveedor: number | null;
  comisionShop: number | null;
  proveedorId: string | null;
}

export interface VentaInput {
  clienteId?: string | null;
  clienteNombre?: string;
  items: ItemVentaInput[];
  descuento: number;
  metodoPago: string;
  notas?: string;
  usuarioId?: string | null;
  ignorarStock?: boolean;
  metodoPagoSecundario?: string | null;
  montoPago1Ars?: number | null;
  montoPago2Ars?: number | null;
  usdPago1?: number | null;
  usdPago2?: number | null;
  cotizacionUsd?: number | null;
}

export async function procesarVenta(input: VentaInput) {
  return prisma.$transaction(async (tx) => {
    // 1. Generar número de venta
    const ultimaVenta = await tx.venta.findFirst({
      orderBy: { createdAt: "desc" },
      select: { numeroVenta: true },
    });

    let siguienteNum = 1;
    if (ultimaVenta?.numeroVenta) {
      const match = ultimaVenta.numeroVenta.match(/V-(\d+)/);
      if (match) siguienteNum = parseInt(match[1], 10) + 1;
    }
    const numeroVenta = `V-${String(siguienteNum).padStart(5, "0")}`;

    // 2. Validar stock y preparar datos
    const subtotal = input.items.reduce((s, i) => s + i.subtotal, 0);
    const total = Math.max(0, subtotal - input.descuento);
    const costoTotal = input.items.reduce((s, i) => s + i.costoTotal, 0);
    const deudaConsignacion = input.items
      .filter((i) => i.esConsignacion)
      .reduce((s, i) => s + (i.deudaProveedor ?? 0), 0);
    const gananciaBruta = total - costoTotal;
    const margenPorcentaje = total > 0 ? (gananciaBruta / total) * 100 : 0;

    for (const item of input.items) {
      const producto = await tx.producto.findUnique({
        where: { id: item.productoId },
      });
      if (!producto) {
        throw new Error(`Producto no encontrado: ${item.productoNombre}`);
      }
      if (!input.ignorarStock && producto.stockActual < item.cantidad) {
        throw new Error(
          `Stock insuficiente para ${item.productoNombre}. Disponible: ${producto.stockActual}`
        );
      }
    }

    // 3. Crear venta — con el adapter/driver actual Prisma solo acepta relaciones (cliente/user), no FKs sueltas
    const venta = await tx.venta.create({
      data: {
        numeroVenta,
        ...(input.clienteId
          ? { cliente: { connect: { id: input.clienteId } } }
          : {}),
        ...(input.usuarioId
          ? { user: { connect: { id: input.usuarioId } } }
          : {}),
        clienteNombre: input.clienteNombre ?? null,
        subtotal: new Prisma.Decimal(subtotal),
        descuento: new Prisma.Decimal(input.descuento),
        total: new Prisma.Decimal(total),
        costoTotal: new Prisma.Decimal(costoTotal),
        gananciaBruta: new Prisma.Decimal(gananciaBruta),
        margenPorcentaje: new Prisma.Decimal(margenPorcentaje),
        deudaConsignacion: new Prisma.Decimal(deudaConsignacion),
        metodoPago: input.metodoPago as "EFECTIVO" | "TARJETA_DEBITO" | "TARJETA_CREDITO" | "TRANSFERENCIA" | "MERCADOPAGO" | "MULTIPLE",
        estadoPago: "PAGADO",
        notas: input.notas ?? null,
        metodoPagoSecundario: input.metodoPagoSecundario
          ? (input.metodoPagoSecundario as
              | "EFECTIVO"
              | "TARJETA_DEBITO"
              | "TARJETA_CREDITO"
              | "TRANSFERENCIA"
              | "MERCADOPAGO")
          : null,
        montoPago1Ars:
          input.montoPago1Ars != null ? new Prisma.Decimal(input.montoPago1Ars) : null,
        montoPago2Ars:
          input.montoPago2Ars != null ? new Prisma.Decimal(input.montoPago2Ars) : null,
        usdPago1: input.usdPago1 != null ? new Prisma.Decimal(input.usdPago1) : null,
        usdPago2: input.usdPago2 != null ? new Prisma.Decimal(input.usdPago2) : null,
        cotizacionUsd:
          input.cotizacionUsd != null ? new Prisma.Decimal(input.cotizacionUsd) : null,
      },
    });

    // 4. Crear items y actualizar stock
    for (const item of input.items) {
      const producto = await tx.producto.findUniqueOrThrow({
        where: { id: item.productoId },
      });
      const stockAnterior = producto.stockActual;
      const stockNuevo = stockAnterior - item.cantidad;

      await tx.itemVenta.create({
        data: {
          ventaId: venta.id,
          productoId: item.productoId,
          productoNombre: item.productoNombre,
          productoSku: item.productoSku,
          cantidad: item.cantidad,
          precioUnitario: new Prisma.Decimal(item.precioUnitario),
          subtotal: new Prisma.Decimal(item.subtotal),
          costoUnitario: new Prisma.Decimal(item.costoUnitario),
          costoTotal: new Prisma.Decimal(item.costoTotal),
          esConsignacion: item.esConsignacion,
          deudaProveedor: item.deudaProveedor != null ? new Prisma.Decimal(item.deudaProveedor) : null,
          comisionShop: item.comisionShop != null ? new Prisma.Decimal(item.comisionShop) : null,
          proveedorId: item.proveedorId,
        },
      });

      await tx.producto.update({
        where: { id: item.productoId },
        data: { stockActual: stockNuevo },
      });

      await tx.movimientoStock.create({
        data: {
          productoId: item.productoId,
          tipo: "SALIDA_VENTA",
          cantidad: -item.cantidad,
          stockAnterior,
          stockNuevo,
          motivo: `Venta ${numeroVenta}`,
          referencia: venta.id,
        },
      });
    }

    // 5. Actualizar estadísticas del cliente si existe
    if (input.clienteId) {
      const cliente = await tx.cliente.findUnique({ where: { id: input.clienteId } });
      if (cliente) {
        const nuevoTotal = Number(cliente.totalCompras) + total;
        const nuevaCantidad = cliente.cantidadCompras + 1;
        const nuevoTicketProm = nuevaCantidad > 0 ? nuevoTotal / nuevaCantidad : 0;
        await tx.cliente.update({
          where: { id: input.clienteId },
          data: {
            totalCompras: new Prisma.Decimal(nuevoTotal),
            cantidadCompras: nuevaCantidad,
            ticketPromedio: new Prisma.Decimal(nuevoTicketProm),
            ultimaCompra: venta.fecha,
          },
        });
      }
    }

    return tx.venta.findUniqueOrThrow({
      where: { id: venta.id },
      include: { items: true, cliente: true },
    });
  });
}
