import type { TonoCifra } from "@/components/ui/figure";

/**
 * Tono de la cifra de stock. Solo presentación: el umbral es el mismo que ya
 * usaba la tabla (stock actual <= mínimo = bajo).
 * - Sin stock (0 o menos) → negativo.
 * - En el mínimo o por debajo → alerta.
 */
export function tonoStock(actual: number, minimo: number): TonoCifra {
  if (actual <= 0) return "negativo";
  if (actual <= minimo) return "alerta";
  return "neutro";
}

export const claseTonoCifra: Record<TonoCifra, string> = {
  neutro: "text-foreground",
  positivo: "text-num-positive",
  negativo: "text-num-negative",
  alerta: "text-num-warning",
};
