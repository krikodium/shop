"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ProductoForm } from "@/components/forms/ProductoForm";
import { Button } from "@/components/ui/button";
import type { ProductoFormValues } from "@/lib/validaciones/productoSchema";
import type { Categoria, Proveedor } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

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
      toast.error(e instanceof Error ? e.message : "Error al crear producto");
      setSubmitPhase("idle");
    }
  };

  const busy = submitPhase !== "idle";

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 sm:px-6">
      <div className="flex justify-center sm:justify-start">
        <Link href="/productos">
          <Button variant="ghost" className="gap-2" type="button">
            <ArrowLeft className="h-4 w-4" />
            Productos
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo producto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cargá los datos del ítem; podés completar partes y detalles después
          desde la ficha.
        </p>
      </div>

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
