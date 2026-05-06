"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarClock,
  DollarSign,
  Percent,
  Receipt,
  Ticket,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";
import { formatARS } from "@/lib/formatCurrency";
import { EstadisticasVendedoresSkeleton } from "./EstadisticasVendedoresSkeleton";

const CHART_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#3b82f6",
  "#14b8a6",
  "#a855f7",
];

const METODO_PAGO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA_DEBITO: "Débito",
  TARJETA_CREDITO: "Crédito",
  TRANSFERENCIA: "Transferencia",
  MERCADOPAGO: "Mercado Pago",
  MULTIPLE: "Múltiple",
};

function labelMetodo(k: string) {
  return METODO_PAGO_LABEL[k] ?? k;
}

interface VendedorPanel {
  id: string;
  name: string | null;
  email: string;
  horarioEntrada: string | null;
  horarioSalida: string | null;
  diasTrabajados: number;
  cantidadVentas: number;
  totalVentas: number;
  gananciaBruta: number;
}

interface ApiResponse {
  fechaDesde: string;
  fechaHasta: string;
  vendedorId: string | null;
  vendedor: VendedorPanel | null;
  vendedoresDisponibles: Array<{ id: string; name: string | null; email: string }>;
  resumen: {
    totalMonto: number;
    cantidadVentas: number;
    ticketPromedio: number;
    margenPorcentaje: number;
  };
  comparacionMesAnterior: {
    totalMonto: number;
    cantidadVentas: number;
    variacionMontoPct: number | null;
  } | null;
  ventasPorDia: Array<{ fecha: string; total: number; cantidad: number }>;
  ventasPorMetodoPago: Array<{ metodoPago: string; total: number; cantidad: number }>;
  ventasPorDiaSemana: Array<{
    isodow: number;
    label: string;
    total: number;
    cantidad: number;
  }>;
}

