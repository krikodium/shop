"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Resumen } from "@/components/ui/resumen";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ProductoForm,
  productoToFormValues,
} from "@/components/forms/ProductoForm";
import { claseTonoCifra, tonoStock } from "@/components/productos/stock";
import { ProductoFormSkeleton } from "@/components/productos/ProductoFormSkeleton";
import { formatARS } from "@/lib/formatCurrency";
import { notificar } from "@/lib/notificar";
import type { ProductoFormValues } from "@/lib/validaciones/productoSchema";
import type {
  Categoria,
  Proveedor,
  Producto,
  ProductoParteProveedor,
} from "@prisma/client";

interface ProductoConRelaciones extends Producto {
  categoria: Categoria | null;
  proveedor: Proveedor | null;
  partesProveedor: (ProductoParteProveedor & { proveedor: Proveedor })[];
}

function VolverAProductos() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
      <Link href="/productos">← Productos</Link>
    </Button>
  );
}

function ProductoEditSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-8 w-28 rounded-md animate-skeleton-shimmer" />
      <div className="space-y-2 border-b pb-5">
        <Skeleton className="h-3 w-40 animate-skeleton-shimmer" />
        <Skeleton className="h-8 w-3/4 animate-skeleton-shimmer" />
        <Skeleton className="h-4 w-32 animate-skeleton-shimmer" />
      </div>
      <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card px-4 py-3.5">
            <Skeleton className="h-3 w-20 animate-skeleton-shimmer" />
            <Skeleton className="mt-2.5 h-6 w-28 animate-skeleton-shimmer" />
          </div>
        ))}
      </div>
      <ProductoFormSkeleton />
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

  // Si falla, lanza: el formulario muestra el error con `notificar`.
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
    notificar.ok("Producto actualizado");
    router.refresh();
  };

  if (loading) return <ProductoEditSkeleton />;

  if (!producto) {
    return (
      <div className="space-y-6">
        <VolverAProductos />
        <EmptyState
          icono={Package}
          titulo="Producto no encontrado"
          descripcion="El producto que buscás no existe o fue eliminado."
          accion={
            <Button asChild variant="outline" size="sm">
              <Link href="/productos">Volver a productos</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const tono = tonoStock(producto.stockActual, producto.stockMinimo);
  const precioVenta = Number(producto.precioVenta);
  const precioCompra = producto.precioCompra != null ? Number(producto.precioCompra) : null;
  const partes = producto.partesProveedor ?? [];
  const proveedoresEnDesglose = new Set(partes.map((p) => p.proveedorId)).size;

  return (
    <div className="space-y-6">
      <VolverAProductos />

      <PageHeader
        overline="Mercadería · Productos"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {producto.nombre}
            {producto.enConsignacion && <Badge variant="outline">Consignación</Badge>}
            {!producto.activo && <Badge variant="outline">Inactivo</Badge>}
          </span>
        }
        description={
          <>
            <span className="font-mono">{producto.sku}</span>
            {" · "}
            {producto.categoria?.nombre ?? "Sin categoría"}
          </>
        }
      />

      <Resumen
        items={[
          { label: "P. venta", valor: formatARS(precioVenta) },
          {
            label: "P. compra",
            valor: precioCompra != null ? formatARS(precioCompra) : "—",
          },
          {
            label: "Stock",
            valor: <span className={claseTonoCifra[tono]}>{producto.stockActual}</span>,
            hint:
              tono === "negativo"
                ? "Sin stock"
                : producto.stockMinimo > 0
                  ? `mín. ${producto.stockMinimo}${tono === "alerta" ? " · en o bajo el mínimo" : ""}`
                  : undefined,
          },
          {
            label: "Proveedor",
            valor: (
              <span className="block truncate font-sans text-base">
                {producto.proveedor?.nombre ?? "Sin definir"}
              </span>
            ),
            hint: `${partes.length} ${partes.length === 1 ? "parte" : "partes"} · ${proveedoresEnDesglose} en desglose`,
          },
        ]}
      />

      <ProductoForm
        defaultValues={productoToFormValues(producto)}
        categorias={categorias}
        proveedores={proveedores}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
