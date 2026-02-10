"use client";

import { useRouter } from "next/navigation";
import { ProveedorForm } from "@/components/forms/ProveedorForm";
import type { ProveedorFormValues } from "@/lib/validaciones/proveedorSchema";

export default function NuevoProveedorPage() {
  const router = useRouter();

  const handleSubmit = async (data: ProveedorFormValues) => {
    const res = await fetch("/api/proveedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Error al crear proveedor");
    }
    const proveedor = await res.json();
    router.push(`/proveedores/${proveedor.id}`);
    router.refresh();
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Nuevo proveedor</h1>
      <ProveedorForm onSubmit={handleSubmit} />
    </div>
  );
}
