"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Stat, StatGrid } from "@/components/ui/stat";
import {
  ShoppingCart,
  TrendingUp,
  Package,
  AlertTriangle,
  ArrowRight,
  Receipt,
  Users,
  Truck,
  HelpCircle,
  ShoppingBag,
  FileStack,
} from "lucide-react";
import { formatARS, formatUSD } from "@/lib/formatCurrency";

const CHART_COLORS = [
  "#6366f1", // indigo
  "#22c55e", // green
  "#f59e0b", // amber
  "#ec4899", // pink
  "#3b82f6", // blue
];

interface DashboardData {
  resumen: {
    totalVentasMes: number;
    totalGananciaMes: number;
    cantidadVentasMes: number;
    totalVentasHoy: number;
    cantidadVentasHoy: number;
    totalDeudaConsignacion: number;
    totalProductos: number;
    productosActivos: number;
    productosBajoStock: number;
    totalUsdRecibidoMes: number;
    ventasConUsdMes: number;
    totalUsdRecibidoHoy: number;
    ventasConUsdHoy: number;
  };
  ventasUltimos14Dias: Array<{ fecha: string; label: string; total: number; cantidad: number }>;
  metodoPagoChart: Array<{ name: string; value: number; cantidad: number }>;
  productosBajoStock: Array<{ id: string; sku: string; nombre: string; stockActual: number; stockMinimo: number }>;
  ultimasVentas: Array<{
    id: string;
    numeroVenta: string;
    fecha: string;
    total: number;
    tieneUsd?: boolean;
    pagoDividido?: boolean;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoadError(null);
    fetch("/api/dashboard", { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch(() => {
        setData(null);
        setLoadError(
          "No se pudo cargar el dashboard. Revisá que la app esté conectada a la base de datos (DATABASE_URL) y que las migraciones estén aplicadas."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="h-3 w-40 animate-skeleton-shimmer rounded" />
            <div className="h-8 w-56 animate-skeleton-shimmer rounded-md" />
            <div className="h-4 w-72 animate-skeleton-shimmer rounded" />
          </div>
          <div className="h-10 w-36 animate-skeleton-shimmer rounded-lg" />
        </div>
        <div className="h-[148px] rounded-2xl bg-zinc-950/90" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-5">
              <div className="h-3 w-24 animate-skeleton-shimmer rounded" />
              <div className="mt-3 h-7 w-32 animate-skeleton-shimmer rounded" />
              <div className="mt-2 h-3 w-20 animate-skeleton-shimmer rounded" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-5">
            <div className="h-6 w-40 animate-skeleton-shimmer rounded" />
            <div className="mt-2 h-4 w-56 animate-skeleton-shimmer rounded" />
            <div className="mt-6 h-[280px] animate-skeleton-shimmer rounded" />
          </div>
          <div className="rounded-lg border bg-card p-5">
            <div className="h-6 w-48 animate-skeleton-shimmer rounded" />
            <div className="mt-2 h-4 w-32 animate-skeleton-shimmer rounded" />
            <div className="mt-6 h-[280px] animate-skeleton-shimmer rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <PageHeader
          overline="Panel · Resumen comercial"
          title="Hermanas Caradonti"
          description="Resumen del mes y actividad reciente"
        />
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive md:p-5">
          <p className="font-medium">Error al cargar datos</p>
          <p className="mt-2 text-foreground/90">{loadError}</p>
        </div>
      </div>
    );
  }

  const resumen = data?.resumen ?? {
    totalVentasMes: 0,
    totalGananciaMes: 0,
    cantidadVentasMes: 0,
    totalVentasHoy: 0,
    cantidadVentasHoy: 0,
    totalDeudaConsignacion: 0,
    totalProductos: 0,
    productosActivos: 0,
    productosBajoStock: 0,
    totalUsdRecibidoMes: 0,
    ventasConUsdMes: 0,
    totalUsdRecibidoHoy: 0,
    ventasConUsdHoy: 0,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        overline="Panel · Resumen comercial"
        title="Hermanas Caradonti"
        description="Resumen comercial, actividad reciente y alertas operativas del negocio"
      >
        <Link href="/ventas/nueva" className="w-full sm:w-auto">
          <Button className="w-full gap-2 sm:w-auto">
            <ShoppingCart className="h-4 w-4" />
            Nueva venta
          </Button>
        </Link>
      </PageHeader>

      {/* Banda de estado: facturación del mes */}
      <section className="ledger-in relative overflow-hidden rounded-2xl bg-zinc-950 text-zinc-100">
        <div
          aria-hidden
          className="ledger-grid-texture pointer-events-none absolute inset-0 opacity-[0.05]"
        />
        <div className="absolute inset-y-0 left-0 w-[3px] bg-primary" />
        <div className="relative flex flex-col gap-7 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              Ventas del mes
            </p>
            <p className="mt-3 font-mono text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
              {formatARS(resumen.totalVentasMes)}
            </p>
            <p className="mt-2 font-mono text-[11px] text-zinc-600">
              {resumen.cantidadVentasMes} ventas registradas este mes
            </p>
          </div>
          <div className="flex divide-x divide-white/10">
            <div className="pr-6 sm:pr-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Ganancia
              </p>
              <p className="mt-1 font-mono text-2xl tabular-nums text-emerald-400">
                {formatARS(resumen.totalGananciaMes)}
              </p>
            </div>
            <div className="pl-6 sm:pl-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Hoy
              </p>
              <p className="mt-1 font-mono text-2xl tabular-nums">
                {formatARS(resumen.totalVentasHoy)}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-zinc-600">
                {resumen.cantidadVentasHoy} ventas
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Métricas secundarias */}
      <StatGrid>
        <Stat
          label="Deuda consignación"
          value={formatARS(resumen.totalDeudaConsignacion)}
          tone={resumen.totalDeudaConsignacion > 0 ? "warning" : "default"}
          hint={
            <Link href="/consignacion" className="font-medium text-primary hover:underline">
              Ver rendiciones →
            </Link>
          }
        />
        <Stat
          label="USD registrados (mes)"
          value={formatUSD(resumen.totalUsdRecibidoMes)}
          hint={`${resumen.ventasConUsdMes} venta${resumen.ventasConUsdMes !== 1 ? "s" : ""} con dólares`}
        />
        <Stat
          label="USD registrados (hoy)"
          value={formatUSD(resumen.totalUsdRecibidoHoy)}
          hint={`${resumen.ventasConUsdHoy} venta${resumen.ventasConUsdHoy !== 1 ? "s" : ""} con USD hoy`}
        />
        <Stat
          label="Productos activos"
          value={resumen.productosActivos}
          tone={resumen.productosBajoStock > 0 ? "warning" : "default"}
          hint={
            resumen.productosBajoStock > 0
              ? `${resumen.productosBajoStock} con stock bajo`
              : "Stock en orden"
          }
        />
      </StatGrid>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Tendencia de ventas (14 días)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Evolución diaria de facturación
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {data?.ventasUltimos14Dias && data.ventasUltimos14Dias.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.ventasUltimos14Dias} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `$${v}`}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid oklch(0.92 0 0)" }}
                      formatter={(value: unknown) =>
                        [formatARS(Number(value ?? 0)), "Total"]
                      }
                      labelFormatter={(_, payload) =>
                        (Array.isArray(payload) && payload[0]?.payload?.label) ?? ""
                      }
                    />
                    <Bar
                      dataKey="total"
                      fill="oklch(0.45 0.12 195)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg bg-muted/30 text-muted-foreground text-sm">
                  Sin datos de ventas
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Composición por método de pago</CardTitle>
            <p className="text-sm text-muted-foreground">
              Participación de cada medio en el mes
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {data?.metodoPagoChart && data.metodoPagoChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.metodoPagoChart}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={45}
                      paddingAngle={2}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {data.metodoPagoChart.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid oklch(0.92 0 0)" }}
                      formatter={(value: unknown) => formatARS(Number(value ?? 0))}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg bg-muted/30 text-muted-foreground text-sm">
                  Sin datos
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Últimas ventas y productos bajo stock */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base md:text-lg">Últimas ventas</CardTitle>
            <Link href="/ventas">
              <Button variant="ghost" size="sm" className="gap-1.5">
                Ver todas
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data?.ultimasVentas && data.ultimasVentas.length > 0 ? (
              <ul className="space-y-2">
                {data.ultimasVentas.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/ventas/${v.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-card p-3 transition-colors hover:bg-accent/40"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">{v.numeroVenta}</span>
                          {v.pagoDividido && (
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              2 medios
                            </Badge>
                          )}
                          {v.tieneUsd && (
                            <Badge variant="outline" className="border-sky-500/50 text-[10px] text-sky-700 dark:text-sky-300">
                              USD
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(v.fecha).toLocaleString("es-AR")}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatARS(Number(v.total))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay ventas recientes
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Package className="h-4 w-4" />
              Productos
            </CardTitle>
            <Link href="/productos">
              <Button variant="ghost" size="sm" className="gap-1.5">
                Ver catálogo
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-3 text-sm">
              <span className="text-muted-foreground">
                {resumen.productosActivos} activos
              </span>
              {resumen.productosBajoStock > 0 && (
                <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  {resumen.productosBajoStock} con stock bajo
                </span>
              )}
            </div>
            {data?.productosBajoStock && data.productosBajoStock.length > 0 ? (
              <ul className="space-y-2">
                {data.productosBajoStock.map((p) => (
                  <li key={p.sku}>
                    <Link
                      href={`/productos/${p.id}/editar`}
                      className="flex items-center justify-between rounded-lg border border-amber-300/80 bg-amber-50/70 p-3 text-sm transition-colors hover:bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
                    >
                      <div className="min-w-0">
                        <span className="font-medium">{p.nombre}</span>
                        <span className="ml-1 text-muted-foreground">({p.sku})</span>
                      </div>
                      <span className="shrink-0 rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                        {p.stockActual} / {p.stockMinimo}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay productos con stock bajo
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accesos rápidos */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Accesos rápidos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Gestión de inventario, ventas, consignación y reportes
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Link href="/ventas/nueva">
              <Button size="sm" className="w-full justify-start gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5" />
                Nueva venta
              </Button>
            </Link>
            <Link href="/ventas">
              <Button variant="secondary" size="sm" className="w-full justify-start gap-1.5">
                <Receipt className="h-3.5 w-3.5" />
                Ventas
              </Button>
            </Link>
            <Link href="/productos">
              <Button variant="secondary" size="sm" className="w-full justify-start gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Productos
              </Button>
            </Link>
            <Link href="/compras">
              <Button variant="secondary" size="sm" className="w-full justify-start gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5" />
                Compras
              </Button>
            </Link>
            <Link href="/proveedores">
              <Button variant="secondary" size="sm" className="w-full justify-start gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                Proveedores
              </Button>
            </Link>
            <Link href="/consignacion">
              <Button variant="secondary" size="sm" className="w-full justify-start gap-1.5">
                <FileStack className="h-3.5 w-3.5" />
                Consignación
              </Button>
            </Link>
            <Link href="/reportes">
              <Button variant="secondary" size="sm" className="w-full justify-start gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Reportes
              </Button>
            </Link>
            <Link href="/clientes">
              <Button variant="secondary" size="sm" className="w-full justify-start gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Clientes
              </Button>
            </Link>
            <Link href="/ayuda">
              <Button variant="outline" size="sm" className="w-full justify-start gap-1.5">
                <HelpCircle className="h-3.5 w-3.5" />
                Ayuda
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
