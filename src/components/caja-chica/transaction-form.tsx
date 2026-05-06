"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { ArrowDownLeft, ArrowUpRight, PlusCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

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
  saving?: boolean;
}

export function TransactionForm({ cajaId, onSuccess, saving: externalSaving }: TransactionFormProps) {
  const [tipo, setTipo] = useState<"INGRESO" | "EGRESO">("EGRESO");
  const [monto, setMonto] = useState(0);
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const [concepto, setConcepto] = useState("");
  const [internalSaving, setInternalSaving] = useState(false);

  const saving = externalSaving || internalSaving;

  const conceptosRapidos =
    tipo === "EGRESO"
      ? ["Gasto - Delivery", "Gasto - Compras", "Gasto - Flete", "Gasto - Viáticos", "Gasto - Otros"]
      : ["Aporte a caja", "Ingreso - Venta", "Ingreso - Sobrante", "Ingreso - Otros"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (monto <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    setInternalSaving(true);
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
      toast.success(tipo === "INGRESO" ? "Ingreso registrado" : "Egreso registrado", {
        icon: <CheckCircle2 className="h-4 w-4 text-foreground" />,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar movimiento");
    } finally {
      setInternalSaving(false);
    }
  };

  return (
    <Card className="border border-border/80 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg font-semibold">Registrar movimiento</CardTitle>
        </div>
        <CardDescription>Ingreso o egreso de efectivo en esta caja</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col gap-6">
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setTipo("INGRESO")}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  tipo === "INGRESO"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowDownLeft className="h-4 w-4" />
                Ingreso
              </button>
              <button
                type="button"
                onClick={() => setTipo("EGRESO")}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  tipo === "EGRESO"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowUpRight className="h-4 w-4" />
                Egreso
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Moneda</Label>
                <Select value={moneda} onValueChange={(v) => setMoneda(v as "ARS" | "USD")}>
                  <SelectTrigger className="border-border bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">Peso argentino (ARS)</SelectItem>
                    <SelectItem value="USD">Dólar (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Monto</Label>
                <CurrencyInput
                  value={monto}
                  onChange={(v) => setMonto(v ?? 0)}
                  placeholder="0.00"
                  className="border-border bg-background"
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground">Concepto</Label>
                <Input
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  placeholder="Ej.: compra, viáticos…"
                  className="border-border bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Sugerencias</Label>
              <div className="flex flex-wrap gap-2">
                {conceptosRapidos.map((c) => (
                  <Button
                    key={c}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full border-dashed text-xs font-normal"
                    onClick={() => setConcepto(c)}
                  >
                    {c}
                  </Button>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={saving} className="w-full sm:w-auto sm:self-end">
              {saving ? "Registrando…" : "Registrar movimiento"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
