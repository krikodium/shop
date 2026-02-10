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

interface VentaRow {
  id: string;
  numeroVenta: string;
  fecha: string;
  total: number;
  gananciaBruta: number;
  margenPorcentaje: number;
  deudaConsignacion: number;
  metodoPago: string;
  cliente?: { nombre: string } | null;
  clienteNombre?: string | null;
}

export function VentasTable() {
  const [ventas, setVentas] = useState<VentaRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ventas")
      .then((res) => res.json())
      .then((data) => {
        const raw = Array.isArray(data) ? data : [];
        const rows: VentaRow[] = raw.map((v: Record<string, unknown>) => ({
          id: v.id as string,
          numeroVenta: v.numeroVenta as string,
          fecha: v.fecha as string,
          total: Number(v.total ?? 0),
          gananciaBruta: Number(v.gananciaBruta ?? 0),
          margenPorcentaje: Number(v.margenPorcentaje ?? 0),
          deudaConsignacion: Number(v.deudaConsignacion ?? 0),
          metodoPago: (v.metodoPago as string) ?? "",
          cliente: v.cliente as { nombre: string } | null,
          clienteNombre: (v.clienteNombre as string) ?? null,
        }));
        setVentas(rows);
      })
      .catch(() => setVentas([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">Cargando ventas…</p>;
  }

  if (ventas.length === 0) {
    return (
      <p className="text-muted-foreground">
        No hay ventas.{" "}
        <Link href="/ventas/nueva" className="text-primary underline">
          Crear una venta
        </Link>
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nº</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Ganancia</TableHead>
          <TableHead>Margen</TableHead>
          <TableHead>Consignación</TableHead>
          <TableHead className="w-[100px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ventas.map((v) => (
          <TableRow key={v.id}>
            <TableCell className="font-medium">{v.numeroVenta}</TableCell>
            <TableCell>
              {new Date(v.fecha).toLocaleDateString()} {new Date(v.fecha).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </TableCell>
            <TableCell>{v.cliente?.nombre ?? v.clienteNombre ?? "—"}</TableCell>
            <TableCell>${v.total.toFixed(2)}</TableCell>
            <TableCell className="text-green-600">${v.gananciaBruta.toFixed(2)}</TableCell>
            <TableCell>{v.margenPorcentaje.toFixed(1)}%</TableCell>
            <TableCell>
              {v.deudaConsignacion > 0 ? (
                <Badge variant="secondary">${v.deudaConsignacion.toFixed(2)}</Badge>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell>
              <Link href={`/ventas/${v.id}`}>
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
