"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { formatARS } from "@/lib/formatCurrency";
import type { Cliente } from "@prisma/client";

export function ClientesTable() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    fetch("/api/clientes")
      .then((res) => res.json())
      .then((data) => {
        setClientes(Array.isArray(data) ? data : []);
      })
      .catch(() => setClientes([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <TableSkeleton rows={6} cols={6} />;
  }

  const termino = busqueda.trim().toLocaleLowerCase("es");
  const filtrados = termino
    ? clientes.filter((c) =>
        `${c.nombre} ${c.telefono ?? ""} ${c.email ?? ""}`.toLocaleLowerCase("es").includes(termino)
      )
    : clientes;

  const buscador = (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Nombre, teléfono o email"
        className="h-10 w-full pl-9 sm:w-60"
        aria-label="Buscar clientes"
      />
    </div>
  );

  return (
    <Panel>
      <PanelHeader
        title="Base de clientes"
        descripcion={
          <span className="font-mono tabular-nums">
            {filtrados.length === clientes.length
              ? `${clientes.length} clientes`
              : `${filtrados.length} de ${clientes.length} clientes`}
          </span>
        }
        acciones={clientes.length > 0 ? buscador : undefined}
      />
      {clientes.length === 0 ? (
        <PanelBody>
          <EmptyState
            icono={Users}
            titulo="Todavía no hay clientes"
            descripcion="Se cargan desde acá o al registrar una venta con los datos del comprador."
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
            titulo="Ningún cliente coincide con la búsqueda"
            accion={
              <Button variant="ghost" size="sm" onClick={() => setBusqueda("")}>
                Limpiar búsqueda
              </Button>
            }
          />
        </PanelBody>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="text-right">Compras</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Ticket prom.</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nombre}</TableCell>
                <TableCell className="text-muted-foreground">
                  {c.telefono ? (
                    <span className="font-mono tabular-nums">{c.telefono}</span>
                  ) : (
                    c.email || "—"
                  )}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">{c.cantidadCompras}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatARS(Number(c.totalCompras))}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatARS(Number(c.ticketPromedio))}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/clientes/${c.id}`}>Ver</Link>
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
