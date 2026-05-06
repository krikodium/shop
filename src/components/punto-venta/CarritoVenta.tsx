"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
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
import { formatARS } from "@/lib/formatCurrency";
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

function PanelSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-4 shadow-sm", className)}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums text-foreground", valueClassName)}>
        {value}
      </span>
    </div>
  );
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
      <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center text-muted-foreground shadow-sm">
        <p className="font-medium text-foreground">Carrito vacío</p>
        <p className="mt-2 text-sm">Buscá productos y agregalos para iniciar la venta.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PanelSection
        title="Carrito"
        description={`${items.length} ${items.length === 1 ? "producto" : "productos"} en la venta`}
      >
        <ul className="max-h-64 space-y-2 overflow-auto pr-1 md:max-h-80">
          {items.map((item, i) => (
            <li
              key={`${item.productoId}-${i}`}
              className="rounded-xl border bg-background p-3 text-sm transition-colors hover:bg-muted/40 touch-manipulation"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 font-semibold leading-tight">
                    {item.productoNombre}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.productoSku}
                    </span>
                    {item.esConsignacion && (
                      <Badge
                        variant="outline"
                        className="border-amber-500/35 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300"
                      >
                        Consignación
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onQuitar(i)}
                  aria-label={`Quitar ${item.productoNombre}`}
                >
                  ×
                </Button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Cantidad</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={item.cantidad}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v >= 1) onCantidadChange(i, v);
                    }}
                    className="h-10 w-16 rounded-lg border bg-background px-2 text-center text-sm font-semibold tabular-nums outline-none transition-colors focus:border-primary"
                  />
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Subtotal item</p>
                  <p className="text-base font-bold tabular-nums">{formatARS(item.subtotal)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </PanelSection>

      <PanelSection title="Cliente" description="Asigná un cliente o registrá una venta de mostrador">
        {/* Cliente: compacto en mobile */}
        <div>
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
      </PanelSection>

      <PanelSection
        title="Cobro"
        description="Elegí el medio de pago o dividí el total en dos tramos"
      >
        {/* Pago único o dividido */}
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/25 p-3 text-sm transition-colors hover:bg-muted/40">
            <input
              type="checkbox"
              checked={pagoDividido}
              onChange={(e) => togglePagoDividido(e.target.checked)}
              className="mt-0.5 size-4 rounded border-input"
            />
            <span className="grid gap-0.5">
              <span className="font-medium">Dividir en dos pagos</span>
              <span className="text-xs text-muted-foreground">
                Para combinar efectivo, transferencia, tarjeta o USD.
              </span>
            </span>
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
                      "rounded-lg border px-3 py-2 text-sm font-medium transition-colors touch-manipulation md:hidden",
                      metodoPago === m.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted"
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
            <div className="space-y-4 rounded-xl border border-primary/15 bg-muted/25 p-4">
              <div className="rounded-lg border bg-background px-3 py-3 text-center shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total a cobrar (venta)
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-foreground md:text-xl">
                  {formatARS(totales.total)}
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
                      {formatARS(ars1Preview)}
                    </p>
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
                      {formatARS(ars2Preview)}
                    </p>
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
                    {formatARS(sumaPreview)}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Total venta:{" "}
                  <span className="font-semibold text-foreground">
                    {formatARS(totales.total)}
                  </span>
                </p>
                {Math.abs(diffPreview) > 0.05 ? (
                  <p className="mt-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Faltan o sobran: {diffPreview > 0 ? "" : "−"}
                    {formatARS(Math.abs(diffPreview))}
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
      </PanelSection>

      <PanelSection
        title="Resumen"
        description="Detalle económico de la venta antes de confirmar"
        className="border-primary/15"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/25 p-3">
            <div>
              <label htmlFor="descuento-venta" className="text-sm font-medium">
                Descuento
              </label>
              <p className="text-xs text-muted-foreground">Porcentaje aplicado al subtotal.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="descuento-venta"
                type="number"
                min={0}
                max={100}
                step={0.5}
                placeholder="0"
                value={descuento === 0 ? "" : descuento}
                onChange={(e) =>
                  onDescuentoChange(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))
                }
                className="min-h-10 w-20 rounded-lg border bg-background px-2 text-right text-sm font-semibold tabular-nums outline-none transition-colors focus:border-primary md:w-24"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border bg-background p-3">
            <SummaryRow label="Subtotal" value={formatARS(totales.subtotal)} />
            {descuento > 0 && (
              <SummaryRow
                label={`Descuento (${descuento}%)`}
                value={`− ${formatARS(totales.subtotal - totales.total)}`}
                valueClassName="text-destructive"
              />
            )}
            <div className="flex items-end justify-between gap-3 border-t pt-3">
              <span className="text-sm font-bold">Total</span>
              <span className="text-2xl font-bold tabular-nums tracking-tight text-primary">
                {formatARS(totales.total)}
              </span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3">
              <p className="text-xs font-medium text-muted-foreground">Ganancia</p>
              <p className="mt-1 text-base font-bold tabular-nums text-green-700 dark:text-green-300">
                {formatARS(totales.gananciaBruta)}
              </p>
            </div>
            <div className="rounded-xl border bg-muted/25 p-3">
              <p className="text-xs font-medium text-muted-foreground">Margen</p>
              <p className="mt-1 text-base font-bold tabular-nums">
                {totales.margenPorcentaje.toFixed(1)}%
              </p>
            </div>
          </div>

          {totales.deudaConsignacion > 0 && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Deuda consignación
                </span>
                <span className="font-bold tabular-nums text-amber-700 dark:text-amber-300">
                  {formatARS(totales.deudaConsignacion)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Monto estimado a rendir por productos en consignación.
              </p>
            </div>
          )}

          <Button
            className="h-12 w-full text-sm font-semibold shadow-sm touch-manipulation"
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
      </PanelSection>
    </div>
  );
}