function formatDayLabel(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

export default function EstadisticasVendedoresPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return String(d.getMonth() + 1).padStart(2, "0");
  });
  const [ano, setAno] = useState(() => String(new Date().getFullYear()));
  /** null = el servidor elige el vendedor por defecto (primer nombre) */
  const [overrideVendorId, setOverrideVendorId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setForbidden(false);
    setLoadError(null);
    const qs = new URLSearchParams({ mes, ano });
    if (overrideVendorId) qs.set("vendedorId", overrideVendorId);
    fetch(`/api/estadisticas-vendedores?${qs.toString()}`)
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          setForbidden(true);
          setData(null);
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
        }
        const json = (await res.json()) as ApiResponse;
        setData(json);
      })
      .catch((e) => {
        setData(null);
        setLoadError(
          e instanceof Error
            ? e.message
            : "No se pudieron cargar las estadísticas. Revisá la conexión e intentá de nuevo."
        );
      })
      .finally(() => setLoading(false));
  }, [mes, ano, overrideVendorId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch tras cambio de filtros
    refresh();
  }, [refresh]);

  const meses = [
    { value: "01", label: "Enero" },
    { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" },
    { value: "06", label: "Junio" },
    { value: "07", label: "Julio" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ];

  const anios = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const ventasDia = data?.ventasPorDia ?? [];
  const areaData = ventasDia.map((row) => ({
    ...row,
    label: formatDayLabel(row.fecha),
  }));

  const pieMetodoData =
    data?.ventasPorMetodoPago
      .filter((r) => r.total > 0)
      .map((r) => ({
        name: labelMetodo(r.metodoPago),
        value: r.total,
        cantidad: r.cantidad,
      })) ?? [];

  const barSemanaData = data?.ventasPorDiaSemana ?? [];

  if (loading) {
    return <EstadisticasVendedoresSkeleton />;
  }

  if (forbidden) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-bold">Estadísticas del vendedor</h1>
          <p className="text-muted-foreground">Solo administradores pueden ver esta página.</p>
        </div>
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-8 text-center text-destructive">
            No tenés permiso para ver esta página (solo administradores).
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-bold">Estadísticas del vendedor</h1>
          <p className="text-muted-foreground">Rendimiento y ventas por período</p>
        </div>
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-6 text-sm text-destructive">{loadError}</CardContent>
        </Card>
      </div>
    );
  }

  const resumen = data?.resumen ?? {
    totalMonto: 0,
    cantidadVentas: 0,
    ticketPromedio: 0,
    margenPorcentaje: 0,
  };

  const v = data?.vendedor;
  const sinVendedor = !v;
  const comparacion = data?.comparacionMesAnterior;
  const multiVendor = (data?.vendedoresDisponibles.length ?? 0) > 1;
  const selectValue = overrideVendorId ?? data?.vendedorId ?? "";

  const nombreMostrar = v?.name ?? v?.email ?? "Vendedor";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Estadísticas del vendedor</h1>
          <p className="mt-1 text-muted-foreground">
            Rendimiento operativo y ventas del período seleccionado
          </p>
          {!sinVendedor && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <User className="h-4 w-4 shrink-0" />
                {nombreMostrar}
              </span>
              <span className="text-border">·</span>
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                Horario: {v.horarioEntrada ?? "—"} – {v.horarioSalida ?? "—"}
              </span>
              <span className="text-border">·</span>
              <span>Jornadas registradas en el mes: {v.diasTrabajados}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {multiVendor && (
            <Select
              value={selectValue}
              onValueChange={(id) => setOverrideVendorId(id)}
            >
              <SelectTrigger className="w-[min(100%,220px)]">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                {data?.vendedoresDisponibles.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name ?? u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {meses.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {anios.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {sinVendedor ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay usuarios con rol vendedor. Creá uno en Usuarios.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Card className="overflow-hidden border border-border/70 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Facturación del período
                </CardTitle>
                <DollarSign className="h-5 w-5 text-primary/70" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{formatARS(resumen.totalMonto)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Ventas no anuladas</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border border-border/70 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ventas
                </CardTitle>
                <Receipt className="h-5 w-5 text-blue-500/70" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{resumen.cantidadVentas}</p>
                <p className="mt-1 text-xs text-muted-foreground">Tickets en el período</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border border-border/70 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ticket promedio
                </CardTitle>
                <Ticket className="h-5 w-5 text-amber-500/70" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">
                  {formatARS(resumen.ticketPromedio)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Por operación</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border border-border/70 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ganancia bruta
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-green-500/70" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
                  {formatARS(v.gananciaBruta)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Margen sobre ventas: {resumen.margenPorcentaje}%
                </p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border border-border/70 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  vs mes anterior
                </CardTitle>
                <Percent className="h-5 w-5 text-muted-foreground/80" />
              </CardHeader>
              <CardContent>
                {comparacion ? (
                  <>
                    <div className="flex items-center gap-2">
                      {comparacion.variacionMontoPct != null ? (
                        <>
                          {comparacion.variacionMontoPct >= 0 ? (
                            <TrendingUp className="h-5 w-5 text-green-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-500" />
                          )}
                          <p
                            className={`text-2xl font-bold tabular-nums ${
                              comparacion.variacionMontoPct >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {comparacion.variacionMontoPct >= 0 ? "+" : ""}
                            {comparacion.variacionMontoPct}%
                          </p>
                        </>
                      ) : (
                        <p className="text-lg font-semibold text-muted-foreground">—</p>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Mes previo: {formatARS(comparacion.totalMonto)} ({comparacion.cantidadVentas}{" "}
                      ventas)
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin datos de comparación</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Método de pago</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Distribución de facturación en el período
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {pieMetodoData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieMetodoData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={95}
                          innerRadius={48}
                          paddingAngle={2}
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                        >
                          {pieMetodoData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid oklch(0.92 0 0)",
                          }}
                          formatter={(value: unknown) => formatARS(Number(value ?? 0))}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-lg bg-muted/30 text-sm text-muted-foreground">
                      Sin ventas en el período
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Ventas por día de la semana</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Total facturado según el día calendario de cada venta
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {barSemanaData.some((d) => d.total > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barSemanaData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis
                          tickFormatter={(x) =>
                            new Intl.NumberFormat("es-AR", {
                              notation: "compact",
                              maximumFractionDigits: 1,
                            }).format(Number(x))
                          }
                          width={44}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid oklch(0.92 0 0)",
                          }}
                          formatter={(value: unknown) => formatARS(Number(value ?? 0))}
                        />
                        <Bar dataKey="total" fill="oklch(0.45 0.12 195)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-lg bg-muted/30 text-sm text-muted-foreground">
                      Sin ventas en el período
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Ventas diarias de {nombreMostrar}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Evolución día a día en el período seleccionado
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {areaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillVendedorUnico" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="oklch(0.55 0.15 195)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="oklch(0.55 0.15 195)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        interval="preserveStartEnd"
                        minTickGap={24}
                      />
                      <YAxis
                        tickFormatter={(val) =>
                          new Intl.NumberFormat("es-AR", {
                            notation: "compact",
                            maximumFractionDigits: 1,
                          }).format(Number(val))
                        }
                        tick={{ fontSize: 11 }}
                        width={52}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid oklch(0.92 0 0)",
                        }}
                        formatter={(value: unknown, name: string) => {
                          if (name === "total") return [formatARS(Number(value ?? 0)), "Total"];
                          return [Number(value ?? 0), "Ventas"];
                        }}
                        labelFormatter={(label) => `Día ${label}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="total"
                        stroke="oklch(0.45 0.12 195)"
                        strokeWidth={2}
                        fill="url(#fillVendedorUnico)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg bg-muted/30 text-sm text-muted-foreground">
                    Sin ventas diarias en el período
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
