"use client";

import { useRef } from "react";
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
      <Button variant="outline" size="sm" onClick={imprimir} className="print:hidden">
        🖨️ Imprimir ticket
      </Button>

      <div
        id="ticket-venta"
        ref={ticketRef}
        className="hidden print:block w-[80mm] max-w-[80mm] mx-auto p-4 text-[11px] font-mono bg-white text-black leading-tight"
      >
        {/* Encabezado */}
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <h1 className="text-base font-bold tracking-wide">SHOP</h1>
          <p className="text-[10px] uppercase tracking-wider mt-0.5">Comprobante de venta</p>
        </div>

        {/* Datos de la venta */}
        <div className="space-y-1.5 text-[11px] mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Venta</span>
            <span className="font-semibold">{numeroVenta}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Fecha</span>
            <span>{new Date(fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Cliente</span>
            <span className="text-right max-w-[55%] break-words">{clienteNombre}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-gray-600 shrink-0">Pago</span>
            <span className="text-right">
              {metodoPagoSecundario && montoPago1Ars != null && montoPago2Ars != null ? (
                <span className="block">
                  {METODO_PAGO_LABEL[metodoPago] ?? metodoPago}: {fmt(montoPago1Ars)}
                  {usdPago1 != null && usdPago1 > 0 && cotizacionUsd != null && (
                    <span className="block text-[9px] text-gray-500">
                      ({usdPago1} USD @ {Number(cotizacionUsd).toLocaleString("es-AR")})
                    </span>
                  )}
                  <span className="mt-0.5 block">
                    {METODO_PAGO_LABEL[metodoPagoSecundario] ?? metodoPagoSecundario}: {fmt(montoPago2Ars)}
                  </span>
                  {usdPago2 != null && usdPago2 > 0 && cotizacionUsd != null && (
                    <span className="block text-[9px] text-gray-500">
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
        <div className="border-t border-dashed border-gray-400 my-3" />

        {/* Items */}
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left py-1.5 font-semibold">Producto</th>
              <th className="text-center py-1.5 w-8 font-semibold">Cant</th>
              <th className="text-right py-1.5 font-semibold">P.unit</th>
              <th className="text-right py-1.5 font-semibold">Subtot</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-dashed border-gray-300">
                <td className="py-1.5 align-top">
                  <span className="block break-words">{item.productoNombre}</span>
                  {item.esConsignacion && (
                    <span className="text-[9px] text-gray-500">(consig.)</span>
                  )}
                </td>
                <td className="text-center py-1.5 align-top">{item.cantidad}</td>
                <td className="text-right py-1.5 align-top tabular-nums">{fmt(item.precioUnitario)}</td>
                <td className="text-right py-1.5 align-top tabular-nums font-medium">{fmt(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="border-t-2 border-black mt-4 pt-3 space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmt(subtotal)}</span>
          </div>
          {descuento > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Descuento</span>
              <span className="tabular-nums">- {fmt(descuento)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm pt-2 mt-2 border-t border-dashed">
            <span>TOTAL</span>
            <span className="tabular-nums">{fmt(total)}</span>
          </div>
        </div>

        {/* Pie */}
        <div className="mt-6 pt-4 border-t border-dashed text-center">
          <p className="text-[9px] text-gray-500">
            Gracias por su compra
          </p>
          {items.some((i) => i.esConsignacion) && (
            <p className="text-[9px] text-gray-500 mt-0.5">
              * Productos en consignación
            </p>
          )}
        </div>

        {/* Línea de corte */}
        <div className="mt-6 pt-2 border-t-2 border-dashed border-gray-400 text-center">
          <span className="text-[8px] text-gray-400">— corte —</span>
        </div>
      </div>
    </>
  );
}
