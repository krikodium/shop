"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { METODO_PAGO_LABEL } from "@/lib/constants";
import { formatCurrencyDisplay } from "@/lib/formatCurrency";

interface ItemTicket {
  productoNombre: string;
  productoSku: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  esConsignacion?: boolean;
}

interface TicketVentaProps {
  numeroVenta: string;
  fecha: string;
  clienteNombre: string;
  metodoPago: string;
  items: ItemTicket[];
  subtotal: number;
  descuento: number;
  total: number;
  /** Pago dividido (opcional) */
  metodoPagoSecundario?: string | null;
  montoPago1Ars?: number | null;
  montoPago2Ars?: number | null;
  usdPago1?: number | null;
  usdPago2?: number | null;
  cotizacionUsd?: number | null;
}

function fmt(n: number) {
  const s = formatCurrencyDisplay(n) || "0,00";
  return `$ ${s}`;
}

export function TicketVenta({
  numeroVenta,
  fecha,
  clienteNombre,
  metodoPago,
  items,
  subtotal,
  descuento,
  total,
  metodoPagoSecundario,
  montoPago1Ars,
  montoPago2Ars,
  usdPago1,
  usdPago2,
  cotizacionUsd,
}: TicketVentaProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  const imprimir = () => {
    window.print();
  };

  return (
    <>
      <Button variant="outline" onClick={imprimir} className="print:hidden">
        <Printer className="size-4" aria-hidden="true" />
        Imprimir ticket
      </Button>

      {/* Documento de impresión: tokens fijados a la variante clara en
          globals.css (bloque @media print), para que el papel salga siempre
          en blanco y negro sin importar el tema de la app. */}
      <div
        id="ticket-venta"
        ref={ticketRef}
        className="hidden w-[80mm] max-w-[80mm] bg-background p-4 text-[11px] leading-tight font-mono text-foreground print:mx-auto print:block"
      >
        {/* Encabezado */}
        <div className="mb-4 border-b-2 border-foreground pb-3 text-center">
          <h1 className="text-base font-bold tracking-wide">SHOP</h1>
          <p className="mt-0.5 text-[10px] tracking-wider uppercase">Comprobante de venta</p>
        </div>

        {/* Datos de la venta */}
        <div className="mb-4 space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Venta</span>
            <span className="font-semibold">{numeroVenta}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha</span>
            <span>{new Date(fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cliente</span>
            <span className="max-w-[55%] text-right break-words">{clienteNombre}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="shrink-0 text-muted-foreground">Pago</span>
            <span className="text-right">
              {metodoPagoSecundario && montoPago1Ars != null && montoPago2Ars != null ? (
                <span className="block">
                  {METODO_PAGO_LABEL[metodoPago] ?? metodoPago}: {fmt(montoPago1Ars)}
                  {usdPago1 != null && usdPago1 > 0 && cotizacionUsd != null && (
                    <span className="block text-[9px] text-muted-foreground">
                      ({usdPago1} USD @ {Number(cotizacionUsd).toLocaleString("es-AR")})
                    </span>
                  )}
                  <span className="mt-0.5 block">
                    {METODO_PAGO_LABEL[metodoPagoSecundario] ?? metodoPagoSecundario}: {fmt(montoPago2Ars)}
                  </span>
                  {usdPago2 != null && usdPago2 > 0 && cotizacionUsd != null && (
                    <span className="block text-[9px] text-muted-foreground">
                      ({usdPago2} USD @ {Number(cotizacionUsd).toLocaleString("es-AR")})
                    </span>
                  )}
                </span>
              ) : (
                METODO_PAGO_LABEL[metodoPago] ?? metodoPago
              )}
            </span>
          </div>
        </div>

        {/* Línea separadora */}
        <div className="my-3 border-t border-dashed border-border" />

        {/* Items */}
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="border-b border-foreground">
              <th className="py-1.5 text-left font-semibold">Producto</th>
              <th className="w-8 py-1.5 text-center font-semibold">Cant</th>
              <th className="py-1.5 text-right font-semibold">P.unit</th>
              <th className="py-1.5 text-right font-semibold">Subtot</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-dashed border-border">
                <td className="py-1.5 align-top">
                  <span className="block break-words">{item.productoNombre}</span>
                  {item.esConsignacion && <span className="text-[9px] text-muted-foreground">(consig.)</span>}
                </td>
                <td className="py-1.5 text-center align-top">{item.cantidad}</td>
                <td className="py-1.5 text-right align-top tabular-nums">{fmt(item.precioUnitario)}</td>
                <td className="py-1.5 text-right align-top font-medium tabular-nums">{fmt(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="mt-4 space-y-1 border-t-2 border-foreground pt-3 text-[11px]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmt(subtotal)}</span>
          </div>
          {descuento > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Descuento</span>
              <span className="tabular-nums">- {fmt(descuento)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-dashed border-border pt-2 text-sm font-bold">
            <span>TOTAL</span>
            <span className="tabular-nums">{fmt(total)}</span>
          </div>
        </div>

        {/* Pie */}
        <div className="mt-6 border-t border-dashed border-border pt-4 text-center">
          <p className="text-[9px] text-muted-foreground">Gracias por su compra</p>
          {items.some((i) => i.esConsignacion) && (
            <p className="mt-0.5 text-[9px] text-muted-foreground">* Productos en consignación</p>
          )}
        </div>

        {/* Línea de corte */}
        <div className="mt-6 border-t-2 border-dashed border-border pt-2 text-center">
          <span className="text-[8px] text-muted-foreground">— corte —</span>
        </div>
      </div>
    </>
  );
}
