"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { useAsyncAction } from "@/hooks/use-async-action";
import { cn } from "@/lib/utils";
import { METODOS_PAGO, METODOS_PAGO_INDIVIDUAL } from "@/lib/constants";
import { formatARS } from "@/lib/formatCurrency";
import { notificar } from "@/lib/notificar";
import type { ItemVentaInput } from "@/types";
import type { TotalesVenta, OpcionesProcesarVenta } from "@/types";
import { escala, importe, convertirUsd } from "./dinero-venta";

/**
 * Avisos por el canal único (`notificar`). Se expone con la forma de `toast`
 * para no tocar el cuerpo de `handleConfirmar`, que valida el pago dividido
 * y está congelado por la regla de plata del rediseño.
 */
const toast = { error: (mensaje: string) => notificar.error(mensaje) };

interface ClienteOption {
  id: string;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
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

/** Bloque del aside de cobro: label mono chico y divisor arriba, sin caja propia. */
function SeccionCarrito({
  titulo,
  id,
  acciones,
  children,
  className,
}: {
  titulo: string;
  id: string;
  acciones?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn("border-t border-border px-4 py-3.5 sm:px-5", className)}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3
          id={id}
          className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
        >
          {titulo}
        </h3>
        {acciones}
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
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn("font-mono tabular-nums text-foreground", valueClassName)}
      >
        {value}
      </span>
    </div>
  );
}

