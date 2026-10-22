import { Prisma } from "@prisma/client";
type Importe = Prisma.Decimal | string | number;
type VentaResumen = { total: Importe; gananciaBruta: Importe; pagos: { montoArs: Importe }[] };
type CobroResumen = { montoArs: Importe; montoUsd: Importe | null; metodoPago: string };
const cero = () => new Prisma.Decimal(0);
export const dinero = (valor: Importe) => new Prisma.Decimal(valor).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
export function sumarImportes(importes: Importe[]): Prisma.Decimal {
  return importes.reduce<Prisma.Decimal>((suma, valor) => suma.plus(valor), cero());
}
/** Vendido pertenece a fecha de venta; cobrado pertenece a fecha efectiva del pago. */
export function resumenVentas(ventas: VentaResumen[]) {
  const total = sumarImportes(ventas.map(v => v.total));
  const cobrado = sumarImportes(ventas.flatMap(v => v.pagos.map(p => p.montoArs)));
  const saldo = sumarImportes(ventas.map(v => Prisma.Decimal.max(0,
    new Prisma.Decimal(v.total).minus(sumarImportes(v.pagos.map(p => p.montoArs))))));
  return {
    totalVentas: dinero(total).toFixed(2), totalGanancia: dinero(sumarImportes(ventas.map(v => v.gananciaBruta))).toFixed(2),
    totalCobradoVentas: dinero(cobrado).toFixed(2), saldoPendiente: dinero(saldo).toFixed(2), cantidadVentas: ventas.length,
  };
}
export function resumenCobros(cobros: CobroResumen[]) {
  const porMetodo: Record<string, { total: string; cantidad: number }> = {};
  for (const cobro of cobros) {
    const anterior = porMetodo[cobro.metodoPago] ?? { total: "0.00", cantidad: 0 };
    porMetodo[cobro.metodoPago] = {
      total: dinero(new Prisma.Decimal(anterior.total).plus(cobro.montoArs)).toFixed(2), cantidad: anterior.cantidad + 1,
    };
  }
  return {
    totalCobrado: dinero(sumarImportes(cobros.map(p => p.montoArs))).toFixed(2),
    totalUsd: dinero(sumarImportes(cobros.map(p => p.montoUsd ?? 0))).toFixed(2),
    cantidadConUsd: cobros.filter(p => new Prisma.Decimal(p.montoUsd ?? 0).gt(0)).length, porMetodo,
  };
}
