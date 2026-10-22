"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Receipt, Search } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Resumen } from "@/components/ui/resumen";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { METODO_PAGO_LABEL } from "@/lib/constants";
import { formatARS } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";

interface VentaRow {
  id: string;
  numeroVenta: string;
  fecha: string;
  total: number;
  gananciaBruta: number;
  margenPorcentaje: number;
  deudaConsignacion: number;
  metodoPago: string;
  metodoPagoSecundario?: string | null;
  usdPago1?: number | null;
  usdPago2?: number | null;
  anulada?: boolean;
  cliente?: { nombre: string } | null;
  clienteNombre?: string | null;
}

type PresetFecha = "hoy" | "7dias" | "mes" | "todo";
type FiltroEstado = "vigentes" | "todas" | "anuladas";

function getDatesForPreset(preset: PresetFecha) {
  const hoy = new Date();
  const hasta = hoy.toISOString().slice(0, 10);
  if (preset === "hoy") {
    return { desde: hasta, hasta };
  }
  if (preset === "7dias") {
    const d = new Date(hoy);
    d.setDate(d.getDate() - 6);
    return { desde: d.toISOString().slice(0, 10), hasta };
  }
  if (preset === "todo") {
    return { desde: "2024-01-01", hasta };
  }
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return {
    desde: inicio.toISOString().slice(0, 10),
    hasta,
  };
}

