"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ProductoForm } from "@/components/forms/ProductoForm";
import { Button } from "@/components/ui/button";
import type { ProductoFormValues } from "@/lib/validaciones/productoSchema";
import type { Categoria, Proveedor } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { notificar } from "@/lib/notificar";

export type SubmitPhase = "idle" | "sending" | "redirecting";

function phaseToProgress(phase: SubmitPhase): number {
  switch (phase) {
    case "sending":
      return 42;
    case "redirecting":
      return 92;
    default:
      return 0;
  }
}

function phaseMessage(phase: SubmitPhase): string {
  switch (phase) {
    case "sending":
      return "Creando producto en el catálogo…";
    case "redirecting":
      return "Abriendo la ficha para seguir editando…";
    default:
      return "";
  }
}

interface NuevoProductoClienteProps {
  categorias: Categoria[];
  proveedores: Proveedor[];
}

export function NuevoProductoCliente({
  categorias,
  proveedores,
}: NuevoProductoClienteProps) {
  const router = useRouter();
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");

  const handleSubmit = async (data: ProductoFormValues) => {
    setSubmitPhase("sending");
    try {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.error === "string" ? err.error : "Error al crear producto"
        );
      }
      const producto = await res.json();
      setSubmitPhase("redirecting");
      await new Promise((r) => setTimeout(r, 280));
      router.push(`/productos/${producto.id}/editar`);
      router.refresh();
    } catch (e) {
      notificar.error(e instanceof Error ? e.message : "Error al crear producto");
      setSubmitPhase("idle");
    }
  };

  const busy = submitPhase !== "idle";

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/productos">← Productos</Link>
      </Button>

      <PageHeader
        overline="Mercadería · Productos"
        title="Nuevo producto"
        description="Cargá los datos del ítem; las partes y los detalles se pueden completar después desde la ficha."
      />

      <ProductoForm
        categorias={categorias}
        proveedores={proveedores}
        onSubmit={handleSubmit}
        isLoading={busy}
        submitActionLabel="Crear producto"
        submitStatus={
          busy
            ? {
                progress: phaseToProgress(submitPhase),
                message: phaseMessage(submitPhase),
              }
            : null
        }
      />
    </div>
  );
}
