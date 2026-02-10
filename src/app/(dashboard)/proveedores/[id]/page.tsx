"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProveedorForm, proveedorToFormValues } from "@/components/forms/ProveedorForm";
import type { ProveedorFormValues } from "@/lib/validaciones/proveedorSchema";
import type { Proveedor } from "@prisma/client";

export default function ProveedorDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [proveedor, setProveedor] = useState<Proveedor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/proveedores/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("No encontrado");
        return res.json();
      })
      .then(setProveedor)
      .catch(() => setProveedor(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: ProveedorFormValues) => {
    const res = await fetch(`/api/proveedores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Error al actualizar");
    }
    const updated = await res.json();
    setProveedor(updated);
    router.refresh();
  };

  if (loading) return <p className="text-muted-foreground">Cargando…</p>;
  if (!proveedor) {
    return (
      <div className="space-y-4">
        <p>Proveedor no encontrado.</p>
        <Link href="/proveedores">
          <Button variant="outline">Volver a proveedores</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/proveedores">
          <Button variant="ghost">← Proveedores</Button>
        </Link>
      </div>
      <h1 className="text-2xl font-bold">{proveedor.nombre}</h1>
      <ProveedorForm
        defaultValues={proveedorToFormValues(proveedor)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
