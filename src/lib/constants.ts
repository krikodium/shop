/**
 * Constantes compartidas del sistema.
 */

/** Etiquetas para métodos de pago (lookup por clave) */
export const METODO_PAGO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA_DEBITO: "Tarjeta débito",
  TARJETA_CREDITO: "Tarjeta crédito",
  TRANSFERENCIA: "Transferencia",
  MERCADOPAGO: "Mercado Pago",
  MULTIPLE: "Múltiple",
};

/** Opciones para selector de método de pago (value, label, short para mobile) */
export const METODOS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo", short: "Efectivo" },
  { value: "TARJETA_DEBITO", label: "Tarjeta débito", short: "Débito" },
  { value: "TARJETA_CREDITO", label: "Tarjeta crédito", short: "Crédito" },
  { value: "TRANSFERENCIA", label: "Transferencia", short: "Transf." },
  { value: "MERCADOPAGO", label: "Mercado Pago", short: "MP" },
  { value: "MULTIPLE", label: "Múltiple", short: "Múltiple" },
] as const;

/** Para pago dividido: sin "Múltiple" (se usa al registrar el detalle) */
export const METODOS_PAGO_INDIVIDUAL = METODOS_PAGO.filter((m) => m.value !== "MULTIPLE");
