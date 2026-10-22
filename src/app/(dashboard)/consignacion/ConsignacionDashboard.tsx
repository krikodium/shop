"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileStack, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Resumen } from "@/components/ui/resumen";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DeudaProveedor } from "@/app/api/consignacion/deudas/route";
import { formatARS } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";

type FiltroConsignacion = "todos" | "con_saldo" | "listos" | "al_dia";

export function ConsignacionDashboard() {
  const [deudas, setDeudas] = useState<DeudaProveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroConsignacion>("todos");

  useEffect(() => {
    fetch("/api/consignacion/deudas")
      .then((res) => res.json())
      .then((data) => setDeudas(Array.isArray(data) ? data : []))
      .catch(() => setDeudas([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) {
      const id = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id);
    }
  }, [loading]);

  const metricas = useMemo(() => {
    const totalDeuda = deudas.reduce((acc, d) => acc + d.deudaPendiente, 0);
    const totalVendido = deudas.reduce((acc, d) => acc + d.totalVendidoPeriodo, 0);
    const conSaldo = deudas.filter((d) => d.deudaPendiente > 0);
    const listos = conSaldo.filter((d) => d.restriccionRendicion.permitido);
    const deudaLista = listos.reduce((acc, d) => acc + d.deudaPendiente, 0);
    return {
      totalDeuda,
      totalVendido,
      conSaldoCount: conSaldo.length,
      listosCount: listos.length,
      alDiaCount: deudas.length - conSaldo.length,
      deudaLista,
    };
  }, [deudas]);

  const filas = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase("es");
    return [...deudas]
      .filter((d) => {
        if (filtro === "con_saldo" && d.deudaPendiente <= 0) return false;
        if (filtro === "listos" && !(d.deudaPendiente > 0 && d.restriccionRendicion.permitido))
          return false;
        if (filtro === "al_dia" && d.deudaPendiente > 0) return false;
        if (!q) return true;
        return d.proveedorNombre.toLocaleLowerCase("es").includes(q);
      })
      .sort((a, b) => b.deudaPendiente - a.deudaPendiente);
  }, [deudas, busqueda, filtro]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-skeleton-shimmer rounded-xl" />
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  if (deudas.length === 0) {
    return (
      <EmptyState
        icono={FileStack}
        titulo="No hay proveedores de consignación"
        descripcion="Creá un proveedor con tipo «Consignación» y asignale productos para empezar a registrar ventas y rendiciones."
        accion={
          <Button asChild variant="outline" size="sm">
            <Link href="/proveedores">Gestionar proveedores</Link>
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
            label: "Deuda pendiente total",
            valor: (
              <span className={metricas.totalDeuda > 0 ? "text-num-warning" : undefined}>
                {formatARS(metricas.totalDeuda)}
              </span>
            ),
            hint: `Saldo acumulado de ${deudas.length} proveedores`,
          },
          {
            label: "Disponible para rendir hoy",
            valor: formatARS(metricas.deudaLista),
            hint: `${metricas.listosCount} ${metricas.listosCount === 1 ? "proveedor habilitado" : "proveedores habilitados"}`,
          },
          {
            label: "Proveedores con saldo",
            valor: (
              <>
                {metricas.conSaldoCount}
                <span className="text-muted-foreground">/{deudas.length}</span>
              </>
            ),
            hint: `${metricas.alDiaCount} al día sin saldo`,
          },
          {
            label: "Ventas aún no rendidas",
            valor: formatARS(metricas.totalVendido),
            hint: "Subtotal bruto en consignación",
          },
        ]}
      />

      <Panel>
        <PanelHeader
          title="Estado de cuenta por proveedor"
          descripcion="Ordenados de mayor a menor saldo pendiente."
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
                  placeholder="Buscar proveedor…"
                  className="h-9 w-full pl-9 sm:w-56"
                  aria-label="Buscar proveedor de consignación"
                />
              </div>
              <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
                {(
                  [
                    { id: "todos", label: "Todos" },
                    { id: "con_saldo", label: "Con saldo" },
                    { id: "listos", label: "Listos" },
                    { id: "al_dia", label: "Al día" },
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

        {filas.length === 0 ? (
          <PanelBody>
            <EmptyState
              titulo="Ningún proveedor coincide con el filtro"
              accion={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBusqueda("");
                    setFiltro("todos");
                  }}
                >
                  Ver todos
                </Button>
              }
            />
          </PanelBody>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Estado de liquidación</TableHead>
                <TableHead className="hidden w-56 md:table-cell">Participación</TableHead>
                <TableHead className="text-right">Vendido bruto</TableHead>
                <TableHead className="text-right">Neto a rendir</TableHead>
                <TableHead className="w-[1%]">
                  <span className="sr-only">Acción</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((d) => {
                const tieneDeuda = d.deudaPendiente > 0;
                const permitido = d.restriccionRendicion.permitido;
                const share =
                  metricas.totalDeuda > 0 ? (d.deudaPendiente / metricas.totalDeuda) * 100 : 0;

                return (
                  <TableRow key={d.proveedorId}>
                    <TableCell className="max-w-[18rem]">
                      <Link
                        href={`/proveedores/${d.proveedorId}`}
                        className="truncate font-medium hover:underline"
                      >
                        {d.proveedorNombre}
                      </Link>
                      <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                        {d.ultimaRendicion
                          ? `Última rendición ${new Date(d.ultimaRendicion.fechaHasta).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} · ${formatARS(d.ultimaRendicion.totalARendir)}`
                          : "Sin rendiciones previas"}
                      </p>
                    </TableCell>
                    <TableCell>
                      {!tieneDeuda ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Al día
                        </Badge>
                      ) : permitido ? (
                        <Badge variant="default">Habilitado para rendir</Badge>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline">Con saldo</Badge>
                          <span className="font-mono text-xs text-muted-foreground">
                            en {d.restriccionRendicion.diasParaUltimaSemana} d
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {tieneDeuda ? (
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-foreground/70 transition-[width] duration-700 ease-out"
                              style={{ width: mounted ? `${Math.max(share, 2)}%` : "0%" }}
                            />
                          </div>
                          <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                            {share.toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {d.totalVendidoPeriodo > 0 ? formatARS(d.totalVendidoPeriodo) : "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono font-semibold tabular-nums",
                        tieneDeuda ? "text-num-warning" : "text-muted-foreground"
                      )}
                    >
                      {formatARS(d.deudaPendiente)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        {tieneDeuda && permitido && (
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={`/consignacion/rendiciones/nueva?proveedorId=${d.proveedorId}`}
                            >
                              Liquidar
                            </Link>
                          </Button>
                        )}
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/proveedores/${d.proveedorId}`}>Ficha</Link>
                        </Button>
                      </div>
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
