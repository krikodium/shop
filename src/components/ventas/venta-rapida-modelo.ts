import {
  convertirUsd,
  escala,
  importe,
} from "@/components/punto-venta/dinero-venta";
import type { VentaFormValues } from "@/lib/validaciones/ventaSchema";

export type ProductoRapido = {
  id: string;
  nombre: string;
  sku: string;
  precioVenta: string;
  precioVentaUsd?: string | null;
  stockActual: number;
  activo?: boolean;
};
export type LineaRapida = { producto: ProductoRapido; cantidad: string };
export type MetodoRapido =
  | "EFECTIVO"
  | "TARJETA_DEBITO"
  | "TARJETA_CREDITO"
  | "TRANSFERENCIA"
  | "MERCADOPAGO";
export type DatosVentaRapida = {
  lineas: LineaRapida[];
  cliente: { id?: string; nombre: string; telefono: string; email: string };
  descuento: string;
  cobro: "total" | "parte" | "pendiente";
  montoCobrado: string;
  metodo: MetodoRapido | "";
  /** Segunda forma de pago cuando lo cobrado hoy se divide entre dos medios. */
  metodo2?: MetodoRapido | "";
  /** Importe que entra por `metodo`; el resto del cobro va por `metodo2`. */
  montoMetodo1?: string;
  /** Cotización ARS por 1 USD: convierte los productos en USD y los cobros en dólares. */
  cotizacion?: string;
  /** Dólares que entregó la clienta; el resto del cobro va por `metodo` en pesos. */
  usdRecibidos?: string;
  /** Cómo entraron esos dólares (billete o transferencia). */
  metodoUsd?: "EFECTIVO" | "TRANSFERENCIA";
  notas: string;
};

/** ¿Algún renglón se vende en dólares? Entonces la venta necesita cotización. */
export function hayProductosUsd(lineas: LineaRapida[]) {
  return lineas.some((l) => l.producto.precioVentaUsd != null);
}

/** Cotización normalizada a 4 decimales ("1200,5" → "1200.5000"), o null si no es válida. */
export function cotizacionValida(texto: string | undefined): string | null {
  try {
    const centesimas = escala((texto ?? "").trim(), 4);
    if (centesimas <= BigInt(0) || centesimas > escala("99999999", 4)) return null;
    return `${centesimas / BigInt(10000)}.${(centesimas % BigInt(10000)).toString().padStart(4, "0")}`;
  } catch {
    return null;
  }
}

/**
 * Precio unitario en centavos de ARS. Un producto en USD se convierte con la
 * cotización de la venta, igual que lo hace el servidor (mitad hacia arriba).
 * Devuelve null si falta una cotización válida para un producto en USD.
 */
export function precioUnitarioArs(
  producto: ProductoRapido,
  cotizacion?: string,
): bigint | null {
  if (producto.precioVentaUsd == null) return escala(producto.precioVenta);
  const tc = cotizacionValida(cotizacion);
  return tc ? convertirUsd(producto.precioVentaUsd, tc) : null;
}

export function totalVentaRapida(
  lineas: LineaRapida[],
  descuento: string,
  cotizacion?: string,
) {
  if (hayProductosUsd(lineas) && !cotizacionValida(cotizacion))
    throw new Error(
      "Indicá la cotización del dólar: hay productos con precio en USD.",
    );
  const subtotal = lineas.reduce((sum, linea) => {
    if (
      !/^\d+$/.test(linea.cantidad) ||
      Number(linea.cantidad) < 1 ||
      Number(linea.cantidad) > 10000
    )
      throw new Error(
        "Revisá las cantidades: deben ser enteros entre 1 y 10.000.",
      );
    return (
      sum + precioUnitarioArs(linea.producto, cotizacion)! * BigInt(linea.cantidad)
    );
  }, BigInt(0));
  const rebaja = escala(descuento.trim() || "0");
  if (rebaja > subtotal)
    throw new Error(
      "El descuento no puede superar el importe de los productos.",
    );
  return { subtotal, descuento: rebaja, total: subtotal - rebaja };
}

