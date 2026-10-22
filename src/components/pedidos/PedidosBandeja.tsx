"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  PackageCheck,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Figure, FigureGrid } from "@/components/ui/figure";
import { Panel } from "@/components/ui/panel";
import {
  Pedido,
  useConsulta,
  EstadoConsulta,
  estados,
  estadosPago,
  dinero,
  fecha,
  demorado,
  resumenPedido,
  centavos,
  decimal,
  nombreClientaPedido,
} from "./pedido-ui";

type FiltroId =
  | "activos"
  | "PENDIENTE"
  | "EN_FABRICACION"
  | "LISTO"
  | "saldo"
  | "demorados"
  | "finalizados"
  | "todos";

type OrdenId = "recientes" | "prometida" | "saldo";

function coincideFiltro(p: Pedido, filtro: FiltroId): boolean {
  const r = resumenPedido(p);
  switch (filtro) {
    case "activos":
      return !r.finalizado;
    case "PENDIENTE":
      return (
        !r.finalizado &&
        p.venta.items.some((i) => i.seguimientoEstado === "PENDIENTE")
      );
    case "EN_FABRICACION":
      return (
        !r.finalizado &&
        p.venta.items.some((i) =>
          ["ENCARGADO", "EN_FABRICACION"].includes(i.seguimientoEstado),
        )
      );
    case "LISTO":
      return !r.finalizado && r.unidadesListasParaEntregar > 0;
    case "saldo":
      return r.tieneSaldo;
    case "demorados":
      return demorado(p);
    case "finalizados":
      return r.finalizado;
    case "todos":
    default:
      return true;
  }
}

