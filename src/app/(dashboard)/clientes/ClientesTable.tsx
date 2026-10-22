"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Search, Users } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Resumen } from "@/components/ui/resumen";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatARS } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";
import type { Cliente } from "@prisma/client";

type SegmentoCliente = "todos" | "frecuentes" | "con_compras" | "sin_compras";
type OrdenCliente = "total_desc" | "compras_desc" | "ticket_desc" | "nombre_asc";

export function ClientesTable() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [segmento, setSegmento] = useState<SegmentoCliente>("todos");
  const [orden, setOrden] = useState<OrdenCliente>("total_desc");

  useEffect(() => {
    fetch("/api/clientes")
      .then((res) => res.json())
      .then((data) => {
        setClientes(Array.isArray(data) ? data : []);
      })
      .catch(() => setClientes([]))
      .finally(() => setLoading(false));
  }, []);

  const metricas = useMemo(() => {
    const total = clientes.length;
    const conCompras = clientes.filter((c) => c.cantidadCompras > 0);
    const frecuentes = clientes.filter((c) => c.cantidadCompras >= 2);
    const facturacionTotal = clientes.reduce((acc, c) => acc + Number(c.totalCompras ?? 0), 0);
    const operacionesTotales = clientes.reduce((acc, c) => acc + Number(c.cantidadCompras ?? 0), 0);
    const ticketGlobal = operacionesTotales > 0 ? facturacionTotal / operacionesTotales : 0;
    return {
      total,
      conComprasCount: conCompras.length,
      frecuentesCount: frecuentes.length,
      sinComprasCount: total - conCompras.length,
      facturacionTotal,
      operacionesTotales,
      ticketGlobal,
    };
  }, [clientes]);

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es");
    const base = clientes.filter((c) => {
      if (segmento === "frecuentes" && c.cantidadCompras < 2) return false;
      if (segmento === "con_compras" && c.cantidadCompras <= 0) return false;
      if (segmento === "sin_compras" && c.cantidadCompras > 0) return false;
      if (!termino) return true;
      return `${c.nombre} ${c.telefono ?? ""} ${c.email ?? ""} ${c.dni ?? ""}`
        .toLocaleLowerCase("es")
        .includes(termino);
    });

    return [...base].sort((a, b) => {
      if (orden === "total_desc") {
        return Number(b.totalCompras) - Number(a.totalCompras);
      }
      if (orden === "compras_desc") {
        return b.cantidadCompras - a.cantidadCompras;
      }
      if (orden === "ticket_desc") {
        return Number(b.ticketPromedio) - Number(a.ticketPromedio);
      }
      return a.nombre.localeCompare(b.nombre, "es");
    });
  }, [clientes, busqueda, segmento, orden]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-skeleton-shimmer rounded-xl" />
        <TableSkeleton rows={6} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Resumen
        items={[
          {
            label: "Base registrada",
            valor: metricas.total,
            hint: `${metricas.conComprasCount} con compras activas`,
          },
          {
            label: "Clientes frecuentes",
            valor: metricas.frecuentesCount,
            hint: "2 o más compras registradas",
          },
          {
            label: "Facturación acumulada",
            valor: formatARS(metricas.facturacionTotal),
            hint: `En ${metricas.operacionesTotales} ${metricas.operacionesTotales === 1 ? "operación" : "operaciones"}`,
          },
          {
            label: "Ticket promedio",
            valor: metricas.operacionesTotales > 0 ? formatARS(metricas.ticketGlobal) : "—",
            hint: "Promedio histórico por compra",
          },
        ]}
      />

      <Panel>
        <PanelHeader
          title="Directorio de clientes"
          descripcion={
            <span className="font-mono text-xs tabular-nums">
              {filtrados.length === clientes.length
                ? `${clientes.length} clientes`
                : `${filtrados.length} de ${clientes.length} clientes`}
            </span>
          }
          acciones={
            clientes.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Nombre, teléfono, email o DNI…"
                    className="h-9 w-full pl-9 sm:w-64"
                    aria-label="Buscar clientes"
                  />
                </div>
                <Select value={orden} onValueChange={(v) => setOrden(v as OrdenCliente)}>
                  <SelectTrigger className="h-9 w-[180px]" aria-label="Ordenar clientes">
                    <ArrowUpDown className="mr-1.5 size-3.5 text-muted-foreground" aria-hidden="true" />
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total_desc">Mayor facturación</SelectItem>
                    <SelectItem value="compras_desc">Más compras</SelectItem>
                    <SelectItem value="ticket_desc">Mayor ticket prom.</SelectItem>
                    <SelectItem value="nombre_asc">Nombre (A–Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : undefined
          }
        />

        {clientes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/15 px-4 py-2.5 sm:px-5">
            {(
              [
                { id: "todos", label: "Todos", count: metricas.total },
                { id: "frecuentes", label: "Frecuentes (2+)", count: metricas.frecuentesCount },
                { id: "con_compras", label: "Con compras", count: metricas.conComprasCount },
                { id: "sin_compras", label: "Sin compras", count: metricas.sinComprasCount },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSegmento(tab.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  segmento === tab.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "font-mono text-[11px] tabular-nums",
                    segmento === tab.id ? "text-background/80" : "text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {clientes.length === 0 ? (
          <PanelBody>
            <EmptyState
              icono={Users}
              titulo="Todavía no hay clientes"
              descripcion="Se cargan desde acá o al registrar una venta o pedido con los datos del comprador."
              accion={
                <Button asChild size="sm">
                  <Link href="/clientes/nuevo">Nuevo cliente</Link>
                </Button>
              }
            />
          </PanelBody>
        ) : filtrados.length === 0 ? (
          <PanelBody>
            <EmptyState
              titulo="Ningún cliente coincide con el filtro"
              accion={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBusqueda("");
                    setSegmento("todos");
                  }}
                >
                  Limpiar filtros
                </Button>
              }
            />
          </PanelBody>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="text-right">Compras</TableHead>
                <TableHead className="text-right">Total acumulado</TableHead>
                <TableHead className="text-right">Ticket prom.</TableHead>
                <TableHead className="w-[90px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((c) => {
                const esFrecuente = c.cantidadCompras >= 3;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/clientes/${c.id}`}
                          className="font-medium hover:underline"
                        >
                          {c.nombre}
                        </Link>
                        {esFrecuente && (
                          <Badge variant="outline" className="text-[10px]">
                            Frecuente
                          </Badge>
                        )}
                      </div>
                      {c.dni && (
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                          DNI {c.dni}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        {c.telefono ? (
                          <p className="font-mono tabular-nums text-foreground">{c.telefono}</p>
                        ) : null}
                        {c.email ? (
                          <p className="text-muted-foreground">{c.email}</p>
                        ) : null}
                        {!c.telefono && !c.email && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {c.cantidadCompras > 0 ? (
                        <span className="font-semibold">{c.cantidadCompras}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold tabular-nums">
                      {Number(c.totalCompras) > 0 ? (
                        formatARS(Number(c.totalCompras))
                      ) : (
                        <span className="font-normal text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {Number(c.ticketPromedio) > 0 ? formatARS(Number(c.ticketPromedio)) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/clientes/${c.id}`}>Ficha</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
