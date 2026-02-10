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
import {
  ShoppingCart,
  TrendingUp,
  CreditCard,
  Package,
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Receipt,
} from "lucide-react";

const formatMoney = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

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
  };
  ventasUltimos14Dias: Array<{ fecha: string; label: string; total: number; cantidad: number }>;
  metodoPagoChart: Array<{ name: string; value: number; cantidad: number }>;
  productosBajoStock: Array<{ id: string; sku: string; nombre: string; stockActual: number; stockMinimo: number }>;
  ultimasVentas: Array<{ id: string; numeroVenta: string; fecha: string; total: number }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard", { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar");
        return res.json();
      })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Cargando dashboard…</p>
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
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen del mes y actividad reciente
          </p>
        </div>
        <Link href="/ventas/nueva">
          <Button size="lg" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Nueva venta
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventas del mes
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMoney(resumen.totalVentasMes)}</p>
            <p className="text-xs text-muted-foreground">
              {resumen.cantidadVentasMes} ventas
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ganancia del mes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatMoney(resumen.totalGananciaMes)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hoy
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMoney(resumen.totalVentasHoy)}</p>
            <p className="text-xs text-muted-foreground">
              {resumen.cantidadVentasHoy} ventas
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deuda consignación
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {formatMoney(resumen.totalDeudaConsignacion)}
            </p>
            <Link href="/consignacion" className="text-xs text-primary hover:underline">
              Ver rendiciones
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ventas últimos 14 días</CardTitle>
            <p className="text-sm text-muted-foreground">
              Total vendido por día
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {data?.ventasUltimos14Dias && data.ventasUltimos14Dias.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.ventasUltimos14Dias}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      tickFormatter={(v) => `$${v}`}
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      formatter={(value: unknown) =>
                        [formatMoney(Number(value ?? 0)), "Total"]
                      }
                      labelFormatter={(_, payload) =>
                        (Array.isArray(payload) && payload[0]?.payload?.label) ?? ""
                      }
                    />
                    <Bar
                      dataKey="total"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  Sin datos de ventas
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ventas por método de pago</CardTitle>
            <p className="text-sm text-muted-foreground">
              Distribución del mes
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
                      outerRadius={90}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {data.metodoPagoChart.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: unknown) => formatMoney(Number(value ?? 0))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  Sin datos
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Últimas ventas y productos bajo stock */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Últimas ventas</CardTitle>
            <Link href="/ventas">
              <Button variant="ghost" size="sm" className="gap-1">
                Ver todas
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data?.ultimasVentas && data.ultimasVentas.length > 0 ? (
              <ul className="space-y-3">
                {data.ultimasVentas.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <Link
                        href={`/ventas/${v.id}`}
                        className="font-medium hover:underline"
                      >
                        {v.numeroVenta}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.fecha).toLocaleString("es-AR")}
                      </p>
                    </div>
                    <span className="font-semibold">{formatMoney(Number(v.total))}</span>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Productos
            </CardTitle>
            <Link href="/productos">
              <Button variant="ghost" size="sm" className="gap-1">
                Ver catálogo
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-4 text-sm">
              <span className="text-muted-foreground">
                {resumen.productosActivos} activos
              </span>
              {resumen.productosBajoStock > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  {resumen.productosBajoStock} con stock bajo
                </span>
              )}
            </div>
            {data?.productosBajoStock && data.productosBajoStock.length > 0 ? (
              <ul className="space-y-2">
                {data.productosBajoStock.map((p) => (
                  <li
                    key={p.sku}
                    className="flex items-center justify-between rounded border border-amber-200 bg-amber-50/50 p-2 text-sm dark:border-amber-900/50 dark:bg-amber-950/20"
                  >
                    <div>
                      <Link
                        href={`/productos/${p.id}/editar`}
                        className="font-medium hover:underline"
                      >
                        {p.nombre}
                      </Link>
                      <span className="ml-1 text-muted-foreground">({p.sku})</span>
                    </div>
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                      {p.stockActual} / {p.stockMinimo}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay productos con stock bajo
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accesos rápidos */}
      <Card>
        <CardHeader>
          <CardTitle>Accesos rápidos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Gestión de inventario, ventas, consignación y reportes
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/ventas/nueva">
            <Button size="sm">Nueva venta</Button>
          </Link>
          <Link href="/productos">
            <Button variant="secondary" size="sm">Productos</Button>
          </Link>
          <Link href="/proveedores">
            <Button variant="secondary" size="sm">Proveedores</Button>
          </Link>
          <Link href="/ventas">
            <Button variant="secondary" size="sm">Ventas</Button>
          </Link>
          <Link href="/consignacion">
            <Button variant="secondary" size="sm">Consignación</Button>
          </Link>
          <Link href="/clientes">
            <Button variant="secondary" size="sm">Clientes</Button>
          </Link>
          <Link href="/compras">
            <Button variant="secondary" size="sm">Compras</Button>
          </Link>
          <Link href="/reportes">
            <Button variant="secondary" size="sm">Reportes</Button>
          </Link>
          <Link href="/ayuda">
            <Button variant="outline" size="sm">Ayuda</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
