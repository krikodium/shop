/** Aritmética de la UI en centavos; el servidor recalcula todos los precios. */
export function escala(valor: string | number, precision = 2): bigint {
  const texto = String(valor).trim().replace(",", ".");
  if (!new RegExp(`^\\d+(\\.\\d{1,${precision}})?$`).test(texto))
    throw new Error(`Importe inválido: hasta ${precision} decimales.`);
  const [entero, dec = ""] = texto.split(".");
  return (
    BigInt(entero) * BigInt(10 ** precision) +
    BigInt(dec.padEnd(precision, "0"))
  );
}
export function importe(valor: bigint): string {
  const signo = valor < BigInt(0) ? "-" : "";
  const absoluto = valor < BigInt(0) ? -valor : valor;
  return `${signo}${absoluto / BigInt(100)}.${(absoluto % BigInt(100)).toString().padStart(2, "0")}`;
}
export function porcentajeCentavos(
  base: bigint,
  porcentaje: string | number,
): bigint {
  return (base * escala(porcentaje) + BigInt(5000)) / BigInt(10000);
}
export function convertirUsd(monto: string, cotizacion: string): bigint {
  const tc = escala(cotizacion, 4);
  if (tc <= BigInt(0)) throw new Error("La cotización debe ser mayor a cero.");
  return (escala(monto) * tc + BigInt(5000)) / BigInt(10000);
}
