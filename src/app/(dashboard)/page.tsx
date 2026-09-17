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
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Figure, FigureGrid } from "@/components/ui/figure";
import { Resumen } from "@/components/ui/resumen";
import { DataList, DataRow } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ShoppingCart,
  Package,
  ArrowRight,
  Receipt,
  Users,
  Truck,
  ShoppingBag,
  FileStack,
  BarChart3,
} from "lucide-react";
import { formatARS, formatUSD } from "@/lib/formatCurrency";
import {
  COLORES_GRAFICO,
  ejeGrafico,
  grillaGrafico,
  tooltipGrafico,
} from "@/lib/chart-theme";

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
  productosBajoStock: Array<{
    id: string;
    sku: string;
    nombre: string;
    stockActual: number;
    stockMinimo: number;
  }>;
  ultimasVentas: Array<{
    id: string;
    numeroVenta: string;
    fecha: string;
    total: number;
    tieneUsd?: boolean;
    pagoDividido?: boolean;
  }>;
}

const ACCESOS = [
  { href: "/ventas", label: "Ventas", icon: Receipt },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/proveedores", label: "Proveedores", icon: Truck },
  { href: "/consignacion", label: "Consignación", icon: FileStack },
  { href: "/compras", label: "Compras", icon: ShoppingBag },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
];

