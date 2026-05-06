"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, User, Calendar, ChevronRight } from "lucide-react";
import { formatARS, formatUSD } from "@/lib/formatCurrency";

interface Movimiento {
  id: string;
  tipo: string;
  monto: number;
  moneda?: string;
  concepto: string | null;
  fecha: string;
}

interface CajaChica {
  id: string;
  userId: string;
  fechaApertura: string;
  fechaCierre: string | null;
  montoInicial: number;
  montoInicialUsd?: number | null;
  estado: string;
  movimientos: Movimiento[];
  user?: { id: string; name: string | null; email: string };
}

interface CajaSelectorProps {
  cajas: CajaChica[];
  cajaSeleccionada: CajaChica | null;
  onSelect: (caja: CajaChica | null) => void;
}

export function CajaSelector({ cajas, cajaSeleccionada, onSelect }: CajaSelectorProps) {
  return (
    <Card className="border border-border/80 bg-card shadow-sm overflow-hidden">
      <CardHeader className="border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg font-semibold">Cajas de empleados</CardTitle>
        </div>
        <CardDescription>Elegí una caja para ver detalle y movimientos</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {cajas.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay cajas en el listado actual
            </div>
          ) : (
            cajas.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(cajaSeleccionada?.id === c.id ? null : c)}
                className={`flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/50 ${
                  cajaSeleccionada?.id === c.id ? "bg-muted/40" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                      c.estado === "ABIERTA"
                        ? "border-border bg-muted/50 text-foreground"
                        : "border-transparent bg-muted text-muted-foreground"
                    }`}
                  >
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-sm">
                        {c.user?.name ?? c.user?.email ?? "Sin nombre"}
                      </p>
                      {c.estado === "ABIERTA" ? (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          Abierta
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          Cerrada
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>
                        {new Date(c.fechaApertura).toLocaleString("es-AR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {formatARS(Number(c.montoInicial ?? 0))}
                    </p>
                    {Number(c.montoInicialUsd ?? 0) > 0 && (
                      <p className="text-[11px] tabular-nums text-muted-foreground">
                        {formatUSD(Number(c.montoInicialUsd ?? 0))}
                      </p>
                    )}
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      cajaSeleccionada?.id === c.id ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
