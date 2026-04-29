"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import type { Cliente } from "@prisma/client";

export function ClientesTable() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (clientes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-muted-foreground">
        No hay clientes.{" "}
        <Link href="/clientes/nuevo" className="font-medium text-primary hover:underline">
          Crear uno
        </Link>
      </div>
    );
  }

  const formatMoney = (n: number | string) => {
    const num = typeof n === "string" ? parseFloat(n) : n;
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(num);
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Contacto</TableHead>
          <TableHead>Compras</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Ticket prom.</TableHead>
          <TableHead className="w-[100px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clientes.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">{c.nombre}</TableCell>
            <TableCell>
              {c.telefono || c.email || "—"}
            </TableCell>
            <TableCell>{c.cantidadCompras}</TableCell>
            <TableCell className="tabular-nums">{formatMoney(Number(c.totalCompras))}</TableCell>
            <TableCell className="tabular-nums">{formatMoney(Number(c.ticketPromedio))}</TableCell>
            <TableCell>
              <Link href={`/clientes/${c.id}`}>
                <Button variant="ghost" size="sm">
                  Ver / Editar
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}
