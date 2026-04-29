"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, User, Calendar, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
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
    <Card className="border-none shadow-md overflow-hidden">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Cajas de Empleados</CardTitle>
        </div>
        <CardDescription>Seleccioná un empleado para ver el detalle de su caja</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {cajas.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground opacity-60">
              <p>No hay cajas abiertas actualmente</p>
            </div>
          ) : (
            cajas.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(cajaSeleccionada?.id === c.id ? null : c)}
                className={`flex w-full items-center justify-between p-4 px-6 text-left transition-all hover:bg-muted/50 ${
                  cajaSeleccionada?.id === c.id ? "bg-primary/5 ring-1 ring-primary/20 ring-inset" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    c.estado === "ABIERTA" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                  }`}>
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">
                            {c.user?.name ?? c.user?.email ?? "Sin nombre"}
                        </p>
                        {c.estado === "ABIERTA" ? (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[9px] h-4 py-0 px-1 uppercase tracking-tight">Abierta</Badge>
                        ) : (
                            <Badge variant="secondary" className="text-[9px] h-4 py-0 px-1 uppercase tracking-tight">Cerrada</Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(c.fechaApertura).toLocaleString("es-AR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                        })}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="text-right flex flex-col items-end">
                      <p className="text-sm font-bold text-foreground">
                        {formatARS(Number(c.montoInicial ?? 0))}
                      </p>
                      {Number(c.montoInicialUsd ?? 0) > 0 && (
                        <p className="text-[10px] font-semibold text-blue-500">
                          {formatUSD(Number(c.montoInicialUsd ?? 0))}
                        </p>
                      )}
                    </div>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground/30 transition-transform ${
                         cajaSeleccionada?.id === c.id ? "rotate-90 text-primary/50" : ""
                    }`} />
                </div>
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
