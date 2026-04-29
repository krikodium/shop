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
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/table-skeleton";

interface OrdenRow {
  id: string;
  numeroOrden: string;
  fecha: string;
  total: number;
  estado: string;
  proveedor: { nombre: string };
}

export function ComprasTable() {
  const [ordenes, setOrdenes] = useState<OrdenRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/compras")
      .then((res) => res.json())
      .then((data) => {
        const raw = Array.isArray(data) ? data : [];
        const rows: OrdenRow[] = raw.map((o: Record<string, unknown>) => ({
          id: o.id as string,
          numeroOrden: o.numeroOrden as string,
          fecha: o.fecha as string,
          total: Number(o.total ?? 0),
          estado: (o.estado as string) ?? "",
          proveedor: (o.proveedor as { nombre: string }) ?? { nombre: "" },
        }));
        setOrdenes(rows);
      })
      .catch(() => setOrdenes([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <TableSkeleton rows={6} cols={6} />;

  if (ordenes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-muted-foreground">
        No hay órdenes.{" "}
        <Link href="/compras/nueva" className="font-medium text-primary hover:underline">
          Crear una
        </Link>
      </div>
    );
  }

  const estadoVariant = (e: string) =>
    e === "RECIBIDO" ? "default" : e === "CANCELADO" ? "destructive" : "secondary";

  return (
    <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nº</TableHead>
          <TableHead>Proveedor</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ordenes.map((o) => (
          <TableRow key={o.id}>
            <TableCell className="font-medium">{o.numeroOrden}</TableCell>
            <TableCell>{o.proveedor?.nombre ?? "—"}</TableCell>
            <TableCell>
              {new Date(o.fecha).toLocaleDateString()}
            </TableCell>
            <TableCell className="tabular-nums">${o.total.toFixed(2)}</TableCell>
            <TableCell>
              <Badge variant={estadoVariant(o.estado)}>{o.estado}</Badge>
            </TableCell>
            <TableCell>
              <Link href={`/compras/${o.id}`}>
                <Button variant="ghost" size="sm">
                  Ver
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
