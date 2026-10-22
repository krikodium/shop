"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Resumen } from "@/components/ui/resumen";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { formatARS, formatUSD } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";

interface RendicionRow {
  id: string;
  numeroRendicion: string;
  fechaRendicion: string;
  fechaDesde: string;
  fechaHasta: string;
  totalVendido: number;
  comisionShop: number;
  totalARendir: number;
  monedaLiquidacion: string;
  totalARendirUsd: number | null;
  estado: string;
  proveedor: { nombre: string };
}

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PARCIAL: "Parcial",
  PAGADO: "Pagado",
};

type FiltroRendicion = "todas" | "pendientes" | "pagadas";

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });

export function RendicionesTable() {
  const [rendiciones, setRendiciones] = useState<RendicionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroRendicion>("todas");

  useEffect(() => {
    fetch("/api/consignacion/rendiciones")
      .then((res) => res.json())
      .then((data) => {
        const raw = Array.isArray(data) ? data : [];
        const rows: RendicionRow[] = raw.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          numeroRendicion: r.numeroRendicion as string,
          fechaRendicion: r.fechaRendicion as string,
          fechaDesde: r.fechaDesde as string,
          fechaHasta: r.fechaHasta as string,
          totalVendido: Number(r.totalVendido ?? 0),
          comisionShop: Number(r.comisionShop ?? 0),
          totalARendir: Number(r.totalARendir ?? 0),
          monedaLiquidacion: (r.monedaLiquidacion as string) ?? "ARS",
          totalARendirUsd: r.totalARendirUsd != null ? Number(r.totalARendirUsd) : null,
          estado: (r.estado as string) ?? "",
          proveedor: (r.proveedor as { nombre: string }) ?? { nombre: "" },
        }));
        setRendiciones(rows);
      })
      .catch(() => setRendiciones([]))
      .finally(() => setLoading(false));
  }, []);

  const metricas = useMemo(() => {
    const total = rendiciones.length;
    const pendientes = rendiciones.filter((r) => r.estado !== "PAGADO");
    const montoPendiente = pendientes.reduce((acc, r) => acc + r.totalARendir, 0);
    const totalLiquidado = rendiciones.reduce((acc, r) => acc + r.totalARendir, 0);
    const comisionTotal = rendiciones.reduce((acc, r) => acc + r.comisionShop, 0);
    return {
      total,
      pendientesCount: pendientes.length,
      pagadasCount: total - pendientes.length,
      montoPendiente,
      totalLiquidado,
      comisionTotal,
    };
  }, [rendiciones]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase("es");
    return rendiciones.filter((r) => {
      if (filtro === "pendientes" && r.estado === "PAGADO") return false;
      if (filtro === "pagadas" && r.estado !== "PAGADO") return false;
      if (!q) return true;
      return `${r.numeroRendicion} ${r.proveedor?.nombre ?? ""}`
        .toLocaleLowerCase("es")
        .includes(q);
    });
  }, [rendiciones, busqueda, filtro]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-skeleton-shimmer rounded-xl" />
        <TableSkeleton rows={6} cols={8} />
      </div>
    );
  }

  if (rendiciones.length === 0) {
    return (
      <EmptyState
        icono={FileText}
        titulo="No hay rendiciones registradas"
        descripcion="Creá una rendición para liquidar las ventas de tus proveedores de consignación."
        accion={
          <Button asChild size="sm">
            <Link href="/consignacion/rendiciones/nueva">Nueva rendición</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Resumen
        items={[
          {
            label: "Rendiciones emitidas",
            valor: metricas.total,
            hint: `${metricas.pagadasCount} pagadas · ${metricas.pendientesCount} pendientes`,
          },
          {
            label: "Pendiente de pago",
            valor: (
              <span className={metricas.montoPendiente > 0 ? "text-num-warning" : undefined}>
                {formatARS(metricas.montoPendiente)}
              </span>
            ),
            hint: `${metricas.pendientesCount} liquidaciones abiertas`,
          },
          {
            label: "Neto total liquidado",
            valor: formatARS(metricas.totalLiquidado),
            hint: "Correspondiente a proveedores",
          },
          {
            label: "Comisión tienda",
            valor: (
              <span className="text-num-positive">{formatARS(metricas.comisionTotal)}</span>
            ),
            hint: "Retención acumulada en rendiciones",
          },
        ]}
      />

      <Panel>
        <PanelHeader
          title="Historial de rendiciones"
          descripcion={
            <span className="font-mono text-xs tabular-nums">
              {filtradas.length === rendiciones.length
                ? `${rendiciones.length} registros`
                : `${filtradas.length} de ${rendiciones.length} registros`}
            </span>
          }
          acciones={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Nº rendición o proveedor…"
                  className="h-9 w-full pl-9 sm:w-56"
                  aria-label="Buscar rendiciones"
                />
              </div>
              <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
                {(
                  [
                    { id: "todas", label: "Todas" },
                    { id: "pendientes", label: "Pendientes" },
                    { id: "pagadas", label: "Pagadas" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFiltro(tab.id)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      filtro === tab.id
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          }
        />

        {filtradas.length === 0 ? (
          <PanelBody>
            <EmptyState
              titulo="Ninguna rendición coincide con el filtro"
              accion={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBusqueda("");
                    setFiltro("todas");
                  }}
                >
                  Limpiar filtros
                </Button>
              }
            />
          </PanelBody>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Total vendido</TableHead>
                <TableHead className="text-right">Comisión</TableHead>
                <TableHead className="text-right">Neto a rendir</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[1%]">
                  <span className="sr-only">Acción</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs font-medium tabular-nums">
                    {r.numeroRendicion}
                  </TableCell>
                  <TableCell className="font-medium">{r.proveedor?.nombre || "—"}</TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {fechaCorta(r.fechaDesde)} – {fechaCorta(r.fechaHasta)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {formatARS(r.totalVendido)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-num-positive">
                    {formatARS(r.comisionShop)}
                  </TableCell>
                  <TableCell className="text-right">
                    <p className="font-mono font-semibold tabular-nums">
                      {formatARS(r.totalARendir)}
                    </p>
                    {r.monedaLiquidacion === "USD" && r.totalARendirUsd != null && (
                      <p className="font-mono text-xs tabular-nums text-muted-foreground">
                        {formatUSD(r.totalARendirUsd)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.estado === "PAGADO" ? "default" : "outline"}>
                      {ESTADO_LABEL[r.estado] ?? r.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/consignacion/rendiciones/${r.id}`}>Ver</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
