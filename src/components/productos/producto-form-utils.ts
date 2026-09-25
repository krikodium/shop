/**
 * Helpers puros del formulario de productos.
 *
 * 🔴 Nada de acá viaja al servidor: el margen es un dato derivado **solo para
 * mostrar**. No se guarda, no se manda en el submit y no reemplaza ningún
 * cálculo de la API.
 */

/** Palabras que no aportan nada a un SKU. */
const PALABRAS_VACIAS = new Set(["de", "del", "la", "el", "los", "las", "y", "con", "para", "por", "un", "una"]);

/**
 * Propone un SKU a partir del nombre del producto.
 *
 * Determinista: mismo nombre → mismo SKU. Saca acentos, deja solo
 * `A-Z 0-9`, descarta palabras vacías y une con guiones.
 *
 * @param nombre Nombre del producto.
 * @param sufijo Sufijo opcional para desempatar cuando el SKU ya existe.
 */
export function generarSku(nombre: string, sufijo?: string | number): string {
  const limpio = (nombre ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

  const palabras = limpio.split(" ").filter(Boolean);
  const utiles = palabras.filter((p) => !PALABRAS_VACIAS.has(p.toLowerCase()));
  const elegidas = (utiles.length > 0 ? utiles : palabras).slice(0, 4);

  let base = elegidas.join("-").slice(0, 24).replace(/-+$/, "");
  if (!base) base = "SKU";

  const marca = sufijo == null || sufijo === "" ? "" : `-${String(sufijo).toUpperCase()}`;
  return `${base}${marca}`;
}

export interface MargenCalculado {
  /** Ganancia unitaria en pesos: venta − compra. */
  ganancia: number;
  /**
   * Margen porcentual **sobre el precio de venta**, la misma convención que
   * usa el resto del sistema (`margenPorcentaje` de ventas y reportes).
   */
  porcentaje: number;
}

/**
 * Margen informativo para mostrar en vivo mientras se cargan los precios.
 *
 * Devuelve `null` — y la UI muestra un guion — cuando no hay con qué
 * calcularlo: sin precio de compra, con compra en cero o sin precio de venta.
 * Nunca inventa un margen.
 */
export function calcularMargen(
  precioCompra: number | null | undefined,
  precioVenta: number | null | undefined
): MargenCalculado | null {
  const compra = typeof precioCompra === "number" ? precioCompra : null;
  const venta = typeof precioVenta === "number" ? precioVenta : null;

  if (compra == null || !Number.isFinite(compra) || compra <= 0) return null;
  if (venta == null || !Number.isFinite(venta) || venta <= 0) return null;

  const ganancia = venta - compra;
  return { ganancia, porcentaje: (ganancia / venta) * 100 };
}

/** Normaliza un SKU para comparar (la unicidad no distingue mayúsculas). */
export function normalizarSku(sku: string): string {
  return (sku ?? "").trim().toUpperCase();
}
