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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import type { Producto, Categoria, Proveedor } from "@prisma/client";

interface ProductoConRelaciones extends Producto {
  categoria: Categoria | null;
  proveedor: Proveedor | null;
}

interface ProductosTableProps {
  queryParams?: string;
  onRefresh?: () => void;
}

export function ProductosTable({ queryParams = "", onRefresh }: ProductosTableProps) {
  const [productos, setProductos] = useState<ProductoConRelaciones[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = queryParams ? `/api/productos?${queryParams}` : "/api/productos";
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const list = data.productos ?? (Array.isArray(data) ? data : []);
        setProductos(list);
      })
      .catch(() => setProductos([]))
      .finally(() => setLoading(false));
  }, [queryParams]);

  if (loading) {
    return <TableSkeleton rows={8} cols={8} />;
  }

  if (productos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-muted-foreground">
        No hay productos.{" "}
        <Link href="/productos/nuevo" className="font-medium text-primary hover:underline">
          Crear uno
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12"></TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>P. venta</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="w-[100px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {productos.map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              {p.imagenUrl ? (
                <img
                  src={p.imagenUrl}
                  alt={p.nombre}
                  className="h-10 w-10 rounded object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-muted" />
              )}
            </TableCell>
            <TableCell className="font-mono text-sm">{p.sku}</TableCell>
            <TableCell className="font-medium">{p.nombre}</TableCell>
            <TableCell>{p.categoria?.nombre ?? "—"}</TableCell>
            <TableCell className="tabular-nums">${Number(p.precioVenta).toFixed(2)}</TableCell>
            <TableCell>
              <span
                className={
                  p.stockActual <= p.stockMinimo ? "text-destructive font-medium" : ""
                }
              >
                {p.stockActual}
              </span>
            </TableCell>
            <TableCell>
              {p.enConsignacion ? (
                <Badge variant="default">Consignación</Badge>
              ) : (
                <Badge variant="secondary">Regular</Badge>
              )}
            </TableCell>
            <TableCell>
              <Link href={`/productos/${p.id}/editar`}>
                <Button variant="ghost" size="sm">
                  Editar
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
