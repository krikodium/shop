import { toast } from "sonner";

export interface OpcionesAviso {
  /** Segunda línea, más chica: contexto o número de comprobante. */
  descripcion?: string;
  /** Milisegundos en pantalla. Por defecto los 5000 del Toaster. */
  duracion?: number;
}

function aSonner(opciones: OpcionesAviso = {}) {
  return {
    ...(opciones.descripcion ? { description: opciones.descripcion } : {}),
    ...(opciones.duracion ? { duration: opciones.duracion } : {}),
  };
}

function mensajeDeError(valor: unknown): string {
  if (typeof valor === "string" && valor.trim()) return valor;
  if (valor instanceof Error && valor.message) return valor.message;
  return "Ocurrió un error inesperado";
}

export interface TextosPromesa<T> {
  cargando: string;
  ok: string | ((valor: T) => string);
  error: string | ((error: unknown) => string);
}

/**
 * Única puerta de avisos al usuario. Nada de alert/confirm/prompt del navegador:
 * todo sale como toast abajo a la derecha.
 */
export const notificar = {
  ok: (mensaje: string, opciones?: OpcionesAviso) =>
    toast.success(mensaje, aSonner(opciones)),

  error: (mensaje: unknown, opciones?: OpcionesAviso) =>
    toast.error(mensajeDeError(mensaje), aSonner(opciones)),

  advertencia: (mensaje: string, opciones?: OpcionesAviso) =>
    toast.warning(mensaje, aSonner(opciones)),

  info: (mensaje: string, opciones?: OpcionesAviso) =>
    toast(mensaje, aSonner(opciones)),

  /** Para acciones largas: un solo toast que pasa de cargando a resultado. */
  promesa: <T,>(promesa: Promise<T>, textos: TextosPromesa<T>) =>
    toast.promise(promesa, {
      loading: textos.cargando,
      success: textos.ok,
      error: textos.error,
    }),
};