/** Solo calcula la confirmación visual: el servidor vuelve a leer precios y stock. */
export function prepararVentaRapida(
  datos: DatosVentaRapida,
): Omit<VentaFormValues, "claveIdempotencia"> & {
  cobroInicial: NonNullable<VentaFormValues["cobroInicial"]>;
} {
  const nombre = datos.cliente.nombre.trim(),
    telefono = datos.cliente.telefono.trim(),
    email = datos.cliente.email.trim();
  if (!nombre) throw new Error("Completá el nombre de la clienta.");
  if (!telefono && !email)
    throw new Error(
      "Agregá un teléfono o email para poder contactar a la clienta.",
    );
  if (nombre.length > 200 || telefono.length > 100 || email.length > 200)
    throw new Error("Revisá la extensión de los datos de la clienta.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Revisá el email de la clienta.");
  if (!datos.lineas.length) throw new Error("Agregá al menos un producto.");
  if (datos.lineas.length > 200)
    throw new Error("Una venta admite hasta 200 productos distintos.");
  for (const { producto, cantidad } of datos.lineas) {
    if (
      producto.activo === false ||
      (producto.precioVentaUsd == null &&
        escala(producto.precioVenta) <= BigInt(0))
    )
      throw new Error(
        `Revisá el precio y la disponibilidad de ${producto.nombre} antes de venderlo.`,
      );
    if (Number(cantidad) > producto.stockActual)
      throw new Error(`No hay stock suficiente de ${producto.nombre}.`);
  }
  const { total, descuento } = totalVentaRapida(
    datos.lineas,
    datos.descuento,
    datos.cotizacion,
  );
  if (total <= BigInt(0) || total > escala("99999999.99"))
    throw new Error("El total debe ser positivo y menor a ARS 100.000.000.");
  const cobrado =
    datos.cobro === "total"
      ? total
      : datos.cobro === "pendiente"
        ? BigInt(0)
        : escala(datos.montoCobrado);
  if (datos.cobro === "parte" && (cobrado <= BigInt(0) || cobrado >= total))
    throw new Error(
      "Indicá un cobro mayor a cero y menor al total, o elegí «Cobró todo».",
    );

  // Cobro en dólares: lo que entregó la clienta en USD se convierte con la
  // cotización de la venta y el resto del cobro se paga en pesos.
  const usdTexto = (datos.usdRecibidos ?? "").trim();
  const tc = cotizacionValida(datos.cotizacion);
  let usd: { monto: string; ars: bigint } | null = null;
  if (usdTexto) {
    if (cobrado <= BigInt(0))
      throw new Error(
        "Para recibir dólares tenés que cobrar algo hoy. Si queda todo a cuenta, no hay nada que cobrar.",
      );
    if (datos.metodo2)
      throw new Error(
        "Elegí dólares + pesos o dividir en pesos, no las dos cosas a la vez.",
      );
    if (!tc) throw new Error("Indicá la cotización del dólar para cobrar en USD.");
    const montoUsd = escala(usdTexto);
    if (montoUsd <= BigInt(0))
      throw new Error("Los dólares recibidos deben ser mayores a cero.");
    const ars = convertirUsd(importe(montoUsd), tc);
    if (ars > cobrado)
      throw new Error(
        "Los dólares recibidos superan lo que se cobra hoy. Revisá el importe o la cotización.",
      );
    usd = { monto: importe(montoUsd), ars };
  }
  const restoArs = usd ? cobrado - usd.ars : cobrado;
  if (restoArs > BigInt(0) && !datos.metodo)
    throw new Error("Elegí cómo pagó la clienta.");
  // Sin cobro no se registra PagoVenta. EFECTIVO solo satisface el campo técnico de Venta.
  const metodo = datos.metodo || "EFECTIVO";
  const metodoUsd = datos.metodoUsd ?? "EFECTIVO";
  // Pago dividido: el servidor exige que los dos tramos sumen exactamente lo
  // cobrado hoy, así que acá se calcula el segundo por resta y nunca a mano.
  const division: Pick<
    VentaFormValues,
    | "metodoPagoSecundario"
    | "montoPago1Ars"
    | "montoPago2Ars"
    | "usdPago1"
    | "cotizacionUsd"
  > = {};
  if (usd && restoArs > BigInt(0)) {
    division.metodoPagoSecundario = metodo;
    division.montoPago1Ars = importe(usd.ars);
    division.montoPago2Ars = importe(restoArs);
    division.usdPago1 = usd.monto;
    division.cotizacionUsd = tc;
  } else if (datos.metodo2) {
    if (cobrado <= BigInt(0))
      throw new Error(
        "Para dividir el pago tenés que cobrar algo hoy. Si queda todo a cuenta, no hay nada que dividir.",
      );
    if (datos.metodo2 === metodo)
      throw new Error("Elegí dos formas de pago distintas para dividir el cobro.");
    const crudo = (datos.montoMetodo1 ?? "").trim();
    if (!crudo)
      throw new Error("Indicá cuánto entra por la primera forma de pago.");
    const tramo1 = escala(crudo);
    const tramo2 = cobrado - tramo1;
    if (tramo1 <= BigInt(0) || tramo2 <= BigInt(0))
      throw new Error(
        "Cada forma de pago tiene que recibir un importe mayor a cero.",
      );
    division.metodoPagoSecundario = datos.metodo2;
    division.montoPago1Ars = importe(tramo1);
    division.montoPago2Ars = importe(tramo2);
  }
  const metodoPrincipal = usd ? metodoUsd : metodo;
  return {
    ...division,
    ...(datos.cliente.id
      ? {
          clienteId: datos.cliente.id,
          clienteTelefono: telefono || null,
          clienteEmail: email || null,
        }
      : { nuevoCliente: { nombre, telefono, email } }),
    items: datos.lineas.map(({ producto, cantidad }) => ({
      productoId: producto.id,
      cantidad: Number(cantidad),
      modalidad: "INMEDIATA" as const,
    })),
    descuento: importe(descuento),
    totalEsperado: importe(total),
    metodoPago: metodoPrincipal,
    ...(hayProductosUsd(datos.lineas) && tc ? { cotizacionItemsUsd: tc } : {}),
    cobroInicial: {
      montoArs: importe(cobrado),
      metodoPago: metodoPrincipal,
      // Un cobro íntegro en dólares viaja con su equivalente para que quede el rastro.
      ...(usd && restoArs === BigInt(0)
        ? { montoUsd: usd.monto, cotizacionUsd: tc }
        : {}),
    },
    notas: datos.notas.trim(),
  };
}
