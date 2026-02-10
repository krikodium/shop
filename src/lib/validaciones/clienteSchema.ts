import { z } from "zod";

export const clienteSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  email: z.union([z.string().email("Email inválido"), z.literal("")]).optional(),
  telefono: z.string().optional(),
  dni: z.string().optional(),
  direccion: z.string().optional(),
  recibeNotificaciones: z.boolean().default(true),
  notas: z.string().optional(),
});

export type ClienteFormValues = z.infer<typeof clienteSchema>;

/** Schema para guardar datos de cliente tras una venta - todos los campos opcionales */
export const datosClienteVentaSchema = z.object({
  nombre: z.string().optional(),
  email: z.union([z.string().email("Email inválido"), z.literal("")]).optional(),
  telefono: z.string().optional(),
  dni: z.string().optional(),
});

export type DatosClienteVenta = z.infer<typeof datosClienteVentaSchema>;
