"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  Eye,
  ImageOff,
  Minus,
  Package,
  Pencil,
  Plus,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Figure, FigureGrid } from "@/components/ui/figure";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatARS, formatUSD } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";
import { claseTonoCifra, tonoStock } from "@/components/productos/stock";
import { calcularMargen } from "@/components/productos/producto-form-utils";
import { notificar } from "@/lib/notificar";
import { useAsyncAction } from "@/hooks/use-async-action";
import type { Producto, Categoria, Proveedor } from "@prisma/client";

interface ProductoConRelaciones extends Producto {
  categoria: Categoria | null;
  proveedor: Proveedor | null;
}

interface ProductosTableProps {
  queryParams?: string;
  monedaFiltro?: "ALL" | "ARS" | "USD";
  disponibilidadFiltro?: "ALL" | "CON_STOCK" | "SIN_STOCK" | "BAJO";
  onRefresh?: () => void;
  /** Barra compacta de filtros: una fila entre el encabezado del panel y la tabla. */
  filtros?: ReactNode;
}

type OrdenCampo = "nombre" | "sku" | "precio" | "stock";

function esUsd(p: Producto): boolean {
  return p.precioVentaUsd != null && Number(p.precioVentaUsd) > 0;
}

function precioMostrado(p: Producto): string {
  if (esUsd(p)) {
    return formatUSD(p.precioVentaUsd!.toString());
  }
  if (Number(p.precioVenta) > 0) {
    return formatARS(p.precioVenta.toString());
  }
  return "Sin precio";
}

function costoMostrado(p: Producto): string {
  if (p.precioCompraUsd != null && Number(p.precioCompraUsd) > 0) {
    return formatUSD(p.precioCompraUsd.toString());
  }
  if (p.precioCompra != null && Number(p.precioCompra) > 0) {
    return formatARS(p.precioCompra.toString());
  }
  return "—";
}

function margenProducto(p: Producto) {
  if (esUsd(p) && p.precioCompraUsd != null) {
    return calcularMargen(Number(p.precioCompraUsd), Number(p.precioVentaUsd));
  }
  if (!esUsd(p) && p.precioCompra != null) {
    return calcularMargen(Number(p.precioCompra), Number(p.precioVenta));
  }
  return null;
}

