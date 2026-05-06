"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { METODO_PAGO_LABEL } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { formatARS, formatUSD } from "@/lib/formatCurrency";
import { Button } from "@/components/ui/button";
import {
  Download,
  Calendar,
  ShoppingBag,
  TrendingUp,
  Percent,
  DollarSign,
  Package,
  Warehouse,
  AlertTriangle,
  BarChart3,
  CreditCard,
  ArrowRight,
  GitCompareArrows,
} from "lucide-react";

function getDefaultDates() {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return {
    desde: inicio.toISOString().slice(0, 10),
    hasta: hoy.toISOString().slice(0, 10),
  };
}

export default function ReportesPage() {
  const { desde, hasta } = getDefaultDates();
  const [fechaDesde, setFechaDesde] = useState(desde);
  const [fechaHasta, setFechaHasta] = useState(hasta);
  const [metodoPago, setMetodoPago] = useState("__all__");
  const [proveedorId, setProveedorId] = useState("__all__");
  const [categoriaId, setCategoriaId] = useState("__all__");
  const [comparar, setComparar] = useState(true);
  const [proveedores, setProveedores] = useState<Array<{ id: string; nombre: string }>>([]);
  const [categorias, setCategorias] = useState<Array<{ id: string; nombre: string }>>([]);
  const [ventas, setVentas] = useState<Record<string, unknown> | null>(null);
  const [inventario, setInventario] = useState<Record<string, unknown> | null>(null);
  const [rentabilidad, setRentabilidad] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const fetchReporte = useCallback(async (tipo: string) => {
    setLoading(tipo);
    try {
      const params = new URLSearchParams({
        tipo,
        desde: fechaDesde,
        hasta: fechaHasta,
        comparar: comparar ? "true" : "false",
      });
      if (metodoPago !== "__all__") params.set("metodoPago", metodoPago);
      if (proveedorId !== "__all__") params.set("proveedorId", proveedorId);
      if (categoriaId !== "__all__") params.set("categoriaId", categoriaId);
      const res = await fetch(`/api/reportes?${params.toString()}`);
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      if (tipo === "ventas") setVentas(data);
      if (tipo === "inventario") setInventario(data);
      if (tipo === "rentabilidad") setRentabilidad(data);
    } catch {
      if (tipo === "ventas") setVentas(null);
      if (tipo === "inventario") setInventario(null);
      if (tipo === "rentabilidad") setRentabilidad(null);
    } finally {
      setLoading(null);
    }
  }, [fechaDesde, fechaHasta, metodoPago, proveedorId, categoriaId, comparar]);

  useEffect(() => {
    fetchReporte("ventas");
    fetchReporte("inventario");
    fetchReporte("rentabilidad");
  }, [fetchReporte]);

  useEffect(() => {
    fetch("/api/proveedores")
      .then((r) => r.json())
      .then((data) =>
        setProveedores(Array.isArray(data) ? data.map((p) => ({ id: p.id, nombre: p.nombre })) : [])
      )
      .catch(() => setProveedores([]));
    fetch("/api/categorias")
      .then((r) => r.json())
      .then((data) =>
        setCategorias(Array.isArray(data) ? data.map((c) => ({ id: c.id, nombre: c.nombre })) : [])
      )
      .catch(() => setCategorias([]));
  }, []);

  const aplicarPreset = (preset: "hoy" | "ultimos7" | "mesActual" | "mesAnterior") => {
    const hoy = new Date();
    if (preset === "hoy") {
      const d = hoy.toISOString().slice(0, 10);
      setFechaDesde(d);
      setFechaHasta(d);
      return;
    }
    if (preset === "ultimos7") {
      const desde7 = new Date(hoy);
      desde7.setDate(hoy.getDate() - 6);
      setFechaDesde(desde7.toISOString().slice(0, 10));
      setFechaHasta(hoy.toISOString().slice(0, 10));
      return;
    }
    if (preset === "mesActual") {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      setFechaDesde(inicio.toISOString().slice(0, 10));
      setFechaHasta(hoy.toISOString().slice(0, 10));
      return;
    }
    const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    setFechaDesde(inicioMesAnterior.toISOString().slice(0, 10));
    setFechaHasta(finMesAnterior.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Reportes</h1>
          <p className="mt-1 text-muted-foreground">
            Ventas, inventario y rentabilidad por período
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 shadow-sm" asChild>
            <a
              href={`/api/reportes/export?desde=${encodeURIComponent(fechaDesde)}&hasta=${encodeURIComponent(fechaHasta)}&metodoPago=${encodeURIComponent(metodoPago)}&proveedorId=${encodeURIComponent(proveedorId)}&categoriaId=${encodeURIComponent(categoriaId)}`}
              download
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </a>
          </Button>
          <Button size="sm" className="gap-1.5 shadow-sm" asChild>
            <a
              href={`/api/reportes/export/pdf?desde=${encodeURIComponent(fechaDesde)}&hasta=${encodeURIComponent(fechaHasta)}&metodoPago=${encodeURIComponent(metodoPago)}&proveedorId=${encodeURIComponent(proveedorId)}&categoriaId=${encodeURIComponent(categoriaId)}`}
              download
            >
              <Download className="h-3.5 w-3.5" />
              Exportar PDF
            </a>
          </Button>
        </div>
      </div>

      {/* ── Filtro de fechas ─────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-4 py-4">
          <div className="flex items-center gap-2 text-muted-foreground shrink-0">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Período</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => aplicarPreset("hoy")}>Hoy</Button>
            <Button variant="outline" size="sm" onClick={() => aplicarPreset("ultimos7")}>Últimos 7 días</Button>
            <Button variant="outline" size="sm" onClick={() => aplicarPreset("mesActual")}>Mes actual</Button>
            <Button variant="outline" size="sm" onClick={() => aplicarPreset("mesAnterior")}>Mes anterior</Button>
          </div>
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">Desde</label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="h-10 border-border/70 bg-muted/20 shadow-sm transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
            <ArrowRight className="hidden sm:block h-4 w-4 text-muted-foreground/30 shrink-0 mt-5" />
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">Hasta</label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="h-10 border-border/70 bg-muted/20 shadow-sm transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Método de pago</label>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger className="h-10 border-border/70 bg-muted/20 shadow-sm hover:bg-muted/30">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {Object.entries(METODO_PAGO_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Proveedor</label>
              <Select value={proveedorId} onValueChange={setProveedorId}>
                <SelectTrigger className="h-10 border-border/70 bg-muted/20 shadow-sm hover:bg-muted/30">
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
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Categoría</label>
              <Select value={categoriaId} onValueChange={setCategoriaId}>
                <SelectTrigger className="h-10 border-border/70 bg-muted/20 shadow-sm hover:bg-muted/30">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end pb-2">
              <Button
                type="button"
                variant={comparar ? "default" : "outline"}
                className={`w-full justify-start gap-2 h-10 shadow-sm ${
                  comparar ? "bg-primary/90 hover:bg-primary" : "border-border/70 bg-muted/20 hover:bg-muted/30"
                }`}
                onClick={() => setComparar((v) => !v)}
              >
                <GitCompareArrows className="h-4 w-4" />
                {comparar ? "Comparando con período anterior" : "Activar comparación con período anterior"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <Tabs defaultValue="ventas">
        <TabsList className="flex w-full flex-wrap gap-1 sm:w-auto">
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
          <TabsTrigger value="rentabilidad">Rentabilidad</TabsTrigger>
        </TabsList>

        {/* ── TAB: VENTAS ────────────────────────────────────────── */}
        <TabsContent value="ventas" className="mt-6">
          {loading === "ventas" ? (
            <LoadingSkeleton />
          ) : ventas ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="overflow-hidden border-l-4 border-l-primary shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total ventas</CardTitle>
                    <ShoppingBag className="h-5 w-5 text-primary/70" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">{formatARS((ventas.totalVentas as number) ?? 0)}</p>
                    <ComparativaHint comparativa={ventas.comparativa} clave="totalVentas" />
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-l-4 border-l-blue-500 shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Cantidad</CardTitle>
                    <BarChart3 className="h-5 w-5 text-blue-500/70" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">{ventas.cantidadVentas as number ?? 0}</p>
                    <p className="mt-1 text-xs text-muted-foreground">operaciones en el período</p>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-l-4 border-l-green-500 shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Ganancia</CardTitle>
                    <TrendingUp className="h-5 w-5 text-green-500/70" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
                      {formatARS((ventas.totalGanancia as number) ?? 0)}
                    </p>
                    <ComparativaHint comparativa={ventas.comparativa} clave="totalGanancia" />
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-l-4 border-l-indigo-500 shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Margen prom.</CardTitle>
                    <Percent className="h-5 w-5 text-indigo-500/70" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">
                      {(ventas.margenPromedio as number)?.toFixed(1) ?? 0}%
                    </p>
                    <ComparativaHint comparativa={ventas.comparativa} clave="margenPromedio" sufijo="%" />
                  </CardContent>
                </Card>
              </div>

              {/* USD section */}
              {(() => {
                const u = ventas.usd as
                  | { totalUsdRecibido: number; ventasConUsd: number; equivalenteArsDesdeUsd: number }
                  | undefined;
                if (!u || u.totalUsdRecibido === 0) return null;
                return (
                  <Card className="overflow-hidden border-l-4 border-l-slate-600 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <DollarSign className="h-4 w-4 text-slate-600" />
                        Dólares en ventas (POS)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">USD cobrados</p>
                          <p className="text-xl font-bold tabular-nums mt-1">{formatUSD(u.totalUsdRecibido ?? 0)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Suma de tramos en USD</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Ventas con USD</p>
                          <p className="text-xl font-bold tabular-nums mt-1">{u.ventasConUsd ?? 0}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Al menos un tramo en dólares</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Equivalente ARS</p>
                          <p className="text-xl font-bold tabular-nums mt-1">{formatARS(u.equivalenteArsDesdeUsd ?? 0)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">USD × cotización de cada venta</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Métodos de pago */}
              {(ventas.porMetodoPago as Record<string, { cantidad: number; total: number }>) && (
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CreditCard className="h-4 w-4" />
                      Por método de pago
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="pl-6">Método</TableHead>
                          <TableHead className="text-center">Cant.</TableHead>
                          <TableHead className="text-right pr-6">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(
                          ventas.porMetodoPago as Record<string, { cantidad: number; total: number }>
                        ).map(([metodo, data]) => (
                          <TableRow key={metodo} className="transition-colors hover:bg-muted/30">
                            <TableCell className="pl-6 font-medium">{METODO_PAGO_LABEL[metodo] ?? metodo}</TableCell>
                            <TableCell className="text-center tabular-nums text-muted-foreground">{data.cantidad}</TableCell>
                            <TableCell className="text-right pr-6 font-semibold tabular-nums">{formatARS(data.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {(() => {
                const rankings = ventas.rankings as
                  | {
                      topProductosPorVenta?: Array<{ nombre: string; sku: string; venta: number }>;
                      topProductosPorGanancia?: Array<{ nombre: string; sku: string; ganancia: number }>;
                    }
                  | undefined;
                if (!rankings) return null;
                return (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base">Top productos por venta</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {(rankings.topProductosPorVenta ?? []).slice(0, 5).map((p) => (
                          <div key={p.sku} className="flex items-center justify-between text-sm">
                            <span className="truncate pr-3">{p.nombre}</span>
                            <span className="font-semibold tabular-nums">{formatARS(p.venta)}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base">Top productos por ganancia</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {(rankings.topProductosPorGanancia ?? []).slice(0, 5).map((p) => (
                          <div key={p.sku} className="flex items-center justify-between text-sm">
                            <span className="truncate pr-3">{p.nombre}</span>
                            <span className="font-semibold tabular-nums">{formatARS(p.ganancia ?? 0)}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
            </div>
          ) : (
            <EmptyState text="Sin datos de ventas para este período" />
          )}
        </TabsContent>

        {/* ── TAB: INVENTARIO ────────────────────────────────────── */}
        <TabsContent value="inventario" className="mt-6">
          {loading === "inventario" ? (
            <LoadingSkeleton />
          ) : inventario ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="overflow-hidden border-l-4 border-l-primary shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Productos activos</CardTitle>
                    <Package className="h-5 w-5 text-primary/70" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">{inventario.cantidadProductos as number ?? 0}</p>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-l-4 border-l-slate-500 shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Valor (costo)</CardTitle>
                    <Warehouse className="h-5 w-5 text-slate-500/70" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">{formatARS((inventario.valorInventarioCompra as number) ?? 0)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Precio compra × stock</p>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-l-4 border-l-green-500 shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Valor (venta)</CardTitle>
                    <TrendingUp className="h-5 w-5 text-green-500/70" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
                      {formatARS((inventario.valorInventarioVenta as number) ?? 0)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Precio venta × stock</p>
                  </CardContent>
                </Card>
              </div>

              {(() => {
                const productos = inventario.productosBajoStock as Array<{ sku: string; nombre: string; stockActual: number; stockMinimo: number }>;
                if (!productos?.length) return (
                  <Card className="shadow-sm border-dashed">
                    <CardContent className="py-8 text-center">
                      <Package className="h-8 w-8 text-green-500/30 mx-auto mb-2" />
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">Todo el stock en orden</p>
                      <p className="text-xs text-muted-foreground mt-1">Ningún producto por debajo del mínimo</p>
                    </CardContent>
                  </Card>
                );
                return (
                  <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Productos con stock bajo
                      </CardTitle>
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/50 dark:text-amber-200">
                        {productos.length}
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="pl-6">Producto</TableHead>
                            <TableHead className="text-center">Stock</TableHead>
                            <TableHead className="text-center">Mínimo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productos.map((p) => (
                            <TableRow key={p.sku} className="transition-colors hover:bg-muted/30">
                              <TableCell className="pl-6">
                                <span className="font-medium">{p.nombre}</span>
                                <span className="ml-1.5 text-muted-foreground text-xs">({p.sku})</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 tabular-nums">
                                  {p.stockActual}
                                </span>
                              </TableCell>
                              <TableCell className="text-center tabular-nums text-muted-foreground">{p.stockMinimo}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          ) : (
            <EmptyState text="Cargar inventario para ver datos" />
          )}
        </TabsContent>

        {/* ── TAB: RENTABILIDAD ──────────────────────────────────── */}
        <TabsContent value="rentabilidad" className="mt-6">
          {loading === "rentabilidad" ? (
            <LoadingSkeleton />
          ) : rentabilidad ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="overflow-hidden border-l-4 border-l-primary shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total ventas</CardTitle>
                    <ShoppingBag className="h-5 w-5 text-primary/70" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">{formatARS((rentabilidad.totalVentas as number) ?? 0)}</p>
                    <ComparativaHint comparativa={rentabilidad.comparativa} clave="totalVentas" />
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-l-4 border-l-slate-500 shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Costo total</CardTitle>
                    <Warehouse className="h-5 w-5 text-slate-500/70" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">{formatARS((rentabilidad.totalCosto as number) ?? 0)}</p>
                    <ComparativaHint comparativa={rentabilidad.comparativa} clave="totalCosto" />
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-l-4 border-l-green-500 shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Ganancia</CardTitle>
                    <TrendingUp className="h-5 w-5 text-green-500/70" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
                      {formatARS((rentabilidad.totalGanancia as number) ?? 0)}
                    </p>
                    <ComparativaHint comparativa={rentabilidad.comparativa} clave="totalGanancia" />
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-l-4 border-l-indigo-500 shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Margen</CardTitle>
                    <Percent className="h-5 w-5 text-indigo-500/70" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">
                      {(rentabilidad.margenPorcentaje as number)?.toFixed(1) ?? 0}%
                    </p>
                    <ComparativaHint comparativa={rentabilidad.comparativa} clave="margenPorcentaje" sufijo="%" />
                  </CardContent>
                </Card>
              </div>

              {(() => {
                const productos = rentabilidad.porProducto as Array<{ nombre: string; sku: string; cantidad: number; venta: number; costo: number; ganancia: number }>;
                if (!productos?.length) return null;
                return (
                  <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="h-4 w-4" />
                        Rentabilidad por producto
                      </CardTitle>
                      <Badge variant="secondary">{productos.length} productos</Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="pl-6">Producto</TableHead>
                            <TableHead className="text-center">Cant.</TableHead>
                            <TableHead className="text-right">Venta</TableHead>
                            <TableHead className="text-right">Costo</TableHead>
                            <TableHead className="text-right pr-6">Ganancia</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productos.map((p) => (
                            <TableRow key={p.sku} className="transition-colors hover:bg-muted/30">
                              <TableCell className="pl-6">
                                <span className="font-medium">{p.nombre}</span>
                                <span className="ml-1.5 text-muted-foreground text-xs">({p.sku})</span>
                              </TableCell>
                              <TableCell className="text-center tabular-nums text-muted-foreground">{p.cantidad}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatARS(p.venta)}</TableCell>
                              <TableCell className="text-right tabular-nums text-muted-foreground">{formatARS(p.costo)}</TableCell>
                              <TableCell className="text-right pr-6 font-semibold tabular-nums text-green-600 dark:text-green-400">
                                {formatARS(p.ganancia)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          ) : (
            <EmptyState text="Sin datos de rentabilidad para este período" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-5">
            <div className="flex justify-between">
              <div className="h-4 w-24 animate-skeleton-shimmer rounded" />
              <div className="h-4 w-4 animate-skeleton-shimmer rounded" />
            </div>
            <div className="mt-3 h-8 w-32 animate-skeleton-shimmer rounded" />
          </div>
        ))}
      </div>
      <div className="h-48 animate-skeleton-shimmer rounded-lg" />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="shadow-sm border-dashed">
      <CardContent className="py-12 text-center">
        <BarChart3 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

function ComparativaHint({
  comparativa,
  clave,
  sufijo = "",
}: {
  comparativa: unknown;
  clave: string;
  sufijo?: string;
}) {
  const entry = (comparativa as Record<string, { deltaPct?: number | null }> | null)?.[clave];
  const deltaPct = entry?.deltaPct;
  if (deltaPct == null) return null;
  const positivo = deltaPct >= 0;
  return (
    <p className={`mt-1 text-xs ${positivo ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
      {positivo ? "+" : ""}
      {deltaPct.toFixed(1)}
      {sufijo || "%"} vs período anterior
    </p>
  );
}
