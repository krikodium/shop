import { escala, importe } from "@/components/punto-venta/dinero-venta";
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
  notas: string;
};

export function totalVentaRapida(lineas: LineaRapida[], descuento: string) {
  const subtotal = lineas.reduce((sum, linea) => {
    if (
      !/^\d+$/.test(linea.cantidad) ||
      Number(linea.cantidad) < 1 ||
      Number(linea.cantidad) > 10000
    )
      throw new Error(
        "Revisá las cantidades: deben ser enteros entre 1 y 10.000.",
      );
    return sum + escala(linea.producto.precioVenta) * BigInt(linea.cantidad);
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
      producto.precioVentaUsd != null ||
      escala(producto.precioVenta) <= BigInt(0)
    )
      throw new Error(
        `Revisá el precio y la disponibilidad de ${producto.nombre} antes de venderlo.`,
      );
    if (Number(cantidad) > producto.stockActual)
      throw new Error(`No hay stock suficiente de ${producto.nombre}.`);
  }
  const { total, descuento } = totalVentaRapida(datos.lineas, datos.descuento);
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
  if (cobrado > BigInt(0) && !datos.metodo)
    throw new Error("Elegí cómo pagó la clienta.");
  // Sin cobro no se registra PagoVenta. EFECTIVO solo satisface el campo técnico de Venta.
  const metodo = datos.metodo || "EFECTIVO";
  // Pago dividido: el servidor exige que los dos tramos sumen exactamente lo
  // cobrado hoy, así que acá se calcula el segundo por resta y nunca a mano.
  const division: Pick<
    VentaFormValues,
    "metodoPagoSecundario" | "montoPago1Ars" | "montoPago2Ars"
  > = {};
  if (datos.metodo2) {
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
    metodoPago: metodo,
    cobroInicial: { montoArs: importe(cobrado), metodoPago: metodo },
    notas: datos.notas.trim(),
  };
}
