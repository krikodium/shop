import { z } from "zod";

const itemVentaSchema = z.object({
  productoId: z.string(),
  productoNombre: z.string(),
  productoSku: z.string(),
  cantidad: z.number().int().positive(),
  precioUnitario: z.number().min(0),
  subtotal: z.number().min(0),
  costoUnitario: z.number().min(0),
  costoTotal: z.number().min(0),
  esConsignacion: z.boolean(),
  deudaProveedor: z.number().min(0).nullable(),
  comisionShop: z.number().nullable(),
  proveedorId: z.string().nullable(),
});

export const ventaSchema = z.object({
  clienteId: z.string().optional().nullable(),
  clienteNombre: z.string().optional(),
  items: z.array(itemVentaSchema).min(1, "Agregar al menos un producto"),
  descuento: z.number().min(0).default(0),
  metodoPago: z.enum([
    "EFECTIVO",
    "TARJETA_DEBITO",
    "TARJETA_CREDITO",
    "TRANSFERENCIA",
    "MERCADOPAGO",
    "MULTIPLE",
  ]),
  notas: z.string().optional(),
});

export type VentaFormValues = z.infer<typeof ventaSchema>;
