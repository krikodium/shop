"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ProveedorForm } from "@/components/forms/ProveedorForm";
import { Button } from "@/components/ui/button";
import type { ProveedorFormValues } from "@/lib/validaciones/proveedorSchema";
import { PageHeader } from "@/components/ui/page-header";
import { notificar } from "@/lib/notificar";

type SubmitPhase = "idle" | "sending" | "redirecting";

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
      return "Creando proveedor…";
    case "redirecting":
      return "Abriendo la ficha del proveedor…";
    default:
      return "";
  }
}

export function NuevoProveedorCliente() {
  const router = useRouter();
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");

  const handleSubmit = async (data: ProveedorFormValues) => {
    setSubmitPhase("sending");
    try {
      const res = await fetch("/api/proveedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.error === "string" ? err.error : "Error al crear proveedor"
        );
      }
      const proveedor = await res.json();
      setSubmitPhase("redirecting");
      await new Promise((r) => setTimeout(r, 280));
      router.push(`/proveedores/${proveedor.id}`);
      router.refresh();
    } catch (e) {
      notificar.error(e instanceof Error ? e.message : "Error al crear proveedor");
      setSubmitPhase("idle");
    }
  };

  const busy = submitPhase !== "idle";

  return (
    <div className="max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/proveedores">← Proveedores</Link>
      </Button>

      <PageHeader
        overline="Mercadería · Proveedores"
        title="Nuevo proveedor"
        description="Cargá los datos básicos; después podés asociarle productos y ver sus métricas en la ficha."
      />

      <ProveedorForm
        onSubmit={handleSubmit}
        isLoading={busy}
        submitActionLabel="Crear proveedor"
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
