"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ClienteForm } from "@/components/forms/ClienteForm";
import { notificar } from "@/lib/notificar";
import type { ClienteFormValues } from "@/lib/validaciones/clienteSchema";

export default function NuevoClientePage() {
  const router = useRouter();

  // El error se tira con su mensaje y el formulario lo avisa (notificar.error).
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
    notificar.ok("Cliente creado correctamente");
    router.push(`/clientes/${cliente.id}`);
    router.refresh();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/clientes">← Clientes</Link>
      </Button>
      <PageHeader
        overline="Operación · Clientes"
        title="Nuevo cliente"
        description="Nombre y teléfono alcanzan para empezar."
      />
      <ClienteForm onSubmit={handleSubmit} variant="quick" />
    </div>
  );
}
