"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Figure, FigureGrid } from "@/components/ui/figure";
import { DataList, DataRow } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import { METODO_PAGO_LABEL } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAsyncAction } from "@/hooks/use-async-action";
import { notificar } from "@/lib/notificar";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Download, GitCompareArrows } from "lucide-react";

function getDefaultDates() {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return {
    desde: inicio.toISOString().slice(0, 10),
    hasta: hoy.toISOString().slice(0, 10),
  };
}

type Preset = "hoy" | "ultimos7" | "mesActual" | "mesAnterior";

const PRESETS: Array<{ id: Preset; label: string }> = [
  { id: "hoy", label: "Hoy" },
  { id: "ultimos7", label: "Últimos 7 días" },
  { id: "mesActual", label: "Mes actual" },
  { id: "mesAnterior", label: "Mes anterior" },
];

/** Rango de fechas de cada atajo (misma lógica que antes, solo extraída). */
function rangoPreset(preset: Preset): { desde: string; hasta: string } {
  const hoy = new Date();
  if (preset === "hoy") {
    const d = hoy.toISOString().slice(0, 10);
    return { desde: d, hasta: d };
  }
  if (preset === "ultimos7") {
    const desde7 = new Date(hoy);
    desde7.setDate(hoy.getDate() - 6);
    return { desde: desde7.toISOString().slice(0, 10), hasta: hoy.toISOString().slice(0, 10) };
  }
  if (preset === "mesActual") {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    return { desde: inicio.toISOString().slice(0, 10), hasta: hoy.toISOString().slice(0, 10) };
  }
  const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
  return {
    desde: inicioMesAnterior.toISOString().slice(0, 10),
    hasta: finMesAnterior.toISOString().slice(0, 10),
  };
}

/**
 * Descarga un archivo del mismo endpoint que antes usaba el `<a download>`
 * (misma URL, mismos query params), para poder mostrar estado de carga.
 */
