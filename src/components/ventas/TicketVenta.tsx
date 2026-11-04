"use client";

import { useRef, useState } from "react";
import { Printer, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { escala, importe } from "@/components/punto-venta/dinero-venta";
import { METODO_PAGO_LABEL } from "@/lib/constants";
import { formatARS, formatUSD } from "@/lib/formatCurrency";
import { haySaldo } from "@/components/ventas/usePagosVenta";

/** Los importes pueden llegar como string de Prisma o como number: acá solo se muestran. */
type Importe = string | number;

interface ItemTicket {
  productoNombre: string;
  productoSku: string;
  cantidad: number;
  precioUnitario: Importe;
  subtotal: Importe;
  /** Precio de catálogo en USD si el producto se vendió en dólares. */
  precioUnitarioUsd?: Importe | null;
  esConsignacion?: boolean;
}

interface PagoTicket {
  metodoPago: string;
  montoArs: Importe;
  montoUsd?: Importe | null;
  cotizacionUsd?: Importe | null;
}

interface TicketVentaProps {
  numeroVenta: string;
  fecha: string;
  clienteNombre: string;
  /** Método principal: solo se usa si no llegan los `pagos` detallados. */
  metodoPago: string;
  items: ItemTicket[];
  subtotal: Importe;
  descuento: Importe;
  total: Importe;
  /** Cotización con la que se convirtieron los productos en USD. */
  cotizacionItemsUsd?: Importe | null;
  /** Cobros registrados (fuente de verdad del medio y la moneda de pago). */
  pagos?: PagoTicket[];
  /** Pago dividido legacy: se usa si no hay `pagos`. */
  metodoPagoSecundario?: string | null;
  montoPago1Ars?: Importe | null;
  montoPago2Ars?: Importe | null;
  usdPago1?: Importe | null;
  usdPago2?: Importe | null;
  cotizacionUsd?: Importe | null;
  /** Strings de dos decimales tal cual los calcula el servidor. */
  cobrado?: string | null;
  saldoPendiente?: string | null;
  /** `inline`: el ticket se ve en la página. `boton`: se abre en un diálogo. */
  variante?: "boton" | "inline";
}

const ars = (n: Importe) => formatARS(n);
const usd = (n: Importe) => formatUSD(n);
const metodo = (m: string) => METODO_PAGO_LABEL[m] ?? m;
const tc = (n: Importe) =>
  Number(n).toLocaleString("es-AR", { maximumFractionDigits: 4 });

/** Línea punteada de corte entre secciones del papel. */
function Corte() {
  return <div className="my-3 border-t border-dashed border-border" />;
}

function Fila({
  izquierda,
  derecha,
  fuerte,
}: {
  izquierda: React.ReactNode;
  derecha: React.ReactNode;
  fuerte?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 ${fuerte ? "font-bold" : ""}`}
    >
      <span className="min-w-0 break-words">{izquierda}</span>
      <span className="shrink-0 tabular-nums">{derecha}</span>
    </div>
  );
}

function Papel({
  innerRef,
  ...t
}: TicketVentaProps & { innerRef?: React.Ref<HTMLDivElement> }) {
  const conPagos = t.pagos && t.pagos.length > 0;
  const hayUsd = t.items.some((i) => i.precioUnitarioUsd != null);

  // Resumen por moneda de origen del precio, en centavos enteros (sin floats).
  let unidades = 0;
  let enPesos = BigInt(0);
  let enDolaresArs = BigInt(0);
  let enDolaresUsd = BigInt(0);
  try {
    for (const i of t.items) {
      unidades += i.cantidad;
      if (i.precioUnitarioUsd != null) {
        enDolaresArs += escala(String(i.subtotal));
        enDolaresUsd += escala(String(i.precioUnitarioUsd)) * BigInt(i.cantidad);
      } else enPesos += escala(String(i.subtotal));
    }
  } catch {
    /* Si algún importe no se puede leer, se omite el resumen por moneda. */
  }

  const pagado = t.saldoPendiente != null && !haySaldo(t.saldoPendiente);

  return (
    <div
      ref={innerRef}
      data-ticket-venta
      className="mx-auto w-[80mm] max-w-full bg-background px-5 pt-5 pb-7 font-mono text-[11px] leading-snug text-foreground shadow-md"
      style={{
        // Borde inferior dentado, como el corte de una impresora térmica.
        WebkitMask:
          "conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom/12px 100% repeat-x",
        mask: "conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom/12px 100% repeat-x",
      }}
    >
      <div className="text-center">
        <h1 className="text-lg font-bold tracking-[0.3em]">SHOP</h1>
        <p className="mt-0.5 text-[9px] tracking-widest uppercase">
          Comprobante de venta · No fiscal
        </p>
      </div>

      <Corte />

      <div className="space-y-1">
        <Fila izquierda="Venta" derecha={<b>{t.numeroVenta}</b>} />
        <Fila
          izquierda="Fecha"
          derecha={new Date(t.fecha).toLocaleString("es-AR", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        />
        <Fila izquierda="Cliente" derecha={t.clienteNombre} />
      </div>

      <Corte />

      <ul className="space-y-2.5">
        {t.items.map((item, i) => (
          <li key={i}>
            <p className="font-semibold break-words">{item.productoNombre}</p>
            <p className="text-[9px] text-muted-foreground">
              {item.productoSku}
              {item.esConsignacion ? " · consignación" : ""}
            </p>
            <Fila
              izquierda={
                <>
                  {item.cantidad} × {ars(item.precioUnitario)}
                </>
              }
              derecha={ars(item.subtotal)}
            />
            {item.precioUnitarioUsd != null && (
              <p className="text-[9px] text-muted-foreground">
                Precio en dólares: {usd(item.precioUnitarioUsd)} c/u
                {t.cotizacionItemsUsd != null &&
                  ` × cotiz. ${tc(t.cotizacionItemsUsd)}`}
              </p>
            )}
          </li>
        ))}
      </ul>

      <Corte />

      <div className="space-y-1">
        <Fila izquierda="Subtotal" derecha={ars(t.subtotal)} />
        {Number(t.descuento) > 0 && (
          <Fila izquierda="Descuento" derecha={`− ${ars(t.descuento)}`} />
        )}
      </div>
      <div className="mt-2 border-y-2 border-foreground py-1.5 text-sm">
        <Fila izquierda="TOTAL" derecha={ars(t.total)} fuerte />
      </div>

      {/* Resumen: cuántas unidades y, si se mezclaron monedas, qué parte
          del total salió de productos en pesos y cuál de productos en dólares. */}
      <div className="mt-3 rounded-sm border border-border p-2 text-[10px]">
        <p className="mb-1 font-bold tracking-widest uppercase">Resumen</p>
        <Fila
          izquierda="Productos"
          derecha={`${t.items.length} (${unidades} u.)`}
        />
        {hayUsd && (
          <>
            <Fila izquierda="En pesos" derecha={ars(importe(enPesos))} />
            <Fila
              izquierda={`En dólares (${usd(importe(enDolaresUsd))})`}
              derecha={ars(importe(enDolaresArs))}
            />
            {t.cotizacionItemsUsd != null && (
              <Fila
                izquierda="Cotización USD"
                derecha={`$ ${tc(t.cotizacionItemsUsd)}`}
              />
            )}
          </>
        )}
      </div>

      <Corte />

      <p className="mb-1 text-[9px] font-bold tracking-widest uppercase">
        Cobros
      </p>
      <div className="space-y-1.5">
        {conPagos ? (
          t.pagos!.map((p, i) => (
            <div key={i}>
              <Fila izquierda={metodo(p.metodoPago)} derecha={ars(p.montoArs)} />
              {p.montoUsd != null && (
                <p className="text-[9px] text-muted-foreground">
                  Recibidos {usd(p.montoUsd)}
                  {p.cotizacionUsd != null && ` a ${tc(p.cotizacionUsd)}`}
                </p>
              )}
            </div>
          ))
        ) : t.pagos !== undefined ? (
          <p className="text-[9px] text-muted-foreground">Sin cobros registrados</p>
        ) : t.metodoPagoSecundario &&
          t.montoPago1Ars != null &&
          t.montoPago2Ars != null ? (
          <>
            <div>
              <Fila
                izquierda={metodo(t.metodoPago)}
                derecha={ars(t.montoPago1Ars)}
              />
              {t.usdPago1 != null && Number(t.usdPago1) > 0 && (
                <p className="text-[9px] text-muted-foreground">
                  Recibidos {usd(t.usdPago1)}
                  {t.cotizacionUsd != null && ` a ${tc(t.cotizacionUsd)}`}
                </p>
              )}
            </div>
            <div>
              <Fila
                izquierda={metodo(t.metodoPagoSecundario)}
                derecha={ars(t.montoPago2Ars)}
              />
              {t.usdPago2 != null && Number(t.usdPago2) > 0 && (
                <p className="text-[9px] text-muted-foreground">
                  Recibidos {usd(t.usdPago2)}
                  {t.cotizacionUsd != null && ` a ${tc(t.cotizacionUsd)}`}
                </p>
              )}
            </div>
          </>
        ) : (
          <Fila izquierda={metodo(t.metodoPago)} derecha={ars(t.total)} />
        )}
        {t.cobrado != null && (
          <Fila izquierda="Cobrado" derecha={ars(t.cobrado)} fuerte />
        )}
      </div>
      {/* El saldo se decide comparando el string del servidor contra "0.00". */}
      {haySaldo(t.saldoPendiente) ? (
        <div className="mt-2 border-2 border-foreground px-2 py-1 text-sm">
          <Fila
            izquierda="SALDO PENDIENTE"
            derecha={ars(t.saldoPendiente!)}
            fuerte
          />
        </div>
      ) : pagado ? (
        <p className="mt-2 border border-foreground py-1 text-center text-[10px] font-bold tracking-[0.3em]">
          ✔ PAGADO
        </p>
      ) : null}

      <Corte />

      <p className="text-center text-[10px]">¡Gracias por su compra!</p>
      {t.items.some((i) => i.esConsignacion) && (
        <p className="mt-0.5 text-center text-[9px] text-muted-foreground">
          * Productos en consignación
        </p>
      )}
    </div>
  );
}

export function TicketVenta(props: TicketVentaProps) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /** Imprime en una ventana aparte, con los estilos de la app y sin el resto de la pantalla. */
  const imprimir = () => {
    const nodo = ref.current;
    if (!nodo) return;
    const ventana = window.open("", "_blank", "width=420,height=720");
    if (!ventana) {
      window.print();
      return;
    }
    // Se clonan nodos (no se arma HTML en texto): lo que escribió el usuario
    // nunca se reinterpreta como marcado.
    const doc = ventana.document;
    doc.title = `Ticket ${props.numeroVenta}`;
    document
      .querySelectorAll('link[rel="stylesheet"], style')
      .forEach((n) => doc.head.appendChild(doc.importNode(n, true)));
    const ajustes = doc.createElement("style");
    ajustes.textContent =
      "@page{size:80mm auto;margin:0}html,body{margin:0;background:#fff}[data-ticket-venta]{box-shadow:none!important}";
    doc.head.appendChild(ajustes);
    doc.body.appendChild(doc.importNode(nodo, true));
    setTimeout(() => {
      ventana.focus();
      ventana.print();
    }, 400);
  };

  if (props.variante === "inline")
    return (
      <div className="space-y-4">
        <Papel {...props} innerRef={ref} />
        <div className="flex justify-center">
          <Button variant="outline" onClick={imprimir}>
            <Printer className="size-4" aria-hidden="true" />
            Imprimir ticket
          </Button>
        </div>
      </div>
    );

  return (
    <>
      <Button variant="outline" onClick={() => setAbierto(true)}>
        <Receipt className="size-4" aria-hidden="true" />
        Ver ticket
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-muted sm:max-w-sm">
          <DialogTitle className="sr-only">Ticket {props.numeroVenta}</DialogTitle>
          <DialogDescription className="sr-only">
            Comprobante de la venta, listo para imprimir.
          </DialogDescription>
          <div className="pt-4">
            <Papel {...props} innerRef={ref} />
          </div>
          <div className="flex justify-center">
            <Button onClick={imprimir}>
              <Printer className="size-4" aria-hidden="true" />
              Imprimir ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
