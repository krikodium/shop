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

  if (loading) {
    return <p className="text-muted-foreground">Cargando proveedores…</p>;
  }

  if (proveedores.length === 0) {
    return (
      <p className="text-muted-foreground">
        No hay proveedores.{" "}
        <Link href="/proveedores/nuevo" className="text-primary underline">
          Crear uno
        </Link>
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Contacto</TableHead>
          <TableHead>Productos</TableHead>
          <TableHead className="w-[100px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {proveedores.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-medium">{p.nombre}</TableCell>
            <TableCell>
              <Badge
                variant={p.tipoProveedor === "CONSIGNACION" ? "default" : "secondary"}
              >
                {p.tipoProveedor === "CONSIGNACION" ? "Consignación" : "Regular"}
              </Badge>
            </TableCell>
            <TableCell>
              {p.telefono || p.email || "—"}
            </TableCell>
            <TableCell>{p._count.productos}</TableCell>
            <TableCell>
              <Link href={`/proveedores/${p.id}`}>
                <Button variant="ghost" size="sm">
                  Ver / Editar
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
