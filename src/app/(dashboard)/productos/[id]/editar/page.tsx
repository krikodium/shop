"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ProductoForm,
  productoToFormValues,
} from "@/components/forms/ProductoForm";
import type { ProductoFormValues } from "@/lib/validaciones/productoSchema";
import type {
  Categoria,
  Proveedor,
  Producto,
  ProductoParteProveedor,
} from "@prisma/client";
import { Package, ArrowLeft, AlertTriangle } from "lucide-react";

interface ProductoConRelaciones extends Producto {
  categoria: Categoria | null;
  proveedor: Proveedor | null;
  partesProveedor: (ProductoParteProveedor & { proveedor: Proveedor })[];
}

function ProductoEditSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 animate-in fade-in duration-300 sm:px-6">
      <div className="flex justify-center sm:justify-start">
        <Skeleton className="h-10 w-24 rounded-md animate-skeleton-shimmer" />
      </div>

      {/* Header skeleton */}
      <div className="flex gap-6">
        <Skeleton className="h-32 w-32 shrink-0 rounded-xl animate-skeleton-shimmer" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-3/4 animate-skeleton-shimmer" />
          <Skeleton className="h-5 w-1/3 animate-skeleton-shimmer" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full animate-skeleton-shimmer" />
            <Skeleton className="h-6 w-20 rounded-full animate-skeleton-shimmer" />
          </div>
        </div>
      </div>

      {/* Form skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 animate-skeleton-shimmer" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16 animate-skeleton-shimmer" />
              <Skeleton className="h-10 w-full animate-skeleton-shimmer" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 animate-skeleton-shimmer" />
              <Skeleton className="h-10 w-full animate-skeleton-shimmer" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 animate-skeleton-shimmer" />
            <Skeleton className="h-24 w-full animate-skeleton-shimmer" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 animate-skeleton-shimmer" />
              <Skeleton className="h-10 w-full animate-skeleton-shimmer" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 animate-skeleton-shimmer" />
              <Skeleton className="h-10 w-full animate-skeleton-shimmer" />
            </div>
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24 animate-skeleton-shimmer" />
            <Skeleton className="h-10 w-28 animate-skeleton-shimmer" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EditarProductoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [producto, setProducto] = useState<ProductoConRelaciones | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/productos/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/categorias").then((r) => r.json()),
      fetch("/api/proveedores").then((r) => r.json()),
    ])
      .then(([prod, cats, provs]) => {
        setProducto(prod);
        setCategorias(Array.isArray(cats) ? cats : []);
        setProveedores(Array.isArray(provs) ? provs : []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: ProductoFormValues) => {
    const res = await fetch(`/api/productos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Error al actualizar");
    }
    const updated = await res.json();
    setProducto(updated);
    router.refresh();
  };

  if (loading) return <ProductoEditSkeleton />;

  if (!producto) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 animate-in fade-in duration-300 sm:px-6">
        <div className="flex justify-center sm:justify-start">
          <Link href="/productos">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Productos
            </Button>
          </Link>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Producto no encontrado</p>
            <p className="text-sm text-muted-foreground mb-6">
              El producto que buscás no existe o fue eliminado.
            </p>
            <Link href="/productos">
              <Button variant="outline">Volver a productos</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bajoStock = producto.stockActual <= producto.stockMinimo;
  const precioVenta = Number(producto.precioVenta);
  const precioCompra = producto.precioCompra != null ? Number(producto.precioCompra) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 sm:px-6">
      <div className="flex justify-center sm:justify-start">
        <Link href="/productos">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Productos
          </Button>
        </Link>
      </div>

      {/* Header con imagen y datos clave */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-xl border bg-muted">
          {producto.imagenUrl ? (
            <img
              src={producto.imagenUrl}
              alt={producto.nombre}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/50" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight">{producto.nombre}</h1>
          <p className="text-sm text-muted-foreground font-mono">{producto.sku}</p>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <Badge variant="secondary">{producto.categoria?.nombre ?? "Sin categoría"}</Badge>
            {producto.enConsignacion && (
              <Badge variant="outline">Consignación</Badge>
            )}
            {!producto.activo && (
              <Badge variant="destructive">Inactivo</Badge>
            )}
            {bajoStock && (
              <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Stock bajo
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-4 pt-2 text-sm sm:justify-start">
            <div>
              <span className="text-muted-foreground">P. venta:</span>{" "}
              <span className="font-semibold tabular-nums">
                ${precioVenta.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {precioCompra != null && (
              <div>
                <span className="text-muted-foreground">P. compra:</span>{" "}
                <span className="tabular-nums">
                  ${precioCompra.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Stock:</span>{" "}
              <span className={bajoStock ? "font-semibold text-amber-600" : "tabular-nums"}>
                {producto.stockActual}
              </span>
              {producto.stockMinimo > 0 && (
                <span className="text-muted-foreground"> / mín. {producto.stockMinimo}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de edición */}
      <Card>
        <CardHeader>
          <CardTitle>Editar datos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Modificá los campos que necesites y guardá los cambios.
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <p className="text-muted-foreground">Partes cargadas</p>
              <p className="font-semibold tabular-nums">{producto.partesProveedor?.length ?? 0}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <p className="text-muted-foreground">Proveedores en desglose</p>
              <p className="font-semibold tabular-nums">
                {new Set((producto.partesProveedor ?? []).map((p) => p.proveedorId)).size}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <p className="text-muted-foreground">Proveedor principal</p>
              <p className="font-semibold truncate">{producto.proveedor?.nombre ?? "Sin definir"}</p>
            </div>
          </div>
          <ProductoForm
            defaultValues={productoToFormValues(producto)}
            categorias={categorias}
            proveedores={proveedores}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
