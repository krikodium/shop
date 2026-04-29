"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  TrendingUp, 
  AlertCircle, 
  ArrowRight, 
  Calendar, 
  Clock,
  ExternalLink,
  ChevronRight,
  PlusCircle
} from "lucide-react";
import type { DeudaProveedor, RestriccionRendicion } from "@/app/api/consignacion/deudas/route";
import { formatARS } from "@/lib/formatCurrency";

export function ConsignacionDashboard() {
  const [deudas, setDeudas] = useState<DeudaProveedor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/consignacion/deudas")
      .then((res) => res.json())
      .then((data) => setDeudas(Array.isArray(data) ? data : []))
      .catch(() => setDeudas([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse border-none shadow-sm bg-muted/20 h-[180px]" />
        ))}
      </div>
    );
  }

  const totalDeuda = deudas.reduce((acc, d) => acc + d.deudaPendiente, 0);
  const proveedoresConDeuda = deudas.filter((d) => d.deudaPendiente > 0).length;

  if (deudas.length === 0) {
    return (
      <Card className="border-dashed bg-muted/10">
        <CardContent className="py-12 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold">No hay proveedores de consignación</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Creá un proveedor con tipo "Consignación" y asignale productos para empezar a trackear ventas y rendiciones.
            </p>
          </div>
          <Link href="/proveedores">
            <Button variant="outline" size="sm" className="mt-2">
              <PlusCircle className="mr-2 h-4 w-4" />
              Gestionar proveedores
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-md bg-gradient-to-br from-zinc-800 to-zinc-950 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-zinc-400 font-medium font-sans uppercase tracking-widest text-[10px]">Deuda Total Acumulada</CardDescription>
            <CardTitle className="text-2xl font-black">{formatARS(totalDeuda)}</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <AlertCircle className="h-3 w-3" />
                <span>Pendiente de rendición · montos en ARS</span>
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white dark:bg-zinc-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground font-medium">Proveedores con deuda</CardDescription>
            <CardTitle className="text-2xl font-black">{proveedoresConDeuda}</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                <Users className="h-3 w-3" />
                <span>de un total de {deudas.length} proveedores</span>
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white dark:bg-zinc-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground font-medium">Vendido en el período</CardDescription>
            <CardTitle className="text-2xl font-black">
                {formatARS(deudas.reduce((acc, d) => acc + d.totalVendidoPeriodo, 0))}
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                <TrendingUp className="h-3 w-3" />
                <span>Flujo de ventas actuales</span>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {deudas.map((d) => (
          <Card
            key={d.proveedorId}
            className={`group relative overflow-hidden transition-all hover:shadow-lg border-none ${
              d.deudaPendiente > 0
                ? "bg-white dark:bg-zinc-900 border-l-4 border-l-primary"
                : "bg-muted/30"
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-lg font-black tracking-tight group-hover:text-primary transition-colors">
                        {d.proveedorNombre}
                    </CardTitle>
                    {d.deudaPendiente > 0 ? (
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold py-0 h-5">PENDIENTE</Badge>
                    ) : (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px] font-bold py-0 h-5"> AL DÍA</Badge>
                    )}
                </div>
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Users className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Deuda por rendir</span>
                <span className={`text-2xl font-black tabular-nums ${
                    d.deudaPendiente > 0 ? "text-primary" : "text-muted-foreground/40"
                  }`}>
                  {formatARS(d.deudaPendiente)}
                </span>
              </div>

              {d.ultimaRendicion ? (
                <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-2 text-[10px] font-medium text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Última rendición: {new Date(d.ultimaRendicion.fechaHasta).toLocaleDateString("es-AR", { day: '2-digit', month: 'short' })}</span>
                    <span className="ml-auto text-primary/70">{formatARS(d.ultimaRendicion.totalARendir)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-2 text-[10px] font-bold text-muted-foreground/50 border border-border/50">
                    <Clock className="h-3 w-3" />
                    <span>Sin rendiciones registradas</span>
                </div>
              )}

              {!d.restriccionRendicion.permitido && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-2 text-[10px] font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>Ya rendido este mes · habilitado en {d.restriccionRendicion.diasParaUltimaSemana} días</span>
                </div>
              )}

              {d.restriccionRendicion.permitido ? (
                <Link href={`/consignacion/rendiciones/nueva?proveedorId=${d.proveedorId}`} className="block">
                  <Button
                    variant={d.deudaPendiente > 0 ? "default" : "outline"}
                    size="sm"
                    className={`w-full font-bold shadow-sm ${d.deudaPendiente > 0 ? "bg-primary hover:bg-primary/90" : "opacity-60 hover:opacity-100"}`}
                  >
                    Generar Rendición
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="w-full font-bold opacity-50 cursor-not-allowed"
                >
                  Rendición no disponible
                  <Clock className="ml-2 h-3 w-3" />
                </Button>
              )}
            </CardContent>
            
            {/* Subtle background icon for premium feel */}
            <Users className="absolute -bottom-4 -right-4 h-24 w-24 text-muted-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Card>
        ))}
      </div>
    </div>
  );
}
