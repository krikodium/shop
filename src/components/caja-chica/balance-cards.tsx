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
  ingresosArs?: number;
  egresosArs?: number;
  movimientosCount?: number;
}

export function BalanceCards({
  ars,
  usd,
  ingresosArs,
  egresosArs,
  movimientosCount,
}: BalanceCardsProps) {
  const tieneDetalle = ingresosArs !== undefined && egresosArs !== undefined;

  return (
    <FigureGrid columnas={tieneDetalle ? 4 : 2}>
      <Figure
        label="Saldo actual · ARS"
        valor={formatARS(ars)}
        tono={ars >= 0 ? "neutro" : "negativo"}
        hint="Efectivo disponible en caja"
      />
      <Figure
        label="Saldo actual · USD"
        valor={formatUSD(usd)}
        tono={usd >= 0 ? "neutro" : "negativo"}
        hint={usd !== 0 ? "Efectivo en dólares" : "Sin billetes USD en caja"}
      />
      {tieneDetalle && (
        <>
          <Figure
            label="Ingresos del turno · ARS"
            valor={formatARS(ingresosArs)}
            tono={ingresosArs > 0 ? "positivo" : "neutro"}
            hint={`${movimientosCount ?? 0} movimientos registrados`}
          />
          <Figure
            label="Egresos del turno · ARS"
            valor={formatARS(egresosArs)}
            tono={egresosArs > 0 ? "negativo" : "neutro"}
            hint="Gastos y retiros del turno"
          />
        </>
      )}
    </FigureGrid>
  );
}
