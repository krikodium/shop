"use client";

/**
 * Diálogo para registrar un cobro parcial o total de una venta.
 *
 * Regla de plata:
 * - El importe se maneja como `string` de punta a punta. Se manda tal cual al
 *   POST; nunca se suma ni se compara con `Number()`.
 * - Los atajos salen de `montoSugerido`, que acota el porcentaje al saldo. Sin
 *   ese tope, el 50 % de un total impar redondea un centavo por encima del
 *   saldo y la API rechaza el cobro.
 * - `Number()` aparece solo dentro de `formatARS`, que es presentación.
 */

import { useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncAction } from "@/hooks/use-async-action";
import { METODO_PAGO_LABEL, METODOS_PAGO_INDIVIDUAL } from "@/lib/constants";
import { formatARS } from "@/lib/formatCurrency";
import {
  aDecimal,
  montoPorPorcentaje,
  montoSugerido,
  validarMontoPago,
} from "@/lib/calculadores/pagosVenta";
import { notificar } from "@/lib/notificar";

type ModoImporte = "saldo" | "mitad" | "otro";

export interface RegistrarPagoDialogProps {
  ventaId: string;
  /** Total de la venta, string con dos decimales tal como lo da la API. */
  total: string;
  /** Saldo pendiente, string con dos decimales tal como lo da la API. */
  saldo: string;
  /** Se ejecuta después de un cobro exitoso para refrescar la pantalla. */
  onRegistrado: () => void | Promise<void>;
}

export function RegistrarPagoDialog({
  ventaId,
  total,
  saldo,
  onRegistrado,
}: RegistrarPagoDialogProps) {
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<ModoImporte>("saldo");
  const [importeLibre, setImporteLibre] = useState("");
  const [metodoPago, setMetodoPago] = useState<string>("EFECTIVO");
  const [notas, setNotas] = useState("");
  const operacion = useRef<{ huella: string; clave: string } | null>(null);

  // El saldo completo y completar el 50 % acumulado son atajos distintos.
  // Ninguno propone volver a cobrar una seña ya registrada.
  const importeSaldo = useMemo(
    () => montoSugerido(total, 100, saldo).toFixed(2),
    [total, saldo],
  );
  const importeMitad = useMemo(() => {
    const pendiente = montoPorPorcentaje(total, 50).minus(
      aDecimal(total).minus(aDecimal(saldo)),
    );
    return pendiente.lte(0)
      ? "0.00"
      : pendiente.gt(aDecimal(saldo))
        ? aDecimal(saldo).toFixed(2)
        : pendiente.toFixed(2);
  }, [total, saldo]);

  // Normalización de tipeo (coma decimal argentina), no aritmética.
  const importeOtro = importeLibre.trim().replace(",", ".");

  const importe =
    modo === "saldo"
      ? importeSaldo
      : modo === "mitad"
        ? importeMitad
        : importeOtro;

  const atajos: Array<{ id: ModoImporte; label: string; detalle?: string }> = [
    {
      id: "saldo",
      label: "Saldo completo",
      detalle: formatARS(Number(importeSaldo)),
    },
    ...(importeMitad !== "0.00"
      ? [
          {
            id: "mitad" as const,
            label: "Completar hasta 50%",
            detalle: formatARS(importeMitad),
          },
        ]
      : []),
    { id: "otro", label: "Otro importe" },
  ];

  function reiniciar() {
    setModo("saldo");
    setImporteLibre("");
    setMetodoPago("EFECTIVO");
    setNotas("");
  }

  const { run: confirmar, loading } = useAsyncAction(async () => {
    const validacion = validarMontoPago(importe, saldo);
    if (!validacion.ok) {
      notificar.error(validacion.error ?? "El importe a cobrar no es válido.");
      return;
    }

    try {
      const contenido = {
        montoArs: importe,
        metodoPago,
        ...(notas.trim() ? { notas: notas.trim() } : {}),
      };
      const huella = JSON.stringify(contenido);
      if (operacion.current?.huella !== huella)
        operacion.current = { huella, clave: crypto.randomUUID() };
      const res = await fetch(`/api/ventas/${ventaId}/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...contenido,
          claveIdempotencia: operacion.current.clave,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo registrar el cobro");
      }
      notificar.ok("Cobro registrado", {
        descripcion: `${formatARS(Number(importe))} · ${METODO_PAGO_LABEL[metodoPago] ?? metodoPago}`,
      });
      setAbierto(false);
      operacion.current = null;
      reiniciar();
      await onRegistrado();
    } catch (e) {
      notificar.error(
        e instanceof Error ? e.message : "No se pudo registrar el cobro",
      );
    }
  });

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        // Mientras el POST sigue vivo no se cierra el diálogo por accidente.
        if (loading) return;
        setAbierto(v);
        if (!v) reiniciar();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Registrar cobro</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar cobro</DialogTitle>
          <DialogDescription>
            Saldo pendiente: {formatARS(Number(saldo))} sobre un total de{" "}
            {formatARS(Number(total))}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <span
              id="pago-importe-label"
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
            >
              Importe
            </span>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-labelledby="pago-importe-label"
            >
              {atajos.map((a) => (
                <Button
                  key={a.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-pressed={modo === a.id}
                  onClick={() => setModo(a.id)}
                  className={
                    modo === a.id ? "border-foreground bg-accent" : undefined
                  }
                >
                  {a.label}
                  {a.detalle && (
                    <span className="ml-1.5 font-mono tabular-nums text-muted-foreground">
                      {a.detalle}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {modo === "otro" && (
            <div className="space-y-2">
              <Label htmlFor="pago-importe">Importe a cobrar (ARS)</Label>
              <Input
                id="pago-importe"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={importeLibre}
                onChange={(e) => setImporteLibre(e.target.value)}
                className="h-10 font-mono tabular-nums"
              />
              <p className="text-xs text-muted-foreground">
                Hasta dos decimales. No puede superar el saldo pendiente.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pago-metodo">Medio de pago</Label>
            <Select value={metodoPago} onValueChange={setMetodoPago}>
              <SelectTrigger id="pago-metodo" className="h-10 w-full">
                <SelectValue placeholder="Elegí un medio" />
              </SelectTrigger>
              <SelectContent>
                {METODOS_PAGO_INDIVIDUAL.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pago-notas">Nota (opcional)</Label>
            <Textarea
              id="pago-notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Seña, transferencia del hermano, etc."
              maxLength={500}
              className="min-h-16"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setAbierto(false);
              reiniciar();
            }}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            loading={loading}
            loadingText="Registrando cobro…"
            onClick={() => void confirmar()}
          >
            Confirmar cobro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
