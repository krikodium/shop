import { z } from "zod";
export const importeSchema = z
  .union([z.string(), z.number().finite()])
  .transform(String)
  .pipe(
    z
      .string()
      .regex(/^\d{1,8}(\.\d{1,2})?$/, "Importe inválido: hasta dos decimales"),
  );
export const metodoSchema = z.enum([
  "EFECTIVO",
  "TARJETA_DEBITO",
  "TARJETA_CREDITO",
  "TRANSFERENCIA",
  "MERCADOPAGO",
]);
export const claveSchema = z.string().min(16).max(120);
export const cobroSchema = z.object({
  montoArs: importeSchema,
  metodoPago: metodoSchema,
  montoUsd: importeSchema.nullish(),
  cotizacionUsd: z
    .union([z.string(), z.number().finite()])
    .transform(String)
    .pipe(z.string().regex(/^\d{1,8}(\.\d{1,4})?$/))
    .nullish(),
  notas: z.string().trim().max(1000).nullish(),
});
export const pagoSchema = cobroSchema.extend({
  claveIdempotencia: claveSchema,
});
export const ventaSchema = z.object({
  clienteId: z.string().min(1).nullish(),
  clienteNombre: z.string().trim().max(200).optional(),
  clienteTelefono: z.string().trim().max(100).nullish(),
  clienteEmail: z.string().trim().max(200).nullish(),
  items: z
    .array(
      z.object({
        productoId: z.string().min(1),
        cantidad: z.number().int().min(1).max(10000),
        modalidad: z.enum(["INMEDIATA", "ENCARGO"]).default("INMEDIATA"),
        especificaciones: z.string().trim().max(2000).optional(),
        fechaEstimada: z.string().datetime({ offset: true }).nullish(),
      }),
    )
    .min(1)
    .max(200),
  descuento: importeSchema.default("0"),
  // Confirma el importe revisado por la operadora; no reemplaza el cálculo del catálogo.
  totalEsperado: importeSchema,
  metodoPago: metodoSchema,
  notas: z.string().trim().max(2000).optional(),
  ignorarStock: z.boolean().optional(),
  claveIdempotencia: claveSchema,
  metodoPagoSecundario: metodoSchema.nullish(),
  montoPago1Ars: importeSchema.nullish(),
  montoPago2Ars: importeSchema.nullish(),
  usdPago1: importeSchema.nullish(),
  usdPago2: importeSchema.nullish(),
  cotizacionUsd: cobroSchema.shape.cotizacionUsd,
  cobroInicial: cobroSchema.nullish(),
  pedido: z
    .object({
      fechaPrometida: z.string().datetime({ offset: true }).nullish(),
      responsable: z.string().trim().max(200).nullish(),
      notas: z.string().trim().max(2000).nullish(),
    })
    .optional(),
});
export const eventoSchema = z.object({
  tipo: z.enum([
    "ENCARGADO",
    "EN_FABRICACION",
    "RECEPCION",
    "ENTREGA",
    "NOTA",
    "COORDINACION",
    "CANCELACION",
  ]),
  itemId: z.string().min(1).optional(),
  cantidad: z.number().int().min(1).max(10000).optional(),
  notas: z.string().trim().max(2000).optional(),
  fechaPrometida: z.string().datetime({ offset: true }).nullish(),
  responsable: z.string().trim().max(200).nullish(),
  notasPedido: z.string().trim().max(2000).nullish(),
  clienteNombre: z.string().trim().max(200).nullish(),
  clienteTelefono: z.string().trim().max(100).nullish(),
  clienteEmail: z.string().trim().max(200).nullish(),
  especificaciones: z.string().trim().max(2000).nullish(),
  fechaEstimada: z.string().datetime({ offset: true }).nullish(),
  excepcionSaldo: z.boolean().optional(),
  motivoExcepcion: z.string().trim().min(5).max(1000).optional(),
  claveIdempotencia: claveSchema,
});
export type VentaFormValues = z.infer<typeof ventaSchema>;

