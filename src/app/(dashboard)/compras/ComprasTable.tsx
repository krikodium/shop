"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PackageSearch, Search } from "lucide-react";
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
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Resumen } from "@/components/ui/resumen";
import { formatARS } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

/** El estado se lee por texto; todos los badges son outline. */
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PARCIAL: "Parcial",
  RECIBIDO: "Recibido",
  CANCELADO: "Cancelado",
};

const claseLabel = "font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground";

interface OrdenRow {
  id: string;
  numeroOrden: string;
  fecha: string;
  total: number;
  estado: string;
  proveedor: { id: string; nombre: string };
  itemsCount: number;
}

interface ComprasMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ProveedorOption {
  id: string;
  nombre: string;
}

export function ComprasTable() {
  const [ordenes, setOrdenes] = useState<OrdenRow[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("__all__");
  const [filtroProveedor, setFiltroProveedor] = useState("__all__");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [montoMin, setMontoMin] = useState("");
  const [montoMax, setMontoMax] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<ComprasMeta>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBusquedaDebounced(filtroBusqueda.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filtroBusqueda]);

  useEffect(() => {
    fetch("/api/proveedores")
      .then((res) => res.json())
      .then((data) => {
        const raw = Array.isArray(data) ? data : [];
        setProveedores(
          raw
            .map((p: { id?: string; nombre?: string }) => ({
              id: p.id ?? "",
              nombre: p.nombre ?? "",
            }))
            .filter((p: ProveedorOption) => p.id)
            .sort((a: ProveedorOption, b: ProveedorOption) =>
              a.nombre.localeCompare(b.nombre, "es")
            )
        );
      })
      .catch(() => setProveedores([]));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (busquedaDebounced) params.set("q", busquedaDebounced);
    if (filtroEstado !== "__all__") params.set("estado", filtroEstado);
    if (filtroProveedor !== "__all__") params.set("proveedorId", filtroProveedor);
    if (fechaDesde) params.set("fechaDesde", fechaDesde);
    if (fechaHasta) params.set("fechaHasta", fechaHasta);
    if (montoMin) params.set("montoMin", montoMin);
    if (montoMax) params.set("montoMax", montoMax);

    Promise.resolve()
      .then(() => {
        if (controller.signal.aborted) return null;
        setLoading(true);
        setError(null);
        return fetch(`/api/compras?${params.toString()}`, { signal: controller.signal });
      })
      .then((res) => {
        if (!res) return null;
        if (!res.ok) throw new Error("No se pudieron cargar las compras");
        return res.json();
      })
      .then((payload) => {
        if (!payload) return;
        const raw = Array.isArray(payload) ? payload : payload?.data ?? [];
        const rows: OrdenRow[] = raw.map((o: Record<string, unknown>) => ({
          id: o.id as string,
          numeroOrden: o.numeroOrden as string,
          fecha: o.fecha as string,
          total: Number(o.total ?? 0),
          estado: (o.estado as string) ?? "",
          proveedor: (o.proveedor as { id?: string; nombre?: string })?.id
            ? {
                id: (o.proveedor as { id: string }).id,
                nombre: ((o.proveedor as { nombre?: string }).nombre ?? "") as string,
              }
            : { id: "", nombre: "" },
          itemsCount: Number(o.itemsCount ?? 0),
        }));
        setOrdenes(rows);
        const nextMeta = Array.isArray(payload) ? null : payload?.meta;
        setMeta({
          page: Number(nextMeta?.page ?? page),
          pageSize: Number(nextMeta?.pageSize ?? PAGE_SIZE),
          total: Number(nextMeta?.total ?? rows.length),
          totalPages: Math.max(1, Number(nextMeta?.totalPages ?? 1)),
        });
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setOrdenes([]);
        setMeta({ page, pageSize: PAGE_SIZE, total: 0, totalPages: 1 });
        setError(err instanceof Error ? err.message : "Error al cargar compras");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setHasLoaded(true);
        }
      });

    return () => controller.abort();
  }, [
    page,
    busquedaDebounced,
    filtroEstado,
    filtroProveedor,
    fechaDesde,
    fechaHasta,
    montoMin,
    montoMax,
  ]);

  const kpis = useMemo(() => {
    const totalOrdenes = ordenes.length;
    const totalComprado = ordenes.reduce((acc, o) => acc + o.total, 0);
    const pendientesParciales = ordenes.filter(
      (o) => o.estado === "PENDIENTE" || o.estado === "PARCIAL"
    ).length;
    const recibidas = ordenes.filter((o) => o.estado === "RECIBIDO").length;
    return { totalOrdenes, totalComprado, pendientesParciales, recibidas };
  }, [ordenes]);

  const resetToFirstPage = () => setPage(1);

  const limpiarFiltros = () => {
    setFiltroBusqueda("");
    setBusquedaDebounced("");
    setFiltroEstado("__all__");
    setFiltroProveedor("__all__");
    setFechaDesde("");
    setFechaHasta("");
    setMontoMin("");
    setMontoMax("");
    setPage(1);
  };

  if (loading && !hasLoaded) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Cargando compras">
        {/* Misma geometría que la banda `Resumen` que aparece después. */}
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card px-4 py-3.5">
              <div className="h-3 w-24 animate-skeleton-shimmer rounded" />
              <div className="mt-2 h-6 w-28 animate-skeleton-shimmer rounded" />
              <div className="mt-1.5 h-3 w-20 animate-skeleton-shimmer rounded" />
            </div>
          ))}
        </div>
        <TableSkeleton rows={6} cols={7} />
      </div>
    );
  }

  const isRefreshing = loading && hasLoaded;
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.page * meta.pageSize, meta.total);

  // Los cuatro valores se calculan sobre la página visible (ver `kpis`): los
  // labels lo dicen para que no se lean como totales del filtro completo.
  const resumen = (
    <Resumen
      items={[
        {
          label: "Órdenes en página",
          valor: kpis.totalOrdenes,
          hint: `${meta.total} resultados filtrados`,
        },
        {
          label: "Total visible",
          valor: formatARS(kpis.totalComprado),
          hint: "suma de las órdenes de esta página",
        },
        {
          label: "Pendientes / parciales",
          valor: kpis.pendientesParciales,
          hint: "en esta página",
        },
        { label: "Recibidas", valor: kpis.recibidas, hint: "en esta página" },
      ]}
    />
  );

  const filtros = (
    <div className="flex flex-wrap items-end gap-2 border-b border-border px-4 py-3 sm:px-5">
      <div className="relative basis-full sm:basis-auto">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="filtro-compra-busqueda"
          aria-label="Buscar compras"
          placeholder="Nº de orden o proveedor"
          value={filtroBusqueda}
          onChange={(e) => setFiltroBusqueda(e.target.value)}
          className="h-9 w-full pl-9 sm:w-56"
        />
      </div>
      <div className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:flex-none sm:basis-auto">
        <Label htmlFor="filtro-compra-estado" className="sr-only">
          Estado
        </Label>
        <Select
          value={filtroEstado}
          onValueChange={(value) => {
            setFiltroEstado(value);
            resetToFirstPage();
          }}
        >
          <SelectTrigger id="filtro-compra-estado" className="h-9 w-full sm:w-[9.5rem]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos los estados</SelectItem>
            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
            <SelectItem value="PARCIAL">Parcial</SelectItem>
            <SelectItem value="RECIBIDO">Recibido</SelectItem>
            <SelectItem value="CANCELADO">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:flex-none sm:basis-auto">
        <Label htmlFor="filtro-compra-proveedor" className="sr-only">
          Proveedor
        </Label>
        <Select
          value={filtroProveedor}
          onValueChange={(value) => {
            setFiltroProveedor(value);
            resetToFirstPage();
          }}
        >
          <SelectTrigger id="filtro-compra-proveedor" className="h-9 w-full sm:w-[11rem]">
            <SelectValue placeholder="Proveedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos los proveedores</SelectItem>
            {proveedores.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex w-full items-end gap-1.5 sm:w-auto">
        <div className="min-w-0 flex-1 space-y-1 sm:flex-none">
          <Label htmlFor="filtro-compra-fecha-desde" className={claseLabel}>
            Desde
          </Label>
          <Input
            id="filtro-compra-fecha-desde"
            type="date"
            value={fechaDesde}
            onChange={(e) => {
              setFechaDesde(e.target.value);
              resetToFirstPage();
            }}
            className="h-9 w-full sm:w-[9.5rem]"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1 sm:flex-none">
          <Label htmlFor="filtro-compra-fecha-hasta" className={claseLabel}>
            Hasta
          </Label>
          <Input
            id="filtro-compra-fecha-hasta"
            type="date"
            value={fechaHasta}
            onChange={(e) => {
              setFechaHasta(e.target.value);
              resetToFirstPage();
            }}
            className="h-9 w-full sm:w-[9.5rem]"
          />
        </div>
      </div>
      <div className="flex w-full items-end gap-1.5 sm:w-auto">
        <div className="min-w-0 flex-1 space-y-1 sm:flex-none">
          <Label htmlFor="filtro-compra-monto-min" className={claseLabel}>
            Monto mín.
          </Label>
          <Input
            id="filtro-compra-monto-min"
            type="number"
            min={0}
            step="0.01"
            value={montoMin}
            onChange={(e) => {
              setMontoMin(e.target.value);
              resetToFirstPage();
            }}
            placeholder="0.00"
            className="h-9 w-full font-mono tabular-nums sm:w-28"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1 sm:flex-none">
          <Label htmlFor="filtro-compra-monto-max" className={claseLabel}>
            Monto máx.
          </Label>
          <Input
            id="filtro-compra-monto-max"
            type="number"
            min={0}
            step="0.01"
            value={montoMax}
            onChange={(e) => {
              setMontoMax(e.target.value);
              resetToFirstPage();
            }}
            placeholder="0.00"
            className="h-9 w-28 font-mono tabular-nums"
          />
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="h-9">
        Limpiar filtros
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {resumen}

      <div className="space-y-3">
        <Panel className="relative">
          {isRefreshing && (
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 z-10 h-0.5 animate-pulse bg-muted-foreground/40"
            />
          )}
          <PanelHeader title="Órdenes de compra" />
          {filtros}
          {error ? (
            <p role="alert" className="px-4 py-6 text-sm text-destructive sm:px-5">
              {error}
            </p>
          ) : ordenes.length === 0 ? (
            <PanelBody>
              <EmptyState
                icono={PackageSearch}
                titulo="No hay órdenes que coincidan"
                descripcion="Ajustá los filtros, o cargá una orden de compra nueva."
                accion={
                  <Button asChild size="sm">
                    <Link href="/compras/nueva">Nueva orden</Link>
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
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[1%]">
                    <span className="sr-only">Acción</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenes.map((o) => (
                  <TableRow
                    key={o.id}
                    className={cn(o.estado === "CANCELADO" && "text-muted-foreground")}
                  >
                    <TableCell className="font-mono text-xs tabular-nums">
                      {o.numeroOrden}
                    </TableCell>
                    <TableCell className="font-medium">{o.proveedor?.nombre || "—"}</TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {new Date(o.fecha).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {o.itemsCount}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold tabular-nums">
                      {formatARS(o.total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ESTADO_LABEL[o.estado] ?? o.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/compras/${o.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono text-xs tabular-nums">
            {from}–{to} de {meta.total} órdenes
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={meta.page <= 1 || loading}
            >
              Anterior
            </Button>
            <span className="font-mono text-xs tabular-nums">
              {meta.page} / {meta.totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((prev) => Math.min(meta.totalPages, prev + 1))}
              disabled={meta.page >= meta.totalPages || loading}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
