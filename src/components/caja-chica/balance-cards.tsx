"use client";

import { Figure, FigureGrid } from "@/components/ui/figure";
import { formatARS, formatUSD } from "@/lib/formatCurrency";

/*
 * Nombre histórico: esto ya NO son tarjetas. Los saldos del turno se muestran
 * como una fila de cifras (`FigureGrid` + `Figure`), un solo bloque con
 * divisores. Se conserva el nombre `BalanceCards` para no romper imports.
 *
 * Solo presenta los saldos que recibe ya calculados: no suma ni recalcula nada.
 */

interface BalanceCardsProps {
  ars: number;
  usd: number;
}

export function BalanceCards({ ars, usd }: BalanceCardsProps) {
  return (
    <FigureGrid columnas={2}>
      <Figure
        label="Saldo ARS"
        valor={formatARS(ars)}
        tono={ars >= 0 ? "neutro" : "negativo"}
        hint="Efectivo en pesos"
      />
      <Figure
        label="Saldo USD"
        valor={formatUSD(usd)}
        tono={usd >= 0 ? "neutro" : "negativo"}
        hint={usd !== 0 ? "Saldo en dólares" : "Sin movimientos en USD"}
      />
    </FigureGrid>
  );
}
