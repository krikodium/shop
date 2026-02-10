import { z } from "zod";

export const proveedorSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  direccion: z.string().optional(),
  tipoProveedor: z.enum(["REGULAR", "CONSIGNACION"]).default("REGULAR"),
  comisionPorDefecto: z.coerce.number().min(0).max(100).optional().nullable(),
});

export type ProveedorFormValues = z.infer<typeof proveedorSchema>;
