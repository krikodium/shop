"use client";

import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronRight } from "lucide-react";
import { formatARS, formatUSD } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";

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
    <Panel>
      <PanelHeader
        title="Cajas de empleados"
        descripcion="Elegí una caja para ver el detalle y los movimientos"
      />
      {cajas.length === 0 ? (
        <PanelBody>
          <EmptyState className="py-6" titulo="No hay cajas en el listado actual" />
        </PanelBody>
      ) : (
        <div className="divide-y divide-border">
          {cajas.map((c) => {
            const seleccionada = cajaSeleccionada?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(seleccionada ? null : c)}
                aria-pressed={seleccionada}
                className={cn(
                  "flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none sm:px-5",
                  seleccionada && "bg-accent"
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {c.user?.name ?? c.user?.email ?? "Sin nombre"}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {c.estado === "ABIERTA" ? "Abierta" : "Cerrada"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                    {new Date(c.fechaApertura).toLocaleString("es-AR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold tabular-nums">
                      {formatARS(Number(c.montoInicial ?? 0))}
                    </p>
                    {Number(c.montoInicialUsd ?? 0) > 0 && (
                      <p className="font-mono text-xs tabular-nums text-muted-foreground">
                        {formatUSD(Number(c.montoInicialUsd ?? 0))}
                      </p>
                    )}
                  </div>
                  <ChevronRight
                    aria-hidden="true"
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      seleccionada && "rotate-90"
                    )}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
