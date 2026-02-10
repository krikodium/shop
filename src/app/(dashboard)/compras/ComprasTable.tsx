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

  if (loading) return <p className="text-muted-foreground">Cargando…</p>;

  if (ordenes.length === 0) {
    return (
      <p className="text-muted-foreground">
        No hay órdenes.{" "}
        <Link href="/compras/nueva" className="text-primary underline">
          Crear una
        </Link>
      </p>
    );
  }

  const estadoVariant = (e: string) =>
    e === "RECIBIDO" ? "default" : e === "CANCELADO" ? "destructive" : "secondary";

  return (
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
            <TableCell>${o.total.toFixed(2)}</TableCell>
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
  );
}
