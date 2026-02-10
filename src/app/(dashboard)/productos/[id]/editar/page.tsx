"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ProductoForm,
  productoToFormValues,
} from "@/components/forms/ProductoForm";
import type { ProductoFormValues } from "@/lib/validaciones/productoSchema";
import type { Categoria, Proveedor, Producto } from "@prisma/client";

interface ProductoConRelaciones extends Producto {
  categoria: Categoria | null;
  proveedor: Proveedor | null;
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

  if (loading) return <p className="text-muted-foreground">Cargando…</p>;
  if (!producto) {
    return (
      <div className="space-y-4">
        <p>Producto no encontrado.</p>
        <Link href="/productos">
          <Button variant="outline">Volver a productos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/productos">
          <Button variant="ghost">← Productos</Button>
        </Link>
      </div>
      <h1 className="text-2xl font-bold">Editar: {producto.nombre}</h1>
      <ProductoForm
        defaultValues={productoToFormValues(producto)}
        categorias={categorias}
        proveedores={proveedores}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
