/**
 * Formateo de montos en formato argentino: 1.000.000,24
 * - Puntos para miles
 * - Coma para decimales
 *
 * Moneda fiduciaria (UI): `formatARS` / `formatUSD` (Intl, símbolo $ según ISO).
 */

const intlArs = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

const intlUsd = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
});

/** Pesos argentinos (ARS) para tableros, listas y KPIs */
export function formatARS(n: number): string {
  return intlArs.format(Number.isFinite(n) ? n : 0);
}

/** Dólares estadounidenses (USD) — caja, ventas en USD, equivalentes */
export function formatUSD(n: number): string {
  return intlUsd.format(Number.isFinite(n) ? n : 0);
}

/**
 * Formatea un número como moneda para mostrar: 1.000.000,24
 */
export function formatCurrencyDisplay(value: number): string {
  if (value === 0 || Number.isNaN(value)) return "";
  const [entero, decimal] = value.toFixed(2).split(".");
  const conPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimal ? `${conPuntos},${decimal}` : conPuntos;
}

/**
 * Parsea un string de input a número.
 * Acepta: "1000", "1.000", "1000,24", "1.000,24"
 */
export function parseCurrencyInput(input: string): number {
  if (!input || input.trim() === "") return 0;
  const limpio = input.trim().replace(/\./g, "").replace(",", ".");
  const num = parseFloat(limpio);
  return Number.isNaN(num) ? 0 : num;
}
