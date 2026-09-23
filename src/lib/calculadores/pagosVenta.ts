/**
 * Cálculo de saldo de una venta cobrada en varias veces (seña hoy, resto después).
 *
 * Reglas de plata que respeta este módulo:
 * - Todo se calcula con `Prisma.Decimal`, nunca con `number`. Un `0.1 + 0.2`
 *   en punto flotante deja un saldo de 0,00000000004 que hace que una venta
 *   pagada figure como PARCIAL para siempre.
 * - El total pagado se deriva SIEMPRE de las filas de pago. No hay un campo
 *   acumulado que pueda quedar desincronizado.
 * - Nada acá escribe en la base: son funciones puras, testeables solas.
 */

import { Prisma } from "@prisma/client";

export type EstadoPagoCalculado = "PENDIENTE" | "PARCIAL" | "PAGADO";

/** Cualquier forma en la que un importe llega desde Prisma, un form o la API. */
export type ImporteCrudo = Prisma.Decimal | number | string;

export interface PagoImputable {
  montoArs: ImporteCrudo;
}

/** Convierte a Decimal. Un valor no numérico es un error de programa, no un 0 silencioso. */
export function aDecimal(valor: ImporteCrudo): Prisma.Decimal {
  const d = new Prisma.Decimal(valor);
  if (!d.isFinite()) {
    throw new Error(`Importe inválido: ${String(valor)}`);
  }
  return d;
}

/** Suma de todos los cobros imputados a la venta. */
export function totalPagado(pagos: readonly PagoImputable[]): Prisma.Decimal {
  return pagos.reduce(
    (acumulado, pago) => acumulado.plus(aDecimal(pago.montoArs)),
    new Prisma.Decimal(0)
  );
}

/**
 * Lo que falta cobrar. Nunca negativo: si por algún motivo se cobró de más,
 * el saldo es 0 y el exceso se ve en el historial, no restando.
 */
export function saldoPendiente(
  total: ImporteCrudo,
  pagos: readonly PagoImputable[]
): Prisma.Decimal {
  const saldo = aDecimal(total).minus(totalPagado(pagos));
  return saldo.isNegative() ? new Prisma.Decimal(0) : saldo;
}

/**
 * Estado derivado del dinero efectivamente cobrado.
 * Se compara contra el total exacto: sin tolerancias, porque ambos lados son
 * Decimal con dos decimales y no hay error de redondeo que absorber.
 */
export function estadoDePago(
  total: ImporteCrudo,
  pagos: readonly PagoImputable[]
): EstadoPagoCalculado {
  const totalDec = aDecimal(total);
  const pagado = totalPagado(pagos);

  if (pagado.lessThanOrEqualTo(0)) return "PENDIENTE";
  if (pagado.greaterThanOrEqualTo(totalDec)) return "PAGADO";
  return "PARCIAL";
}

export interface ResultadoValidacion {
  ok: boolean;
  error?: string;
}

/**
 * Valida un cobro nuevo contra el saldo. Rechaza cobrar de más: si el cliente
 * paga por encima del saldo, es un error de carga o hay que corregir la venta,
 * no dejar la venta con un pagado mayor al total.
 */
export function validarMontoPago(
  monto: ImporteCrudo,
  saldo: ImporteCrudo
): ResultadoValidacion {
  let montoDec: Prisma.Decimal;
  try {
    montoDec = aDecimal(monto);
  } catch {
    return { ok: false, error: "El importe no es un número válido." };
  }

  const saldoDec = aDecimal(saldo);

  if (montoDec.lessThanOrEqualTo(0)) {
    return { ok: false, error: "El importe a cobrar tiene que ser mayor a cero." };
  }
  if (montoDec.decimalPlaces() > 2) {
    return { ok: false, error: "El importe no puede tener más de dos decimales." };
  }
  if (saldoDec.lessThanOrEqualTo(0)) {
    return { ok: false, error: "Esta venta ya está saldada." };
  }
  if (montoDec.greaterThan(saldoDec)) {
    return {
      ok: false,
      error: `El importe supera el saldo pendiente (${saldoDec.toFixed(2)}).`,
    };
  }
  return { ok: true };
}

/**
 * Importe de una seña por porcentaje, redondeado a dos decimales.
 * Se usa para los atajos del punto de venta (50 %, por ejemplo).
 * `ROUND_HALF_UP` es el redondeo comercial: 0,125 → 0,13.
 */
export function montoPorPorcentaje(
  total: ImporteCrudo,
  porcentaje: number
): Prisma.Decimal {
  if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) {
    throw new Error(`Porcentaje inválido: ${porcentaje}`);
  }
  return aDecimal(total)
    .times(porcentaje)
    .dividedBy(100)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/**
 * Importe que propone un atajo del punto de venta ("50 %", "el resto").
 *
 * Acota el porcentaje al saldo pendiente. Sin este tope aparece un error por un
 * centavo: con un total de 333,25 la seña del 50 % redondea a 166,63, el saldo
 * queda en 166,62, y al volver a tocar "50 %" el cobro se rechaza por superarlo.
 */
export function montoSugerido(
  total: ImporteCrudo,
  porcentaje: number,
  saldo: ImporteCrudo
): Prisma.Decimal {
  const propuesto = montoPorPorcentaje(total, porcentaje);
  const saldoDec = aDecimal(saldo);
  return propuesto.greaterThan(saldoDec) ? saldoDec : propuesto;
}
