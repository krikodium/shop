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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Resumen } from "@/components/ui/resumen";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatARS } from "@/lib/formatCurrency";
import {
  COLORES_GRAFICO,
  ejeGrafico,
  formatoEjeMonto,
  grillaGrafico,
  tooltipGrafico,
} from "@/lib/chart-theme";
import { cn } from "@/lib/utils";
import { EstadisticasVendedoresSkeleton } from "./EstadisticasVendedoresSkeleton";

/** Eje Y de importes: `$ 260 mil` en vez de `260000`. */
const ejeMonto = (x: unknown) => formatoEjeMonto(Number(x));

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
        <PageHeader
          overline="Administración"
          title="Estadísticas del vendedor"
          description="Solo administradores pueden ver esta página."
        />
        <EmptyState
          titulo="No tenés permiso para ver esta página"
          descripcion="Las estadísticas de vendedores están disponibles solo para administradores."
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <PageHeader
          overline="Administración"
          title="Estadísticas del vendedor"
          description="Rendimiento y ventas por período"
        />
        <EmptyState
          titulo="No se pudieron cargar las estadísticas"
          descripcion={loadError}
          accion={
            <Button variant="outline" size="sm" onClick={refresh}>
              Reintentar
            </Button>
          }
        />
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
  const variacion = comparacion?.variacionMontoPct ?? null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        overline="Administración"
        title="Estadísticas del vendedor"
        description={
          sinVendedor ? (
            "Rendimiento operativo y ventas del período seleccionado"
          ) : (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-foreground">{nombreMostrar}</span>
              <span aria-hidden="true">·</span>
              <span>
                Horario{" "}
                <span className="font-mono tabular-nums">
                  {v.horarioEntrada ?? "—"} – {v.horarioSalida ?? "—"}
                </span>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Jornadas en el mes{" "}
                <span className="font-mono tabular-nums">{v.diasTrabajados}</span>
              </span>
            </span>
          )
        }
      >
        {multiVendor && (
          <>
            <Label htmlFor="est-vendedor" className="sr-only">
              Vendedor
            </Label>
            <Select value={selectValue} onValueChange={(id) => setOverrideVendorId(id)}>
              <SelectTrigger id="est-vendedor" className="h-9 w-[min(100%,220px)]">
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
          </>
        )}
        <Label htmlFor="est-mes" className="sr-only">
          Mes
        </Label>
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger id="est-mes" className="h-9 w-[140px]">
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
        <Label htmlFor="est-ano" className="sr-only">
          Año
        </Label>
        <Select value={ano} onValueChange={setAno}>
          <SelectTrigger id="est-ano" className="h-9 w-[96px] font-mono tabular-nums">
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
      </PageHeader>

      {sinVendedor ? (
        <EmptyState
          titulo="No hay usuarios con rol vendedor"
          descripcion="Creá uno en Usuarios para ver sus estadísticas."
        />
      ) : (
        <>
          <Resumen
            className="anim-entrada"
            items={[
              {
                label: "Facturación del período",
                valor: formatARS(resumen.totalMonto),
                hint: comparacion ? (
                  <span className="flex flex-col gap-0.5">
                    {variacion != null ? (
                      <span className="inline-flex items-center gap-1">
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 font-mono tabular-nums",
                            variacion >= 0 ? "text-num-positive" : "text-num-negative"
                          )}
                        >
                          {variacion >= 0 ? (
                            <ArrowUpRight className="size-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowDownRight className="size-3.5" aria-hidden="true" />
                          )}
                          {variacion >= 0 ? "+" : ""}
                          {variacion}%
                        </span>
                        vs mes anterior
                      </span>
                    ) : (
                      <span>Sin variación calculable vs mes anterior</span>
                    )}
                    <span>
                      Mes previo{" "}
                      <span className="font-mono tabular-nums">
                        {formatARS(comparacion.totalMonto)}
                      </span>{" "}
                      ({comparacion.cantidadVentas} ventas)
                    </span>
                  </span>
                ) : (
                  "Ventas no anuladas"
                ),
              },
              {
                label: "Ventas",
                valor: resumen.cantidadVentas,
                hint: "Tickets en el período",
              },
              {
                label: "Ticket promedio",
                valor: formatARS(resumen.ticketPromedio),
                hint: "Por operación",
              },
              {
                label: "Ganancia bruta",
                valor: (
                  <span className={v.gananciaBruta < 0 ? "text-num-negative" : "text-num-positive"}>
                    {formatARS(v.gananciaBruta)}
                  </span>
                ),
                hint: (
                  <>
                    Margen sobre ventas{" "}
                    <span className="font-mono tabular-nums">{resumen.margenPorcentaje}%</span>
                  </>
                ),
              },
            ]}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel>
              <PanelHeader
                title="Método de pago"
                descripcion="Distribución de la facturación en el período"
              />
              <PanelBody>
                <div className="h-[280px]">
                  {pieMetodoData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieMetodoData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius="70%"
                          innerRadius="40%"
                          paddingAngle={2}
                          stroke="var(--card)"
                          strokeWidth={2}
                          /* Solo se rotula la porción que tiene lugar; el resto
                             se lee en la leyenda y en el tooltip. */
                          label={({ name, percent }) =>
                            (percent ?? 0) >= 0.08
                              ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                              : ""
                          }
                          labelLine={false}
                          fontSize={11}
                        >
                          {pieMetodoData.map((entrada, i) => (
                            <Cell
                              key={entrada.name}
                              fill={COLORES_GRAFICO[i % COLORES_GRAFICO.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          {...tooltipGrafico}
                          formatter={(value: unknown, name: unknown) => [
                            formatARS(Number(value ?? 0)),
                            String(name),
                          ]}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={32}
                          formatter={(value: unknown) => (
                            <span className="text-xs text-muted-foreground">{String(value)}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState
                      className="h-full justify-center py-6"
                      titulo="Sin ventas en el período"
                    />
                  )}
                </div>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader
                title="Ventas por día de la semana"
                descripcion="Total facturado según el día calendario de cada venta"
              />
              <PanelBody>
                <div className="h-[280px]">
                  {barSemanaData.some((d) => d.total > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barSemanaData}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid {...grillaGrafico} />
                        <XAxis dataKey="label" {...ejeGrafico} />
                        <YAxis tickFormatter={ejeMonto} width={68} {...ejeGrafico} />
                        <Tooltip
                          {...tooltipGrafico}
                          formatter={(value: unknown) => [
                            formatARS(Number(value ?? 0)),
                            "Facturado",
                          ]}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={28}
                          formatter={() => (
                            <span className="text-xs text-muted-foreground">Facturado</span>
                          )}
                        />
                        <Bar
                          dataKey="total"
                          name="Facturado"
                          fill={COLORES_GRAFICO[0]}
                          radius={[3, 3, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState
                      className="h-full justify-center py-6"
                      titulo="Sin ventas en el período"
                    />
                  )}
                </div>
              </PanelBody>
            </Panel>
          </div>

          <Panel>
            <PanelHeader
              title={`Ventas diarias de ${nombreMostrar}`}
              descripcion="Evolución día a día en el período seleccionado"
            />
            <PanelBody>
              <div className="h-[260px]">
                {areaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid {...grillaGrafico} />
                      <XAxis
                        dataKey="label"
                        interval="preserveStartEnd"
                        minTickGap={24}
                        {...ejeGrafico}
                      />
                      <YAxis tickFormatter={ejeMonto} width={68} {...ejeGrafico} />
                      <Tooltip
                        {...tooltipGrafico}
                        cursor={{ stroke: "var(--border)" }}
                        formatter={(value: unknown, name?: string) => {
                          if (name === "total") return [formatARS(Number(value ?? 0)), "Total"];
                          return [Number(value ?? 0), "Ventas"];
                        }}
                        labelFormatter={(label) => `Día ${label}`}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={28}
                        formatter={() => (
                          <span className="text-xs text-muted-foreground">Total facturado</span>
                        )}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="total"
                        stroke={COLORES_GRAFICO[0]}
                        strokeWidth={2}
                        strokeDasharray=""
                        fill={COLORES_GRAFICO[0]}
                        fillOpacity={0.06}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    className="h-full justify-center py-6"
                    titulo="Sin ventas diarias en el período"
                  />
                )}
              </div>
            </PanelBody>
          </Panel>
        </>
      )}
    </div>
  );
}
