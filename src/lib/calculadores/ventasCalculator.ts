/**
 * Cálculo de costos y márgenes para ventas.
 * Lógica crítica: productos regulares vs productos en consignación.
 */

import type { CostosItemVenta, TotalesVenta } from "@/types";
import type { ProductoConProveedor } from "@/types";

const toNum = (v: unknown): number => (v != null ? Number(v) : 0);

/**
 * Calcula costos por item según tipo de producto (regular o consignación).
 * En consignación: costo = lo que se le debe al proveedor (precioVenta * % proveedor).
 */
export function calcularCostosItemVenta(
  producto: ProductoConProveedor,
  cantidad: number
): CostosItemVenta {
  const precioVenta = toNum(producto.precioVenta);
  const esConsignacion = producto.enConsignacion ?? false;

  let costoUnitario: number;
  let deudaProveedor = 0;
  let comisionShop = 0;
  const proveedorId = producto.proveedorId ?? null;

  if (esConsignacion) {
    // % que se queda el shop: producto > proveedor > 30 default
    const comisionPorcentaje =
      toNum(producto.comisionConsignacion) ||
      (producto.proveedor ? toNum(producto.proveedor.comisionPorDefecto) : 0) ||
      30;

    comisionShop = comisionPorcentaje;
    const porcentajeProveedor = 100 - comisionPorcentaje;
    deudaProveedor = (precioVenta * porcentajeProveedor) / 100;
    costoUnitario = deudaProveedor;
  } else {
    // Producto regular: costo = precio de compra
    costoUnitario = toNum(producto.precioCompra) || 0;
  }

  return {
    costoUnitario,
    costoTotal: costoUnitario * cantidad,
    esConsignacion,
    deudaProveedor: deudaProveedor * cantidad,
    comisionShop,
    proveedorId,
  };
}

/**
 * Calcula totales de la venta a partir de los items y el descuento.
 */
export function calcularTotalesVenta(
  items: Array<{
    subtotal: number;
    costoTotal: number;
    deudaProveedor: number | null;
    esConsignacion: boolean;
  }>,
  descuento: number
): TotalesVenta {
  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const total = Math.max(0, subtotal - descuento);
  const costoTotal = items.reduce((sum, i) => sum + i.costoTotal, 0);
  const deudaConsignacion = items
    .filter((i) => i.esConsignacion)
    .reduce((sum, i) => sum + (i.deudaProveedor ?? 0), 0);
  const gananciaBruta = total - costoTotal;
  const margenPorcentaje = total > 0 ? (gananciaBruta / total) * 100 : 0;

  return {
    subtotal,
    total,
    costoTotal,
    deudaConsignacion,
    gananciaBruta,
    margenPorcentaje,
  };
}
