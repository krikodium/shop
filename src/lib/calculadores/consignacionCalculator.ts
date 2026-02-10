/**
 * Lógica de generación de rendiciones a proveedores.
 * Agrupa items de consignación por proveedor y período.
 */

import type { ItemVenta } from "@prisma/client";

export interface DetalleItemRendicion {
  ventaId: string;
  productoNombre: string;
  productoSku: string;
  cantidad: number;
  precioVenta: number;
  totalVenta: number;
  comisionShop: number | null;
  montoProveedor: number;
}

export interface PreviewRendicion {
  totalVendido: number;
  comisionShop: number;
  totalARendir: number;
  items: DetalleItemRendicion[];
}

const toNum = (v: unknown): number => (v != null ? Number(v) : 0);

/**
 * Genera el preview de una rendición a partir de items de venta.
 */
export function calcularPreviewRendicion(
  items: Array<{
    ventaId: string;
    productoNombre: string;
    productoSku: string;
    cantidad: number;
    precioUnitario: unknown;
    subtotal: unknown;
    comisionShop: unknown;
    deudaProveedor: unknown;
  }>
): PreviewRendicion {
  const detalleItems: DetalleItemRendicion[] = items.map((item) => {
    const totalVenta = toNum(item.subtotal);
    const montoProveedor = toNum(item.deudaProveedor);
    return {
      ventaId: item.ventaId,
      productoNombre: item.productoNombre,
      productoSku: item.productoSku,
      cantidad: item.cantidad,
      precioVenta: toNum(item.precioUnitario),
      totalVenta,
      comisionShop: item.comisionShop != null ? toNum(item.comisionShop) : null,
      montoProveedor,
    };
  });

  const totalVendido = detalleItems.reduce((s, i) => s + i.totalVenta, 0);
  const totalARendir = detalleItems.reduce((s, i) => s + i.montoProveedor, 0);
  const comisionShop = totalVendido - totalARendir;

  return {
    totalVendido,
    comisionShop,
    totalARendir,
    items: detalleItems,
  };
}
