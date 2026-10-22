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
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Figure, FigureGrid } from "@/components/ui/figure";
import { DataList, DataRow } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ShoppingCart,
  Package,
  ArrowRight,
  ArrowUpRight,
  Receipt,
  Users,
  Truck,
  ShoppingBag,
  FileStack,
  BarChart3,
  Wallet,
  Plus,
  AlertCircle,
} from "lucide-react";
import { formatARS, formatUSD } from "@/lib/formatCurrency";
import {
  barraGrafico,
  ejeGrafico,
  formatoEjeMonto,
  grillaGrafico,
  tooltipGrafico,
} from "@/lib/chart-theme";
import { cn } from "@/lib/utils";

interface DashboardData {
  resumen: {
    totalVentasMes: string;
    totalGananciaMes: string;
    cantidadVentasMes: number;
    totalVentasHoy: string;
    totalCobradoMes: string;
    totalCobradoHoy: string;
    saldoPendiente: string;
    cantidadVentasHoy: number;
    totalDeudaConsignacion: string;
    totalProductos: number;
    productosActivos: number;
    productosBajoStock: number;
    productosEnSalon?: number;
    productosPorEncargo?: number;
    unidadesEnSalon?: number;
    valorSalonArs?: string;
    valorSalonUsd?: string;
    productosEnArs?: number;
    productosEnUsd?: number;
    productosSinPrecioCount?: number;
    pedidosActivosCount?: number;
    pedidosListosCount?: number;
    totalUsdRecibidoMes: string;
    ventasConUsdMes: number;
    totalUsdRecibidoHoy: string;
    ventasConUsdHoy: number;
  };
  caja?: {
    abierta: boolean;
    responsable: string | null;
    saldoArs: number;
    saldoUsd: number;
  };
  pedidosActivos?: Array<{
    id: string;
    ventaId: string;
    numeroVenta: string;
    cliente: string;
    resumenItems: string;
    fechaPrometida: string | null;
    total: number;
    saldoPendiente: number;
    estado: "EN_CURSO" | "LISTO_ENTREGA";
  }>;
  productosSinPrecio?: Array<{
    id: string;
    sku: string;
    nombre: string;
  }>;
  ventasUltimos14Dias: Array<{ fecha: string; label: string; total: number; cantidad: number }>;
  metodoPagoChart: Array<{ name: string; value: number; cantidad: number }>;
  productosBajoStock: Array<{
    id: string;
    sku: string;
    nombre: string;
    stockActual: number;
    stockMinimo: number;
    categoria?: string | null;
  }>;
  ultimasVentas: Array<{
    id: string;
    numeroVenta: string;
    fecha: string;
    total: number | string;
    cliente?: string;
    resumenItems?: string;
    esPedido?: boolean;
    pedidoId?: string | null;
    saldoPendiente?: number;
    metodoPagoLabel?: string;
    tieneUsd?: boolean;
    pagoDividido?: boolean;
  }>;
}

const ATAJOS_SECUNDARIOS = [
  { href: "/caja-chica", label: "Caja chica", detalle: "Apertura y movimientos", icon: Wallet },
  { href: "/clientes", label: "Clientas", detalle: "Agenda e historial", icon: Users },
  { href: "/proveedores", label: "Proveedores", detalle: "Catálogo y acuerdos", icon: Truck },
  { href: "/compras", label: "Compras", detalle: "Órdenes y reposición", icon: ShoppingBag },
  { href: "/consignacion/rendiciones", label: "Rendiciones", detalle: "Liquidaciones emitidas", icon: FileStack },
  { href: "/reportes", label: "Reportes", detalle: "Márgenes y cierres", icon: BarChart3 },
];

