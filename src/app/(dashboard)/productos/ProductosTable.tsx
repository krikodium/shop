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

/** Encabezados reales de la tabla: el esqueleto y los datos usan la misma fila. */
const COLUMNAS = [
  { clave: "foto", etiqueta: "Foto", soloLectores: true, className: "w-14" },
  { clave: "sku", etiqueta: "SKU" },
  { clave: "nombre", etiqueta: "Nombre" },
  { clave: "categoria", etiqueta: "Categoría" },
  { clave: "precio", etiqueta: "P. venta", className: "text-right" },
  { clave: "stock", etiqueta: "Stock", className: "text-right" },
  { clave: "tipo", etiqueta: "Tipo" },
  { clave: "acciones", etiqueta: "Acciones", soloLectores: true, className: "w-[80px]" },
] as const;

function EncabezadoTabla() {
  return (
    <TableHeader>
      <TableRow>
        {COLUMNAS.map((c) => (
          <TableHead key={c.clave} className={"className" in c ? c.className : undefined}>
            {"soloLectores" in c && c.soloLectores ? (
              <span className="sr-only">{c.etiqueta}</span>
            ) : (
              c.etiqueta
            )}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

/**
 * Esqueleto con la forma real de la tabla: mismas columnas y alto de fila,
 * con la miniatura en la primera celda.
 */
function FilasEsqueleto({ filas = 8 }: { filas?: number }) {
  return (
    <Table aria-busy="true" aria-label="Cargando productos">
      <EncabezadoTabla />
      <TableBody>
        {Array.from({ length: filas }).map((_, i) => (
          <TableRow key={i} className="hover:bg-transparent">
            <TableCell>
              <div className="size-10 animate-skeleton-shimmer rounded-md" />
            </TableCell>
            {COLUMNAS.slice(1).map((c) => (
              <TableCell key={c.clave}>
                <div
                  className={cn(
                    "h-4 animate-skeleton-shimmer rounded",
                    c.clave === "nombre" ? "w-40" : "w-16",
                    "className" in c && c.className?.includes("text-right") && "ml-auto"
                  )}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

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
        <FilasEsqueleto />
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
          <EncabezadoTabla />
          <TableBody>
            {productos.map((p) => {
              const tono = tonoStock(p.stockActual, p.stockMinimo);
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.imagenUrl ? (
                      <img
                        src={p.imagenUrl}
                        alt={`Foto de ${p.nombre}`}
                        loading="lazy"
                        className="size-10 rounded-md object-cover"
                      />
                    ) : (
                      <div
                        role="img"
                        aria-label="Sin foto"
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
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/productos/${p.id}/editar`}>Editar</Link>
                    </Button>
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
