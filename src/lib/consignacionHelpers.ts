/**
 * Excluye items de ventas que ya fueron incluidas en rendiciones anteriores.
 * Una venta está "rendida" si su fecha cae dentro del rango [fechaDesde, fechaHasta]
 * de alguna rendición previa del mismo proveedor.
 */

import { prisma } from "@/lib/prisma";

/** Items de consignación en un período que aún no fueron rendidos */
export async function itemsNoRendidos(
  proveedorId: string,
  fechaDesde: Date,
  fechaHasta: Date
) {
  const [items, rendicionesPrevias] = await Promise.all([
    prisma.itemVenta.findMany({
      where: {
        esConsignacion: true,
        proveedorId,
        venta: {
          fecha: { gte: fechaDesde, lte: fechaHasta },
        },
      },
      select: {
        id: true,
        ventaId: true,
        venta: { select: { fecha: true } },
        productoNombre: true,
        productoSku: true,
        cantidad: true,
        precioUnitario: true,
        subtotal: true,
        comisionShop: true,
        deudaProveedor: true,
      },
    }),
    prisma.rendicion.findMany({
      where: { proveedorId },
      select: { fechaDesde: true, fechaHasta: true },
    }),
  ]);

  const filtrados = items.filter((item) => {
    const ventaFecha = item.venta.fecha;
    const yaRendido = rendicionesPrevias.some(
      (r) =>
        ventaFecha >= r.fechaDesde &&
        ventaFecha <= r.fechaHasta
    );
    return !yaRendido;
  });

  return filtrados;
}

/** Items de consignación que aún no fueron incluidos en ninguna rendición (para deuda pendiente) */
export async function itemsDeudaPendiente(proveedorId: string) {
  const [items, rendicionesPrevias] = await Promise.all([
    prisma.itemVenta.findMany({
      where: {
        esConsignacion: true,
        proveedorId,
      },
      select: {
        deudaProveedor: true,
        subtotal: true,
        venta: { select: { fecha: true } },
      },
    }),
    prisma.rendicion.findMany({
      where: { proveedorId },
      select: { fechaDesde: true, fechaHasta: true },
    }),
  ]);

  const filtrados = items.filter((item) => {
    const ventaFecha = item.venta.fecha;
    const yaRendido = rendicionesPrevias.some(
      (r) =>
        ventaFecha >= r.fechaDesde &&
        ventaFecha <= r.fechaHasta
    );
    return !yaRendido;
  });

  return filtrados;
}