const plural = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard", { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch(() => {
        setData(null);
        setLoadError(
          "No se pudo cargar el panel. Revisá que la app esté conectada a la base de datos (DATABASE_URL) y que las migraciones estén aplicadas."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="h-3 w-28 animate-skeleton-shimmer rounded" />
            <div className="h-8 w-52 animate-skeleton-shimmer rounded-md" />
            <div className="h-4 w-80 animate-skeleton-shimmer rounded" />
          </div>
          <div className="h-10 w-36 animate-skeleton-shimmer rounded-md" />
        </div>
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card px-5 py-5">
              <div className="h-3 w-24 animate-skeleton-shimmer rounded" />
              <div className="mt-3 h-8 w-36 animate-skeleton-shimmer rounded" />
              <div className="mt-2 h-3 w-20 animate-skeleton-shimmer rounded" />
            </div>
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-border">
              <div className="border-b border-border px-5 py-3.5">
                <div className="h-4 w-44 animate-skeleton-shimmer rounded" />
              </div>
              <div className="p-5">
                <div className="h-[260px] animate-skeleton-shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader
          overline="Panel"
          title="Inicio"
          description="Resumen del mes, actividad reciente y alertas de stock."
        />
        <EmptyState
          titulo="No se pudieron cargar los datos"
          descripcion={loadError}
          accion={
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          }
        />
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

  const ventas14 = data?.ventasUltimos14Dias ?? [];
  const metodoPago = data?.metodoPagoChart ?? [];
  const ultimasVentas = data?.ultimasVentas ?? [];
  const bajoStock = data?.productosBajoStock ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        overline="Panel"
        title="Inicio"
        description="Resumen del mes, actividad reciente y alertas de stock."
      >
        <Button asChild className="h-11 w-full sm:w-auto">
          <Link href="/ventas/nueva">
            <ShoppingCart className="size-4" aria-hidden="true" />
            Nueva venta
          </Link>
        </Button>
      </PageHeader>

      <Resumen
        className="anim-entrada"
        items={[
          {
            label: "Ventas del mes",
            valor: formatARS(resumen.totalVentasMes),
            hint: plural(resumen.cantidadVentasMes, "venta registrada", "ventas registradas"),
          },
          {
            label: "Ganancia del mes",
            valor: formatARS(resumen.totalGananciaMes),
            hint: "Neto después de costos",
          },
          {
            label: "Vendido hoy",
            valor: formatARS(resumen.totalVentasHoy),
            hint: plural(resumen.cantidadVentasHoy, "venta", "ventas"),
            destacado: true,
          },
        ]}
      />

      <FigureGrid columnas={4}>
        <Figure
          label="Deuda consignación"
          valor={formatARS(resumen.totalDeudaConsignacion)}
          tono={resumen.totalDeudaConsignacion > 0 ? "alerta" : "neutro"}
          hint={
            <Link href="/consignacion" className="underline underline-offset-4 hover:text-foreground">
              Ver rendiciones
            </Link>
          }
        />
        <Figure
          label="USD del mes"
          valor={formatUSD(resumen.totalUsdRecibidoMes)}
          hint={plural(resumen.ventasConUsdMes, "venta con dólares", "ventas con dólares")}
        />
        <Figure
          label="USD de hoy"
          valor={formatUSD(resumen.totalUsdRecibidoHoy)}
          hint={plural(resumen.ventasConUsdHoy, "venta con dólares", "ventas con dólares")}
        />
        <Figure
          label="Productos activos"
          valor={resumen.productosActivos}
          tono={resumen.productosBajoStock > 0 ? "alerta" : "neutro"}
          hint={
            resumen.productosBajoStock > 0
              ? `${resumen.productosBajoStock} con stock bajo`
              : "Stock en orden"
          }
        />
      </FigureGrid>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Ventas de los últimos 14 días"
            descripcion="Facturación diaria en pesos"
          />
          <PanelBody>
            <div className="h-[260px]">
              {ventas14.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ventas14} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid {...grillaGrafico} />
                    <XAxis dataKey="label" {...ejeGrafico} />
                    <YAxis
                      tickFormatter={(v) => `$${v}`}
                      width={56}
                      {...ejeGrafico}
                    />
                    <Tooltip
                      {...tooltipGrafico}
                      formatter={(value: unknown) => [formatARS(Number(value ?? 0)), "Total"]}
                      labelFormatter={(_, payload) =>
                        (Array.isArray(payload) && payload[0]?.payload?.label) ?? ""
                      }
                    />
                    <Bar dataKey="total" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  className="h-full justify-center"
                  titulo="Sin ventas en el período"
                  descripcion="Cuando registres ventas vas a ver acá la evolución diaria."
                />
              )}
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            title="Cómo te pagaron este mes"
            descripcion="Participación de cada medio de pago"
          />
          <PanelBody>
            <div className="h-[260px]">
              {metodoPago.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metodoPago}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={92}
                      innerRadius={52}
                      paddingAngle={2}
                      stroke="var(--card)"
                      strokeWidth={2}
                    >
                      {metodoPago.map((entrada, i) => (
                        <Cell
                          key={entrada.name}
                          fill={COLORES_GRAFICO[i % COLORES_GRAFICO.length]}
                        />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="bottom"
                      height={32}
                      formatter={(value: unknown) => (
                        <span className="text-xs text-muted-foreground">{String(value)}</span>
                      )}
                    />
                    <Tooltip
                      {...tooltipGrafico}
                      formatter={(value: unknown, name: unknown) => [
                        formatARS(Number(value ?? 0)),
                        String(name),
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  className="h-full justify-center"
                  titulo="Sin cobros registrados"
                  descripcion="Acá vas a ver con qué medios te pagaron durante el mes."
                />
              )}
            </div>
          </PanelBody>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Últimas ventas"
            acciones={
              <Button asChild variant="ghost" size="sm">
                <Link href="/ventas">
                  Ver todas
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          {ultimasVentas.length > 0 ? (
            <DataList className="rounded-none border-0 border-t">
              {ultimasVentas.map((v) => (
                <DataRow
                  key={v.id}
                  href={`/ventas/${v.id}`}
                  titulo={v.numeroVenta}
                  meta={new Date(v.fecha).toLocaleString("es-AR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  etiquetas={
                    <>
                      {v.pagoDividido && (
                        <Badge variant="outline" className="font-normal">
                          2 medios
                        </Badge>
                      )}
                      {v.tieneUsd && (
                        <Badge variant="outline" className="font-normal">
                          USD
                        </Badge>
                      )}
                    </>
                  }
                  valor={formatARS(Number(v.total))}
                />
              ))}
            </DataList>
          ) : (
            <PanelBody>
              <EmptyState
                titulo="Todavía no hay ventas"
                descripcion="La primera venta que registres aparece acá."
                accion={
                  <Button asChild size="sm">
                    <Link href="/ventas/nueva">Registrar una venta</Link>
                  </Button>
                }
              />
            </PanelBody>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Stock bajo"
            descripcion={
              resumen.productosBajoStock > 0
                ? `${resumen.productosBajoStock} de ${resumen.productosActivos} productos activos`
                : "Todo el catálogo por encima del mínimo"
            }
            acciones={
              <Button asChild variant="ghost" size="sm">
                <Link href="/productos">
                  Ver catálogo
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          {bajoStock.length > 0 ? (
            <DataList className="rounded-none border-0 border-t">
              {bajoStock.map((p) => (
                <DataRow
                  key={p.sku}
                  href={`/productos/${p.id}/editar`}
                  titulo={p.nombre}
                  meta={p.sku}
                  valor={`${p.stockActual} / ${p.stockMinimo}`}
                  valorHint="actual / mínimo"
                  tono={p.stockActual === 0 ? "negativo" : "alerta"}
                />
              ))}
            </DataList>
          ) : (
            <PanelBody>
              <EmptyState
                titulo="Sin faltantes"
                descripcion="Ningún producto está por debajo de su stock mínimo."
              />
            </PanelBody>
          )}
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Ir a" />
        <PanelBody>
          <div className="flex flex-wrap gap-2">
            {ACCESOS.map(({ href, label, icon: Icono }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors duration-[--dur-fast] hover:border-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Icono className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}
