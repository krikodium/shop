"use client";

import { useState, useEffect } from "react";
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
import type { ItemVentaInput } from "@/types";
import type { TotalesVenta } from "@/types";

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
  onProcesar: (opts: { metodoPago: string; clienteId?: string | null; clienteNombre?: string }) => Promise<void>;
  isLoading?: boolean;
}

const METODOS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo", short: "Efectivo" },
  { value: "TARJETA_DEBITO", label: "Tarjeta débito", short: "Débito" },
  { value: "TARJETA_CREDITO", label: "Tarjeta crédito", short: "Crédito" },
  { value: "TRANSFERENCIA", label: "Transferencia", short: "Transf." },
  { value: "MERCADOPAGO", label: "Mercado Pago", short: "MP" },
  { value: "MULTIPLE", label: "Múltiple", short: "Múltiple" },
] as const;

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
    } catch (err) {
      setErrorCliente(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setGuardandoCliente(false);
    }
  };

  const handleConfirmar = async () => {
    const cid = clienteId === "__none__" ? null : clienteId;
    const cnom = cid ? (clientes.find((c) => c.id === cid)?.nombre ?? "") : clienteNombre;
    await onProcesar({
      metodoPago,
      clienteId: cid,
      clienteNombre: cnom || undefined,
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
        <p>Carrito vacío</p>
        <p className="mt-2 text-sm">Buscá productos y agregalos para iniciar la venta</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-3 md:p-4">
        <h3 className="mb-2 text-sm font-semibold md:mb-3">Carrito</h3>
        <ul className="max-h-48 space-y-1.5 overflow-auto md:max-h-64 md:space-y-2">
          {items.map((item, i) => (
            <li
              key={`${item.productoId}-${i}`}
              className="flex items-center justify-between gap-2 rounded border p-2 text-sm touch-manipulation"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium line-clamp-1">{item.productoNombre}</span>
                <span className="text-muted-foreground"> {item.productoSku}</span>
                {item.esConsignacion && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    C
                  </Badge>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={item.cantidad}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 1) onCantidadChange(i, v);
                  }}
                  className="w-12 rounded border px-1 py-1 text-center text-base tabular-nums md:w-14 md:py-0.5"
                />
                <span className="w-14 text-right font-medium tabular-nums md:w-16">
                  ${item.subtotal.toFixed(2)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 shrink-0 p-0 text-destructive touch-manipulation md:h-7 md:w-7"
                  onClick={() => onQuitar(i)}
                >
                  ×
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-3 md:p-4">
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
                <div className="grid gap-3 py-4">
                  <div>
                    <Label htmlFor="modal-nombre">Nombre</Label>
                    <Input
                      id="modal-nombre"
                      placeholder="Nombre"
                      value={formNombre}
                      onChange={(e) => setFormNombre(e.target.value)}
                      className="min-h-11 text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="modal-telefono">Teléfono</Label>
                    <Input
                      id="modal-telefono"
                      placeholder="Teléfono"
                      type="tel"
                      inputMode="numeric"
                      value={formTelefono}
                      onChange={(e) => setFormTelefono(e.target.value)}
                      className="min-h-11 text-base"
                    />
                  </div>
                  <details className="group">
                    <summary className="cursor-pointer text-sm text-muted-foreground">
                      Más datos (opcional)
                    </summary>
                    <div className="mt-3 grid gap-3">
                      <div>
                        <Label htmlFor="modal-dni">DNI</Label>
                        <Input
                          id="modal-dni"
                          placeholder="DNI"
                          value={formDni}
                          onChange={(e) => setFormDni(e.target.value)}
                          className="min-h-11"
                        />
                      </div>
                      <div>
                        <Label htmlFor="modal-email">Email</Label>
                        <Input
                          id="modal-email"
                          type="email"
                          placeholder="email@ejemplo.com"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          className="min-h-11"
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
                    className="min-h-11 w-full touch-manipulation"
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
              className="mt-2 min-h-10 text-base md:mt-1"
            />
          )}
        </div>

        {/* Método de pago: chips en mobile */}
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

        {/* Descuento compacto */}
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs md:text-sm">Descuento ($)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={descuento}
            onChange={(e) => onDescuentoChange(parseFloat(e.target.value) || 0)}
            className="w-20 rounded border px-2 py-1.5 text-right text-base tabular-nums min-h-10 md:w-24 md:py-1"
          />
        </div>

        <div className="space-y-0.5 border-t pt-3">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span className="tabular-nums">${totales.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-base">
            <span>Total</span>
            <span className="tabular-nums">${totales.total.toFixed(2)}</span>
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
          className="h-12 w-full text-base font-semibold touch-manipulation md:h-10"
          size="lg"
          onClick={handleConfirmar}
          disabled={isLoading}
        >
          {isLoading ? "Procesando..." : "Confirmar venta"}
        </Button>
      </div>
    </div>
  );
}
