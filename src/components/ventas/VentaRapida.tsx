"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Figure, FigureGrid } from "@/components/ui/figure";
import { cn } from "@/lib/utils";
import { formatARS, formatUSD } from "@/lib/formatCurrency";
import {
  convertirUsd,
  escala,
  importe,
} from "@/components/punto-venta/dinero-venta";
import { TicketVenta } from "@/components/ventas/TicketVenta";
import {
  cotizacionValida,
  hayProductosUsd,
  precioUnitarioArs,
  prepararVentaRapida,
  totalVentaRapida,
  type LineaRapida,
  type MetodoRapido,
  type ProductoRapido,
} from "./venta-rapida-modelo";

type Clienta = {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
};
const METODOS: { id: MetodoRapido; nombre: string }[] = [
  { id: "EFECTIVO", nombre: "Efectivo" },
  { id: "TRANSFERENCIA", nombre: "Transferencia" },
  { id: "TARJETA_DEBITO", nombre: "Débito" },
  { id: "TARJETA_CREDITO", nombre: "Crédito" },
  { id: "MERCADOPAGO", nombre: "Mercado Pago" },
];
const vacia = {
  id: undefined as string | undefined,
  nombre: "",
  telefono: "",
  email: "",
};

const PASOS = [
  { numero: 1, titulo: "Clienta", detalle: "Quién compra" },
  { numero: 2, titulo: "Productos", detalle: "Qué se lleva" },
  { numero: 3, titulo: "Cobro", detalle: "Cómo paga" },
] as const;

const NOMBRE_METODO = (id: string) =>
  METODOS.find((m) => m.id === id)?.nombre ?? id;

/**
 * Barra de pasos. Un paso por vez en pantalla: el resumen de la derecha es el
 * que muestra el conjunto, así ninguna pantalla acumula las tres etapas juntas.
 */
