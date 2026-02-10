import type { Prisma } from "@prisma/client";

// Re-exportar enums y tipos útiles de Prisma
export type { Proveedor, Producto, Venta, ItemVenta, Rendicion, Cliente } from "@prisma/client";
export { TipoProveedor, MetodoPago, EstadoPago, EstadoRendicion } from "@prisma/client";

// Item de venta para el carrito (antes de persistir)
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

// Resultado del cálculo de costos por item
export interface CostosItemVenta {
  costoUnitario: number;
  costoTotal: number;
  esConsignacion: boolean;
  deudaProveedor: number;
  comisionShop: number;
  proveedorId: string | null;
}

// Totales de una venta
export interface TotalesVenta {
  subtotal: number;
  total: number;
  costoTotal: number;
  deudaConsignacion: number;
  gananciaBruta: number;
  margenPorcentaje: number;
}

// Producto con proveedor para cálculos
export type ProductoConProveedor = Prisma.ProductoGetPayload<{
  include: { proveedor: true };
}>;