const plural = (n: number, singular: string, pluralText: string) =>
  `${n} ${n === 1 ? singular : pluralText}`;

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
        setLoadError("No se pudo cargar el panel. Reintentá en unos instantes.");
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
            <div className="h-4 w-72 animate-skeleton-shimmer rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 animate-skeleton-shimmer rounded-md" />
            <div className="h-10 w-36 animate-skeleton-shimmer rounded-md" />
          </div>
        </div>
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card p-4 sm:p-5">
              <div className="h-4 w-28 animate-skeleton-shimmer rounded" />
              <div className="mt-2 h-3 w-40 animate-skeleton-shimmer rounded" />
            </div>
          ))}
        </div>
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card px-5 py-4">
              <div className="h-3 w-20 animate-skeleton-shimmer rounded" />
              <div className="mt-2 h-7 w-28 animate-skeleton-shimmer rounded" />
              <div className="mt-2 h-3 w-24 animate-skeleton-shimmer rounded" />
            </div>
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="h-[340px] animate-skeleton-shimmer rounded-xl border border-border lg:col-span-7" />
          <div className="h-[340px] animate-skeleton-shimmer rounded-xl border border-border lg:col-span-5" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader
          overline="Operación"
          title="Inicio"
          description="Centro operativo del local."
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
    totalVentasMes: "0.00",
    totalGananciaMes: "0.00",
    cantidadVentasMes: 0,
    totalVentasHoy: "0.00",
    totalCobradoMes: "0.00",
    totalCobradoHoy: "0.00",
    saldoPendiente: "0.00",
    cantidadVentasHoy: 0,
    totalDeudaConsignacion: "0.00",
    totalProductos: 0,
    productosActivos: 0,
    productosBajoStock: 0,
    productosEnSalon: 0,
    productosPorEncargo: 0,
    unidadesEnSalon: 0,
    valorSalonArs: "0.00",
    valorSalonUsd: "0.00",
    productosEnArs: 0,
    productosEnUsd: 0,
    productosSinPrecioCount: 0,
    pedidosActivosCount: 0,
    pedidosListosCount: 0,
    totalUsdRecibidoMes: "0.00",
    ventasConUsdMes: 0,
    totalUsdRecibidoHoy: "0.00",
    ventasConUsdHoy: 0,
  };

  const caja = data?.caja ?? { abierta: false, responsable: null, saldoArs: 0, saldoUsd: 0 };
  const pedidosActivos = data?.pedidosActivos ?? [];
  const productosSinPrecio = data?.productosSinPrecio ?? [];
  const ventas14 = data?.ventasUltimos14Dias ?? [];
  const hayVentas14 = ventas14.some((d) => d.total > 0);
  const total14Dias = ventas14.reduce((acc, d) => acc + d.total, 0);
  const metodoPago = data?.metodoPagoChart ?? [];
  const ultimasVentas = data?.ultimasVentas ?? [];
  const ultimasPiezasSalon = data?.productosBajoStock ?? [];

  const tieneSaldoClientas = Number(resumen.saldoPendiente) > 0;
  const tieneDeudaConsignacion = Number(resumen.totalDeudaConsignacion) > 0;
  const usdHoy = Number(resumen.totalUsdRecibidoHoy);
  const usdMes = Number(resumen.totalUsdRecibidoMes);

  const enSalon = resumen.productosEnSalon ?? 0;
  const porEncargo = resumen.productosPorEncargo ?? 0;
  const unidadesSalon = resumen.unidadesEnSalon ?? 0;
  const sinPrecioCount = resumen.productosSinPrecioCount ?? productosSinPrecio.length;
  const pedidosEnCursoCount = resumen.pedidosActivosCount ?? pedidosActivos.length;
  const pedidosListosCount = resumen.pedidosListosCount ?? 0;
  const pctSalon =
    resumen.productosActivos > 0 ? Math.round((enSalon / resumen.productosActivos) * 100) : 0;

  const modulosPrincipales = [
    {
      href: "/ventas/nueva",
      titulo: "Registro de venta",
      descripcion: "Cobro en salón, pago mixto ARS/USD o seña",
      meta: "Iniciar operación",
      icon: ShoppingCart,
      destacado: true,
    },
    {
      href: "/pedidos",
      titulo: "Pedidos y encargos",
      descripcion:
        pedidosEnCursoCount > 0
          ? `${plural(pedidosEnCursoCount, "encargo activo", "encargos activos")}${pedidosListosCount > 0 ? ` · ${pedidosListosCount} para entregar` : ""}`
          : tieneSaldoClientas
            ? `Saldo por cobrar: ${formatARS(resumen.saldoPendiente)}`
            : "Seguimiento de fabricación, señas y entregas",
      meta: pedidosListosCount > 0 ? `${pedidosListosCount} listos para entrega` : "Abrir bandeja",
      icon: ShoppingBag,
      alerta: pedidosListosCount > 0 || tieneSaldoClientas,
    },
    {
      href: "/productos",
      titulo: "Catálogo e inventario",
      descripcion: `${enSalon} con stock en salón (${unidadesSalon} u.) · ${porEncargo} por encargo`,
      meta:
        sinPrecioCount > 0
          ? `${sinPrecioCount} sin precio definido`
          : `${resumen.productosActivos} activos en línea`,
      icon: Package,
      alerta: sinPrecioCount > 0,
    },
    {
      href: "/consignacion",
      titulo: "Consignación",
      descripcion: tieneDeudaConsignacion
        ? `Por liquidar: ${formatARS(resumen.totalDeudaConsignacion)}`
        : "Estado de cuenta y comisiones de talleres",
      meta: tieneDeudaConsignacion ? "Pendiente de rendir" : "Proveedores al día",
      icon: FileStack,
      alerta: tieneDeudaConsignacion,
    },
  ];

  return (
    <div className="space-y-6 anim-entrada">
      <PageHeader
        overline="Operación · Panel Ejecutivo"
        title="Inicio"
        description={
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span>Centro de control comercial, encargos a medida y patrimonio en salón.</span>
            <Link
              href="/caja-chica"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-0.5 font-mono text-xs text-foreground transition-colors hover:bg-muted"
            >
              <Wallet className="size-3 text-muted-foreground" aria-hidden="true" />
              {caja.abierta ? (
                <span>
                  Caja abierta: <strong className="tabular-nums">{formatARS(caja.saldoArs)}</strong>
                  {caja.saldoUsd > 0 ? ` · ${formatUSD(caja.saldoUsd)}` : ""}
                </span>
              ) : (
                <span className="text-muted-foreground">Caja cerrada · Abrir turno</span>
              )}
            </Link>
          </span>
        }
      >
        <Button asChild variant="outline" className="h-10">
          <Link href="/pedidos/nuevo">
            <Plus className="size-4" aria-hidden="true" />
            Nuevo pedido
          </Link>
        </Button>
        <Button asChild className="h-10">
          <Link href="/ventas/nueva">
            <ShoppingCart className="size-4" aria-hidden="true" />
            Nueva venta
          </Link>
        </Button>
      </PageHeader>

      {/* 1. Accesos operativos principales */}
      <section aria-label="Operaciones principales">
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border shadow-xs sm:grid-cols-2 lg:grid-cols-4">
          {modulosPrincipales.map((mod) => {
            const Icono = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className={cn(
                  "group flex flex-col justify-between bg-card p-4 transition-colors duration-[--dur-fast] hover:bg-accent/70 focus-visible:bg-accent focus-visible:outline-none sm:p-5",
                  mod.destacado && "bg-surface/60"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg border border-border transition-colors",
                        mod.destacado
                          ? "bg-foreground text-background"
                          : "bg-surface text-foreground group-hover:border-border-strong"
                      )}
                    >
                      <Icono className="size-4" aria-hidden="true" />
                    </span>
                    <ArrowUpRight
                      className="size-4 text-muted-foreground transition-transform duration-[--dur-fast] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <h2 className="mt-3.5 text-sm font-semibold tracking-tight text-foreground">
                    {mod.titulo}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {mod.descripcion}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-2.5">
                  <span
                    className={cn(
                      "font-mono text-[11px] tabular-nums",
                      mod.alerta ? "font-medium text-num-warning" : "text-muted-foreground"
                    )}
                  >
                    {mod.meta}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground group-hover:text-foreground">
                    Abrir
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 2. Fila de métricas ejecutivas */}
      <FigureGrid columnas={4}>
        <Figure
          label="Vendido hoy"
          valor={formatARS(resumen.totalVentasHoy)}
          hint={
            <>
              {plural(resumen.cantidadVentasHoy, "operación hoy", "operaciones hoy")}
              {usdHoy > 0 && ` · ${formatUSD(resumen.totalUsdRecibidoHoy)}`}
            </>
          }
        />
        <Figure
          label="Facturado del mes"
          valor={formatARS(resumen.totalVentasMes)}
          hint={
            <>
              {plural(resumen.cantidadVentasMes, "operación", "operaciones")}
              {Number(resumen.totalCobradoMes) > 0 &&
                ` · Cobrado ${formatARS(resumen.totalCobradoMes)}`}
              {usdMes > 0 && ` (${formatUSD(resumen.totalUsdRecibidoMes)})`}
            </>
          }
        />
        <Figure
          label="Saldos por cobrar"
          valor={formatARS(resumen.saldoPendiente)}
          tono={tieneSaldoClientas ? "alerta" : "neutro"}
          hint={
            tieneSaldoClientas ? (
              <Link href="/pedidos" className="underline underline-offset-4 hover:text-foreground">
                Ver señas y saldos pendientes
              </Link>
            ) : (
              "Sin saldos pendientes de clientas"
            )
          }
        />
        <Figure
          label="Exhibición en salón (USD)"
          valor={formatUSD(resumen.valorSalonUsd ?? "0.00")}
          hint={
            <>
              + {formatARS(resumen.valorSalonArs ?? "0.00")} en piezas ARS ({unidadesSalon} u.)
            </>
          }
        />
      </FigureGrid>

      {/* 3. Área principal en dos columnas asimétricas */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Columna izquierda: Seguimiento de encargos, ritmo comercial y últimas operaciones */}
        <div className="space-y-6 lg:col-span-7">
          {pedidosActivos.length > 0 && (
            <Panel>
              <PanelHeader
                title="Pedidos y encargos en curso"
                descripcion={`${plural(pedidosEnCursoCount, "encargo activo", "encargos activos")} pendientes de entrega`}
                acciones={
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/pedidos">
                      Bandeja de pedidos
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                }
              />
              <DataList className="rounded-none border-0">
                {pedidosActivos.map((p) => (
                  <DataRow
                    key={p.id}
                    href={`/pedidos/${p.id}`}
                    titulo={`${p.cliente} · ${p.numeroVenta}`}
                    meta={p.resumenItems || "Encargo a medida"}
                    etiquetas={
                      <>
                        <Badge
                          variant={p.estado === "LISTO_ENTREGA" ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {p.estado === "LISTO_ENTREGA" ? "Listo para entregar" : "En producción"}
                        </Badge>
                        {p.fechaPrometida && (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            Entrega{" "}
                            {new Date(p.fechaPrometida).toLocaleDateString("es-AR", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        )}
                      </>
                    }
                    valor={
                      p.saldoPendiente > 0
                        ? `Resta ${formatARS(p.saldoPendiente)}`
                        : "Saldado"
                    }
                    tono={p.saldoPendiente > 0 ? "alerta" : "positivo"}
                  />
                ))}
              </DataList>
            </Panel>
          )}

          <Panel>
            <PanelHeader
              title="Ritmo comercial (últimos 14 días)"
              descripcion="Evolución diaria de ventas y encargos registrados"
              acciones={
                hayVentas14 ? (
                  <Badge variant="secondary" className="font-mono tabular-nums">
                    {formatARS(total14Dias)}
                  </Badge>
                ) : (
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/reportes">
                      Reportes
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                )
              }
            />
            <PanelBody className="space-y-4">
              {hayVentas14 ? (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ventas14} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid {...grillaGrafico} />
                      <XAxis dataKey="label" {...ejeGrafico} />
                      <YAxis
                        tickFormatter={formatoEjeMonto}
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
                      <Bar dataKey="total" fill="var(--chart-1)" {...barraGrafico} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState
                  icono={Receipt}
                  titulo="Sin ventas en los últimos 14 días"
                  descripcion="A medida que registres ventas de salón o encargos con seña, acá se dibuja la curva diaria y el desglose por medio de cobro."
                  accion={
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button asChild size="sm">
                        <Link href="/ventas/nueva">Registrar venta</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href="/pedidos/nuevo">Cargar encargo</Link>
                      </Button>
                    </div>
                  }
                />
              )}

              {metodoPago.length > 0 && (
                <div className="border-t border-border pt-3.5">
                  <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Medios de cobro del mes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {metodoPago.map((m) => (
                      <div
                        key={m.name}
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/50 px-2.5 py-1.5 text-xs"
                      >
                        <span className="font-medium text-foreground">{m.name}</span>
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {formatARS(m.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Últimas operaciones"
              descripcion="Ventas de salón y encargos recientes con detalle de clienta"
              acciones={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/ventas">
                    Ver historial
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              }
            />
            {ultimasVentas.length > 0 ? (
              <DataList className="rounded-none border-0">
                {ultimasVentas.map((v) => (
                  <DataRow
                    key={v.id}
                    href={v.esPedido && v.pedidoId ? `/pedidos/${v.pedidoId}` : `/ventas/${v.id}`}
                    titulo={`${v.numeroVenta} · ${v.cliente ?? "Consumidor final"}`}
                    meta={
                      v.resumenItems
                        ? `${new Date(v.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} · ${v.resumenItems}`
                        : new Date(v.fecha).toLocaleString("es-AR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                    }
                    etiquetas={
                      <>
                        {v.esPedido && (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            Encargo
                          </Badge>
                        )}
                        {v.metodoPagoLabel && (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {v.metodoPagoLabel}
                          </Badge>
                        )}
                        {v.pagoDividido && (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            2 medios
                          </Badge>
                        )}
                        {v.tieneUsd && (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            USD
                          </Badge>
                        )}
                      </>
                    }
                    valor={formatARS(Number(v.total))}
                    valorHint={
                      (v.saldoPendiente ?? 0) > 0
                        ? `Debe ${formatARS(v.saldoPendiente ?? 0)}`
                        : undefined
                    }
                    tono={(v.saldoPendiente ?? 0) > 0 ? "alerta" : "neutro"}
                  />
                ))}
              </DataList>
            ) : (
              <PanelBody>
                <EmptyState
                  titulo="Todavía no hay operaciones registradas"
                  descripcion="Las ventas de salón y los pedidos por encargo recientes se listarán acá con acceso directo a su comprobante."
                />
              </PanelBody>
            )}
          </Panel>
        </div>

        {/* Columna derecha: Radiografía real del catálogo y accesos administrativos */}
        <div className="space-y-6 lg:col-span-5">
          <Panel>
            <PanelHeader
              title="Radiografía del catálogo"
              descripcion={`${resumen.productosActivos} productos activos (${resumen.productosEnArs ?? 0} en ARS · ${resumen.productosEnUsd ?? 0} en USD)`}
              acciones={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/productos">
                    Catálogo
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              }
            />

            {/* Distribución real del negocio: Exhibición en salón vs Por encargo */}
            <div className="border-b border-border bg-surface/30 px-4 py-3.5 sm:px-5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  En salón ({enSalon}) vs. Por encargo ({porEncargo})
                </span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {unidadesSalon} u. físicas en tienda
                </span>
              </div>
              <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-foreground transition-all duration-500"
                  style={{ width: `${pctSalon}%` }}
                  title={`En salón: ${enSalon} productos`}
                />
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                <span>{pctSalon}% entrega inmediata</span>
                <span>{100 - pctSalon}% fabricación a pedido</span>
              </div>
            </div>

            {/* Alerta administrativa si algún producto activo no tiene precio */}
            {productosSinPrecio.length > 0 && (
              <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-num-warning">
                      <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                      {plural(
                        productosSinPrecio.length,
                        "producto activo sin precio asignado",
                        "productos activos sin precio asignado"
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {productosSinPrecio.map((p) => `${p.nombre} (${p.sku})`).join(", ")}
                    </p>
                  </div>
                  <Button asChild size="xs" variant="outline" className="shrink-0">
                    <Link href={`/productos/${productosSinPrecio[0].id}/editar`}>
                      Asignar precio
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Piezas únicas en exhibición (1 unidad física en salón) */}
            <div className="px-4 pt-3 pb-1.5 sm:px-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Última unidad en salón ({resumen.productosBajoStock} artículos con 1 u.)
              </p>
            </div>
            {ultimasPiezasSalon.length > 0 ? (
              <DataList className="rounded-none border-0">
                {ultimasPiezasSalon.map((p) => (
                  <DataRow
                    key={p.sku}
                    href={`/productos/${p.id}/editar`}
                    titulo={p.nombre}
                    meta={`${p.sku}${p.categoria ? ` · ${p.categoria}` : ""}`}
                    valor="1 u."
                    valorHint="en salón"
                  />
                ))}
              </DataList>
            ) : (
              <PanelBody>
                <EmptyState
                  icono={Package}
                  titulo="Catálogo equilibrado"
                  descripcion="Todos los artículos en salón cuentan con disponibilidad."
                />
              </PanelBody>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Gestión y administración"
              descripcion="Accesos directos a módulos del sistema"
            />
            <div className="grid gap-px bg-border sm:grid-cols-2">
              {ATAJOS_SECUNDARIOS.map(({ href, label, detalle, icon: Icono }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-start gap-3 bg-card p-3.5 transition-colors duration-[--dur-fast] hover:bg-accent/70 focus-visible:bg-accent focus-visible:outline-none sm:p-4"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors group-hover:border-border-strong group-hover:text-foreground">
                    <Icono className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-1 text-sm font-medium text-foreground">
                      <span className="truncate">{label}</span>
                      <ArrowRight
                        className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-all duration-[--dur-fast] group-hover:translate-x-0.5 group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {detalle}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
