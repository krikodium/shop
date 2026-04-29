import type { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

/**
 * Si la BD no tiene aún las columnas de pago dividido, el findMany falla.
 * Reintenta sin esas columnas para que dashboard/reportes sigan mostrando datos.
 */
export async function ventaFindManySafe<TFull extends object, TBasic extends object>(
  prisma: PrismaClient,
  options: {
    where: Prisma.VentaWhereInput;
    orderBy?: Prisma.VentaOrderByWithRelationInput | Prisma.VentaOrderByWithRelationInput[];
    take?: number;
    selectFull: Prisma.VentaSelect;
    selectBasic: Prisma.VentaSelect;
    mapBasic: (rows: TBasic[]) => TFull[];
  }
): Promise<TFull[]> {
  const { where, orderBy, take, selectFull, selectBasic, mapBasic } = options;
  try {
    const rows = await prisma.venta.findMany({
      where,
      ...(orderBy ? { orderBy } : {}),
      ...(take != null ? { take } : {}),
      select: selectFull,
    });
    return rows as unknown as TFull[];
  } catch (err) {
    console.warn(
      "[ventaFindManySafe] select completo falló (¿migración pago dividido?). Reintento básico.",
      err
    );
    const rows = await prisma.venta.findMany({
      where,
      ...(orderBy ? { orderBy } : {}),
      ...(take != null ? { take } : {}),
      select: selectBasic,
    });
    return mapBasic(rows as unknown as TBasic[]);
  }
}
