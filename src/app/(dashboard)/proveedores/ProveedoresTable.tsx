"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Truck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Resumen } from "@/components/ui/resumen";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { cn } from "@/lib/utils";
import type { Proveedor } from "@prisma/client";

interface ProveedorConCount extends Proveedor {
  _count: { productos: number };
}

type FiltroTipo = "todos" | "REGULAR" | "CONSIGNACION";

export function ProveedoresTable() {
  const [proveedores, setProveedores] = useState<ProveedorConCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");

  useEffect(() => {
    fetch("/api/proveedores")
      .then((res) => res.json())
      .then((data) => {
        setProveedores(Array.isArray(data) ? data : []);
      })
      .catch(() => setProveedores([]))
      .finally(() => setLoading(false));
  }, []);

  const metricas = useMemo(() => {
    const total = proveedores.length;
    const consignacion = proveedores.filter((p) => p.tipoProveedor === "CONSIGNACION").length;
    const regulares = total - consignacion;
    const productosVinculados = proveedores.reduce(
      (acc, p) => acc + Number(p._count?.productos ?? 0),
      0
    );
    return { total, consignacion, regulares, productosVinculados };
  }, [proveedores]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase("es");
    return proveedores.filter((p) => {
      if (filtroTipo !== "todos" && p.tipoProveedor !== filtroTipo) return false;
      if (!q) return true;
      return `${p.nombre} ${p.telefono ?? ""} ${p.email ?? ""} ${p.direccion ?? ""}`
        .toLocaleLowerCase("es")
        .includes(q);
    });
  }, [proveedores, busqueda, filtroTipo]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-skeleton-shimmer rounded-xl" />
        <TableSkeleton rows={6} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Resumen
        items={[
          {
            label: "Proveedores activos",
            valor: metricas.total,
            hint: "Talleres y marcas registradas",
          },
          {
            label: "En consignación",
            valor: metricas.consignacion,
            hint: "Liquidación por rendición",
          },
          {
            label: "Compra directa",
            valor: metricas.regulares,
            hint: "Proveedores regulares",
          },
          {
            label: "Productos asociados",
            valor: metricas.productosVinculados,
            hint: "Artículos vinculados a proveedor",
          },
        ]}
      />

      <Panel>
        <PanelHeader
          title="Directorio de proveedores"
          descripcion={
            <span className="font-mono text-xs tabular-nums">
              {filtrados.length === proveedores.length
                ? `${proveedores.length} ${proveedores.length === 1 ? "proveedor" : "proveedores"}`
                : `${filtrados.length} de ${proveedores.length} proveedores`}
            </span>
          }
          acciones={
            proveedores.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre o contacto…"
                    className="h-9 w-full pl-9 sm:w-60"
                    aria-label="Buscar proveedores"
                  />
                </div>
                <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
                  {(
                    [
                      { id: "todos", label: "Todos" },
                      { id: "CONSIGNACION", label: "Consignación" },
                      { id: "REGULAR", label: "Regulares" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFiltroTipo(tab.id)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        filtroTipo === tab.id
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : undefined
          }
        />

        {proveedores.length === 0 ? (
          <PanelBody>
            <EmptyState
              icono={Truck}
              titulo="Todavía no hay proveedores"
              descripcion="Cargá el primero para asociarle productos y ver sus métricas."
              accion={
                <Button asChild size="sm">
                  <Link href="/proveedores/nuevo">Nuevo proveedor</Link>
                </Button>
              }
            />
          </PanelBody>
        ) : filtrados.length === 0 ? (
          <PanelBody>
            <EmptyState
              titulo="Ningún proveedor coincide con el filtro"
              accion={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBusqueda("");
                    setFiltroTipo("todos");
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
                <TableHead>Proveedor</TableHead>
                <TableHead>Modalidad</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="text-right">Productos</TableHead>
                <TableHead className="w-[110px]">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((p) => {
                const esConsignacion = p.tipoProveedor === "CONSIGNACION";
                const comision = p.comisionPorDefecto != null ? Number(p.comisionPorDefecto) : null;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/proveedores/${p.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.nombre}
                      </Link>
                      {p.direccion && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{p.direccion}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={esConsignacion ? "default" : "outline"}>
                          {esConsignacion ? "Consignación" : "Regular"}
                        </Badge>
                        {esConsignacion && comision != null && comision > 0 && (
                          <Badge variant="outline" className="font-mono text-[10px] tabular-nums">
                            Comisión {comision}%
                          </Badge>
                        )}
                        {esConsignacion && p.liquidacionUsd && (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            USD
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        {p.telefono && (
                          <p className="font-mono tabular-nums text-foreground">{p.telefono}</p>
                        )}
                        {p.email && <p className="text-muted-foreground">{p.email}</p>}
                        {!p.telefono && !p.email && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold tabular-nums">
                      {p._count.productos}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/proveedores/${p.id}`}>Ficha</Link>
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
