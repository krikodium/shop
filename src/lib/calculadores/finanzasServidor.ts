import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
export const dinero = (valor: Prisma.Decimal.Value) =>
  new Prisma.Decimal(valor).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
export const huella = (valor: unknown) =>
  createHash("sha256").update(JSON.stringify(valor)).digest("hex");
export function validarMoneda(p: {
  montoArs: Prisma.Decimal.Value;
  montoUsd?: Prisma.Decimal.Value | null;
  cotizacionUsd?: Prisma.Decimal.Value | null;
}) {
  const ars = dinero(p.montoArs);
  if (p.montoUsd != null) {
    const usd = dinero(p.montoUsd);
    const tc = new Prisma.Decimal(p.cotizacionUsd ?? 0);
    if (usd.lte(0) || tc.lte(0) || tc.gt("99999999") || tc.decimalPlaces() > 4)
      throw new Error("Dólares y cotización deben ser positivos y válidos");
    if (!dinero(usd.times(tc)).eq(ars))
      throw new Error(
        "El importe ARS debe coincidir con USD por cotización, redondeado a dos decimales",
      );
  } else if (p.cotizacionUsd != null)
    throw new Error("La cotización requiere un importe USD");
}
export async function serializable<T>(
  operacion: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  const { prisma } = await import("@/lib/prisma");
  for (let intento = 0; ; intento++) {
    try {
      return await prisma.$transaction(operacion, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 20000,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(error.code) &&
        intento < 2
      )
        continue;
      throw error;
    }
  }
}