function Pasos({
  paso,
  completo,
  habilitado,
  onIr,
}: {
  paso: number;
  completo: (numero: number) => boolean;
  habilitado: (numero: number) => boolean;
  onIr: (numero: number) => void;
}) {
  return (
    <ol className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
      {PASOS.map((p) => {
        const actual = p.numero === paso;
        const hecho = !actual && completo(p.numero);
        const puede = habilitado(p.numero);
        return (
          <li key={p.numero} className="min-w-0 bg-card">
            <button
              type="button"
              onClick={() => onIr(p.numero)}
              disabled={!puede}
              aria-current={actual ? "step" : undefined}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-[--dur-fast]",
                actual ? "bg-surface/60" : puede && "hover:bg-muted/40",
                !puede && "cursor-not-allowed opacity-55",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs tabular-nums",
                  actual
                    ? "border-foreground bg-foreground text-background"
                    : hecho
                      ? "border-foreground text-foreground"
                      : "border-border text-muted-foreground",
                )}
              >
                {hecho ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : (
                  p.numero
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {p.titulo}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {p.detalle}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Rótulo de las celdas del resumen: mismo tratamiento que `Figure`. */
function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </p>
  );
}

export function VentaRapida() {
  const [paso, setPaso] = useState(1);
  const [clienta, setClienta] = useState(vacia);
  const [buscarClienta, setBuscarClienta] = useState("");
  const [clientas, setClientas] = useState<Clienta[]>([]);
  const [errorClientas, setErrorClientas] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<ProductoRapido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState("");
  const [revision, setRevision] = useState(0);
  const [lineas, setLineas] = useState<LineaRapida[]>([]);
  const [descuento, setDescuento] = useState("");
  const [cobro, setCobro] = useState<"total" | "parte" | "pendiente">("total");
  const [montoCobrado, setMontoCobrado] = useState("");
  const [metodo, setMetodo] = useState<MetodoRapido | "">("");
  const [metodo2, setMetodo2] = useState<MetodoRapido | "">("");
  const [montoMetodo1, setMontoMetodo1] = useState("");
  const [cotizacion, setCotizacion] = useState("");
  const [usdRecibidos, setUsdRecibidos] = useState("");
  const [metodoUsd, setMetodoUsd] = useState<"EFECTIVO" | "TRANSFERENCIA">(
    "EFECTIVO",
  );
  const [notas, setNotas] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [incierta, setIncierta] = useState(false);
  const [venta, setVenta] = useState<{
    id: string;
    numeroVenta: string;
    total: string;
    cliente?: { nombre: string } | null;
    /** Lo que el servidor efectivamente registró, no lo que pedimos cobrar. */
    cobrado: string | null;
    saldo: string | null;
    medios: { metodoPago: string; montoArs: string }[];
    registro: Record<string, unknown>;
  } | null>(null);
  const bloqueo = useRef(false);
  const pendiente = useRef<{
    contenido: ReturnType<typeof prepararVentaRapida>;
    clave: string;
  } | null>(null);
  const buscador = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setCargando(true);
    setErrorCatalogo("");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/productos?page=1&limit=12&q=${encodeURIComponent(busqueda.trim())}`,
          { signal: controller.signal },
        );
        if (!res.ok)
          throw new Error(
            "No pudimos cargar los productos. Intentá actualizar el catálogo.",
          );
        const data = await res.json();
        if (!controller.signal.aborted) setProductos(data.productos ?? []);
      } catch (err) {
        if (!controller.signal.aborted) {
          setErrorCatalogo(
            err instanceof Error
              ? err.message
              : "No pudimos cargar el catálogo.",
          );
          setProductos([]);
        }
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [busqueda, revision]);

  useEffect(() => {
    setClientas([]);
    setErrorClientas("");
    if (buscarClienta.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/clientes?q=${encodeURIComponent(buscarClienta.trim())}`,
          { signal: controller.signal },
        );
        if (!res.ok)
          throw new Error(
            "No pudimos buscar la ficha. Reintentá antes de crear otra.",
          );
        const data = await res.json();
        if (!controller.signal.aborted)
          setClientas(Array.isArray(data) ? data.slice(0, 6) : []);
      } catch (err) {
        if (!controller.signal.aborted)
          setErrorClientas(
            err instanceof Error ? err.message : "No pudimos buscar clientas.",
          );
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [buscarClienta]);

  let subtotal = BigInt(0),
    total = BigInt(0),
    errorImportes = "";
  try {
    ({ subtotal, total } = totalVentaRapida(lineas, descuento, cotizacion));
  } catch (err) {
    errorImportes = err instanceof Error ? err.message : "Revisá los importes.";
  }
  let cobrado = cobro === "total" ? total : BigInt(0);
  try {
    if (cobro === "parte") cobrado = escala(montoCobrado || "0");
  } catch {
    /* La validación muestra el error al confirmar. */
  }
  const saldo = total - cobrado;
  const hayUsd = hayProductosUsd(lineas);
  const tcValida = cotizacionValida(cotizacion);
  // Dólares recibidos y su equivalente en pesos, para mostrar cuánto resta cobrar en ARS.
  let usdArs = BigInt(0);
  try {
    if (usdRecibidos.trim() && tcValida)
      usdArs = convertirUsd(importe(escala(usdRecibidos)), tcValida);
  } catch {
    /* La validación muestra el error al confirmar. */
  }
  const restoArs = cobrado - usdArs;
  // Lo que entra por cada forma de pago cuando el cobro se divide. El segundo
  // tramo siempre es el resto: no hay dos importes sueltos que puedan no sumar.
  let tramo1 = BigInt(0);
  try {
    if (metodo2) tramo1 = escala(montoMetodo1 || "0");
  } catch {
    /* La validación muestra el error al confirmar. */
  }
  const tramo2 = cobrado - tramo1;

  function dejarDeDividir() {
    setMetodo2("");
    setMontoMetodo1("");
  }

  const paso1Ok =
    Boolean(clienta.nombre.trim()) &&
    Boolean(clienta.telefono.trim() || clienta.email.trim());
  const paso2Ok = lineas.length > 0 && !errorImportes;
  const paso3Ok =
    cobro === "pendiente" ||
    Boolean(metodo) ||
    (Boolean(usdRecibidos.trim()) && restoArs <= BigInt(0));
  const completoPaso = (numero: number) =>
    numero === 1 ? paso1Ok : numero === 2 ? paso2Ok : paso3Ok;
  // Un paso se habilita solo cuando los anteriores están completos: así el
  // resumen de la derecha nunca muestra un cobro de una venta sin productos.
  const habilitadoPaso = (numero: number) =>
    numero === 1 || (numero === 2 ? paso1Ok : paso1Ok && paso2Ok);

  function irAPaso(numero: number) {
    setError("");
    setPaso(numero);
  }

  function avanzar() {
    if (paso === 1 && !paso1Ok) {
      setError("Completá el nombre y un teléfono o email de la clienta.");
      return;
    }
    if (paso === 2 && !paso2Ok) {
      setError(errorImportes || "Agregá al menos un producto.");
      return;
    }
    irAPaso(Math.min(PASOS.length, paso + 1));
  }

  /** Importe de un renglón, o null si la cantidad todavía no es válida. */
  function importeLinea(linea: LineaRapida) {
    if (!/^\d+$/.test(linea.cantidad) || Number(linea.cantidad) > 10000)
      return null;
    const unitario = precioUnitarioArs(linea.producto, cotizacion);
    return unitario == null ? null : importe(unitario * BigInt(linea.cantidad));
  }

  /** Precio unitario en ARS (convertido si el producto se vende en USD). */
  function precioLinea(producto: ProductoRapido) {
    const unitario = precioUnitarioArs(producto, cotizacion);
    return unitario == null ? null : importe(unitario);
  }

  function agregar(producto: ProductoRapido) {
    setError("");
    setLineas((prev) => {
      const existente = prev.find((l) => l.producto.id === producto.id);
      const cantidad = existente ? Number(existente.cantidad) + 1 : 1;
      if (
        !Number.isSafeInteger(cantidad) ||
        cantidad > producto.stockActual ||
        cantidad > 10000
      )
        return prev;
      return existente
        ? prev.map((l) =>
            l.producto.id === producto.id
              ? { ...l, cantidad: String(cantidad) }
              : l,
          )
        : [...prev, { producto, cantidad: "1" }];
    });
    buscador.current?.focus();
  }

  async function actualizarSeleccion() {
    setActualizando(true);
    setError("");
    try {
      const nuevas: LineaRapida[] = [];
      // Lotes chicos para no saturar la API cuando hay muchos renglones.
      for (let inicio = 0; inicio < lineas.length; inicio += 8) {
        nuevas.push(
          ...(await Promise.all(
            lineas.slice(inicio, inicio + 8).map(async (linea) => {
              const res = await fetch(
                `/api/productos/${encodeURIComponent(linea.producto.id)}`,
              );
              if (!res.ok)
                throw new Error(
                  `No pudimos actualizar ${linea.producto.nombre}. Reintentá antes de confirmar.`,
                );
              return {
                ...linea,
                producto: (await res.json()) as ProductoRapido,
              };
            }),
          )),
        );
      }
      setLineas(nuevas);
      setRevision((r) => r + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos actualizar los precios.",
      );
    } finally {
      setActualizando(false);
    }
  }

  async function registrar() {
    if (bloqueo.current) return;
    setError("");
    try {
      if (!pendiente.current)
        pendiente.current = {
          contenido: prepararVentaRapida({
            lineas,
            cliente: clienta,
            descuento,
            cobro,
            montoCobrado,
            metodo,
            metodo2,
            montoMetodo1,
            cotizacion,
            usdRecibidos,
            metodoUsd,
            notas,
          }),
          clave: crypto.randomUUID(),
        };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revisá los datos.");
      return;
    }
    bloqueo.current = true;
    setEnviando(true);
    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pendiente.current.contenido,
          claveIdempotencia: pendiente.current.clave,
        }),
      });
      if (res.status >= 500)
        throw new Error(
          "No pudimos confirmar la respuesta. Reintentá esta misma operación para comprobar si se guardó.",
        );
      const data = await res.json();
      if (!res.ok) {
        pendiente.current = null;
        setIncierta(false);
        setError(
          data.error ?? "No se pudo registrar la venta. Revisá los datos.",
        );
        return;
      }
      // El resumen de confirmación se arma con los cobros que devolvió el
      // servidor, no con lo que mostraba el formulario: si algo se guardó
      // distinto, el papel y la pantalla tienen que decir lo mismo.
      const medios = Array.isArray(data.pagos)
        ? (data.pagos as { metodoPago: string; montoArs: string }[]).map(
            (p) => ({
              metodoPago: String(p.metodoPago),
              montoArs: String(p.montoArs),
            }),
          )
        : [];
      let cobradoConfirmado: string | null = null;
      let saldoConfirmado: string | null = null;
      try {
        const centavos = medios.reduce(
          (acum, p) => acum + escala(p.montoArs),
          BigInt(0),
        );
        cobradoConfirmado = importe(centavos);
        saldoConfirmado = importe(escala(String(data.total)) - centavos);
      } catch {
        /* Sin cifras confiables el resumen muestra "—" antes que inventarlas. */
      }
      setVenta({
        ...data,
        cobrado: cobradoConfirmado,
        saldo: saldoConfirmado,
        medios,
        registro: data,
      });
      pendiente.current = null;
      setIncierta(false);
    } catch (err) {
      setIncierta(true);
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos confirmar la venta. Reintentá la misma operación.",
      );
    } finally {
      bloqueo.current = false;
      setEnviando(false);
    }
  }

  function nueva() {
    setVenta(null);
    setPaso(1);
    setClienta(vacia);
    setLineas([]);
    setBusqueda("");
    setBuscarClienta("");
    setDescuento("");
    setCobro("total");
    setMontoCobrado("");
    setMetodo("");
    dejarDeDividir();
    setCotizacion("");
    setUsdRecibidos("");
    setMetodoUsd("EFECTIVO");
    setNotas("");
    setError("");
    setRevision((r) => r + 1);
  }

  if (venta)
    return (
      <div className="anim-entrada mx-auto max-w-3xl space-y-8 py-10">
        <div className="text-center" role="status">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-border bg-surface">
            <CheckCircle2 className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Venta registrada
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {venta.numeroVenta} · {venta.cliente?.nombre ?? clienta.nombre}
          </p>
        </div>

        <FigureGrid columnas={3}>
          <Figure label="Total" valor={formatARS(venta.total)} />
          <Figure
            label="Cobrado"
            valor={venta.cobrado ? formatARS(venta.cobrado) : "—"}
            hint={
              venta.medios.length > 1
                ? `${venta.medios.length} formas de pago`
                : venta.medios.length === 1
                  ? NOMBRE_METODO(venta.medios[0].metodoPago)
                  : "Sin cobro registrado"
            }
          />
          <Figure
            label="Saldo pendiente"
            valor={venta.saldo ? formatARS(venta.saldo) : "—"}
            tono={venta.saldo && venta.saldo !== "0.00" ? "alerta" : "neutro"}
            hint={
              venta.saldo === "0.00" ? "Venta saldada" : "Se cobra desde la ficha"
            }
          />
        </FigureGrid>

        <TicketVenta
          variante="inline"
          numeroVenta={venta.numeroVenta}
          fecha={String(venta.registro.fecha ?? new Date().toISOString())}
          clienteNombre={venta.cliente?.nombre ?? clienta.nombre}
          metodoPago={String(venta.registro.metodoPago ?? "")}
          items={
            (venta.registro.items as Parameters<typeof TicketVenta>[0]["items"]) ??
            []
          }
          subtotal={String(venta.registro.subtotal ?? "0")}
          descuento={String(venta.registro.descuento ?? "0")}
          total={venta.total}
          cotizacionItemsUsd={
            venta.registro.cotizacionItemsUsd as string | null | undefined
          }
          pagos={
            (venta.registro.pagos as Parameters<typeof TicketVenta>[0]["pagos"]) ??
            []
          }
          cobrado={venta.cobrado}
          saldoPendiente={venta.saldo}
        />

        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={nueva}>
            Registrar otra venta
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href={`/ventas/${venta.id}`}>Ver comprobante</Link>
          </Button>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 pb-6">
      <PageHeader
        overline="Ventas · Planilla"
        title="Venta rápida"
        description="Completá la clienta, agregá los productos y registrá el cobro."
      >
        <Button variant="outline" asChild>
          <Link href="/pedidos/nuevo">Nuevo pedido con seña</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/ventas/nueva">Usar vista habitual</Link>
        </Button>
      </PageHeader>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void registrar();
        }}
        onKeyDown={(event) => {
          // Enter en una celda nunca registra accidentalmente una venta.
          if (
            event.key === "Enter" &&
            event.target instanceof HTMLInputElement
          ) {
            event.preventDefault();
            if (
              event.target.id === "buscar-producto" &&
              !enviando &&
              !incierta &&
              !cargando &&
              !errorCatalogo &&
              !actualizando
            ) {
              const disponibles = productos.filter(
                (p) =>
                  p.stockActual >
                    Number(
                      lineas.find((l) => l.producto.id === p.id)?.cantidad ?? 0,
                    ) &&
                  (p.precioVentaUsd != null ||
                    escala(p.precioVenta) > BigInt(0)),
              );
              const primero =
                disponibles.find(
                  (p) =>
                    p.sku.toLocaleLowerCase() ===
                    busqueda.trim().toLocaleLowerCase(),
                ) ?? disponibles[0];
              if (primero) agregar(primero);
            }
          }
        }}
      >
        <fieldset
          disabled={enviando || incierta || actualizando}
          className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]"
        >
          <legend className="sr-only">Registro de venta rápida</legend>
          <div className="min-w-0 space-y-6">
            <Pasos
              paso={paso}
              completo={completoPaso}
              habilitado={habilitadoPaso}
              onIr={irAPaso}
            />
            {paso === 1 && (
            <Panel className="anim-entrada">
              <PanelHeader
                title="¿Quién compra?"
                descripcion="Guardá su nombre y un contacto para las próximas compras."
              />
              <PanelBody className="space-y-5">
              <details className="rounded-md border px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium">
                  Buscar una clienta existente
                </summary>
                <Label htmlFor="buscar-clienta" className="sr-only">
                  Buscar una clienta que ya compró
                </Label>
                <Input
                  id="buscar-clienta"
                  placeholder="Nombre, teléfono o email"
                  value={buscarClienta}
                  onChange={(e) => setBuscarClienta(e.target.value)}
                  className="mt-2 h-11"
                  autoComplete="off"
                />
                {errorClientas && (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    {errorClientas}
                  </p>
                )}
                {clientas.length > 0 && (
                  <div className="mt-2 divide-y rounded-md border">
                    {clientas.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="flex w-full flex-wrap justify-between gap-1 p-3 text-left hover:bg-muted focus-visible:bg-muted"
                        onClick={() => {
                          setClienta({
                            id: c.id,
                            nombre: c.nombre,
                            telefono: c.telefono ?? "",
                            email: c.email ?? "",
                          });
                          setBuscarClienta("");
                        }}
                      >
                        <span className="font-medium">{c.nombre}</span>
                        <span className="text-sm text-muted-foreground">
                          {c.telefono || c.email || "Completar contacto"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </details>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="clienta-nombre">
                      Nombre y apellido <span aria-hidden="true">*</span>
                    </Label>
                    {clienta.id && (
                      <button
                        type="button"
                        className="text-sm underline"
                        onClick={() => setClienta(vacia)}
                      >
                        Cambiar clienta
                      </button>
                    )}
                  </div>
                  <Input
                    id="clienta-nombre"
                    value={clienta.nombre}
                    readOnly={!!clienta.id}
                    onChange={(e) =>
                      setClienta({ ...clienta, nombre: e.target.value })
                    }
                    maxLength={200}
                    autoComplete="name"
                    className="h-11"
                    placeholder="Ej. María González"
                    aria-required="true"
                  />
                  {clienta.id && (
                    <p className="text-xs text-muted-foreground">
                      Ficha existente seleccionada
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clienta-telefono">Teléfono / WhatsApp</Label>
                  <Input
                    id="clienta-telefono"
                    type="tel"
                    autoComplete="tel"
                    value={clienta.telefono}
                    onChange={(e) =>
                      setClienta({ ...clienta, telefono: e.target.value })
                    }
                    maxLength={100}
                    className="h-11"
                    placeholder="11 1234 5678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clienta-email">Email</Label>
                  <Input
                    id="clienta-email"
                    type="email"
                    autoComplete="email"
                    value={clienta.email}
                    onChange={(e) =>
                      setClienta({ ...clienta, email: e.target.value })
                    }
                    maxLength={200}
                    className="h-11"
                    placeholder="Opcional si dejó su teléfono"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Completá al menos teléfono o email. No se enviarán mensajes
                automáticamente.
              </p>
              </PanelBody>
            </Panel>
            )}
            {paso === 2 && (
            <Panel className="anim-entrada min-w-0">
              <PanelHeader
                title="¿Qué se lleva?"
                descripcion="Buscá por nombre o código. La cantidad se edita en la planilla."
              />
              <PanelBody>
              <Label htmlFor="buscar-producto" className="sr-only">
                Buscar producto
              </Label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-3.5 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  ref={buscador}
                  id="buscar-producto"
                  value={busqueda}
                  onChange={(e) => {
                    setCargando(true);
                    setBusqueda(e.target.value);
                  }}
                  placeholder="Escribí un producto o su código…"
                  autoComplete="off"
                  className="h-12 pl-10 text-base"
                />
              </div>
              {cargando ? (
                <p role="status" className="py-5 text-sm text-muted-foreground">
                  Buscando productos…
                </p>
              ) : errorCatalogo ? (
                <div className="py-4">
                  <p role="alert" className="text-sm text-destructive">
                    {errorCatalogo}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2"
                    onClick={() => setRevision((r) => r + 1)}
                  >
                    Actualizar catálogo
                  </Button>
                </div>
              ) : (
                <div className="mt-3 max-h-44 divide-y overflow-y-auto rounded-md border">
                  {productos.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">
                      No encontramos productos. Probá con otro nombre o código.
                    </p>
                  ) : (
                    productos.map((p) => {
                      const elegida = Number(
                        lineas.find((l) => l.producto.id === p.id)?.cantidad ??
                          0,
                      );
                      const noDisponible =
                        p.stockActual <= elegida ||
                        (p.precioVentaUsd == null &&
                          escala(p.precioVenta) <= BigInt(0));
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-3 p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{p.nombre}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {p.sku} ·{" "}
                              {p.stockActual > 0
                                ? `${p.stockActual} en stock`
                                : "Sin stock"}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="text-sm tabular-nums">
                              {p.precioVentaUsd != null
                                ? `USD ${p.precioVentaUsd}`
                                : formatARS(p.precioVenta)}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={noDisponible}
                              onClick={() => agregar(p)}
                              aria-label={`Agregar ${p.nombre}`}
                            >
                              <Plus className="size-4" />
                              <span className="hidden sm:inline">Agregar</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
              <div className="relative mt-6 overflow-x-auto rounded-md border">
                <table className="w-full min-w-[520px] text-sm">
                  <caption className="sr-only">
                    Productos de esta venta. Editá las cantidades en cada fila.
                  </caption>
                  <thead className="bg-muted/60 text-left">
                    <tr>
                      <th scope="col" className="p-3 font-medium">
                        Producto
                      </th>
                      <th scope="col" className="w-24 p-3 font-medium">
                        Cantidad
                      </th>
                      <th scope="col" className="p-3 text-right font-medium">
                        Precio ARS
                      </th>
                      <th scope="col" className="p-3 text-right font-medium">
                        Importe ARS
                      </th>
                      <th scope="col" className="p-3">
                        <span className="sr-only">Quitar</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {lineas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center text-muted-foreground"
                        >
                          Agregá el primer producto desde el buscador.
                        </td>
                      </tr>
                    ) : (
                      lineas.map((l, index) => (
                        <tr key={l.producto.id}>
                          <td className="p-3 font-medium">
                            {l.producto.nombre}
                            <span className="mt-1 block font-mono text-xs font-normal text-muted-foreground">
                              {l.producto.sku}
                            </span>
                          </td>
                          <td className="p-2">
                            <Input
                              aria-label={`Cantidad de ${l.producto.nombre}`}
                              type="number"
                              min={1}
                              max={Math.min(l.producto.stockActual, 10000)}
                              step={1}
                              value={l.cantidad}
                              onChange={(e) =>
                                setLineas((prev) =>
                                  prev.map((item, i) =>
                                    i === index
                                      ? { ...item, cantidad: e.target.value }
                                      : item,
                                  ),
                                )
                              }
                              className="h-11 w-20 text-center text-base"
                            />
                          </td>
                          <td className="p-3 text-right tabular-nums">
                            {precioLinea(l.producto) != null
                              ? formatARS(precioLinea(l.producto)!)
                              : "—"}
                            {l.producto.precioVentaUsd != null && (
                              <span className="block text-xs font-normal text-muted-foreground">
                                {formatUSD(l.producto.precioVentaUsd)}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-medium tabular-nums">
                            {importeLinea(l) != null
                              ? formatARS(importeLinea(l)!)
                              : "—"}
                          </td>
                          <td className="p-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Quitar ${l.producto.nombre}`}
                              onClick={() =>
                                setLineas((prev) =>
                                  prev.filter((_, i) => i !== index),
                                )
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {lineas.length}{" "}
                  {lineas.length === 1
                    ? "producto distinto"
                    : "productos distintos"}
                </p>
                <div className="flex items-center gap-3">
                  <Label htmlFor="descuento">Descuento (ARS)</Label>
                  <Input
                    id="descuento"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={descuento}
                    onChange={(e) => setDescuento(e.target.value)}
                    className="h-11 w-32 text-right"
                  />
                </div>
              </div>
              {hayUsd && (
                <div className="mt-4 rounded-md border border-dashed p-3">
                  <Label htmlFor="cotizacion-items">
                    Cotización del dólar (ARS por 1 USD)
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Hay productos con precio en USD: se pasan a pesos con esta
                    cotización y queda guardada en la venta.
                  </p>
                  <Input
                    id="cotizacion-items"
                    inputMode="decimal"
                    placeholder="Ej.: 1200"
                    value={cotizacion}
                    onChange={(e) => setCotizacion(e.target.value)}
                    aria-invalid={!tcValida || undefined}
                    className="mt-2 h-11 w-40 text-right"
                  />
                </div>
              )}
              {lineas.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-3"
                  onClick={() => void actualizarSeleccion()}
                >
                  {actualizando
                    ? "Actualizando…"
                    : "Actualizar precios y stock"}
                </Button>
              )}
              </PanelBody>
            </Panel>
            )}
            {paso === 3 && (
            <Panel className="anim-entrada">
              <PanelHeader
                title="¿Cómo paga?"
                descripcion="Dejá registrado lo que cobraste hoy."
              />
              <PanelBody>
            <div
              className="grid gap-2"
              role="group"
              aria-label="Cuánto paga hoy"
            >
              {(
                [
                  { id: "total", label: "Cobró todo" },
                  { id: "parte", label: "Cobró una parte" },
                  { id: "pendiente", label: "Queda a cuenta" },
                ] as const
              ).map((c) => (
                <Button
                  type="button"
                  key={c.id}
                  variant={cobro === c.id ? "default" : "outline"}
                  className="h-11 justify-start"
                  aria-pressed={cobro === c.id}
                  onClick={() => {
                    setCobro(c.id);
                    // Sin cobro de hoy no hay nada que dividir.
                    if (c.id === "pendiente") dejarDeDividir();
                  }}
                >
                  {c.label}
                </Button>
              ))}
            </div>
            {cobro === "parte" && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="cobrado">Importe cobrado hoy (ARS)</Label>
                <Input
                  id="cobrado"
                  value={montoCobrado}
                  onChange={(e) => setMontoCobrado(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="h-12 text-lg"
                />
              </div>
            )}
            {cobro !== "pendiente" && (
              <div className="mt-5 space-y-3 rounded-md border border-dashed p-3">
                <div>
                  <p className="text-sm font-medium">
                    ¿Recibió dólares?{" "}
                    <span className="font-normal text-muted-foreground">
                      (opcional)
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Se pueden mezclar: dólares y el resto en pesos.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="usd-recibidos">Dólares (USD)</Label>
                    <Input
                      id="usd-recibidos"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={usdRecibidos}
                      onChange={(e) => {
                        setUsdRecibidos(e.target.value);
                        if (e.target.value.trim()) dejarDeDividir();
                      }}
                      className="h-11 text-right"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cotizacion-cobro">Cotización</Label>
                    <Input
                      id="cotizacion-cobro"
                      inputMode="decimal"
                      placeholder="Ej.: 1200"
                      value={cotizacion}
                      onChange={(e) => setCotizacion(e.target.value)}
                      className="h-11 text-right"
                    />
                  </div>
                </div>
                {usdRecibidos.trim() && (
                  <>
                    <div
                      className="grid grid-cols-2 gap-2"
                      role="group"
                      aria-label="Cómo entraron los dólares"
                    >
                      {(
                        [
                          { id: "EFECTIVO", nombre: "Billetes" },
                          { id: "TRANSFERENCIA", nombre: "Transferencia" },
                        ] as const
                      ).map((m) => (
                        <Button
                          key={m.id}
                          type="button"
                          variant={metodoUsd === m.id ? "default" : "outline"}
                          className="h-10"
                          aria-pressed={metodoUsd === m.id}
                          onClick={() => setMetodoUsd(m.id)}
                        >
                          {m.nombre}
                        </Button>
                      ))}
                    </div>
                    <p className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Equivalen a</span>
                      <span className="font-mono tabular-nums">
                        {tcValida
                          ? formatARS(importe(usdArs))
                          : "Falta cotización"}
                      </span>
                    </p>
                    <p className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Resta cobrar en pesos
                      </span>
                      <span
                        className={cn(
                          "font-mono tabular-nums",
                          restoArs < BigInt(0) && "text-destructive",
                        )}
                      >
                        {formatARS(importe(restoArs))}
                      </span>
                    </p>
                  </>
                )}
              </div>
            )}
            {cobro !== "pendiente" && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-medium">
                  {usdRecibidos.trim()
                    ? "Forma de pago del resto (pesos)"
                    : metodo2
                      ? "Primera forma de pago"
                      : "Forma de pago"}
                </p>
                <div
                  className="grid grid-cols-2 gap-2"
                  role="group"
                  aria-label={metodo2 ? "Primera forma de pago" : "Forma de pago"}
                >
                  {METODOS.map((m) => (
                    <Button
                      key={m.id}
                      type="button"
                      variant={metodo === m.id ? "default" : "outline"}
                      className="h-11 px-2"
                      aria-pressed={metodo === m.id}
                      disabled={metodo2 === m.id}
                      onClick={() => setMetodo(m.id)}
                    >
                      {m.nombre}
                    </Button>
                  ))}
                </div>
                {metodo2 ? (
                  <div className="mt-4 space-y-4 rounded-md border border-dashed p-3">
                    <div className="space-y-2">
                      <Label htmlFor="monto-metodo-1">
                        Importe por{" "}
                        {METODOS.find((m) => m.id === metodo)?.nombre ??
                          "la primera forma"}{" "}
                        (ARS)
                      </Label>
                      <Input
                        id="monto-metodo-1"
                        value={montoMetodo1}
                        onChange={(e) => setMontoMetodo1(e.target.value)}
                        inputMode="decimal"
                        placeholder="0,00"
                        className="h-11"
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium">
                        Segunda forma de pago
                      </p>
                      <div
                        className="grid grid-cols-2 gap-2"
                        role="group"
                        aria-label="Segunda forma de pago"
                      >
                        {METODOS.map((m) => (
                          <Button
                            key={m.id}
                            type="button"
                            variant={metodo2 === m.id ? "default" : "outline"}
                            className="h-11 px-2"
                            aria-pressed={metodo2 === m.id}
                            disabled={metodo === m.id}
                            onClick={() => setMetodo2(m.id)}
                          >
                            {m.nombre}
                          </Button>
                        ))}
                      </div>
                      <p className="mt-2 flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Entra por la segunda
                        </span>
                        <span
                          className={
                            tramo2 <= BigInt(0)
                              ? "text-destructive"
                              : "font-medium tabular-nums"
                          }
                        >
                          {formatARS(importe(tramo2))}
                        </span>
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 w-full"
                      onClick={dejarDeDividir}
                    >
                      Volver a una sola forma de pago
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 h-11 w-full justify-start"
                    disabled={Boolean(usdRecibidos.trim())}
                    onClick={() =>
                      setMetodo2(
                        METODOS.find((m) => m.id !== (metodo || "EFECTIVO"))!.id,
                      )
                    }
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Dividir entre dos formas de pago
                  </Button>
                )}
              </div>
            )}
            {cobro !== "total" && (
              <p className="mt-3 rounded-md bg-muted p-3 text-sm">
                La venta queda con saldo para seguir cobrando desde su ficha.
                Los productos se descuentan del stock y se consideran
                entregados.
              </p>
            )}
            <div className="mt-5 space-y-2">
              <Label htmlFor="notas">
                Observaciones{" "}
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                maxLength={2000}
                rows={2}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Algo que necesites recordar de esta venta"
              />
            </div>
              </PanelBody>
            </Panel>
            )}
          </div>

          {/* Resumen permanente: es el único lugar donde la venta se ve
              completa, así ningún paso tiene que mostrarlo todo junto. */}
          <aside className="min-w-0 xl:sticky xl:top-6 xl:h-fit">
            <Panel>
              <PanelHeader
                title="Resumen"
                descripcion="Así va quedando la venta"
              />
              <PanelBody className="space-y-5">
                <div>
                  <Rotulo>Clienta</Rotulo>
                  {clienta.nombre.trim() ? (
                    <>
                      <p className="mt-1.5 truncate text-sm font-medium">
                        {clienta.nombre}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {clienta.telefono ||
                          clienta.email ||
                          "Falta un teléfono o email"}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Sin completar
                    </p>
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <Rotulo>Productos</Rotulo>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {lineas.length}
                    </span>
                  </div>
                  {lineas.length === 0 ? (
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Todavía no agregaste ninguno.
                    </p>
                  ) : (
                    <ul className="mt-2.5 space-y-2.5">
                      {lineas.map((l) => {
                        const parcial = importeLinea(l);
                        return (
                          <li
                            key={l.producto.id}
                            className="flex items-baseline justify-between gap-3 text-sm"
                          >
                            <span className="min-w-0">
                              <span className="block truncate">
                                {l.producto.nombre}
                              </span>
                              <span className="block font-mono text-xs text-muted-foreground">
                                {l.cantidad} ×{" "}
                                {precioLinea(l.producto) != null
                                  ? formatARS(precioLinea(l.producto)!)
                                  : "—"}
                                {l.producto.precioVentaUsd != null &&
                                  ` (${formatUSD(l.producto.precioVentaUsd)})`}
                              </span>
                            </span>
                            <span className="shrink-0 font-mono tabular-nums">
                              {parcial ? formatARS(parcial) : "—"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="space-y-2 border-t border-border pt-4">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-mono tabular-nums">
                      {formatARS(importe(subtotal))}
                    </span>
                  </div>
                  {subtotal !== total && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Descuento</span>
                      <span className="font-mono tabular-nums">
                        − {formatARS(importe(subtotal - total))}
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
                    <span className="text-sm font-medium">Total</span>
                    <span className="font-mono text-xl font-semibold tabular-nums">
                      {formatARS(importe(total))}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cobra hoy</span>
                    <span className="font-mono tabular-nums">
                      {formatARS(importe(cobrado))}
                    </span>
                  </div>
                  {usdRecibidos.trim() && cobro !== "pendiente" && (
                    <p className="text-right text-xs text-muted-foreground">
                      USD {usdRecibidos.trim()} → {formatARS(importe(usdArs))}
                      {restoArs > BigInt(0) && metodo
                        ? ` · ${NOMBRE_METODO(metodo)} ${formatARS(importe(restoArs))}`
                        : ""}
                    </p>
                  )}
                  {metodo && !usdRecibidos.trim() && cobro !== "pendiente" && (
                    <p className="text-right text-xs text-muted-foreground">
                      {metodo2
                        ? `${NOMBRE_METODO(metodo)} ${formatARS(importe(tramo1))} · ${NOMBRE_METODO(metodo2)} ${formatARS(importe(tramo2))}`
                        : NOMBRE_METODO(metodo)}
                    </p>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Queda a cuenta</span>
                    <span
                      className={cn(
                        "font-mono font-medium tabular-nums",
                        saldo < BigInt(0) && "text-destructive",
                      )}
                    >
                      {formatARS(importe(saldo))}
                    </span>
                  </div>
                </div>
              </PanelBody>
            </Panel>
          </aside>
        </fieldset>
        <div className="sticky bottom-0 z-10 mt-5 space-y-3 rounded-xl border bg-card p-5 shadow-sm">
          {(error || errorImportes) && (
            <p className="text-sm text-destructive" role="alert">
              {error || errorImportes}
            </p>
          )}
          {incierta && (
            <p className="text-sm text-muted-foreground">
              Conservamos la misma operación para evitar duplicados. Reintentá
              sin volver a cargar los datos.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              className="h-12"
              disabled={paso === 1 || enviando || incierta || actualizando}
              onClick={() => irAPaso(paso - 1)}
            >
              Volver
            </Button>
            {paso < PASOS.length ? (
              <Button
                type="button"
                size="lg"
                className="h-12 w-full text-base sm:w-auto"
                disabled={enviando || actualizando}
                onClick={avanzar}
              >
                Continuar
              </Button>
            ) : (
              <Button
                type="submit"
                size="lg"
                disabled={
                  enviando || actualizando || (!incierta && !lineas.length)
                }
                className="h-12 w-full text-base sm:w-auto"
              >
                {enviando
                  ? "Guardando venta…"
                  : incierta
                    ? "Reintentar la misma operación"
                    : `Registrar venta · ${formatARS(importe(total))}`}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
