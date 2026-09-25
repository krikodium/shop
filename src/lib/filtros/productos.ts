import type { Prisma } from "@prisma/client";

/**
 * Filtros crudos tal como llegan de la query string de `GET /api/productos`.
 * Todos son `string | null` porque salen de `searchParams.get()`.
 */
export interface FiltrosProductos {
  categoriaId?: string | null;
  proveedorId?: string | null;
  enConsignacion?: string | null;
  stockBajo?: string | null;
  activo?: string | null;
  q?: string | null;
}

/**
 * Arma el `where` de Prisma para el listado de productos.
 *
 * Regla de proveedor: en este sistema un producto puede pertenecer a un
 * proveedor de dos formas — como proveedor principal (`producto.proveedorId`)
 * o a través de una de sus partes (`producto.partesProveedor[]`). Al comprarle
 * a un proveedor tienen que aparecer **las dos**, si no los productos armados
 * por partes se vuelven invisibles y no se les puede comprar el repuesto.
 *
 * Los dos filtros que producen un `OR` (proveedor y texto) se combinan dentro
 * de un `AND` explícito: si se dejaran como dos claves `OR` al mismo nivel del
 * objeto, la segunda pisaría a la primera y buscar texto con proveedor
 * seleccionado devolvería productos de cualquier proveedor.
 *
 * Esta función es de **filtrado**: no toca importes, costos ni redondeos.
 */
export function construirWhereProductos(
  filtros: FiltrosProductos
): Prisma.ProductoWhereInput {
  const { categoriaId, proveedorId, enConsignacion, stockBajo, activo, q } = filtros;

  const condiciones: Prisma.ProductoWhereInput[] = [];

  if (proveedorId) {
    condiciones.push({
      OR: [{ proveedorId }, { partesProveedor: { some: { proveedorId } } }],
    });
  }

  const texto = q?.trim();
  if (texto) {
    condiciones.push({
      OR: [
        { nombre: { contains: texto, mode: "insensitive" } },
        { sku: { contains: texto, mode: "insensitive" } },
      ],
    });
  }

  return {
    ...(categoriaId ? { categoriaId } : {}),
    ...(enConsignacion === "true" ? { enConsignacion: true } : {}),
    ...(enConsignacion === "false" ? { enConsignacion: false } : {}),
    ...(activo !== "false" ? { activo: true } : {}),
    ...(stockBajo === "sin" ? { stockActual: 0 } : {}),
    ...(condiciones.length > 0 ? { AND: condiciones } : {}),
  };
}