function FilasEsqueleto({ filas = 8 }: { filas?: number }) {
  return (
    <Table aria-busy="true" aria-label="Cargando productos">
      <TableHeader>
        <TableRow>
          <TableHead className="w-14">
            <span className="sr-only">Foto</span>
          </TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Producto</TableHead>
          <TableHead>Categoría / Proveedor</TableHead>
          <TableHead className="text-right">Costo / Margen</TableHead>
          <TableHead className="text-right">P. venta</TableHead>
          <TableHead className="text-right">Stock</TableHead>
          <TableHead>Régimen</TableHead>
          <TableHead className="w-[120px] text-right">
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: filas }).map((_, i) => (
          <TableRow key={i} className="hover:bg-transparent">
            <TableCell>
              <div className="size-10 animate-skeleton-shimmer rounded-md" />
            </TableCell>
            {Array.from({ length: 8 }).map((__, j) => (
              <TableCell key={j}>
                <div
                  className={cn(
                    "h-4 animate-skeleton-shimmer rounded",
                    j === 1 ? "w-40" : "w-16",
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

export function ProductosTable({
  queryParams = "",
  monedaFiltro = "ALL",
  disponibilidadFiltro = "ALL",
  filtros,
}: ProductosTableProps) {
  const [productos, setProductos] = useState<ProductoConRelaciones[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordenCampo, setOrdenCampo] = useState<OrdenCampo>("nombre");
  const [ordenDir, setOrdenDir] = useState<"asc" | "desc">("asc");
  const [fichaProducto, setFichaProducto] =
    useState<ProductoConRelaciones | null>(null);
  const [nuevoStock, setNuevoStock] = useState<number>(0);

  const cargar = useCallback(() => {
    setLoading(true);
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

  useEffect(() => {
    cargar();
  }, [cargar]);

  const productosFiltrados = useMemo(() => {
    const filtrados = productos.filter((p) => {
      if (monedaFiltro === "USD" && !esUsd(p)) return false;
      if (monedaFiltro === "ARS" && (esUsd(p) || Number(p.precioVenta) <= 0))
        return false;
      if (disponibilidadFiltro === "CON_STOCK" && p.stockActual <= 0)
        return false;
      if (disponibilidadFiltro === "SIN_STOCK" && p.stockActual > 0)
        return false;
      if (
        disponibilidadFiltro === "BAJO" &&
        !(p.stockActual > 0 && p.stockActual <= Math.max(1, p.stockMinimo))
      )
        return false;
      return true;
    });

    return [...filtrados].sort((a, b) => {
      const mult = ordenDir === "asc" ? 1 : -1;
      if (ordenCampo === "sku") {
        return a.sku.localeCompare(b.sku) * mult;
      }
      if (ordenCampo === "stock") {
        return (a.stockActual - b.stockActual) * mult;
      }
      if (ordenCampo === "precio") {
        const pa = esUsd(a) ? Number(a.precioVentaUsd) : Number(a.precioVenta);
        const pb = esUsd(b) ? Number(b.precioVentaUsd) : Number(b.precioVenta);
        return (pa - pb) * mult;
      }
      return a.nombre.localeCompare(b.nombre) * mult;
    });
  }, [productos, monedaFiltro, disponibilidadFiltro, ordenCampo, ordenDir]);

  const metricas = useMemo(() => {
    let activos = 0;
    let conStock = 0;
    let sinStock = 0;
    let unidadesFisicas = 0;
    let enArs = 0;
    let enUsd = 0;
    let consignacion = 0;

    for (const p of productosFiltrados) {
      if (p.activo) activos += 1;
      if (p.stockActual > 0) {
        conStock += 1;
        unidadesFisicas += p.stockActual;
      } else {
        sinStock += 1;
      }
      if (esUsd(p)) enUsd += 1;
      else if (Number(p.precioVenta) > 0) enArs += 1;
      if (p.enConsignacion) consignacion += 1;
    }

    return {
      total: productosFiltrados.length,
      activos,
      conStock,
      sinStock,
      unidadesFisicas,
      enArs,
      enUsd,
      consignacion,
      propios: productosFiltrados.length - consignacion,
    };
  }, [productosFiltrados]);

  const alternarOrden = (campo: OrdenCampo) => {
    if (ordenCampo === campo) {
      setOrdenDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setOrdenCampo(campo);
      setOrdenDir(campo === "stock" || campo === "precio" ? "desc" : "asc");
    }
  };

  const abrirFicha = (p: ProductoConRelaciones) => {
    setFichaProducto(p);
    setNuevoStock(p.stockActual);
  };

  const { run: guardarStockRapido, loading: guardandoStock } = useAsyncAction(
    async () => {
      if (!fichaProducto) return;
      try {
        const res = await fetch(`/api/productos/${fichaProducto.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku: fichaProducto.sku,
            nombre: fichaProducto.nombre,
            descripcion: fichaProducto.descripcion ?? "",
            categoriaId: fichaProducto.categoriaId,
            precioCompra:
              fichaProducto.precioCompra != null
                ? Number(fichaProducto.precioCompra)
                : null,
            precioVenta: Number(fichaProducto.precioVenta),
            precioCompraUsd:
              fichaProducto.precioCompraUsd != null
                ? Number(fichaProducto.precioCompraUsd)
                : null,
            precioVentaUsd:
              fichaProducto.precioVentaUsd != null
                ? Number(fichaProducto.precioVentaUsd)
                : null,
            enConsignacion: fichaProducto.enConsignacion,
            comisionConsignacion:
              fichaProducto.comisionConsignacion != null
                ? Number(fichaProducto.comisionConsignacion)
                : null,
            stockActual: Math.max(0, Math.trunc(nuevoStock)),
            stockMinimo: fichaProducto.stockMinimo,
            proveedorId: fichaProducto.proveedorId,
            imagenUrl: fichaProducto.imagenUrl ?? "",
            activo: fichaProducto.activo,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "No se pudo actualizar el stock");
        }
        const actualizado = (await res.json()) as ProductoConRelaciones;
        setProductos((prev) =>
          prev.map((item) =>
            item.id === actualizado.id ? actualizado : item,
          ),
        );
        setFichaProducto(actualizado);
        notificar.ok("Stock actualizado");
      } catch (e) {
        notificar.error(
          e instanceof Error ? e.message : "Error al actualizar stock",
        );
      }
    },
  );

  return (
    <div className="space-y-5">
      {!loading && (
        <FigureGrid columnas={4}>
          <Figure
            label="Productos en vista"
            valor={metricas.total}
            hint={`${metricas.activos} activos en línea`}
          />
          <Figure
            label="Con stock en salón"
            valor={metricas.conStock}
            tono={metricas.conStock > 0 ? "positivo" : "neutro"}
            hint={`${metricas.unidadesFisicas} unidades físicas disponibles`}
          />
          <Figure
            label="Sin stock / Por encargo"
            valor={metricas.sinStock}
            hint="Disponibles para pedir a medida en Pedidos"
          />
          <Figure
            label="Moneda y régimen"
            valor={`${metricas.enArs} ARS · ${metricas.enUsd} USD`}
            hint={`${metricas.propios} propios · ${metricas.consignacion} consignación`}
          />
        </FigureGrid>
      )}

      <Panel>
        <PanelHeader
          title="Inventario general"
          descripcion={
            loading
              ? undefined
              : `${productosFiltrados.length} ${productosFiltrados.length === 1 ? "producto" : "productos"} en el listado`
          }
        />
        {filtros && (
          <div className="border-b border-border px-4 py-3 sm:px-5">
            {filtros}
          </div>
        )}
        {loading ? (
          <FilasEsqueleto />
        ) : productosFiltrados.length === 0 ? (
          <PanelBody>
            <EmptyState
              icono={Package}
              titulo="No hay productos para mostrar"
              descripcion="Ajustá los filtros de búsqueda o cargá un producto nuevo."
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
                <TableHead>
                  <button
                    type="button"
                    onClick={() => alternarOrden("sku")}
                    className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                  >
                    SKU
                    <ArrowUpDown className="size-3 opacity-60" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => alternarOrden("nombre")}
                    className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                  >
                    Producto
                    <ArrowUpDown className="size-3 opacity-60" />
                  </button>
                </TableHead>
                <TableHead>Categoría / Proveedor</TableHead>
                <TableHead className="text-right">Costo / Margen</TableHead>
                <TableHead className="text-right">
                  <button
                    type="button"
                    onClick={() => alternarOrden("precio")}
                    className="ml-auto inline-flex items-center gap-1 font-medium hover:text-foreground"
                  >
                    P. venta
                    <ArrowUpDown className="size-3 opacity-60" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    type="button"
                    onClick={() => alternarOrden("stock")}
                    className="ml-auto inline-flex items-center gap-1 font-medium hover:text-foreground"
                  >
                    Stock
                    <ArrowUpDown className="size-3 opacity-60" />
                  </button>
                </TableHead>
                <TableHead>Régimen</TableHead>
                <TableHead className="w-[120px] text-right">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productosFiltrados.map((p) => {
                const tono = tonoStock(p.stockActual, p.stockMinimo);
                const m = margenProducto(p);
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
                          className="flex size-10 items-center justify-center rounded-md border border-border bg-secondary/30"
                          title="Sin foto"
                        >
                          <ImageOff
                            className="size-3.5 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="w-[115px] font-mono text-xs tabular-nums text-muted-foreground">
                      {p.sku}
                    </TableCell>
                    <TableCell className="min-w-[220px] max-w-[320px] whitespace-normal">
                      <div className="flex flex-wrap items-start gap-1.5">
                        <span
                          className="line-clamp-2 font-medium leading-snug text-foreground break-words"
                          title={p.nombre}
                        >
                          {p.nombre}
                        </span>
                        {!p.activo && (
                          <Badge variant="secondary" className="shrink-0">
                            Inactivo
                          </Badge>
                        )}
                      </div>
                      {p.descripcion && (
                        <p
                          className="mt-0.5 truncate text-xs text-muted-foreground"
                          title={p.descripcion}
                        >
                          {p.descripcion}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[150px] max-w-[210px]">
                      <span
                        className="block truncate text-sm text-foreground"
                        title={p.categoria?.nombre ?? "Sin categoría"}
                      >
                        {p.categoria?.nombre ?? "Sin categoría"}
                      </span>
                      <span
                        className="block truncate text-xs text-muted-foreground"
                        title={p.proveedor?.nombre ?? "Sin proveedor"}
                      >
                        {p.proveedor?.nombre ?? "Sin proveedor"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      <span className="block text-muted-foreground">
                        {costoMostrado(p)}
                      </span>
                      {m && (
                        <span
                          className={cn(
                            "text-[11px]",
                            m.porcentaje >= 0
                              ? "text-num-positive"
                              : "text-num-negative",
                          )}
                        >
                          {m.porcentaje.toFixed(0)}% margen
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {esUsd(p) && (
                          <Badge
                            variant="outline"
                            className="px-1.5 py-0 font-mono text-[10px]"
                          >
                            USD
                          </Badge>
                        )}
                        <span className="font-semibold text-foreground">
                          {precioMostrado(p)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono tabular-nums",
                        claseTonoCifra[tono],
                        tono !== "neutro" && "font-semibold",
                      )}
                    >
                      <span className="block">{p.stockActual}</span>
                      <span className="block font-sans text-[10px] font-normal text-muted-foreground">
                        {p.stockActual > 0 ? "en salón" : "encargo"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {p.enConsignacion ? "Consignación" : "Propio"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title="Ficha rápida y stock"
                          aria-label={`Ver ficha de ${p.nombre}`}
                          onClick={() => abrirFicha(p)}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/productos/${p.id}/editar`}>
                            <Pencil className="size-3.5" />
                            Editar
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>

      {/* Modal de Ficha Rápida y Ajuste de Stock */}
      <Dialog
        open={fichaProducto != null}
        onOpenChange={(abierto) => {
          if (!abierto && !guardandoStock) setFichaProducto(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {fichaProducto && (
            <>
              <DialogHeader>
                <DialogTitle>{fichaProducto.nombre}</DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {fichaProducto.sku} ·{" "}
                  {fichaProducto.categoria?.nombre ?? "Sin categoría"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {fichaProducto.descripcion && (
                  <p className="rounded-md bg-secondary/40 p-3 text-xs text-muted-foreground">
                    {fichaProducto.descripcion}
                  </p>
                )}

                <dl className="divide-y divide-border rounded-md border border-border px-3.5 py-1 text-sm">
                  <div className="flex justify-between py-2">
                    <dt className="text-muted-foreground">Precio de venta</dt>
                    <dd className="font-mono font-semibold">
                      {precioMostrado(fichaProducto)}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-muted-foreground">Costo registrado</dt>
                    <dd className="font-mono">{costoMostrado(fichaProducto)}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-muted-foreground">Proveedor</dt>
                    <dd>{fichaProducto.proveedor?.nombre ?? "Sin definir"}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-muted-foreground">Régimen</dt>
                    <dd>
                      {fichaProducto.enConsignacion ? "Consignación" : "Propio"}
                    </dd>
                  </div>
                </dl>

                <div className="space-y-2 rounded-md border border-border bg-secondary/30 p-3.5">
                  <Label htmlFor="stock-rapido">
                    Ajuste rápido de stock físico en salón
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      disabled={guardandoStock || nuevoStock <= 0}
                      onClick={() =>
                        setNuevoStock((s) => Math.max(0, s - 1))
                      }
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <Input
                      id="stock-rapido"
                      type="number"
                      min={0}
                      step={1}
                      className="h-9 w-24 text-center font-mono"
                      value={nuevoStock}
                      disabled={guardandoStock}
                      onChange={(e) =>
                        setNuevoStock(Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      disabled={guardandoStock}
                      onClick={() => setNuevoStock((s) => s + 1)}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="ml-auto"
                      disabled={nuevoStock === fichaProducto.stockActual}
                      loading={guardandoStock}
                      loadingText="Guardando…"
                      onClick={() => void guardarStockRapido()}
                    >
                      Guardar stock
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFichaProducto(null)}
                  >
                    Cerrar
                  </Button>
                  <Button asChild>
                    <Link href={`/productos/${fichaProducto.id}/editar`}>
                      Editar ficha completa
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
