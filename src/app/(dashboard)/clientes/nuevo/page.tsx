"use client";

import { useRouter } from "next/navigation";
import { ClienteForm } from "@/components/forms/ClienteForm";
import type { ClienteFormValues } from "@/lib/validaciones/clienteSchema";

export default function NuevoClientePage() {
  const router = useRouter();

  const handleSubmit = async (data: ClienteFormValues) => {
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Error al crear cliente");
    }
    const cliente = await res.json();
    router.push(`/clientes/${cliente.id}`);
    router.refresh();
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Nuevo cliente</h1>
      <ClienteForm onSubmit={handleSubmit} />
    </div>
  );
}
