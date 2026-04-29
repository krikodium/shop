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

interface TransactionFormProps {
  cajaId: string;
  onSuccess: () => void;
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
      
      setMonto(0);
      setConcepto("");
      onSuccess();
      toast.success(tipo === "INGRESO" ? "Ingreso registrado" : "Egreso registrado", {
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar movimiento");
    } finally {
      setInternalSaving(false);
    }
  };

  return (
    <Card className="border-none shadow-md overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Registrar Movimiento</CardTitle>
        </div>
        <CardDescription>Cargar un nuevo ingreso o egreso de dinero</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col gap-6">
            {/* Tipo de Movimiento */}
            <div className="flex p-1 bg-muted rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setTipo("INGRESO")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                  tipo === "INGRESO"
                    ? "bg-white shadow-sm text-emerald-600 dark:bg-zinc-800"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowDownLeft className="h-4 w-4" />
                <span className="text-sm font-semibold">Ingreso</span>
              </button>
              <button
                type="button"
                onClick={() => setTipo("EGRESO")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                  tipo === "EGRESO"
                    ? "bg-white shadow-sm text-red-600 dark:bg-zinc-800"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm font-semibold">Egreso</span>
              </button>
            </div>

            {/* Form Fields Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Moneda</Label>
                <Select value={moneda} onValueChange={(v) => setMoneda(v as "ARS" | "USD")}>
                  <SelectTrigger className="bg-muted/50 border-none focus:ring-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">Peso Argentino (ARS)</SelectItem>
                    <SelectItem value="USD">Dólar (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monto</Label>
                <CurrencyInput
                  value={monto}
                  onChange={(v) => setMonto(v ?? 0)}
                  placeholder="0.00"
                  className="bg-muted/50 border-none focus:ring-1 h-10"
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Concepto</Label>
                <Input
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  placeholder="Ej: Pago de servicios, Venta de..."
                  className="bg-muted/50 border-none focus:ring-1 h-10"
                />
              </div>
            </div>

            {/* Quick Concepts */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground italic">Sugerencias</Label>
              <div className="flex flex-wrap gap-2">
                {conceptosRapidos.map((c) => (
                  <Button
                    key={c}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 rounded-full border-dashed bg-transparent hover:bg-primary/5 hover:text-primary transition-colors"
                    onClick={() => setConcepto(c)}
                  >
                    {c}
                  </Button>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={saving} className="w-full sm:w-auto self-end px-8 shadow-md">
              {saving ? "Registrando..." : "Registrar Movimiento"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
