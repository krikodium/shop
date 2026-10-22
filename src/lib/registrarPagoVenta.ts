import { Prisma } from "@prisma/client";
import type { MetodoPago } from "@prisma/client";
import { pagoSchema } from "@/lib/validaciones/ventaSchema";
import {
  huella,
  serializable,
  validarMoneda,
} from "@/lib/calculadores/finanzasServidor";
import {
  aDecimal,
  estadoDePago,
  saldoPendiente,
  totalPagado,
  validarMontoPago,
  type ImporteCrudo,
} from "@/lib/calculadores/pagosVenta";
export class ErrorPagoVenta extends Error {
  constructor(
    message: string,
    readonly codigo:
      "VENTA_NO_ENCONTRADA" | "VENTA_ANULADA" | "MONTO_INVALIDO" | "CONFLICTO",
  ) {
    super(message);
    this.name = "ErrorPagoVenta";
  }
}
export interface EntradaPagoVenta {
  ventaId: string;
  montoArs: ImporteCrudo;
  metodoPago: MetodoPago;
  montoUsd?: ImporteCrudo | null;
  cotizacionUsd?: ImporteCrudo | null;
  notas?: string | null;
  usuarioId?: string | null;
  claveIdempotencia: string;
}
export interface ResultadoPagoVenta {
  pagoId: string;
  totalVenta: string;
  totalPagado: string;
  saldoPendiente: string;
  estadoPago: "PENDIENTE" | "PARCIAL" | "PAGADO";
}
export async function registrarPagoVenta(
  entrada: EntradaPagoVenta,
): Promise<ResultadoPagoVenta> {
  const datos = pagoSchema.parse(entrada);
  const fingerprint = huella({
    ...datos,
    ventaId: entrada.ventaId,
    usuarioId: entrada.usuarioId,
  });
  try {
    return await serializable(async (tx) => {
      const autor = entrada.usuarioId
        ? await tx.user.findUnique({ where: { id: entrada.usuarioId } })
        : null;
      if (!autor || autor.role === "VIEWER")
        throw new ErrorPagoVenta(
          "No tenés permiso para cobrar",
          "MONTO_INVALIDO",
        );
      const venta = await tx.venta.findUnique({
        where: { id: entrada.ventaId },
        include: { pagos: true },
      });
      if (!venta)
        throw new ErrorPagoVenta("La venta no existe", "VENTA_NO_ENCONTRADA");
      const previo = await tx.pagoVenta.findUnique({
        where: { claveIdempotencia: datos.claveIdempotencia },
      });
      if (previo && previo.huellaSolicitud !== fingerprint)
        throw new ErrorPagoVenta(
          "La clave de operación ya se usó con otros datos",
          "CONFLICTO",
        );
      if (venta.anulada)
        throw new ErrorPagoVenta(
          "No se puede cobrar una venta anulada",
          "VENTA_ANULADA",
        );
      let pagoId = previo?.id;
      let pagos = venta.pagos.map((p) => ({ montoArs: p.montoArs }));
      if (!previo) {
        const validacion = validarMontoPago(
          datos.montoArs,
          saldoPendiente(venta.total, pagos),
        );
        if (!validacion.ok)
          throw new ErrorPagoVenta(validacion.error!, "MONTO_INVALIDO");
        try {
          validarMoneda(datos);
        } catch (error) {
          throw new ErrorPagoVenta((error as Error).message, "MONTO_INVALIDO");
        }
        const pago = await tx.pagoVenta.create({
          data: {
            ventaId: venta.id,
            montoArs: datos.montoArs,
            metodoPago: datos.metodoPago,
            montoUsd: datos.montoUsd,
            cotizacionUsd: datos.cotizacionUsd,
            notas: datos.notas,
            usuarioId: autor.id,
            claveIdempotencia: datos.claveIdempotencia,
            huellaSolicitud: fingerprint,
          },
        });
        pagoId = pago.id;
        pagos = [...pagos, { montoArs: aDecimal(datos.montoArs) }];
        await tx.venta.update({
          where: { id: venta.id },
          data: { estadoPago: estadoDePago(venta.total, pagos) },
        });
        await tx.pedido.updateMany({
          where: { ventaId: venta.id },
          data: { updatedAt: new Date() },
        });
      }
      return {
        pagoId: pagoId!,
        totalVenta: venta.total.toFixed(2),
        totalPagado: totalPagado(pagos).toFixed(2),
        saldoPendiente: saldoPendiente(venta.total, pagos).toFixed(2),
        estadoPago: estadoDePago(venta.total, pagos),
      };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2034", "P2002"].includes(error.code)
    )
      throw new ErrorPagoVenta(
        "Hay otra operación concurrente. Reintentá con la misma clave",
        "CONFLICTO",
      );
    throw error;
  }
}