/** Control segmentado ARS/USD de cada tramo del pago dividido. */
function SelectorMoneda({
  valor,
  onCambiar,
  etiqueta,
}: {
  valor: "ARS" | "USD";
  onCambiar: (v: "ARS" | "USD") => void;
  etiqueta: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className="inline-flex rounded-md border border-border p-0.5"
    >
      {(["ARS", "USD"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={valor === m}
          onClick={() => onCambiar(m)}
          className={cn(
            "h-7 rounded-[5px] px-2.5 font-mono text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60",
            valor === m
              ? "bg-action text-action-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {m}
        </button>
      ))}
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
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [formNombre, setFormNombre] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formDni, setFormDni] = useState("");

  const loadClientes = () => {
    fetch("/api/clientes")
      .then((res) => res.json())
      .then((data) => setClientes(Array.isArray(data) ? data : []))
      .catch(() => setClientes([]));
  };

  useEffect(() => {
    loadClientes();
  }, []);

  const guardarCliente = useAsyncAction(async () => {
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
      setClienteNombre(nuevo.nombre ?? "");
      setFormNombre("");
      setFormEmail("");
      setFormTelefono("");
      setFormDni("");
      setModalClienteOpen(false);
      notificar.ok("Cliente cargado y asignado");
    } catch (err) {
      notificar.error(err instanceof Error ? err.message : "Error al guardar");
    }
  });

  const handleCargarDatosCliente = () => {
    const tiene =
      formNombre?.trim() ||
      formEmail?.trim() ||
      formTelefono?.trim() ||
      formDni?.trim();
    if (!tiene) {
      notificar.error("Agregá al menos un dato del cliente");
      return;
    }
    void guardarCliente.run();
  };

  function tramo(valor: string, moneda: "ARS" | "USD") {
    return moneda === "USD"
      ? convertirUsd(valor, cotizacionUsd)
      : escala(valor);
  }

  const handleConfirmar = async () => {
    const cid = clienteId === "__none__" ? null : clienteId;
    const cnom = cid
      ? (clientes.find((c) => c.id === cid)?.nombre ?? "")
      : clienteNombre;
    const base: OpcionesProcesarVenta = {
      metodoPago,
      clienteId: cid,
      clienteNombre: cnom || undefined,
    };

    if (pagoDividido) {
      let ars1: bigint;
      let ars2: bigint;
      try {
        ars1 = tramo(montoLeg1, moneda1);
        ars2 = tramo(montoLeg2, moneda2);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Revisá los importes y la cotización.",
        );
        return;
      }
      if (ars1 + ars2 !== escala(totales.total)) {
        toast.error(
          `Los montos deben sumar el total (${importe(escala(totales.total))} ARS). Suma: ${importe(ars1 + ars2)}`,
        );
        return;
      }
      if (ars1 <= BigInt(0) || ars2 <= BigInt(0)) {
        toast.error("Indicá un monto mayor a 0 en cada pago");
        return;
      }
      await onProcesar({
        ...base,
        metodoPago: metodoPago1,
        metodoPagoSecundario: metodoPago2,
        montoPago1Ars: importe(ars1),
        montoPago2Ars: importe(ars2),
        usdPago1: moneda1 === "USD" ? importe(escala(montoLeg1)) : null,
        usdPago2: moneda2 === "USD" ? importe(escala(montoLeg2)) : null,
        cotizacionUsd:
          moneda1 === "USD" || moneda2 === "USD"
            ? cotizacionUsd.trim().replace(",", ".")
            : null,
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
      const total = escala(totales.total);
      const mitad = (total + BigInt(1)) / BigInt(2);
      setMontoLeg1(total > BigInt(0) ? importe(mitad) : "");
      setMontoLeg2(total > BigInt(0) ? importe(total - mitad) : "");
    } else {
      setMetodoPago(metodoPago1);
    }
    setPagoDividido(checked);
  };

  let tramo1 = BigInt(0),
    tramo2 = BigInt(0);
  let tramosValidos = true;
  if (pagoDividido) {
    try {
      tramo1 = tramo(montoLeg1, moneda1);
      tramo2 = tramo(montoLeg2, moneda2);
    } catch {
      tramosValidos = false;
    }
  }
  const ars1Preview = importe(tramo1);
  const ars2Preview = importe(tramo2);
  const sumaPreview = importe(tramo1 + tramo2);
  const diferencia = pagoDividido
    ? escala(totales.total) - tramo1 - tramo2
    : BigInt(0);
  const diffPreview = Number(importe(diferencia)); // Solo presentación.

  if (items.length === 0) {
    return (
      <Panel>
        <PanelHeader title="Venta" descripcion="Todavía sin productos" />
        <div className="p-4 sm:p-5">
          <EmptyState
            className="py-8"
            titulo="Carrito vacío"
            descripcion="Tocá un producto del catálogo para sumarlo a la venta. Acá vas a ver cantidades, cliente, forma de pago y total."
          />
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader
        title="Venta"
        descripcion={`${items.length} ${items.length === 1 ? "producto" : "productos"} en la venta`}
      />

      <ul
        aria-label="Productos en la venta"
        className="max-h-[22rem] divide-y divide-border overflow-y-auto"
      >
        {items.map((item, i) => (
          <li key={`${item.productoId}-${i}`} className="px-4 py-3 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-medium leading-snug">
                  {item.productoNombre}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {item.productoSku}
                  {item.esConsignacion && (
                    <span className="font-sans"> · Consignación</span>
                  )}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="-mr-1.5 -mt-1 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => onQuitar(i)}
                aria-label={`Quitar ${item.productoNombre}`}
              >
                <X aria-hidden="true" />
              </Button>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <div
                className="flex items-center"
                role="group"
                aria-label={`Cantidad de ${item.productoNombre}`}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-r-none"
                  onClick={() => onCantidadChange(i, item.cantidad - 1)}
                  disabled={item.cantidad <= 1}
                  aria-label="Restar una unidad"
                >
                  <Minus aria-hidden="true" />
                </Button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  value={item.cantidad}
                  aria-label={`Cantidad de ${item.productoNombre}`}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 1) onCantidadChange(i, v);
                  }}
                  className="h-8 w-12 border-y border-input bg-background text-center font-mono text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-l-none"
                  onClick={() => onCantidadChange(i, item.cantidad + 1)}
                  disabled={item.cantidad >= 999}
                  aria-label="Sumar una unidad"
                >
                  <Plus aria-hidden="true" />
                </Button>
              </div>
              <p className="text-right font-mono text-sm font-semibold tabular-nums">
                {formatARS(item.subtotal)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <SeccionCarrito titulo="Clienta" id="pv-cliente">
        <div className="relative flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Input
              aria-label="Clienta"
              placeholder="Escribí un nombre o Consumidor final…"
              value={clienteNombre}
              onFocus={() => setSugerenciasAbiertas(true)}
              onBlur={() =>
                setTimeout(() => setSugerenciasAbiertas(false), 160)
              }
              onChange={(e) => {
                const v = e.target.value;
                setClienteNombre(v);
                setSugerenciasAbiertas(true);
                const coincidencia = clientes.find(
                  (c) =>
                    c.nombre.trim().toLowerCase() === v.trim().toLowerCase(),
                );
                setClienteId(coincidencia ? coincidencia.id : "__none__");
              }}
              className="h-10 pr-8 text-sm"
            />
            {clienteNombre && (
              <button
                type="button"
                aria-label="Limpiar clienta"
                onClick={() => {
                  setClienteNombre("");
                  setClienteId("__none__");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
            {sugerenciasAbiertas && clientes.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md">
                {clientes
                  .filter((c) => {
                    const q = clienteNombre.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      c.nombre.toLowerCase().includes(q) ||
                      (c.telefono ?? "").toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 8)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setClienteId(c.id);
                        setClienteNombre(c.nombre);
                        setSugerenciasAbiertas(false);
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent"
                    >
                      <span className="truncate font-medium text-foreground">
                        {c.nombre}
                      </span>
                      {c.telefono && (
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                          {c.telefono}
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <Dialog
            open={modalClienteOpen}
            onOpenChange={(open) => {
              if (open && clienteNombre.trim() && !formNombre.trim()) {
                setFormNombre(clienteNombre.trim());
              }
              setModalClienteOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button type="button" variant="outline" className="h-10">
                <Plus aria-hidden="true" />
                Ficha
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[min(95vw,400px)]">
              <DialogHeader>
                <DialogTitle>Guardar ficha de clienta</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Si querés agendar su teléfono o DNI en la base de clientas.
                </p>
              </DialogHeader>
              <div className="grid gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="modal-nombre">Nombre</Label>
                  <Input
                    id="modal-nombre"
                    placeholder="Nombre"
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="modal-telefono">Teléfono</Label>
                  <Input
                    id="modal-telefono"
                    placeholder="Teléfono"
                    type="tel"
                    inputMode="numeric"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
                <details className="group">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Más datos (opcional)
                  </summary>
                  <div className="mt-3 grid gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-dni">DNI</Label>
                      <Input
                        id="modal-dni"
                        placeholder="DNI"
                        value={formDni}
                        onChange={(e) => setFormDni(e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-email">Email</Label>
                      <Input
                        id="modal-email"
                        type="email"
                        placeholder="email@ejemplo.com"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                </details>
                <Button
                  onClick={handleCargarDatosCliente}
                  loading={guardarCliente.loading}
                  loadingText="Guardando clienta…"
                  className="h-10 w-full"
                >
                  Guardar y asignar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {clienteId !== "__none__"
            ? "Clienta vinculada de tu base."
            : clienteNombre.trim()
              ? `Se registrará a nombre de "${clienteNombre.trim()}".`
              : "Dejalo vacío para Consumidor final o escribí cualquier nombre."}
        </p>
      </SeccionCarrito>

      <SeccionCarrito titulo="Forma de pago" id="pv-cobro">
        <label className="mb-3 flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={pagoDividido}
            onChange={(e) => togglePagoDividido(e.target.checked)}
            className="size-4 rounded border-input accent-foreground"
          />
          <span>
            Dividir en dos pagos
            <span className="text-muted-foreground">
              {" "}
              · efectivo, tarjeta, transferencia o USD
            </span>
          </span>
        </label>

        {!pagoDividido ? (
          <div
            role="radiogroup"
            aria-labelledby="pv-cobro"
            className="grid grid-cols-2 gap-1.5 sm:grid-cols-3"
          >
            {METODOS_PAGO.map((m) => {
              const activo = metodoPago === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  onClick={() => setMetodoPago(m.value)}
                  className={cn(
                    "min-h-10 rounded-md border px-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 touch-manipulation",
                    activo
                      ? "border-foreground bg-accent text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <SummaryRow
              label="Total a cobrar"
              value={formatARS(totales.total)}
              valueClassName="font-semibold"
            />
            <p className="text-xs leading-snug text-muted-foreground">
              Los dos importes, en pesos (o USD × cotización), tienen que sumar
              este total.
            </p>

            {(moneda1 === "USD" || moneda2 === "USD") && (
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="cotiz-usd" className="text-xs font-medium">
                  Cotización (ARS por 1 USD)
                </Label>
                <Input
                  id="cotiz-usd"
                  inputMode="decimal"
                  value={cotizacionUsd}
                  onChange={(e) => setCotizacionUsd(e.target.value)}
                  className="h-9 w-32 text-right font-mono text-sm tabular-nums"
                  placeholder="1200"
                />
              </div>
            )}

            <div className="divide-y divide-border rounded-md border border-border">
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Pago 1</span>
                  <SelectorMoneda
                    valor={moneda1}
                    onCambiar={setMoneda1}
                    etiqueta="Moneda del pago 1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={metodoPago1} onValueChange={setMetodoPago1}>
                    <SelectTrigger
                      className="h-9 w-full text-sm"
                      aria-label="Medio del pago 1"
                    >
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
                  <Input
                    inputMode="decimal"
                    aria-label={`Importe del pago 1 ${moneda1 === "USD" ? "(USD)" : "(ARS)"}`}
                    value={montoLeg1}
                    onChange={(e) => setMontoLeg1(e.target.value)}
                    placeholder={moneda1 === "USD" ? "0.00" : "0,00"}
                    className="h-9 text-right font-mono text-sm tabular-nums"
                  />
                </div>
                <p className="flex justify-between text-xs text-muted-foreground">
                  <span>Equivale en pesos</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {formatARS(ars1Preview)}
                  </span>
                </p>
              </div>

              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Pago 2</span>
                  <SelectorMoneda
                    valor={moneda2}
                    onCambiar={setMoneda2}
                    etiqueta="Moneda del pago 2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={metodoPago2} onValueChange={setMetodoPago2}>
                    <SelectTrigger
                      className="h-9 w-full text-sm"
                      aria-label="Medio del pago 2"
                    >
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
                  <Input
                    inputMode="decimal"
                    aria-label={`Importe del pago 2 ${moneda2 === "USD" ? "(USD)" : "(ARS)"}`}
                    value={montoLeg2}
                    onChange={(e) => setMontoLeg2(e.target.value)}
                    placeholder={moneda2 === "USD" ? "0.00" : "0,00"}
                    className="h-9 text-right font-mono text-sm tabular-nums"
                  />
                </div>
                <p className="flex justify-between text-xs text-muted-foreground">
                  <span>Equivale en pesos</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {formatARS(ars2Preview)}
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-1.5" aria-live="polite">
              <SummaryRow
                label="Suma de los pagos"
                value={formatARS(sumaPreview)}
              />
              {diferencia !== BigInt(0) || !tramosValidos ? (
                <SummaryRow
                  label={diffPreview > 0 ? "Faltan" : "Sobran"}
                  value={formatARS(Math.abs(diffPreview))}
                  valueClassName="font-semibold text-num-negative"
                />
              ) : (
                <SummaryRow
                  label="Diferencia"
                  value="Cierra con el total"
                  valueClassName="font-sans text-muted-foreground"
                />
              )}
            </div>
          </div>
        )}
      </SeccionCarrito>

      <SeccionCarrito titulo="Resumen" id="pv-resumen">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="descuento-venta"
              className="text-sm text-muted-foreground"
            >
              Descuento sobre el subtotal
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id="descuento-venta"
                type="number"
                min={0}
                max={100}
                step={0.5}
                placeholder="0"
                value={descuento === 0 ? "" : descuento}
                onChange={(e) =>
                  onDescuentoChange(
                    Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                  )
                }
                className="h-9 w-20 rounded-md border border-input bg-background px-2 text-right font-mono text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-border pt-2.5">
            <SummaryRow label="Subtotal" value={formatARS(totales.subtotal)} />
            {descuento > 0 && (
              <SummaryRow
                label={`Descuento (${descuento}%)`}
                value={`− ${formatARS(totales.subtotal - totales.total)}`}
              />
            )}
            <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2.5">
              <span className="text-sm font-semibold">Total</span>
              <span className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
                {formatARS(totales.total)}
              </span>
            </div>
          </div>

          <dl className="flex flex-wrap justify-between gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
            <div className="flex gap-1.5">
              <dt>Ganancia</dt>
              <dd
                className={cn(
                  "font-mono tabular-nums",
                  totales.gananciaBruta > 0 && "text-num-positive",
                  totales.gananciaBruta < 0 && "text-num-negative",
                )}
              >
                {formatARS(totales.gananciaBruta)}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Margen</dt>
              <dd className="font-mono tabular-nums text-foreground">
                {totales.margenPorcentaje.toFixed(1)}%
              </dd>
            </div>
            {totales.deudaConsignacion > 0 && (
              <div className="flex w-full justify-between gap-1.5">
                <dt>Deuda consignación estimada</dt>
                <dd className="font-mono tabular-nums text-num-warning">
                  {formatARS(totales.deudaConsignacion)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </SeccionCarrito>

      <div className="border-t border-border p-4 sm:px-5">
        <Button
          className="h-12 w-full text-sm font-semibold"
          onClick={handleConfirmar}
          loading={isLoading}
          loadingText="Registrando venta…"
          disabled={
            pagoDividido &&
            (!tramosValidos ||
              diferencia !== BigInt(0) ||
              tramo1 <= BigInt(0) ||
              tramo2 <= BigInt(0))
          }
        >
          Confirmar venta · {formatARS(totales.total)}
        </Button>
      </div>
    </Panel>
  );
}
