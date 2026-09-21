"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ImageOff, Package } from "lucide-react";
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
import { formatARS } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";
import { claseTonoCifra, tonoStock } from "@/components/productos/stock";
import type { Producto, Categoria, Proveedor } from "@prisma/client";

interface ProductoConRelaciones extends Producto {
  categoria: Categoria | null;
  proveedor: Proveedor | null;
}

interface ProductosTableProps {
  queryParams?: string;
  onRefresh?: () => void;
  /** Barra compacta de filtros: una fila entre el encabezado del panel y la tabla. */
  filtros?: ReactNode;
}

const claseLinkFila =
  "rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function ProductosTable({ queryParams = "", filtros }: ProductosTableProps) {
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

  return (
    <Panel>
      <PanelHeader
        title="Inventario"
        descripcion={
          loading ? undefined : `${productos.length} ${productos.length === 1 ? "producto" : "productos"}`
        }
      />
      {filtros && (
        <div className="border-b border-border px-4 py-3 sm:px-5">{filtros}</div>
      )}
      {loading ? (
        <div className="divide-y divide-border" aria-busy="true" aria-label="Cargando productos">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 sm:px-5">
              <div className="size-10 shrink-0 animate-skeleton-shimmer rounded-md" />
              <div className="h-4 flex-1 animate-skeleton-shimmer rounded" />
              <div className="h-4 w-20 animate-skeleton-shimmer rounded" />
            </div>
          ))}
        </div>
      ) : productos.length === 0 ? (
        <PanelBody>
          <EmptyState
            icono={Package}
            titulo="No hay productos para mostrar"
            descripcion="Ajustá los filtros o cargá un producto nuevo."
            accion={
              <Button asChild size="sm">
                <Link href="/productos/nuevo">Nuevo producto</Link>
              </Button>
            }
          />
        </PanelBody>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">
                <span className="sr-only">Foto</span>
              </TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">P. venta</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-[80px]">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.map((p) => {
              const tono = tonoStock(p.stockActual, p.stockMinimo);
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.imagenUrl ? (
                      <img
                        src={p.imagenUrl}
                        alt=""
                        className="size-10 rounded-md object-cover"
                      />
                    ) : (
                      <div
                        className="flex size-10 items-center justify-center rounded-md border border-border"
                        title="Sin foto"
                      >
                        <ImageOff className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {p.sku}
                  </TableCell>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.categoria?.nombre ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatARS(Number(p.precioVenta))}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono tabular-nums",
                      claseTonoCifra[tono],
                      tono !== "neutro" && "font-semibold"
                    )}
                    title={
                      tono === "negativo"
                        ? "Sin stock"
                        : tono === "alerta"
                          ? `En o bajo el mínimo (${p.stockMinimo})`
                          : undefined
                    }
                  >
                    {p.stockActual}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {p.enConsignacion ? "Consignación" : "Regular"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/productos/${p.id}/editar`} className={claseLinkFila}>
                      Editar
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
