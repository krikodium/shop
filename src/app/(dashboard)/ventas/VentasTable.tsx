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

function getDefaultDates() {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return {
    desde: inicio.toISOString().slice(0, 10),
    hasta: hoy.toISOString().slice(0, 10),
  };
}

export function VentasTable() {
  const { desde, hasta } = getDefaultDates();
  const [fechaDesde, setFechaDesde] = useState(desde);
  const [fechaHasta, setFechaHasta] = useState(hasta);
  const [busqueda, setBusqueda] = useState("");
  const [ventas, setVentas] = useState<VentaRow[]>([]);
  // Arranca en `true`: la primera carga ya se refleja en el estado inicial,
  // así el efecto de montaje no necesita volver a pedirlo de forma síncrona.
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(() => {
    // Deferido a un microtask: evita marcar `setLoading(true)` de forma
    // síncrona dentro del efecto que dispara esta función (el estado ya
    // arranca en `true` para la primera carga; para los refetch de filtros
    // alcanza con encenderlo un instante después, no antes del primer paint).
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
  const ventasFiltradas = termino
    ? ventas.filter((v) =>
        `${v.numeroVenta} ${v.cliente?.nombre ?? v.clienteNombre ?? ""}`
          .toLocaleLowerCase("es")
          .includes(termino)
      )
    : ventas;

  // La API devuelve como máximo 100 ventas (take: 100 en /api/ventas). Los
  // agregados de abajo suman SOLO lo listado, así que cuando se alcanza el tope
  // hay que decirlo: si no, un total incompleto se lee como el total del período.
  const topeAlcanzado = ventas.length >= 100;
  const vigentes = ventasFiltradas.filter((v) => !v.anulada);
  const totalPeriodo = vigentes.reduce((s, v) => s + v.total, 0);
  const gananciaPeriodo = vigentes.reduce((s, v) => s + v.gananciaBruta, 0);

  const filtros = (
    <div className="flex flex-wrap items-end gap-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Nº de venta o cliente"
          className="h-10 w-44 pl-9 sm:w-52"
          aria-label="Buscar ventas"
        />
      </div>
      <div>
        <Label htmlFor="ventas-desde" className="sr-only">
          Desde
        </Label>
        <Input
          id="ventas-desde"
          type="date"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          className="h-10 w-[9.5rem]"
        />
      </div>
      <div>
        <Label htmlFor="ventas-hasta" className="sr-only">
          Hasta
        </Label>
        <Input
          id="ventas-hasta"
          type="date"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          className="h-10 w-[9.5rem]"
        />
      </div>
    </div>
  );

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
      {vigentes.length > 0 && (
        <Resumen
          className="anim-entrada"
          items={[
            {
              label: "Ventas listadas",
              valor: vigentes.length,
              hint: topeAlcanzado ? "tope de 100 alcanzado" : "en el período elegido",
            },
            {
              label: "Ganancia",
              valor: formatARS(gananciaPeriodo),
              hint: "suma de las ventas listadas",
            },
            {
              label: "Total facturado",
              valor: formatARS(totalPeriodo),
              hint: "suma de las ventas listadas",
            },
          ]}
        />
      )}

      <Panel>
        <PanelHeader title="Historial de ventas" acciones={filtros} />
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
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead className="text-right">Ganancia</TableHead>
                <TableHead className="text-right">Margen</TableHead>
                <TableHead className="text-right">Consignación</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ventasFiltradas.map((v) => {
                const sinMedioDetectado =
                  !v.metodoPagoSecundario &&
                  !((v.usdPago1 ?? 0) > 0 || (v.usdPago2 ?? 0) > 0);
                return (
                  <TableRow key={v.id} className={v.anulada ? "text-muted-foreground" : undefined}>
                    <TableCell className={cn("font-medium", v.anulada && "line-through")}>
                      {v.numeroVenta}
                    </TableCell>
                    <TableCell className={v.anulada ? "line-through" : undefined}>
                      {new Date(v.fecha).toLocaleDateString("es-AR")}{" "}
                      {new Date(v.fecha).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className={v.anulada ? "line-through" : undefined}>
                      {v.cliente?.nombre ?? v.clienteNombre ?? "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono tabular-nums",
                        v.anulada && "line-through"
                      )}
                    >
                      {formatARS(v.total)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {v.anulada && <Badge variant="outline">Anulada</Badge>}
                        {v.metodoPagoSecundario && <Badge variant="outline">2 medios</Badge>}
                        {((v.usdPago1 != null && v.usdPago1 > 0) ||
                          (v.usdPago2 != null && v.usdPago2 > 0)) && (
                          <Badge variant="outline">USD</Badge>
                        )}
                        {!v.anulada && sinMedioDetectado && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
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
                        "text-right font-mono tabular-nums",
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
