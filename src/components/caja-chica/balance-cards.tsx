"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Landmark } from "lucide-react";
import { formatARS, formatUSD } from "@/lib/formatCurrency";

interface BalanceCardsProps {
  ars: number;
  usd: number;
}

export function BalanceCards({ ars, usd }: BalanceCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Saldo ARS
              </p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
                {formatARS(ars)}
              </p>
              <p className="text-xs text-muted-foreground">Efectivo en pesos</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-muted-foreground">
              <Wallet className="h-5 w-5" aria-hidden />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Saldo USD
              </p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
                {formatUSD(usd)}
              </p>
              <p className="text-xs text-muted-foreground">
                {usd !== 0 ? "Saldo en dólares" : "Sin movimientos en USD"}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-muted-foreground">
              <Landmark className="h-5 w-5" aria-hidden />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
