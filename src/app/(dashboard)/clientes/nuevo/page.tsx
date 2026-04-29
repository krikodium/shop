"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
      const msg = err.error ?? "Error al crear cliente";
      toast.error(msg);
      throw new Error(msg);
    }
    const cliente = await res.json();
    toast.success("Cliente creado correctamente");
    router.push(`/clientes/${cliente.id}`);
    router.refresh();
  };

  return (
    <div className="max-w-lg space-y-4 md:space-y-6">
      <h1 className="text-xl font-bold md:text-2xl">Nuevo cliente</h1>
      <p className="text-sm text-muted-foreground">Nombre y teléfono. El resto es opcional.</p>
      <ClienteForm onSubmit={handleSubmit} variant="quick" />
    </div>
  );
}
