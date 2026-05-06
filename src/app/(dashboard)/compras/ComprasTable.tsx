"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PAGE_SIZE = 20;
const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

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

  if (loading && !hasLoaded) return <TableSkeleton rows={6} cols={7} />;

  const estadoVariant = (e: string) =>
    e === "CANCELADO" ? "destructive" : e === "PENDIENTE" ? "secondary" : "outline";
  const isRefreshing = loading && hasLoaded;
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.page * meta.pageSize, meta.total);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border bg-card shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Órdenes en página
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{kpis.totalOrdenes}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {meta.total} resultados filtrados
            </p>
          </CardContent>
        </Card>
        <Card className="border bg-card shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total visible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {currencyFormatter.format(kpis.totalComprado)}
            </p>
          </CardContent>
        </Card>
        <Card className="border bg-card shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pendientes / parciales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{kpis.pendientesParciales}</p>
          </CardContent>
        </Card>
        <Card className="border bg-card shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Recibidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{kpis.recibidas}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Filtros de compras</CardTitle>
            <Button variant="ghost" onClick={limpiarFiltros}>
              Limpiar filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="filtro-compra-busqueda">Buscar</Label>
              <Input
                id="filtro-compra-busqueda"
                placeholder="Nº de orden o proveedor"
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filtro-compra-estado">Estado</Label>
              <Select
                value={filtroEstado}
                onValueChange={(value) => {
                  setFiltroEstado(value);
                  resetToFirstPage();
                }}
              >
                <SelectTrigger id="filtro-compra-estado">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="PARCIAL">Parcial</SelectItem>
                  <SelectItem value="RECIBIDO">Recibido</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filtro-compra-proveedor">Proveedor</Label>
              <Select
                value={filtroProveedor}
                onValueChange={(value) => {
                  setFiltroProveedor(value);
                  resetToFirstPage();
                }}
              >
                <SelectTrigger id="filtro-compra-proveedor">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filtro-compra-fecha-desde">Fecha desde</Label>
              <Input
                id="filtro-compra-fecha-desde"
                type="date"
                value={fechaDesde}
                onChange={(e) => {
                  setFechaDesde(e.target.value);
                  resetToFirstPage();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filtro-compra-fecha-hasta">Fecha hasta</Label>
              <Input
                id="filtro-compra-fecha-hasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => {
                  setFechaHasta(e.target.value);
                  resetToFirstPage();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filtro-compra-monto-min">Monto mínimo</Label>
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filtro-compra-monto-max">Monto máximo</Label>
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
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-lg border bg-card shadow-sm">
          {isRefreshing && (
            <div className="absolute inset-x-0 top-0 z-10 h-1 animate-pulse bg-primary/40" />
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No hay órdenes que coincidan con los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : (
                ordenes.map((o) => (
                  <TableRow key={o.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{o.numeroOrden}</TableCell>
                    <TableCell>{o.proveedor?.nombre ?? "—"}</TableCell>
                    <TableCell>{new Date(o.fecha).toLocaleDateString("es-AR")}</TableCell>
                    <TableCell className="text-right tabular-nums">{o.itemsCount}</TableCell>
                    <TableCell className="tabular-nums font-medium">
                      {currencyFormatter.format(o.total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={estadoVariant(o.estado)}>{o.estado}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/compras/${o.id}`}>
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border bg-card/70 px-4 py-3 text-sm text-muted-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
          Mostrando {from}-{to} de {meta.total} órdenes
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={meta.page <= 1 || loading}
          >
            Anterior
          </Button>
          <span className="min-w-24 text-center">
            Página {meta.page} de {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.min(meta.totalPages, prev + 1))}
            disabled={meta.page >= meta.totalPages || loading}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
