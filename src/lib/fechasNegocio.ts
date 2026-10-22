/** Fechas comerciales de Buenos Aires, independientes de la zona del servidor. */
export function fechaNegocio(fecha = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(fecha);
}
export function inicioDiaNegocio(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000-03:00`);
}
export function siguienteDia(fecha: string, dias = 1): string {
  const dia = new Date(`${fecha}T12:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + dias);
  return dia.toISOString().slice(0, 10);
}
