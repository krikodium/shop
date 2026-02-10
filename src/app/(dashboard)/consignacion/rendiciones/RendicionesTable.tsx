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

interface RendicionRow {
  id: string;
  numeroRendicion: string;
  fechaRendicion: string;
  fechaDesde: string;
  fechaHasta: string;
  totalVendido: number;
  comisionShop: number;
  totalARendir: number;
  estado: string;
  proveedor: { nombre: string };
}

export function RendicionesTable() {
  const [rendiciones, setRendiciones] = useState<RendicionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/consignacion/rendiciones")
      .then((res) => res.json())
      .then((data) => {
        const raw = Array.isArray(data) ? data : [];
        const rows: RendicionRow[] = raw.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          numeroRendicion: r.numeroRendicion as string,
          fechaRendicion: r.fechaRendicion as string,
          fechaDesde: r.fechaDesde as string,
          fechaHasta: r.fechaHasta as string,
          totalVendido: Number(r.totalVendido ?? 0),
          comisionShop: Number(r.comisionShop ?? 0),
          totalARendir: Number(r.totalARendir ?? 0),
          estado: (r.estado as string) ?? "",
          proveedor: (r.proveedor as { nombre: string }) ?? { nombre: "" },
        }));
        setRendiciones(rows);
      })
      .catch(() => setRendiciones([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted-foreground">Cargando…</p>;

  if (rendiciones.length === 0) {
    return (
      <p className="text-muted-foreground">
        No hay rendiciones.{" "}
        <Link href="/consignacion/rendiciones/nueva" className="text-primary underline">
          Crear una
        </Link>
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nº</TableHead>
          <TableHead>Proveedor</TableHead>
          <TableHead>Período</TableHead>
          <TableHead>Vendido</TableHead>
          <TableHead>A rendir</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rendiciones.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">{r.numeroRendicion}</TableCell>
            <TableCell>{r.proveedor?.nombre ?? "—"}</TableCell>
            <TableCell className="text-sm">
              {new Date(r.fechaDesde).toLocaleDateString()} -{" "}
              {new Date(r.fechaHasta).toLocaleDateString()}
            </TableCell>
            <TableCell>${r.totalVendido.toFixed(2)}</TableCell>
            <TableCell>${r.totalARendir.toFixed(2)}</TableCell>
            <TableCell>
              <Badge
                variant={
                  r.estado === "PAGADO"
                    ? "default"
                    : r.estado === "PARCIAL"
                      ? "secondary"
                      : "outline"
                }
              >
                {r.estado}
              </Badge>
            </TableCell>
            <TableCell>
              <Link href={`/consignacion/rendiciones/${r.id}`}>
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
