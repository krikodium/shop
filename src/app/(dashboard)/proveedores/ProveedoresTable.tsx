"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Truck } from "lucide-react";
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
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import type { Proveedor } from "@prisma/client";

interface ProveedorConCount extends Proveedor {
  _count: { productos: number };
}

export function ProveedoresTable() {
  const [proveedores, setProveedores] = useState<ProveedorConCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/proveedores")
      .then((res) => res.json())
      .then((data) => {
        setProveedores(Array.isArray(data) ? data : []);
      })
      .catch(() => setProveedores([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Panel>
      <PanelHeader
        title="Listado"
        descripcion={
          loading
            ? undefined
            : `${proveedores.length} ${proveedores.length === 1 ? "proveedor" : "proveedores"}`
        }
      />
      {loading ? (
        <div className="divide-y divide-border" aria-busy="true" aria-label="Cargando proveedores">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
              <div className="h-4 flex-1 animate-skeleton-shimmer rounded" />
              <div className="h-4 w-24 animate-skeleton-shimmer rounded" />
              <div className="h-4 w-10 animate-skeleton-shimmer rounded" />
            </div>
          ))}
        </div>
      ) : proveedores.length === 0 ? (
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
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="text-right">Productos</TableHead>
              <TableHead className="w-[110px]">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proveedores.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nombre}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {p.tipoProveedor === "CONSIGNACION" ? "Consignación" : "Regular"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.telefono || p.email || "—"}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {p._count.productos}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/proveedores/${p.id}`}>Ver</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
