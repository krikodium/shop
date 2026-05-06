"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ProveedorForm } from "@/components/forms/ProveedorForm";
import { Button } from "@/components/ui/button";
import type { ProveedorFormValues } from "@/lib/validaciones/proveedorSchema";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

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
      toast.error(
        e instanceof Error ? e.message : "Error al crear proveedor"
      );
      setSubmitPhase("idle");
    }
  };

  const busy = submitPhase !== "idle";

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 sm:px-6">
      <div className="flex justify-center sm:justify-start">
        <Link href="/proveedores">
          <Button variant="ghost" className="gap-2" type="button">
            <ArrowLeft className="h-4 w-4" />
            Proveedores
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo proveedor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cargá los datos básicos; después podés asociar productos y ver métricas
          en la ficha.
        </p>
      </div>

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