async function descargarArchivo(url: string, nombrePorDefecto: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo generar el archivo (HTTP ${res.status})`);
  const blob = await res.blob();
  const disposicion = res.headers.get("Content-Disposition") ?? "";
  const nombre = /filename="?([^";]+)"?/i.exec(disposicion)?.[1] ?? nombrePorDefecto;
  const enlace = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = enlace;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(enlace);
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

  const aplicarPreset = (preset: Preset) => {
    const { desde, hasta } = rangoPreset(preset);
    setFechaDesde(desde);
    setFechaHasta(hasta);
  };

  const presetActivo = PRESETS.find((p) => {
    const r = rangoPreset(p.id);
    return r.desde === fechaDesde && r.hasta === fechaHasta;
  })?.id;

  const qsExport = `desde=${encodeURIComponent(fechaDesde)}&hasta=${encodeURIComponent(fechaHasta)}&metodoPago=${encodeURIComponent(metodoPago)}&proveedorId=${encodeURIComponent(proveedorId)}&categoriaId=${encodeURIComponent(categoriaId)}`;

  const exportarCsv = useAsyncAction(async () => {
    try {
      await descargarArchivo(`/api/reportes/export?${qsExport}`, "ventas.csv");
      notificar.ok("CSV generado", { descripcion: "La descarga empezó en tu navegador." });
    } catch (e) {
      notificar.error(e instanceof Error ? e.message : "No se pudo generar el CSV");
    }
  });

  const exportarPdf = useAsyncAction(async () => {
    try {
      await descargarArchivo(`/api/reportes/export/pdf?${qsExport}`, "reporte.pdf");
      notificar.ok("PDF generado", { descripcion: "La descarga empezó en tu navegador." });
    } catch (e) {
      notificar.error(e instanceof Error ? e.message : "No se pudo generar el PDF");
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        overline="Administración"
        title="Reportes"
        description="Ventas, inventario y rentabilidad por período"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void exportarCsv.run()}
          loading={exportarCsv.loading}
          loadingText="Generando…"
        >
          <Download className="size-4" aria-hidden="true" />
          Exportar CSV
        </Button>
        <Button
          size="sm"
          onClick={() => void exportarPdf.run()}
          loading={exportarPdf.loading}
          loadingText="Generando…"
        >
          <Download className="size-4" aria-hidden="true" />
          Exportar PDF
        </Button>
      </PageHeader>

      {/* ── Barra de filtros ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Atajos de período"
          className="inline-flex rounded-lg border border-border bg-muted p-0.5"
        >
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={presetActivo === p.id}
              onClick={() => aplicarPreset(p.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                presetActivo === p.id
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <Label htmlFor="reporte-desde" className="sr-only">
            Desde
          </Label>
          <Input
            id="reporte-desde"
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="h-9 w-[9.5rem] font-mono tabular-nums"
          />
          <span className="text-xs text-muted-foreground">a</span>
          <Label htmlFor="reporte-hasta" className="sr-only">
            Hasta
          </Label>
          <Input
            id="reporte-hasta"
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="h-9 w-[9.5rem] font-mono tabular-nums"
          />
        </div>

        <Label htmlFor="reporte-metodo" className="sr-only">
          Método de pago
        </Label>
        <Select value={metodoPago} onValueChange={setMetodoPago}>
          <SelectTrigger id="reporte-metodo" className="h-9 w-[170px]">
            <SelectValue placeholder="Método de pago" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos los medios</SelectItem>
            {Object.entries(METODO_PAGO_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Label htmlFor="reporte-proveedor" className="sr-only">
          Proveedor
        </Label>
        <Select value={proveedorId} onValueChange={setProveedorId}>
          <SelectTrigger id="reporte-proveedor" className="h-9 w-[170px]">
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

        <Label htmlFor="reporte-categoria" className="sr-only">
          Categoría
        </Label>
        <Select value={categoriaId} onValueChange={setCategoriaId}>
          <SelectTrigger id="reporte-categoria" className="h-9 w-[170px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas las categorías</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={comparar}
          onClick={() => setComparar((v) => !v)}
          className={cn("h-9", comparar && "border-foreground bg-accent")}
        >
          <GitCompareArrows className="size-4" aria-hidden="true" />
          Comparar con período anterior
        </Button>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <Tabs defaultValue="ventas">
        <TabsList>
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
          <TabsTrigger value="rentabilidad">Rentabilidad</TabsTrigger>
        </TabsList>

        {/* ── TAB: VENTAS ────────────────────────────────────────── */}
        <TabsContent value="ventas" className="mt-4">
          {loading === "ventas" ? (
            <LoadingSkeleton />
          ) : ventas ? (
            <div className="space-y-6">
              <FigureGrid columnas={4}>
                <Figure
                  label="Total ventas"
                  valor={formatARS((ventas.totalVentas as number) ?? 0)}
                  hint={<ComparativaHint comparativa={ventas.comparativa} clave="totalVentas" />}
                />
                <Figure
                  label="Cantidad"
                  valor={(ventas.cantidadVentas as number) ?? 0}
                  hint="operaciones en el período"
                />
                <Figure
                  label="Ganancia"
                  valor={formatARS((ventas.totalGanancia as number) ?? 0)}
                  tono="positivo"
                  hint={<ComparativaHint comparativa={ventas.comparativa} clave="totalGanancia" />}
                />
                <Figure
                  label="Margen prom."
                  valor={`${(ventas.margenPromedio as number)?.toFixed(1) ?? 0}%`}
                  hint={
                    <ComparativaHint
                      comparativa={ventas.comparativa}
                      clave="margenPromedio"
                      sufijo="%"
                    />
                  }
                />
              </FigureGrid>

              {(() => {
                const u = ventas.usd as
                  | { totalUsdRecibido: number; ventasConUsd: number; equivalenteArsDesdeUsd: number }
                  | undefined;
                if (!u || u.totalUsdRecibido === 0) return null;
                return (
                  <Panel>
                    <PanelHeader title="Dólares en ventas (POS)" />
                    <FigureGrid columnas={3} className="rounded-none border-0">
                      <Figure
                        label="USD cobrados"
                        valor={formatUSD(u.totalUsdRecibido ?? 0)}
                        hint="Suma de tramos en USD"
                      />
                      <Figure
                        label="Ventas con USD"
                        valor={u.ventasConUsd ?? 0}
                        hint="Al menos un tramo en dólares"
                      />
                      <Figure
                        label="Equivalente ARS"
                        valor={formatARS(u.equivalenteArsDesdeUsd ?? 0)}
                        hint="USD × cotización de cada venta"
                      />
                    </FigureGrid>
                  </Panel>
                );
              })()}

              {(() => {
                const porMetodo = Object.entries(
                  (ventas.porMetodoPago as Record<string, { cantidad: number; total: number }>) ?? {}
                );
                return (
                  <Panel>
                    <PanelHeader title="Por método de pago" />
                    {porMetodo.length === 0 ? (
                      <PanelBody>
                        <EmptyState className="py-6" titulo="Sin cobros en el período" />
                      </PanelBody>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Método</TableHead>
                            <TableHead className="text-right">Cant.</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {porMetodo.map(([metodo, data]) => (
                            <TableRow key={metodo}>
                              <TableCell className="font-medium">
                                {METODO_PAGO_LABEL[metodo] ?? metodo}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                                {data.cantidad}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold tabular-nums">
                                {formatARS(data.total)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Panel>
                );
              })()}

              {(() => {
                const rankings = ventas.rankings as
                  | {
                      topProductosPorVenta?: Array<{ nombre: string; sku: string; venta: number }>;
                      topProductosPorGanancia?: Array<{ nombre: string; sku: string; ganancia: number }>;
                    }
                  | undefined;
                if (!rankings) return null;
                const porVenta = (rankings.topProductosPorVenta ?? []).slice(0, 5);
                const porGanancia = (rankings.topProductosPorGanancia ?? []).slice(0, 5);
                return (
                  <div className="grid gap-5 lg:grid-cols-2">
                    <Panel>
                      <PanelHeader title="Top productos por venta" />
                      {porVenta.length === 0 ? (
                        <PanelBody>
                          <EmptyState className="py-6" titulo="Sin ventas en el período" />
                        </PanelBody>
                      ) : (
                        <DataList className="rounded-none border-0">
                          {porVenta.map((p) => (
                            <DataRow
                              key={p.sku}
                              className="min-h-0"
                              titulo={p.nombre}
                              meta={p.sku}
                              valor={formatARS(p.venta)}
                            />
                          ))}
                        </DataList>
                      )}
                    </Panel>
                    <Panel>
                      <PanelHeader title="Top productos por ganancia" />
                      {porGanancia.length === 0 ? (
                        <PanelBody>
                          <EmptyState className="py-6" titulo="Sin ganancia registrada en el período" />
                        </PanelBody>
                      ) : (
                        <DataList className="rounded-none border-0">
                          {porGanancia.map((p) => (
                            <DataRow
                              key={p.sku}
                              className="min-h-0"
                              titulo={p.nombre}
                              meta={p.sku}
                              valor={formatARS(p.ganancia ?? 0)}
                              tono={(p.ganancia ?? 0) < 0 ? "negativo" : "positivo"}
                            />
                          ))}
                        </DataList>
                      )}
                    </Panel>
                  </div>
                );
              })()}
            </div>
          ) : (
            <SinDatos texto="Sin datos de ventas para este período" />
          )}
        </TabsContent>

        {/* ── TAB: INVENTARIO ────────────────────────────────────── */}
        <TabsContent value="inventario" className="mt-4">
          {loading === "inventario" ? (
            <LoadingSkeleton />
          ) : inventario ? (
            <div className="space-y-6">
              <FigureGrid columnas={3}>
                <Figure
                  label="Productos activos"
                  valor={(inventario.cantidadProductos as number) ?? 0}
                />
                <Figure
                  label="Valor (costo)"
                  valor={formatARS((inventario.valorInventarioCompra as number) ?? 0)}
                  hint="Precio compra × stock"
                />
                <Figure
                  label="Valor (venta)"
                  valor={formatARS((inventario.valorInventarioVenta as number) ?? 0)}
                  tono="positivo"
                  hint="Precio venta × stock"
                />
              </FigureGrid>

              {(() => {
                const productos = inventario.productosBajoStock as Array<{
                  sku: string;
                  nombre: string;
                  stockActual: number;
                  stockMinimo: number;
                }>;
                return (
                  <Panel>
                    <PanelHeader
                      title="Productos con stock bajo"
                      descripcion={
                        productos?.length
                          ? `${productos.length} ${productos.length === 1 ? "producto" : "productos"} por debajo del mínimo`
                          : undefined
                      }
                    />
                    {!productos?.length ? (
                      <PanelBody>
                        <EmptyState
                          className="py-6"
                          titulo="Todo el stock en orden"
                          descripcion="Ningún producto por debajo del mínimo."
                        />
                      </PanelBody>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead className="text-right">Mínimo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productos.map((p) => (
                            <TableRow key={p.sku}>
                              <TableCell className="font-medium">{p.nombre}</TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {p.sku}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold tabular-nums text-num-warning">
                                {p.stockActual}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                                {p.stockMinimo}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Panel>
                );
              })()}
            </div>
          ) : (
            <SinDatos texto="No se pudo cargar el inventario" />
          )}
        </TabsContent>

        {/* ── TAB: RENTABILIDAD ──────────────────────────────────── */}
        <TabsContent value="rentabilidad" className="mt-4">
          {loading === "rentabilidad" ? (
            <LoadingSkeleton />
          ) : rentabilidad ? (
            <div className="space-y-6">
              <FigureGrid columnas={4}>
                <Figure
                  label="Total ventas"
                  valor={formatARS((rentabilidad.totalVentas as number) ?? 0)}
                  hint={
                    <ComparativaHint comparativa={rentabilidad.comparativa} clave="totalVentas" />
                  }
                />
                <Figure
                  label="Costo total"
                  valor={formatARS((rentabilidad.totalCosto as number) ?? 0)}
                  hint={
                    <ComparativaHint
                      comparativa={rentabilidad.comparativa}
                      clave="totalCosto"
                      mejorSiBaja
                    />
                  }
                />
                <Figure
                  label="Ganancia"
                  valor={formatARS((rentabilidad.totalGanancia as number) ?? 0)}
                  tono="positivo"
                  hint={
                    <ComparativaHint comparativa={rentabilidad.comparativa} clave="totalGanancia" />
                  }
                />
                <Figure
                  label="Margen"
                  valor={`${(rentabilidad.margenPorcentaje as number)?.toFixed(1) ?? 0}%`}
                  hint={
                    <ComparativaHint
                      comparativa={rentabilidad.comparativa}
                      clave="margenPorcentaje"
                      sufijo="%"
                    />
                  }
                />
              </FigureGrid>

              {(() => {
                const productos = rentabilidad.porProducto as Array<{
                  nombre: string;
                  sku: string;
                  cantidad: number;
                  venta: number;
                  costo: number;
                  ganancia: number;
                }>;
                return (
                  <Panel>
                    <PanelHeader
                      title="Rentabilidad por producto"
                      descripcion={
                        productos?.length
                          ? `${productos.length} ${productos.length === 1 ? "producto" : "productos"}`
                          : undefined
                      }
                    />
                    {!productos?.length ? (
                      <PanelBody>
                        <EmptyState className="py-6" titulo="Sin productos vendidos en el período" />
                      </PanelBody>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead className="text-right">Cant.</TableHead>
                            <TableHead className="text-right">Venta</TableHead>
                            <TableHead className="text-right">Costo</TableHead>
                            <TableHead className="text-right">Ganancia</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productos.map((p) => (
                            <TableRow key={p.sku}>
                              <TableCell className="font-medium">{p.nombre}</TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {p.sku}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                                {p.cantidad}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums">
                                {formatARS(p.venta)}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                                {formatARS(p.costo)}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  "text-right font-mono font-semibold tabular-nums",
                                  p.ganancia >= 0 ? "text-num-positive" : "text-num-negative"
                                )}
                              >
                                {formatARS(p.ganancia)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Panel>
                );
              })()}
            </div>
          ) : (
            <SinDatos texto="Sin datos de rentabilidad para este período" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card px-4 py-3.5">
            <div className="h-3 w-24 animate-skeleton-shimmer rounded" />
            <div className="mt-2 h-6 w-32 animate-skeleton-shimmer rounded" />
            <div className="mt-1.5 h-3 w-20 animate-skeleton-shimmer rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-5 py-3.5">
          <div className="h-4 w-44 animate-skeleton-shimmer rounded" />
        </div>
        <div className="h-40 animate-skeleton-shimmer" />
      </div>
    </div>
  );
}

function SinDatos({ texto }: { texto: string }) {
  return (
    <EmptyState
      className="py-8"
      titulo={texto}
      descripcion="Probá con otro período o revisá los filtros."
    />
  );
}

/**
 * Variación contra el período anterior, tal como la calcula el servidor
 * (`deltaPct`). Siempre flecha + signo además del color, para que no dependa
 * solo del tono. `mejorSiBaja` invierte el color (ej.: costo total: que suba es malo).
 */
function ComparativaHint({
  comparativa,
  clave,
  sufijo = "",
  mejorSiBaja = false,
}: {
  comparativa: unknown;
  clave: string;
  sufijo?: string;
  mejorSiBaja?: boolean;
}) {
  const entry = (comparativa as Record<string, { deltaPct?: number | null }> | null)?.[clave];
  const deltaPct = entry?.deltaPct;
  if (deltaPct == null) return null;
  const sube = deltaPct >= 0;
  const favorable = mejorSiBaja ? !sube : sube;
  const Flecha = sube ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-mono tabular-nums",
          favorable ? "text-num-positive" : "text-num-negative"
        )}
      >
        <Flecha className="size-3.5" aria-hidden="true" />
        {sube ? "+" : ""}
        {deltaPct.toFixed(1)}
        {sufijo || "%"}
      </span>
      <span>vs período anterior</span>
    </span>
  );
}