export function VentasTable() {
  const initialDates = getDatesForPreset("mes");
  const [preset, setPreset] = useState<PresetFecha | "custom">("mes");
  const [fechaDesde, setFechaDesde] = useState(initialDates.desde);
  const [fechaHasta, setFechaHasta] = useState(initialDates.hasta);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todas");
  const [ventas, setVentas] = useState<VentaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const aplicarPreset = (nuevo: PresetFecha) => {
    const rango = getDatesForPreset(nuevo);
    setPreset(nuevo);
    setFechaDesde(rango.desde);
    setFechaHasta(rango.hasta);
  };

  const cargar = useCallback(() => {
    Promise.resolve().then(() => setLoading(true));
    const params = new URLSearchParams();
    params.set("fechaDesde", fechaDesde);
    params.set("fechaHasta", `${fechaHasta}T23:59:59.999Z`);
    fetch(`/api/ventas?${params}`)
      .then((res) => res.json())
      .then((data) => {
        const raw = Array.isArray(data) ? data : [];
        const rows: VentaRow[] = raw.map((v: Record<string, unknown>) => {
          const u1 = v.usdPago1 != null ? Number(v.usdPago1) : null;
          const u2 = v.usdPago2 != null ? Number(v.usdPago2) : null;
          return {
            id: v.id as string,
            numeroVenta: v.numeroVenta as string,
            fecha: v.fecha as string,
            total: Number(v.total ?? 0),
            gananciaBruta: Number(v.gananciaBruta ?? 0),
            margenPorcentaje: Number(v.margenPorcentaje ?? 0),
            deudaConsignacion: Number(v.deudaConsignacion ?? 0),
            metodoPago: (v.metodoPago as string) ?? "",
            metodoPagoSecundario: (v.metodoPagoSecundario as string) ?? null,
            usdPago1: u1,
            usdPago2: u2,
            anulada: Boolean(v.anulada),
            cliente: v.cliente as { nombre: string } | null,
            clienteNombre: (v.clienteNombre as string) ?? null,
          };
        });
        setVentas(rows);
      })
      .catch(() => setVentas([]))
      .finally(() => setLoading(false));
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const termino = busqueda.trim().toLocaleLowerCase("es");
  const ventasPorTexto = termino
    ? ventas.filter((v) =>
        `${v.numeroVenta} ${v.cliente?.nombre ?? v.clienteNombre ?? ""} ${METODO_PAGO_LABEL[v.metodoPago] ?? v.metodoPago}`
          .toLocaleLowerCase("es")
          .includes(termino)
      )
    : ventas;

  const ventasFiltradas = ventasPorTexto.filter((v) => {
    if (filtroEstado === "vigentes") return !v.anulada;
    if (filtroEstado === "anuladas") return Boolean(v.anulada);
    return true;
  });

  const topeAlcanzado = ventas.length >= 100;
  const vigentes = ventasPorTexto.filter((v) => !v.anulada);
  const totalPeriodo = vigentes.reduce((s, v) => s + v.total, 0);
  const gananciaPeriodo = vigentes.reduce((s, v) => s + v.gananciaBruta, 0);
  const ticketPromedio = vigentes.length > 0 ? totalPeriodo / vigentes.length : 0;
  const margenGlobal = totalPeriodo > 0 ? (gananciaPeriodo / totalPeriodo) * 100 : 0;

  if (loading && ventas.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-skeleton-shimmer rounded-xl" />
        <TableSkeleton rows={6} cols={9} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Resumen
        className="anim-entrada"
        items={[
          {
            label: "Total facturado",
            valor: formatARS(totalPeriodo),
            hint:
              vigentes.length > 0
                ? `${vigentes.length} ${vigentes.length === 1 ? "operación vigente" : "operaciones vigentes"}${topeAlcanzado ? " (tope 100)" : ""}`
                : "Sin operaciones en el rango",
          },
          {
            label: "Ganancia bruta",
            valor: (
              <span className={gananciaPeriodo >= 0 ? "text-num-positive" : "text-num-negative"}>
                {formatARS(gananciaPeriodo)}
              </span>
            ),
            hint: `Margen global ${margenGlobal.toFixed(1)}%`,
          },
          {
            label: "Ticket promedio",
            valor: vigentes.length > 0 ? formatARS(ticketPromedio) : "—",
            hint: "Promedio por venta vigente",
          },
          {
            label: "Ventas listadas",
            valor: ventasFiltradas.length,
            hint:
              ventasPorTexto.length !== vigentes.length
                ? `${ventasPorTexto.length - vigentes.length} anuladas en el período`
                : "Todas las ventas activas",
          },
        ]}
      />

      <Panel>
        <PanelHeader
          title="Historial de operaciones"
          descripcion={
            <span className="font-mono text-xs tabular-nums">
              {ventasFiltradas.length} {ventasFiltradas.length === 1 ? "registro" : "registros"}
            </span>
          }
          acciones={
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "hoy", label: "Hoy" },
                  { id: "7dias", label: "7 días" },
                  { id: "mes", label: "Este mes" },
                  { id: "todo", label: "Todo" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => aplicarPreset(p.id)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    preset === p.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/15 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nº de venta, cliente o medio de pago…"
                className="h-9 w-56 pl-9 sm:w-64"
                aria-label="Buscar ventas"
              />
            </div>

            <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
              {(
                [
                  { id: "todas", label: "Todas" },
                  { id: "vigentes", label: "Vigentes" },
                  { id: "anuladas", label: "Anuladas" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFiltroEstado(tab.id)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    filtroEstado === tab.id
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Label htmlFor="ventas-desde" className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Desde
            </Label>
            <Input
              id="ventas-desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setPreset("custom");
                setFechaDesde(e.target.value);
              }}
              className="h-9 w-[9.25rem] font-mono text-xs tabular-nums"
            />
            <Label htmlFor="ventas-hasta" className="ml-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Hasta
            </Label>
            <Input
              id="ventas-hasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setPreset("custom");
                setFechaHasta(e.target.value);
              }}
              className="h-9 w-[9.25rem] font-mono text-xs tabular-nums"
            />
          </div>
        </div>

        {ventasFiltradas.length === 0 ? (
          <PanelBody>
            <EmptyState
              icono={Receipt}
              titulo="No hay ventas en este período"
              descripcion="Ajustá el rango de fechas o el buscador, o registrá una venta nueva."
              accion={
                <Button asChild size="sm">
                  <Link href="/ventas/nueva">Registrar una venta</Link>
                </Button>
              }
            />
          </PanelBody>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Medio de pago</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Ganancia</TableHead>
                <TableHead className="text-right">Margen</TableHead>
                <TableHead className="text-right">Consignación</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ventasFiltradas.map((v) => {
                const labelMedio = METODO_PAGO_LABEL[v.metodoPago] ?? (v.metodoPago || "—");
                const tieneUsd =
                  (v.usdPago1 != null && v.usdPago1 > 0) ||
                  (v.usdPago2 != null && v.usdPago2 > 0);
                return (
                  <TableRow key={v.id} className={v.anulada ? "text-muted-foreground" : undefined}>
                    <TableCell className={cn("font-mono text-xs font-medium", v.anulada && "line-through")}>
                      {v.numeroVenta}
                    </TableCell>
                    <TableCell className={cn("font-mono text-xs tabular-nums", v.anulada && "line-through")}>
                      <span>{new Date(v.fecha).toLocaleDateString("es-AR")}</span>{" "}
                      <span className="text-muted-foreground">
                        {new Date(v.fecha).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </TableCell>
                    <TableCell className={cn("font-medium", v.anulada && "line-through")}>
                      {v.cliente?.nombre ?? v.clienteNombre ?? (
                        <span className="font-normal text-muted-foreground">Consumidor final</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium">{labelMedio}</span>
                        {v.anulada && <Badge variant="outline">Anulada</Badge>}
                        {v.metodoPagoSecundario && (
                          <Badge variant="outline">
                            + {METODO_PAGO_LABEL[v.metodoPagoSecundario] ?? v.metodoPagoSecundario}
                          </Badge>
                        )}
                        {tieneUsd && <Badge variant="outline">USD</Badge>}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono font-semibold tabular-nums",
                        v.anulada && "line-through"
                      )}
                    >
                      {formatARS(v.total)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono tabular-nums",
                        !v.anulada &&
                          (v.gananciaBruta >= 0 ? "text-num-positive" : "text-num-negative"),
                        v.anulada && "line-through"
                      )}
                    >
                      {formatARS(v.gananciaBruta)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono text-xs tabular-nums text-muted-foreground",
                        v.anulada && "line-through"
                      )}
                    >
                      {v.margenPorcentaje.toFixed(1)}%
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono tabular-nums",
                        !v.anulada && v.deudaConsignacion > 0 && "text-num-warning",
                        v.anulada && "line-through"
                      )}
                    >
                      {v.deudaConsignacion > 0 ? formatARS(v.deudaConsignacion) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/ventas/${v.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
