import { z } from "zod";

/** URL http(s) o ruta local del sitio (ej. /uploads/... tras subir archivo). Sin blobs en BD. */
function imagenUrlValida(val: string): boolean {
  if (!val || val.trim() === "") return true;
  if (val.includes("..")) return false;
  if (val.startsWith("/")) {
    if (val.startsWith("//")) return false; // evita URLs protocol-relative
    return val.length >= 2;
  }
  try {
    const u = new URL(val);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

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
  imagenUrl: z.preprocess(
    (v) => (v === null || v === undefined ? "" : v),
    z.string().refine(imagenUrlValida, {
      message:
        "Imagen: URL https://… o ruta local /uploads/… (no uses rutas con ..)",
    })
  ),
  activo: z.boolean().default(true),
});

export type ProductoFormValues = z.infer<typeof productoSchema>;
