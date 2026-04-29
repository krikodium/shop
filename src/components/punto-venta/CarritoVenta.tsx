"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { METODOS_PAGO, METODOS_PAGO_INDIVIDUAL } from "@/lib/constants";
import type { ItemVentaInput } from "@/types";
import type { TotalesVenta, OpcionesProcesarVenta } from "@/types";

interface ClienteOption {
  id: string;
  nombre: string;
}

interface CarritoVentaProps {
  items: ItemVentaInput[];
  totales: TotalesVenta;
  descuento: number;
  onDescuentoChange: (v: number) => void;
  onCantidadChange: (index: number, cantidad: number) => void;
  onQuitar: (index: number) => void;
  onProcesar: (opts: OpcionesProcesarVenta) => Promise<void>;
  isLoading?: boolean;
}

export function CarritoVenta({
  items,
  totales,
  descuento,
  onDescuentoChange,
  onCantidadChange,
  onQuitar,
  onProcesar,
  isLoading = false,
}: CarritoVentaProps) {
  const [metodoPago, setMetodoPago] = useState<string>("EFECTIVO");
  const [pagoDividido, setPagoDividido] = useState(false);
  const [metodoPago1, setMetodoPago1] = useState<string>("EFECTIVO");
  const [metodoPago2, setMetodoPago2] = useState<string>("TRANSFERENCIA");
  const [moneda1, setMoneda1] = useState<"ARS" | "USD">("ARS");
  const [moneda2, setMoneda2] = useState<"ARS" | "USD">("ARS");
  const [montoLeg1, setMontoLeg1] = useState("");
  const [montoLeg2, setMontoLeg2] = useState("");
  const [cotizacionUsd, setCotizacionUsd] = useState("");
  const [clienteId, setClienteId] = useState<string>("__none__");
  const [clienteNombre, setClienteNombre] = useState<string>("");
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [formNombre, setFormNombre] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formDni, setFormDni] = useState("");
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [errorCliente, setErrorCliente] = useState<string | null>(null);

  const loadClientes = () => {
    fetch("/api/clientes")
      .then((res) => res.json())
      .then((data) => setClientes(Array.isArray(data) ? data : []))
      .catch(() => setClientes([]));
  };

  useEffect(() => {
    loadClientes();
  }, []);

  const handleCargarDatosCliente = async () => {
    const tiene = (formNombre?.trim() || formEmail?.trim() || formTelefono?.trim() || formDni?.trim());
    if (!tiene) {
      setErrorCliente("Agregá al menos un dato");
      toast.error("Agregá al menos un dato del cliente");
      return;
    }
    setGuardandoCliente(true);
    setErrorCliente(null);
    try {
      const res = await fetch("/api/clientes/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formNombre.trim() || undefined,
          email: formEmail.trim() || undefined,
          telefono: formTelefono.trim() || undefined,
          dni: formDni.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al guardar");
      }
      const nuevo = await res.json();
      loadClientes();
      setClienteId(nuevo.id);
      setClienteNombre("");
      setFormNombre("");
      setFormEmail("");
      setFormTelefono("");
      setFormDni("");
      setModalClienteOpen(false);
      toast.success("Cliente cargado y asignado");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      setErrorCliente(msg);
      toast.error(msg);
    } finally {
      setGuardandoCliente(false);
    }
  };

  const parseNum = (s: string) => {
    const n = parseFloat(String(s).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const handleConfirmar = async () => {
    const cid = clienteId === "__none__" ? null : clienteId;
    const cnom = cid ? (clientes.find((c) => c.id === cid)?.nombre ?? "") : clienteNombre;
    const base: OpcionesProcesarVenta = {
      metodoPago,
      clienteId: cid,
      clienteNombre: cnom || undefined,
    };

    if (pagoDividido) {
      const cot = parseNum(cotizacionUsd);
      const v1 = parseNum(montoLeg1);
      const v2 = parseNum(montoLeg2);
      const ars1 = moneda1 === "USD" ? v1 * cot : v1;
      const ars2 = moneda2 === "USD" ? v2 * cot : v2;
      if ((moneda1 === "USD" || moneda2 === "USD") && cot <= 0) {
        toast.error("Ingresá una cotización USD válida (ARS por 1 USD)");
        return;
      }
      if (Math.abs(ars1 + ars2 - totales.total) > 0.05) {
        toast.error(
          `Los montos deben sumar el total (${totales.total.toFixed(2)} ARS). Suma: ${(ars1 + ars2).toFixed(2)}`
        );
        return;
      }
      if (ars1 <= 0 || ars2 <= 0) {
        toast.error("Indicá un monto mayor a 0 en cada pago");
        return;
      }
      await onProcesar({
        ...base,
        metodoPago: metodoPago1,
        metodoPagoSecundario: metodoPago2,
        montoPago1Ars: ars1,
        montoPago2Ars: ars2,
        usdPago1: moneda1 === "USD" ? v1 : null,
        usdPago2: moneda2 === "USD" ? v2 : null,
        cotizacionUsd: moneda1 === "USD" || moneda2 === "USD" ? cot : null,
      });
      return;
    }

    await onProcesar(base);
  };

  const togglePagoDividido = (checked: boolean) => {
    if (checked) {
      setMetodoPago1(metodoPago);
      setMetodoPago2("TRANSFERENCIA");
      setMoneda1("ARS");
      setMoneda2("ARS");
      setCotizacionUsd("");
      const half = totales.total > 0 ? (totales.total / 2).toFixed(2) : "";
      const halfNum = parseFloat(half || "0");
      setMontoLeg1(half);
      setMontoLeg2(totales.total > 0 ? (totales.total - halfNum).toFixed(2) : "");
    } else {
      setMetodoPago(metodoPago1);
    }
    setPagoDividido(checked);
  };

  const cotNum = parseNum(cotizacionUsd);
  const ars1Preview = pagoDividido
    ? moneda1 === "USD"
      ? parseNum(montoLeg1) * cotNum
      : parseNum(montoLeg1)
    : 0;
  const ars2Preview = pagoDividido
    ? moneda2 === "USD"
      ? parseNum(montoLeg2) * cotNum
      : parseNum(montoLeg2)
    : 0;
  const sumaPreview = ars1Preview + ars2Preview;
  const diffPreview = pagoDividido ? totales.total - sumaPreview : 0;

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-muted-foreground">
        <p className="font-medium">Carrito vacío</p>
        <p className="mt-2 text-sm">Buscá productos y agregalos para iniciar la venta</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">Carrito</h3>
        <ul className="max-h-52 space-y-2 overflow-auto md:max-h-72">
          {items.map((item, i) => (
            <li
              key={`${item.productoId}-${i}`}
              className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3 text-sm transition-colors hover:bg-muted/50 touch-manipulation"
            >
              <div className="min-w-0 flex-1">
                <span className="font-semibold leading-tight line-clamp-2">{item.productoNombre}</span>
                <span className="mt-0.5 block font-mono text-xs text-muted-foreground">{item.productoSku}</span>
                {item.esConsignacion && (
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    Consig.
                  </Badge>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={item.cantidad}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 1) onCantidadChange(i, v);
                  }}
                  className="w-12 rounded-md border bg-background px-1 py-1 text-center text-sm font-semibold tabular-nums md:w-14"
                />
                <span className="min-w-[5.5rem] text-right text-sm font-bold tabular-nums text-foreground sm:min-w-[6.5rem] sm:text-base">
                  ${item.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 shrink-0 p-0 text-destructive touch-manipulation md:h-8 md:w-8"
                  onClick={() => onQuitar(i)}
                >
                  ×
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
        {/* Cliente: compacto en mobile */}
        <div>
          <label className="mb-1 block text-xs font-medium md:text-sm">Cliente</label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={clienteId}
              onValueChange={(v) => {
                setClienteId(v);
                if (v !== "__none__") setClienteNombre("");
              }}
            >
              <SelectTrigger className="min-h-10 flex-1 touch-manipulation">
                <SelectValue placeholder="Sin cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin cliente / Mostrador</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={modalClienteOpen} onOpenChange={setModalClienteOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="min-h-10 touch-manipulation">
                  + Nuevo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[min(95vw,400px)]">
                <DialogHeader>
                  <DialogTitle>Cliente rápido</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    Nombre o teléfono. Al menos uno.
                  </p>
                </DialogHeader>
                <div className="grid gap-5 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="modal-nombre">Nombre</Label>
                    <Input
                      id="modal-nombre"
                      placeholder="Nombre"
                      value={formNombre}
                      onChange={(e) => setFormNombre(e.target.value)}
                      className="min-h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modal-telefono">Teléfono</Label>
                    <Input
                      id="modal-telefono"
                      placeholder="Teléfono"
                      type="tel"
                      inputMode="numeric"
                      value={formTelefono}
                      onChange={(e) => setFormTelefono(e.target.value)}
                      className="min-h-10 text-sm"
                    />
                  </div>
                  <details className="group">
                    <summary className="cursor-pointer text-sm text-muted-foreground">
                      Más datos (opcional)
                    </summary>
                    <div className="mt-4 grid gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="modal-dni">DNI</Label>
                        <Input
                          id="modal-dni"
                          placeholder="DNI"
                          value={formDni}
                          onChange={(e) => setFormDni(e.target.value)}
                          className="min-h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="modal-email">Email</Label>
                        <Input
                          id="modal-email"
                          type="email"
                          placeholder="email@ejemplo.com"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          className="min-h-10 text-sm"
                        />
                      </div>
                    </div>
                  </details>
                  {errorCliente && (
                    <p className="text-sm text-destructive">{errorCliente}</p>
                  )}
                  <Button
                    onClick={handleCargarDatosCliente}
                    disabled={guardandoCliente}
                    className="min-h-10 w-full touch-manipulation text-sm"
                  >
                    {guardandoCliente ? "Guardando…" : "Guardar y asignar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {clienteId === "__none__" && (
            <Input
              placeholder="Nombre (ej: Mostrador)"
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              className="mt-2 min-h-9 text-sm md:mt-1"
            />
          )}
        </div>

        {/* Pago único o dividido */}
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pagoDividido}
              onChange={(e) => togglePagoDividido(e.target.checked)}
              className="size-4 rounded border-input"
            />
            <span className="font-medium">Dividir en dos pagos</span>
            <span className="text-xs text-muted-foreground">(ej. parte en USD y parte en pesos)</span>
          </label>

          {!pagoDividido ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium md:text-sm">Método de pago</label>
              <div className="flex flex-wrap gap-1.5 md:block">
                {METODOS_PAGO.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMetodoPago(m.value)}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors touch-manipulation md:hidden",
                      metodoPago === m.value ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
                    )}
                  >
                    {m.short}
                  </button>
                ))}
                <div className="hidden md:block">
                  <Select value={metodoPago} onValueChange={setMetodoPago}>
                    <SelectTrigger className="min-h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METODOS_PAGO.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border-2 border-dashed border-primary/20 bg-gradient-to-b from-muted/40 to-muted/10 p-4 shadow-inner">
              <div className="rounded-lg bg-background/80 px-3 py-3 text-center shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total a cobrar (venta)
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-foreground md:text-xl">
                  ${totales.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
                  La suma de los dos tramos en pesos (o USD × cotización) debe coincidir con este total.
                </p>
              </div>

              {(moneda1 === "USD" || moneda2 === "USD") && (
                <div className="space-y-2 rounded-lg border bg-card p-3">
                  <Label htmlFor="cotiz-usd" className="text-xs font-semibold">
                    Cotización (ARS por 1 USD)
                  </Label>
                  <Input
                    id="cotiz-usd"
                    inputMode="decimal"
                    value={cotizacionUsd}
                    onChange={(e) => setCotizacionUsd(e.target.value)}
                    className="min-h-9 text-center text-sm font-semibold tabular-nums tracking-tight"
                    placeholder="1200"
                  />
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2 border-b pb-2">
                    <span className="text-xs font-bold text-primary sm:text-sm">1 · Primer pago</span>
                    <Select value={moneda1} onValueChange={(v) => setMoneda1(v as "ARS" | "USD")}>
                      <SelectTrigger className="h-8 w-[80px] shrink-0 text-xs font-semibold sm:h-9 sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARS">ARS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Medio</Label>
                    <Select value={metodoPago1} onValueChange={setMetodoPago1}>
                      <SelectTrigger className="mt-1 min-h-9 w-full text-sm">
                        <SelectValue />
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
                  <div>
                    <Label className="text-xs font-medium sm:text-sm">
                      Importe {moneda1 === "USD" ? "(USD)" : "(ARS)"}
                    </Label>
                    <Input
                      inputMode="decimal"
                      value={montoLeg1}
                      onChange={(e) => setMontoLeg1(e.target.value)}
                      placeholder={moneda1 === "USD" ? "0.00" : "0,00"}
                      className="mt-1 min-h-9 w-full border text-right text-sm font-semibold tabular-nums tracking-tight md:text-base"
                    />
                  </div>
                  <div className="rounded-lg bg-primary/10 px-2.5 py-2 text-center">
                    <p className="text-[10px] font-medium text-muted-foreground">Equivalente en pesos</p>
                    <p className="mt-0.5 text-xs font-bold tabular-nums text-primary sm:text-sm">
                      $ {ars1Preview.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">ARS</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2 border-b pb-2">
                    <span className="text-xs font-bold text-primary sm:text-sm">2 · Segundo pago</span>
                    <Select value={moneda2} onValueChange={(v) => setMoneda2(v as "ARS" | "USD")}>
                      <SelectTrigger className="h-8 w-[80px] shrink-0 text-xs font-semibold sm:h-9 sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARS">ARS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Medio</Label>
                    <Select value={metodoPago2} onValueChange={setMetodoPago2}>
                      <SelectTrigger className="mt-1 min-h-9 w-full text-sm">
                        <SelectValue />
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
                  <div>
                    <Label className="text-xs font-medium sm:text-sm">
                      Importe {moneda2 === "USD" ? "(USD)" : "(ARS)"}
                    </Label>
                    <Input
                      inputMode="decimal"
                      value={montoLeg2}
                      onChange={(e) => setMontoLeg2(e.target.value)}
                      placeholder={moneda2 === "USD" ? "0.00" : "0,00"}
                      className="mt-1 min-h-9 w-full border text-right text-sm font-semibold tabular-nums tracking-tight md:text-base"
                    />
                  </div>
                  <div className="rounded-lg bg-primary/10 px-2.5 py-2 text-center">
                    <p className="text-[10px] font-medium text-muted-foreground">Equivalente en pesos</p>
                    <p className="mt-0.5 text-xs font-bold tabular-nums text-primary sm:text-sm">
                      $ {ars2Preview.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">ARS</p>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "rounded-lg border-2 px-3 py-3 text-center",
                  Math.abs(diffPreview) <= 0.05
                    ? "border-green-500/40 bg-green-500/10"
                    : "border-amber-500/50 bg-amber-500/10"
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Control de suma
                </p>
                <p className="mt-1.5 text-xs font-bold tabular-nums sm:text-sm">
                  Suma tramos:{" "}
                  <span className="text-foreground">
                    ${sumaPreview.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Total venta:{" "}
                  <span className="font-semibold text-foreground">
                    ${totales.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </p>
                {Math.abs(diffPreview) > 0.05 ? (
                  <p className="mt-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Faltan o sobran: {diffPreview > 0 ? "" : "−"}
                    {Math.abs(diffPreview).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                    ARS
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs font-semibold text-green-700 dark:text-green-400">
                    ✓ Los importes cierran con el total
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Descuento por porcentaje */}
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs md:text-sm">Descuento (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            placeholder="0"
            value={descuento === 0 ? "" : descuento}
            onChange={(e) => onDescuentoChange(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
            className="w-20 rounded border px-2 py-1 text-right text-sm tabular-nums min-h-9 md:w-24"
          />
        </div>

        <div className="space-y-2 border-t pt-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums font-medium text-foreground">${totales.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2 border-t pt-2">
            <span className="text-sm font-bold">Total</span>
            <span className="text-base font-bold tabular-nums tracking-tight text-primary md:text-lg">
              ${totales.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="hidden justify-between text-xs text-muted-foreground md:flex">
            <span>Ganancia</span>
            <span className="text-green-600">${totales.gananciaBruta.toFixed(2)}</span>
          </div>
          <div className="hidden justify-between text-xs text-muted-foreground md:flex">
            <span>Margen</span>
            <span>{totales.margenPorcentaje.toFixed(1)}%</span>
          </div>
          {totales.deudaConsignacion > 0 && (
            <div className="flex justify-between text-xs text-amber-600">
              <span>Deuda consig.</span>
              <span>${totales.deudaConsignacion.toFixed(2)}</span>
            </div>
          )}
        </div>

        <Button
          className="h-10 w-full text-sm font-semibold shadow-sm touch-manipulation"
          size="default"
          onClick={handleConfirmar}
          disabled={
            isLoading ||
            (pagoDividido &&
              (((moneda1 === "USD" || moneda2 === "USD") && cotNum <= 0) ||
                Math.abs(diffPreview) > 0.05 ||
                ars1Preview <= 0 ||
                ars2Preview <= 0))
          }
        >
          {isLoading ? "Procesando..." : "Confirmar venta"}
        </Button>
      </div>
    </div>
  );
}
