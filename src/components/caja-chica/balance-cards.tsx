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
      <Card className="overflow-hidden border-none bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 shadow-md transition-all hover:shadow-lg dark:from-emerald-500/20 dark:to-emerald-500/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Saldo Pesos (ARS)
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatARS(ars)}
              </h3>
            </div>
            <div className="rounded-full bg-emerald-500/20 p-3 text-emerald-600 dark:text-emerald-400">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs text-muted-foreground italic">Caja activa · Tiempo real</p>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-none bg-gradient-to-br from-blue-500/10 to-blue-500/5 shadow-md transition-all hover:shadow-lg dark:from-blue-500/20 dark:to-blue-500/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Saldo Dólares (USD)
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                {formatUSD(usd)}
              </h3>
            </div>
            <div className="rounded-full bg-blue-500/20 p-3 text-blue-600 dark:text-blue-400">
              <Landmark className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {usd > 0 ? (
                <>
                    <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <p className="text-xs text-muted-foreground italic">Cuenta secundaria activa</p>
                </>
            ) : (
                <p className="text-xs text-muted-foreground italic">Sin movimientos en USD</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
