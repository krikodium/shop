"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useAsyncAction } from "@/hooks/use-async-action";
import { notificar } from "@/lib/notificar";
import { cn } from "@/lib/utils";

export interface CajaChicaPayload {
  id: string;
  userId: string;
  fechaApertura: string;
  fechaCierre: string | null;
  montoInicial: number;
  montoInicialUsd?: number | null;
  estado: string;
  movimientos: Array<{
    id: string;
    tipo: string;
    monto: number;
    moneda?: string;
    concepto: string | null;
    fecha: string;
  }>;
  user?: { id: string; name: string | null; email: string };
}

interface TransactionFormProps {
  cajaId: string;
  onSuccess: (caja: CajaChicaPayload) => void;
  /** Bloquea el alta mientras la página tiene otra acción de caja en vuelo. */
  saving?: boolean;
}

const claseSegmento = (activo: boolean) =>
  cn(
    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    activo
      ? "bg-background text-foreground shadow-xs"
      : "text-muted-foreground hover:text-foreground"
  );

export function TransactionForm({ cajaId, onSuccess, saving: externalSaving }: TransactionFormProps) {
  const [tipo, setTipo] = useState<"INGRESO" | "EGRESO">("EGRESO");
  const [monto, setMonto] = useState(0);
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const [concepto, setConcepto] = useState("");

  const conceptosRapidos =
    tipo === "EGRESO"
      ? ["Gasto - Delivery", "Gasto - Compras", "Gasto - Flete", "Gasto - Viáticos", "Gasto - Otros"]
      : ["Aporte a caja", "Ingreso - Venta", "Ingreso - Sobrante", "Ingreso - Otros"];

  const registrar = useAsyncAction(async () => {
    try {
      const res = await fetch("/api/caja-chica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "movimiento",
          cajaId,
          tipo,
          monto,
          moneda,
          concepto: concepto || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      const caja = data.caja as CajaChicaPayload | undefined;
      if (!caja) throw new Error("Respuesta inválida del servidor");

      setMonto(0);
      setConcepto("");
      onSuccess(caja);
      notificar.ok(tipo === "INGRESO" ? "Ingreso registrado" : "Egreso registrado");
    } catch (err) {
      notificar.error(err instanceof Error ? err.message : "Error al registrar movimiento");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (monto <= 0) {
      notificar.error("El monto debe ser mayor a 0");
      return;
    }
    void registrar.run();
  };

  return (
    <Panel>
      <PanelHeader
        title="Registrar movimiento"
        descripcion="Ingreso o egreso de efectivo en esta caja"
        acciones={
          <div
            role="group"
            aria-label="Tipo de movimiento"
            className="inline-flex rounded-lg border border-border bg-muted p-0.5"
          >
            <button
              type="button"
              aria-pressed={tipo === "INGRESO"}
              onClick={() => setTipo("INGRESO")}
              className={claseSegmento(tipo === "INGRESO")}
            >
              <ArrowDownLeft className="size-4" aria-hidden="true" />
              Ingreso
            </button>
            <button
              type="button"
              aria-pressed={tipo === "EGRESO"}
              onClick={() => setTipo("EGRESO")}
              className={claseSegmento(tipo === "EGRESO")}
            >
              <ArrowUpRight className="size-4" aria-hidden="true" />
              Egreso
            </button>
          </div>
        }
      />
      <PanelBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="mov-moneda" className="text-xs text-muted-foreground">
                Moneda
              </Label>
              <Select value={moneda} onValueChange={(v) => setMoneda(v as "ARS" | "USD")}>
                <SelectTrigger id="mov-moneda" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">Peso argentino (ARS)</SelectItem>
                  <SelectItem value="USD">Dólar (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Monto</Label>
              <CurrencyInput
                value={monto}
                onChange={(v) => setMonto(v ?? 0)}
                placeholder="0.00"
                className="h-10 font-mono tabular-nums"
              />
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="mov-concepto" className="text-xs text-muted-foreground">
                Concepto
              </Label>
              <Input
                id="mov-concepto"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Ej.: compra, viáticos…"
                className="h-10"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Sugerencias
              </span>
              {conceptosRapidos.map((c) => (
                <Button
                  key={c}
                  type="button"
                  variant="outline"
                  size="xs"
                  className="font-normal"
                  aria-pressed={concepto === c}
                  onClick={() => setConcepto(c)}
                >
                  {c}
                </Button>
              ))}
            </div>

            <Button
              type="submit"
              loading={registrar.loading}
              loadingText="Registrando…"
              disabled={externalSaving}
              className="w-full sm:w-auto"
            >
              Registrar movimiento
            </Button>
          </div>
        </form>
      </PanelBody>
    </Panel>
  );
}
