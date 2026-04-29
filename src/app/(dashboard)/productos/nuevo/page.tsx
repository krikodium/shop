"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductoForm, productoToFormValues } from "@/components/forms/ProductoForm";
import type { ProductoFormValues } from "@/lib/validaciones/productoSchema";
import type { Categoria, Proveedor } from "@prisma/client";

export default function NuevoProductoPage() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/categorias").then((r) => r.json()),
      fetch("/api/proveedores").then((r) => r.json()),
    ])
      .then(([cats, provs]) => {
        setCategorias(Array.isArray(cats) ? cats : []);
        setProveedores(Array.isArray(provs) ? provs : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (data: ProductoFormValues) => {
    const res = await fetch("/api/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Error al crear producto");
    }
    const producto = await res.json();
    router.push(`/productos/${producto.id}/editar`);
    router.refresh();
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6 animate-in fade-in duration-300">
        <div className="h-8 w-48 animate-skeleton-shimmer rounded" />
        <div className="h-96 animate-skeleton-shimmer rounded-lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo producto</h1>
        <p className="mt-1 text-sm text-muted-foreground">Crear un nuevo producto en el catálogo</p>
      </div>
      <ProductoForm
        categorias={categorias}
        proveedores={proveedores}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
