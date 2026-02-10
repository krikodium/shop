import { z } from "zod";

export const productoSchema = z.object({
  sku: z.string().min(1, "SKU requerido"),
  nombre: z.string().min(1, "Nombre requerido"),
  descripcion: z.string().optional(),
  categoriaId: z.string().optional().nullable(),
  precioCompra: z.coerce.number().min(0).optional().nullable(),
  precioVenta: z.coerce.number().min(0, "Precio de venta requerido"),
  enConsignacion: z.boolean().default(false),
  comisionConsignacion: z.coerce.number().min(0).max(100).optional().nullable(),
  stockActual: z.coerce.number().int().min(0).default(0),
  stockMinimo: z.coerce.number().int().min(0).default(5),
  proveedorId: z.string().optional().nullable(),
  imagenUrl: z.string().url().optional().nullable().or(z.literal("")),
  activo: z.boolean().default(true),
});

export type ProductoFormValues = z.infer<typeof productoSchema>;
