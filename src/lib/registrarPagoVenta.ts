/**
 * Registro de un cobro contra una venta (seña, cuota, saldo final).
 *
 * Garantías:
 * - **Atómico**: crear el pago y actualizar el estado de la venta ocurre en una
 *   sola transacción. Nunca queda un pago sin que el estado lo refleje.
 * - **Sin sobrecobro por carrera**: la transacción corre en nivel `Serializable`,
 *   así dos cobros simultáneos sobre la misma venta no pueden leer ambos el
 *   mismo saldo y pasarse del total. Postgres aborta uno y devolvemos un error
 *   entendible en vez de dejar la venta pagada de más.
 * - **Sin floats**: todo el dinero se maneja con `Prisma.Decimal`.
 * - **Rastro**: cada pago guarda quién lo registró y cuándo.
 */

import { Prisma } from "@prisma/client";
import type { MetodoPago } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  aDecimal,
  estadoDePago,
  saldoPendiente,
  validarMontoPago,
  type ImporteCrudo,
} from "@/lib/calculadores/pagosVenta";

export class ErrorPagoVenta extends Error {
  constructor(
    message: string,
    readonly codigo:
      | "VENTA_NO_ENCONTRADA"
      | "VENTA_ANULADA"
      | "MONTO_INVALIDO"
      | "CONFLICTO"
  ) {
    super(message);
    this.name = "ErrorPagoVenta";
  }
}

export interface EntradaPagoVenta {
  ventaId: string;
  montoArs: ImporteCrudo;
  metodoPago: MetodoPago;
  /** Referencia: cuántos dólares entraron y a qué cotización se convirtieron. */
  montoUsd?: ImporteCrudo | null;
  cotizacionUsd?: ImporteCrudo | null;
  notas?: string | null;
  usuarioId?: string | null;
}

export interface ResultadoPagoVenta {
  pagoId: string;
  totalVenta: string;
  totalPagado: string;
  saldoPendiente: string;
  estadoPago: "PENDIENTE" | "PARCIAL" | "PAGADO";
}

export async function registrarPagoVenta(
  entrada: EntradaPagoVenta
): Promise<ResultadoPagoVenta> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const venta = await tx.venta.findUnique({
          where: { id: entrada.ventaId },
          select: {
            id: true,
            total: true,
            anulada: true,
            pagos: { select: { montoArs: true } },
          },
        });

        if (!venta) {
          throw new ErrorPagoVenta("La venta no existe.", "VENTA_NO_ENCONTRADA");
        }
        if (venta.anulada) {
          throw new ErrorPagoVenta(
            "No se pueden registrar cobros sobre una venta anulada.",
            "VENTA_ANULADA"
          );
        }

        const saldoAntes = saldoPendiente(venta.total, venta.pagos);
        const validacion = validarMontoPago(entrada.montoArs, saldoAntes);
        if (!validacion.ok) {
          throw new ErrorPagoVenta(validacion.error ?? "Importe inválido.", "MONTO_INVALIDO");
        }

        const montoDec = aDecimal(entrada.montoArs);

        const pago = await tx.pagoVenta.create({
          data: {
            venta: { connect: { id: venta.id } },
            montoArs: montoDec,
            metodoPago: entrada.metodoPago,
            montoUsd:
              entrada.montoUsd != null ? aDecimal(entrada.montoUsd) : null,
            cotizacionUsd:
              entrada.cotizacionUsd != null ? aDecimal(entrada.cotizacionUsd) : null,
            notas: entrada.notas ?? null,
            ...(entrada.usuarioId
              ? { user: { connect: { id: entrada.usuarioId } } }
              : {}),
          },
          select: { id: true },
        });

        const pagosDespues = [...venta.pagos, { montoArs: montoDec }];
        const estado = estadoDePago(venta.total, pagosDespues);

        await tx.venta.update({
          where: { id: venta.id },
          data: { estadoPago: estado },
        });

        return {
          pagoId: pago.id,
          totalVenta: aDecimal(venta.total).toFixed(2),
          totalPagado: aDecimal(venta.total)
            .minus(saldoPendiente(venta.total, pagosDespues))
            .toFixed(2),
          saldoPendiente: saldoPendiente(venta.total, pagosDespues).toFixed(2),
          estadoPago: estado,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (error instanceof ErrorPagoVenta) throw error;
    // 40001 = serialization_failure: otro cobro sobre la misma venta ganó la carrera.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2034" || error.meta?.code === "40001")
    ) {
      throw new ErrorPagoVenta(
        "Se registró otro cobro sobre esta venta al mismo tiempo. Volvé a intentar.",
        "CONFLICTO"
      );
    }
    throw error;
  }
}