export function PedidosBandeja() {
  const consulta = useConsulta<Pedido[]>("/api/pedidos");
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroId>("activos");
  const [orden, setOrden] = useState<OrdenId>("recientes");

  const todos = useMemo(() => consulta.datos ?? [], [consulta.datos]);

  const metricas = useMemo(() => {
    let activos = 0;
    let porEncargar = 0;
    let listos = 0;
    let demoradosCount = 0;
    let conSaldoCount = 0;
    let saldoTotalCentavos = BigInt(0);

    for (const p of todos) {
      const r = resumenPedido(p);
      if (!r.finalizado) {
        activos += 1;
        if (p.venta.items.some((i) => i.seguimientoEstado === "PENDIENTE")) {
          porEncargar += 1;
        }
        if (r.unidadesListasParaEntregar > 0) {
          listos += 1;
        }
      }
      if (r.estaDemorado) {
        demoradosCount += 1;
      }
      if (r.tieneSaldo) {
        conSaldoCount += 1;
        try {
          saldoTotalCentavos += centavos(p.saldoPendiente);
        } catch {
          // Ignorar formato inesperado
        }
      }
    }

    return {
      activos,
      porEncargar,
      listos,
      demoradosCount,
      conSaldoCount,
      saldoTotal: decimal(saldoTotalCentavos),
    };
  }, [todos]);

  const filtros: { id: FiltroId; label: string; count: number }[] = useMemo(
    () => [
      {
        id: "activos",
        label: "En curso",
        count: todos.filter((p) => coincideFiltro(p, "activos")).length,
      },
      {
        id: "PENDIENTE",
        label: "Por encargar",
        count: todos.filter((p) => coincideFiltro(p, "PENDIENTE")).length,
      },
      {
        id: "EN_FABRICACION",
        label: "En taller",
        count: todos.filter((p) => coincideFiltro(p, "EN_FABRICACION")).length,
      },
      {
        id: "LISTO",
        label: "Listos para entregar",
        count: todos.filter((p) => coincideFiltro(p, "LISTO")).length,
      },
      {
        id: "saldo",
        label: "Con saldo",
        count: todos.filter((p) => coincideFiltro(p, "saldo")).length,
      },
      {
        id: "demorados",
        label: "Demorados",
        count: todos.filter((p) => coincideFiltro(p, "demorados")).length,
      },
      {
        id: "finalizados",
        label: "Finalizados",
        count: todos.filter((p) => coincideFiltro(p, "finalizados")).length,
      },
      {
        id: "todos",
        label: "Todos",
        count: todos.length,
      },
    ],
    [todos],
  );

  const pedidos = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase();
    const filtrados = todos.filter((p) => {
      const texto = [
        p.venta.numeroVenta,
        nombreClientaPedido(p),
        p.venta.cliente?.telefono || "",
        p.responsable || "",
        ...p.venta.items.map(
          (i) => `${i.productoNombre} ${i.productoSku} ${i.especificaciones || ""}`,
        ),
      ]
        .join(" ")
        .toLocaleLowerCase();

      return (!q || texto.includes(q)) && coincideFiltro(p, filtro);
    });

    return [...filtrados].sort((a, b) => {
      if (orden === "saldo") {
        return Number(b.saldoPendiente) - Number(a.saldoPendiente);
      }
      if (orden === "prometida") {
        const fa = a.fechaPrometida
          ? new Date(a.fechaPrometida).getTime()
          : Number.MAX_SAFE_INTEGER;
        const fb = b.fechaPrometida
          ? new Date(b.fechaPrometida).getTime()
          : Number.MAX_SAFE_INTEGER;
        return fa - fb;
      }
      const ua = new Date(a.updatedAt || a.venta.fecha).getTime();
      const ub = new Date(b.updatedAt || b.venta.fecha).getTime();
      return ub - ua;
    });
  }, [todos, busqueda, filtro, orden]);

  return (
    <div className="space-y-6">
      <PageHeader
        overline="Operación · Clientas y taller"
        title="Pedidos y encargos"
        description="Control de producción a medida, recepciones en local, señas y saldos pendientes de retiro."
      >
        <Button asChild>
          <Link href="/pedidos/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo pedido
          </Link>
        </Button>
      </PageHeader>

      {consulta.datos && !consulta.error && (
        <FigureGrid columnas={4}>
          <Figure
            label="Pedidos en curso"
            valor={metricas.activos}
            hint={
              metricas.porEncargar > 0
                ? `${metricas.porEncargar} pendientes de encargar al taller`
                : "Todos los encargos están en marcha"
            }
          />
          <Figure
            label="Listos en local"
            valor={metricas.listos}
            tono={metricas.listos > 0 ? "positivo" : "neutro"}
            hint="Con mercadería recibida para entregar"
          />
          <Figure
            label="Con demora"
            valor={metricas.demoradosCount}
            tono={metricas.demoradosCount > 0 ? "alerta" : "neutro"}
            hint={
              metricas.demoradosCount > 0
                ? "Fecha prometida vencida"
                : "Sin entregas atrasadas"
            }
          />
          <Figure
            label="Saldo por cobrar"
            valor={dinero(metricas.saldoTotal)}
            tono={metricas.conSaldoCount > 0 ? "alerta" : "neutro"}
            hint={`${metricas.conSaldoCount} pedido(s) con saldo abierto`}
          />
        </FigureGrid>
      )}

      <Panel className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Buscar pedidos"
              className="pl-9"
              placeholder="Buscar por número, clienta, teléfono, responsable, SKU o producto…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Ordenar:
            </span>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: "recientes", label: "Actividad" },
                  { id: "prometida", label: "Fecha prometida" },
                  { id: "saldo", label: "Mayor saldo" },
                ] as const
              ).map((o) => (
                <Button
                  key={o.id}
                  size="xs"
                  variant={orden === o.id ? "default" : "outline"}
                  onClick={() => setOrden(o.id)}
                >
                  {o.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div
          className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3"
          role="group"
          aria-label="Filtrar pedidos"
        >
          {filtros.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={filtro === f.id ? "default" : "outline"}
              aria-pressed={filtro === f.id}
              onClick={() => setFiltro(f.id)}
            >
              <span>{f.label}</span>
              <span className="ml-1 font-mono text-[11px] opacity-75">
                {f.count}
              </span>
            </Button>
          ))}
        </div>
      </Panel>

      <EstadoConsulta
        error={consulta.error}
        cargando={consulta.cargando && !consulta.datos}
        reintentar={() => void consulta.refrescar()}
      />

      {!consulta.error &&
        consulta.datos &&
        (pedidos.length === 0 ? (
          <EmptyState
            titulo={
              consulta.datos.length
                ? "Sin pedidos en esta vista"
                : "Todavía no hay pedidos registrados"
            }
            descripcion={
              consulta.datos.length
                ? "Probá cambiando el filtro activo o limpiando la búsqueda."
                : "Registrá el primer pedido con su clienta, especificaciones de taller y seña inicial."
            }
            accion={
              consulta.datos.length ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFiltro("todos");
                    setBusqueda("");
                  }}
                >
                  Ver todos los pedidos
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href="/pedidos/nuevo">Crear pedido</Link>
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {pedidos.map((p) => {
              const r = resumenPedido(p);
              return (
                <Link
                  key={p.id}
                  href={`/pedidos/${p.id}`}
                  className="group block rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/25 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {/* Fila superior: Identificación + Estados */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs font-medium text-foreground">
                          {p.venta.numeroVenta}
                        </span>
                        <h2 className="text-base font-semibold tracking-tight text-foreground">
                          {nombreClientaPedido(p)}
                        </h2>
                        {p.venta.cliente?.telefono && (
                          <span className="text-xs text-muted-foreground">
                            · {p.venta.cliente.telefono}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Prometido: <strong className="font-medium text-foreground">{fecha(p.fechaPrometida)}</strong>
                        </span>
                        {p.responsable && (
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="h-3.5 w-3.5" />
                            Taller / Resp.: <strong className="font-medium text-foreground">{p.responsable}</strong>
                          </span>
                        )}
                        <span>
                          Actividad: {fecha(p.updatedAt || p.venta.fecha)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {r.estaDemorado && (
                        <Badge variant="outline" className="text-num-warning">
                          Demorado
                        </Badge>
                      )}
                      {r.unidadesListasParaEntregar > 0 && !r.finalizado && (
                        <Badge variant="default">
                          <PackageCheck className="mr-1 h-3 w-3" />
                          {r.unidadesListasParaEntregar} u. para retirar
                        </Badge>
                      )}
                      <Badge variant="secondary">{r.etiquetaEstadoGeneral}</Badge>
                      <Badge variant="outline">
                        {estadosPago[p.venta.estadoPago] || p.venta.estadoPago}
                      </Badge>
                    </div>
                  </div>

                  {/* Ítems del pedido */}
                  <div className="my-4 divide-y divide-border/60 rounded-md border border-border/80 bg-background/60 px-3.5 py-1">
                    {p.venta.items.map((i) => (
                      <div
                        key={i.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-medium text-muted-foreground">
                              {i.cantidad}×
                            </span>
                            <span className="font-medium text-foreground">
                              {i.productoNombre}
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {i.productoSku}
                            </span>
                          </div>
                          {i.especificaciones && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {i.especificaciones}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-mono text-muted-foreground">
                            Recib. {i.cantidadRecibida}/{i.cantidad} · Entreg.{" "}
                            {i.cantidadEntregada}/{i.cantidad}
                          </span>
                          <span className="rounded border border-border bg-card px-2 py-0.5 font-medium text-foreground">
                            {estados[i.seguimientoEstado] || i.seguimientoEstado}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Barra inferior: Progreso físico y Resumen financiero */}
                  <div className="grid gap-4 pt-1 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Avance de entrega</span>
                        <span className="font-mono">
                          {r.unidadesEntregadas}/{r.unidadesTotales} u. ({r.porcentajeEntrega}%)
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-foreground transition-all"
                          style={{ width: `${r.porcentajeEntrega}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Avance de cobro</span>
                        <span className="font-mono">{r.porcentajePago}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-foreground transition-all"
                          style={{ width: `${r.porcentajePago}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs sm:justify-end sm:gap-4 lg:col-span-2">
                      <div>
                        <span className="text-muted-foreground">Total: </span>
                        <strong className="font-mono text-foreground">
                          {dinero(p.venta.total)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cobrado: </span>
                        <span className="font-mono text-foreground">
                          {dinero(p.totalPagado)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Saldo: </span>
                        <strong
                          className={`font-mono ${
                            r.tieneSaldo
                              ? "text-num-warning"
                              : "text-num-positive"
                          }`}
                        >
                          {dinero(p.saldoPendiente)}
                        </strong>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground transition-transform group-hover:translate-x-0.5">
                        Gestionar
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
    </div>
  );
}
