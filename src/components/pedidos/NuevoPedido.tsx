"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Check,
  Copy,
  Minus,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserRound,
  X,
} from "lucide-react";
import { ProductosGridPaginado } from "@/components/punto-venta/ProductosGridPaginado";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { METODOS_PAGO_INDIVIDUAL } from "@/lib/constants";
import type { ItemVentaInput } from "@/types";
import { useAsyncAction } from "@/hooks/use-async-action";
import { notificar } from "@/lib/notificar";
import { cn } from "@/lib/utils";
import {
  api,
  useConsulta,
  EstadoConsulta,
  centavos,
  decimal,
  dinero,
} from "./pedido-ui";

type Linea = {
  clave: string;
  productoId: string;
  nombre: string;
  sku?: string;
  precio: string;
  cantidad: number;
  modalidad: string;
  especificaciones: string;
  fechaEstimada: string;
};

type Clienta = {
  id: string;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
};

const campo =
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm";

function fechaMasDiasISO(dias: number): string {
  const f = new Date();
  f.setDate(f.getDate() + dias);
  const yyyy = f.getFullYear();
  const mm = String(f.getMonth() + 1).padStart(2, "0");
  const dd = String(f.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const ETIQUETAS_ESPECIFICACION = [
  "Medidas: ",
  "Tela / Tapizado: ",
  "Color / Lustre: ",
  "Terminación: ",
];

export function NuevoPedido() {
  const router = useRouter();
  const clientes = useConsulta<Clienta[]>("/api/clientes");

  // Estado flexible de clienta: permite tipear cualquier nombre libre o elegir una recomendada
  const [clienteId, setClienteId] = useState("");
  const [nombreClienta, setNombreClienta] = useState("");
  const [telefonoClienta, setTelefonoClienta] = useState("");
  const [emailClienta, setEmailClienta] = useState("");
  const [guardarEnAgenda, setGuardarEnAgenda] = useState(true);
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState(false);

  const [items, setItems] = useState<Linea[]>([]);
  const [fechaPrometida, setFechaPrometida] = useState("");
  const [responsable, setResponsable] = useState("");
  const [notas, setNotas] = useState("");

  // Descuento (por monto ARS o porcentaje)
  const [tipoDescuento, setTipoDescuento] = useState<"ars" | "pct">("ars");
  const [descuentoInput, setDescuentoInput] = useState("");

  // Cobro inicial / seña
  const [modo, setModo] = useState<"sin" | "mitad" | "total" | "otro">("mitad");
  const [importe, setImporte] = useState("");
  const [monedaCobro, setMonedaCobro] = useState<"ARS" | "USD">("ARS");
  const [cotizacionUsd, setCotizacionUsd] = useState("");
  const [medio, setMedio] = useState("EFECTIVO");
  const [error, setError] = useState<string | null>(null);
  const clave = useRef<string | null>(null);

  const clientaVinculada = useMemo(
    () => clientes.datos?.find((c) => c.id === clienteId) ?? null,
    [clientes.datos, clienteId],
  );

  // Recomendaciones en vivo mientras tipea el nombre, teléfono o email
  const recomendacionesClientas = useMemo(() => {
    const lista = clientes.datos ?? [];
    const q = nombreClienta.trim().toLocaleLowerCase();
    if (!q) return lista.slice(0, 6);
    return lista
      .filter((c) =>
        `${c.nombre} ${c.telefono || ""} ${c.email || ""}`
          .toLocaleLowerCase()
          .includes(q),
      )
      .slice(0, 6);
  }, [clientes.datos, nombreClienta]);

  function seleccionarClientaRecomendada(c: Clienta) {
    clave.current = null;
    setClienteId(c.id);
    setNombreClienta(c.nombre);
    setTelefonoClienta(c.telefono || "");
    setEmailClienta(c.email || "");
    setSugerenciasAbiertas(false);
  }

  function desvincularClienta() {
    clave.current = null;
    setClienteId("");
  }

  const subtotalCentavos = items.reduce(
    (total, i) => total + centavos(i.precio) * BigInt(i.cantidad),
    BigInt(0),
  );

  let descuentoCentavos = BigInt(0);
  let descuentoValido = true;
  if (descuentoInput.trim()) {
    try {
      const normalizado = descuentoInput.trim().replace(",", ".");
      if (tipoDescuento === "pct") {
        const pct = Number(normalizado);
        if (!Number.isFinite(pct) || pct < 0 || pct >= 100) {
          descuentoValido = false;
        } else {
          const pctCentesimos = BigInt(Math.round(pct * 100));
          descuentoCentavos =
            (subtotalCentavos * pctCentesimos + BigInt(5000)) / BigInt(10000);
        }
      } else {
        descuentoCentavos = centavos(normalizado);
      }
    } catch {
      descuentoValido = false;
    }
  }

  const totalCentavos =
    subtotalCentavos > descuentoCentavos
      ? subtotalCentavos - descuentoCentavos
      : BigInt(0);

  const mitadCentavos = (totalCentavos + BigInt(1)) / BigInt(2);

  let cobro = BigInt(0);
  let importeValido = true;
  try {
    if (modo === "total") {
      cobro = totalCentavos;
    } else if (modo === "mitad") {
      cobro = mitadCentavos;
    } else if (modo === "otro") {
      const valorIngresado = centavos(importe.trim().replace(",", "."));
      if (monedaCobro === "USD") {
        const tcNorm = cotizacionUsd.trim().replace(",", ".");
        if (!/^\d+(\.\d{1,4})?$/.test(tcNorm)) {
          importeValido = false;
        } else {
          const [ent, dec = ""] = tcNorm.split(".");
          const tc = BigInt(ent) * BigInt(10000) + BigInt(dec.padEnd(4, "0"));
          if (tc <= BigInt(0)) importeValido = false;
          else cobro = (valorIngresado * tc + BigInt(5000)) / BigInt(10000);
        }
      } else {
        cobro = valorIngresado;
      }
    } else {
      cobro = BigInt(0);
    }
  } catch {
    importeValido = false;
  }

  const saldo = totalCentavos - cobro;

  function modificar(claveItem: string, cambios: Partial<Linea>) {
    clave.current = null;
    setItems((prev) =>
      prev.map((i) => (i.clave === claveItem ? { ...i, ...cambios } : i)),
    );
  }

  function agregarEspecificacionRapida(linea: Linea, prefijo: string) {
    const actual = linea.especificaciones.trim();
    const nueva = actual ? `${actual}\n${prefijo}` : prefijo;
    modificar(linea.clave, { especificaciones: nueva });
  }

  function agregar(item: ItemVentaInput) {
    if (item.esConsignacion) {
      notificar.error(
        "Los productos en consignación se registran desde Registro de venta; todavía no admiten encargos.",
      );
      return;
    }
    clave.current = null;
    setItems((prev) => {
      const existenteSinMedidas = prev.find(
        (x) =>
          x.productoId === item.productoId &&
          !x.especificaciones.trim() &&
          x.modalidad === "ENCARGO",
      );
      if (existenteSinMedidas) {
        return prev.map((x) =>
          x.clave === existenteSinMedidas.clave
            ? { ...x, cantidad: Math.min(10000, x.cantidad + item.cantidad) }
            : x,
        );
      }
      return [
        ...prev,
        {
          clave: crypto.randomUUID(),
          productoId: item.productoId,
          nombre: item.productoNombre,
          sku: item.productoSku,
          precio: String(item.precioUnitario),
          cantidad: item.cantidad,
          modalidad: "ENCARGO",
          especificaciones: "",
          fechaEstimada: "",
        },
      ];
    });
  }

  function duplicarLinea(linea: Linea) {
    clave.current = null;
    setItems((prev) => [
      ...prev,
      {
        ...linea,
        clave: crypto.randomUUID(),
        cantidad: 1,
        especificaciones: "",
      },
    ]);
  }

  const { run: confirmar, loading: cargando } = useAsyncAction(async () => {
    setError(null);
    const nombreLimpio = nombreClienta.trim();
    if (!nombreLimpio && !clienteId) {
      setError("Escribí el nombre de la clienta o elegí una de las sugeridas.");
      return;
    }
    if (!items.length) {
      setError("Agregá al menos un producto al pedido.");
      return;
    }
    if (!items.some((i) => i.modalidad === "ENCARGO")) {
      setError(
        "Al menos un producto debe ser por encargo. Para entrega inmediata total, usá Registro de venta.",
      );
      return;
    }
    if (items.some((i) => i.modalidad === "INMEDIATA") && saldo > BigInt(0)) {
      setError(
        "Los pedidos con productos que se retiran hoy deben cobrarse por completo, o marcarse por encargo hasta saldar.",
      );
      return;
    }
    if (
      !descuentoValido ||
      descuentoCentavos < BigInt(0) ||
      (subtotalCentavos > BigInt(0) && descuentoCentavos >= subtotalCentavos)
    ) {
      setError("El descuento debe ser menor al subtotal del pedido.");
      return;
    }
    if (
      !importeValido ||
      cobro < BigInt(0) ||
      cobro > totalCentavos ||
      (modo !== "sin" && cobro === BigInt(0))
    ) {
      setError(
        "Revisá el importe de la seña: debe ser mayor a cero y no superar el total.",
      );
      return;
    }
    if (
      !items.every((i) => Number.isSafeInteger(i.cantidad) && i.cantidad > 0)
    ) {
      setError("Las cantidades deben ser enteras mayores a cero.");
      return;
    }

    let idClientaFinal = clienteId || undefined;

    // Si escribió una clienta nueva y pidió guardarla en la agenda (o cargó teléfono/email), la agendamos sin interrumpir el flujo
    if (
      !idClientaFinal &&
      guardarEnAgenda &&
      nombreLimpio &&
      (telefonoClienta.trim() || emailClienta.trim())
    ) {
      try {
        const creada = await api<Clienta>("/api/clientes/quick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: nombreLimpio,
            telefono: telefonoClienta.trim() || undefined,
            email: emailClienta.trim() || undefined,
          }),
        });
        idClientaFinal = creada.id;
        setClienteId(creada.id);
      } catch {
        // Si el email ya existía o falla el alta rápida, continuamos registrando el pedido con clienteNombre libre
      }
    }

    // Si es una clienta libre con teléfono/email y no quedó vinculada a agenda, conservamos su contacto en las notas del pedido
    const contactoExtra =
      !idClientaFinal && (telefonoClienta.trim() || emailClienta.trim())
        ? [
            telefonoClienta.trim() ? `Tel: ${telefonoClienta.trim()}` : "",
            emailClienta.trim() ? `Email: ${emailClienta.trim()}` : "",
          ]
            .filter(Boolean)
            .join(" · ")
        : "";
    const notasFinales = [contactoExtra, notas.trim()]
      .filter(Boolean)
      .join("\n");

    clave.current ??= crypto.randomUUID();
    try {
      const pedido = await api<{ id: string }>("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(idClientaFinal ? { clienteId: idClientaFinal } : {}),
          clienteNombre: nombreLimpio,
          clienteTelefono: telefonoClienta.trim() || undefined,
          clienteEmail: emailClienta.trim() || undefined,
          totalEsperado: decimal(totalCentavos),
          items: items.map((i) => ({
            productoId: i.productoId,
            cantidad: i.cantidad,
            modalidad: i.modalidad,
            especificaciones: i.especificaciones.trim() || undefined,
            fechaEstimada: i.fechaEstimada
              ? `${i.fechaEstimada}T12:00:00-03:00`
              : undefined,
          })),
          descuento: decimal(descuentoCentavos),
          metodoPago: medio,
          cobroInicial: {
            montoArs: decimal(cobro),
            metodoPago: medio,
            ...(modo === "otro" && monedaCobro === "USD" && cobro > BigInt(0)
              ? {
                  montoUsd: importe.trim().replace(",", "."),
                  cotizacionUsd: cotizacionUsd.trim().replace(",", "."),
                }
              : {}),
          },
          claveIdempotencia: clave.current,
          pedido: {
            fechaPrometida: fechaPrometida
              ? `${fechaPrometida}T12:00:00-03:00`
              : undefined,
            responsable: responsable.trim() || undefined,
            notas: notasFinales || undefined,
          },
        }),
      });
      router.push(`/pedidos/${pedido.id}`);
      notificar.ok("Pedido registrado correctamente");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo registrar el pedido.",
      );
      notificar.error(
        e instanceof Error ? e.message : "No se pudo registrar el pedido.",
      );
    }
  });

  const enCarritoMap = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const i of items) {
      mapa.set(i.productoId, (mapa.get(i.productoId) ?? 0) + i.cantidad);
    }
    return mapa;
  }, [items]);

  return (
    <div className="space-y-6">
      <PageHeader
        overline="Operación · Pedidos"
        title="Nuevo pedido"
        description="Escribí el nombre de la clienta (o elegí una sugerida), cargá las piezas a medida y registrá la seña."
      >
        <Button variant="outline" asChild>
          <Link href="/pedidos">
            <ArrowLeft className="h-4 w-4" />
            Volver a pedidos
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_31rem]">
        <div className="min-w-0 space-y-6">
          <Panel>
            <PanelHeader
              title="1. Clienta y coordinación"
              descripcion="Podés escribir cualquier nombre libremente. Al tipear te recomendamos clientas ya cargadas."
              acciones={
                clientaVinculada ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground">
                    <UserCheck className="size-3.5 text-num-positive" />
                    <span>En agenda: {clientaVinculada.nombre}</span>
                    <button
                      type="button"
                      onClick={desvincularClienta}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                      title="Desvincular para usar como nombre libre"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ) : nombreClienta.trim() ? (
                  <Badge variant="secondary">Nombre libre / nueva</Badge>
                ) : undefined
              }
            />
            <PanelBody>
              <EstadoConsulta
                error={clientes.error}
                cargando={clientes.cargando}
                reintentar={() => void clientes.refrescar()}
              />

              <div className="space-y-4">
                {/* Input principal de Nombre de Clienta con recomendaciones desplegables al tipear */}
                <div className="relative">
                  <Label htmlFor="nombre-clienta-pedido">
                    Nombre de la clienta
                  </Label>
                  <div className="relative mt-1">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="nombre-clienta-pedido"
                      placeholder="Escribí cualquier nombre (ej. Sofía Martínez) o buscá por teléfono…"
                      value={nombreClienta}
                      disabled={cargando}
                      autoComplete="off"
                      onFocus={() => setSugerenciasAbiertas(true)}
                      onBlur={() => {
                        setTimeout(() => setSugerenciasAbiertas(false), 180);
                      }}
                      onChange={(e) => {
                        const nuevo = e.target.value;
                        setNombreClienta(nuevo);
                        setSugerenciasAbiertas(true);
                        clave.current = null;
                        if (
                          clientaVinculada &&
                          nuevo.trim().toLocaleLowerCase() !==
                            clientaVinculada.nombre.trim().toLocaleLowerCase()
                        ) {
                          setClienteId("");
                        }
                      }}
                      className="pl-9 pr-8 font-medium"
                    />
                    {nombreClienta && (
                      <button
                        type="button"
                        onClick={() => {
                          setNombreClienta("");
                          setClienteId("");
                          setTelefonoClienta("");
                          setEmailClienta("");
                          clave.current = null;
                        }}
                        aria-label="Limpiar nombre de clienta"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>

                  {/* Menú desplegable de recomendaciones en vivo */}
                  {sugerenciasAbiertas &&
                    (recomendacionesClientas.length > 0 ||
                      nombreClienta.trim().length > 0) && (
                      <div
                        role="listbox"
                        aria-label="Clientas recomendadas"
                        className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border-strong/60 bg-popover p-1.5 text-popover-foreground shadow-md"
                      >
                        {nombreClienta.trim() && !clientaVinculada && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSugerenciasAbiertas(false);
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-md bg-surface/80 px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-accent"
                          >
                            <span>
                              Usar{" "}
                              <strong className="font-semibold">
                                «{nombreClienta.trim()}»
                              </strong>{" "}
                              directamente en el pedido
                            </span>
                            <Badge variant="outline">Nombre libre</Badge>
                          </button>
                        )}

                        {recomendacionesClientas.length > 0 && (
                          <div className="pt-1">
                            <p className="px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                              Clientas ya cargadas ({recomendacionesClientas.length})
                            </p>
                            {recomendacionesClientas.map((c) => {
                              const seleccionada = c.id === clienteId;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    seleccionarClientaRecomendada(c);
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                                    seleccionada && "bg-accent font-medium",
                                  )}
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-foreground">
                                      {c.nombre}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                      {c.telefono
                                        ? `Tel: ${c.telefono}`
                                        : "Sin teléfono"}
                                      {c.email ? ` · ${c.email}` : ""}
                                    </p>
                                  </div>
                                  {seleccionada ? (
                                    <Check className="size-4 shrink-0 text-foreground" />
                                  ) : (
                                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                                      Elegir
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                </div>

                {/* Contacto opcional en línea (sin obligar a abrir un modal) */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="telefono-clienta-pedido">
                      Teléfono / WhatsApp (opcional)
                    </Label>
                    <Input
                      id="telefono-clienta-pedido"
                      placeholder="Ej. 11 5555-4444"
                      value={telefonoClienta}
                      disabled={cargando}
                      onChange={(e) => {
                        setTelefonoClienta(e.target.value);
                        clave.current = null;
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email-clienta-pedido">
                      Email (opcional)
                    </Label>
                    <Input
                      id="email-clienta-pedido"
                      type="email"
                      placeholder="clienta@email.com"
                      value={emailClienta}
                      disabled={cargando}
                      onChange={(e) => {
                        setEmailClienta(e.target.value);
                        clave.current = null;
                      }}
                    />
                  </div>
                </div>

                {!clienteId &&
                  nombreClienta.trim() &&
                  (telefonoClienta.trim() || emailClienta.trim()) && (
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={guardarEnAgenda}
                        onChange={(e) => setGuardarEnAgenda(e.target.checked)}
                        className="size-3.5 rounded border-input accent-foreground"
                      />
                      <span>
                        Guardar también a{" "}
                        <strong className="text-foreground">
                          {nombreClienta.trim()}
                        </strong>{" "}
                        en la agenda de clientas para próximas compras
                      </span>
                    </label>
                  )}

                {/* Fecha prometida con atajos rápidos + Responsable */}
                <div className="grid gap-3 border-t border-border/70 pt-3.5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <Label htmlFor="fecha-pedido">
                        Fecha prometida de entrega
                      </Label>
                      <div className="flex items-center gap-1">
                        {[
                          { label: "+7d", dias: 7 },
                          { label: "+15d", dias: 15 },
                          { label: "+30d", dias: 30 },
                          { label: "+45d", dias: 45 },
                        ].map((atajo) => (
                          <button
                            key={atajo.label}
                            type="button"
                            onClick={() => {
                              setFechaPrometida(fechaMasDiasISO(atajo.dias));
                              clave.current = null;
                            }}
                            className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            {atajo.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Input
                      id="fecha-pedido"
                      type="date"
                      value={fechaPrometida}
                      onChange={(e) => {
                        setFechaPrometida(e.target.value);
                        clave.current = null;
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="responsable-pedido">
                      Responsable / taller asignado
                    </Label>
                    <Input
                      id="responsable-pedido"
                      placeholder="Ej. Taller Herrería / Tapicería"
                      value={responsable}
                      maxLength={200}
                      onChange={(e) => {
                        setResponsable(e.target.value);
                        clave.current = null;
                      }}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notas-pedido">
                    Observaciones generales del pedido (opcional)
                  </Label>
                  <Textarea
                    id="notas-pedido"
                    rows={2}
                    placeholder="Condiciones de entrega, coordinación de flete o aclaraciones…"
                    value={notas}
                    maxLength={2000}
                    onChange={(e) => {
                      setNotas(e.target.value);
                      clave.current = null;
                    }}
                  />
                </div>
              </div>
            </PanelBody>
          </Panel>

          <ProductosGridPaginado
            onAgregar={agregar}
            enCarrito={enCarritoMap}
            permitirSinStock
          />
        </div>

        <aside className="min-w-0 space-y-6">
          <Panel>
            <PanelHeader
              title="2. Líneas del encargo"
              descripcion="Detallá medidas o terminación de cada producto. Podés duplicar una línea si lleva otra medida."
              acciones={
                items.length > 0 ? (
                  <Badge variant="secondary">
                    {items.reduce((a, b) => a + b.cantidad, 0)} u.
                  </Badge>
                ) : undefined
              }
            />
            <PanelBody>
              {!items.length ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <Search className="size-6 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">
                    Elegí productos del catálogo para armar el pedido.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((i, index) => (
                    <fieldset
                      key={i.clave}
                      disabled={cargando}
                      className="space-y-3 rounded-lg border border-border bg-background/50 p-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <legend className="text-sm font-semibold text-foreground">
                            {i.nombre}
                          </legend>
                          <p className="font-mono text-xs text-muted-foreground">
                            {dinero(i.precio)} c/u
                            {i.sku ? ` · ${i.sku}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="xs"
                            variant="ghost"
                            title="Agregar otra línea con distintas medidas"
                            onClick={() => duplicarLinea(i)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Otra medida
                          </Button>
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            aria-label={`Quitar ${i.nombre}`}
                            onClick={() => {
                              setItems((prev) =>
                                prev.filter((x) => x.clave !== i.clave),
                              );
                              clave.current = null;
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-[auto_1fr] items-end gap-3">
                        <div>
                          <Label htmlFor={`cantidad-${index}`}>Cantidad</Label>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="outline"
                              onClick={() =>
                                modificar(i.clave, {
                                  cantidad: Math.max(1, i.cantidad - 1),
                                })
                              }
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <Input
                              id={`cantidad-${index}`}
                              type="number"
                              min="1"
                              step="1"
                              className="h-8 w-16 text-center font-mono"
                              value={i.cantidad}
                              onChange={(e) =>
                                modificar(i.clave, {
                                  cantidad: Math.max(
                                    1,
                                    Math.min(10000, Number(e.target.value) || 1),
                                  ),
                                })
                              }
                            />
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="outline"
                              onClick={() =>
                                modificar(i.clave, {
                                  cantidad: Math.min(10000, i.cantidad + 1),
                                })
                              }
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`modalidad-${index}`}>
                            Modalidad de entrega
                          </Label>
                          <select
                            id={`modalidad-${index}`}
                            className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs"
                            value={i.modalidad}
                            onChange={(e) =>
                              modificar(i.clave, { modalidad: e.target.value })
                            }
                          >
                            <option value="ENCARGO">
                              Mandar a hacer / por encargo
                            </option>
                            <option value="INMEDIATA">
                              Retira hoy (descuenta stock)
                            </option>
                          </select>
                        </div>
                      </div>

                      {i.modalidad === "ENCARGO" && (
                        <div className="space-y-2.5 pt-1">
                          <div>
                            <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
                              <Label htmlFor={`especificaciones-${index}`}>
                                Medidas, tela, color o terminación
                              </Label>
                              <div className="flex flex-wrap gap-1">
                                {ETIQUETAS_ESPECIFICACION.map((et) => (
                                  <button
                                    key={et}
                                    type="button"
                                    onClick={() =>
                                      agregarEspecificacionRapida(i, et)
                                    }
                                    className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
                                  >
                                    + {et.replace(": ", "")}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <Textarea
                              id={`especificaciones-${index}`}
                              placeholder="Ej. 180×90 cm, madera petiribí, laca mate…"
                              className="min-h-16 text-xs"
                              value={i.especificaciones}
                              maxLength={2000}
                              onChange={(e) =>
                                modificar(i.clave, {
                                  especificaciones: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor={`estimada-${index}`}>
                              Fecha estimada de esta pieza (opcional)
                            </Label>
                            <Input
                              id={`estimada-${index}`}
                              type="date"
                              className="h-8 text-xs"
                              value={i.fechaEstimada}
                              onChange={(e) =>
                                modificar(i.clave, {
                                  fechaEstimada: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                        <span className="text-muted-foreground">
                          Subtotal línea
                        </span>
                        <strong className="font-mono text-sm text-foreground">
                          {dinero(
                            decimal(centavos(i.precio) * BigInt(i.cantidad)),
                          )}
                        </strong>
                      </div>
                    </fieldset>
                  ))}
                </div>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="3. Seña y confirmación"
              descripcion="Calculá el anticipo hoy y el saldo pendiente a cobrar en la entrega."
            />
            <PanelBody>
              <div className="space-y-4">
                {/* Bonificación / Descuento en ARS o % */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="descuento-pedido">
                      Bonificación / descuento (opcional)
                    </Label>
                    <div className="inline-flex rounded-md border border-border bg-surface p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setTipoDescuento("ars");
                          setDescuentoInput("");
                          clave.current = null;
                        }}
                        className={cn(
                          "rounded px-2 py-0.5 font-mono text-[11px]",
                          tipoDescuento === "ars"
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        $ ARS
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTipoDescuento("pct");
                          setDescuentoInput("");
                          clave.current = null;
                        }}
                        className={cn(
                          "rounded px-2 py-0.5 font-mono text-[11px]",
                          tipoDescuento === "pct"
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        % Porc.
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="descuento-pedido"
                      inputMode="decimal"
                      placeholder={
                        tipoDescuento === "pct" ? "Ej. 10 (%)" : "0.00"
                      }
                      value={descuentoInput}
                      disabled={cargando}
                      onChange={(e) => {
                        setDescuentoInput(e.target.value);
                        clave.current = null;
                      }}
                    />
                    {tipoDescuento === "pct" && (
                      <div className="flex shrink-0 gap-1">
                        {["5", "10", "15"].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setDescuentoInput(p);
                              clave.current = null;
                            }}
                            className="rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-xs hover:bg-accent"
                          >
                            {p}%
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cuánto abona hoy con montos calculados en vivo */}
                <div className="space-y-1.5">
                  <Label>Cuánto abona hoy</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        {
                          id: "mitad",
                          label: "Seña 50%",
                          sub:
                            totalCentavos > BigInt(0)
                              ? dinero(decimal(mitadCentavos))
                              : undefined,
                        },
                        {
                          id: "total",
                          label: "Total 100%",
                          sub:
                            totalCentavos > BigInt(0)
                              ? dinero(decimal(totalCentavos))
                              : undefined,
                        },
                        {
                          id: "otro",
                          label: "Otro monto",
                          sub: "ARS o USD",
                        },
                        {
                          id: "sin",
                          label: "Sin seña hoy",
                          sub: "$ 0",
                        },
                      ] as const
                    ).map((op) => {
                      const activo = modo === op.id;
                      return (
                        <button
                          key={op.id}
                          type="button"
                          disabled={cargando}
                          onClick={() => {
                            setModo(op.id);
                            clave.current = null;
                          }}
                          className={cn(
                            "flex flex-col items-start justify-between rounded-md border px-3 py-2 text-left transition-colors",
                            activo
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-background text-foreground hover:bg-accent",
                          )}
                        >
                          <span className="text-xs font-semibold">
                            {op.label}
                          </span>
                          {op.sub && (
                            <span
                              className={cn(
                                "font-mono text-[11px] tabular-nums",
                                activo
                                  ? "text-background/80"
                                  : "text-muted-foreground",
                              )}
                            >
                              {op.sub}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {modo === "otro" && (
                  <div className="space-y-3 rounded-lg border border-border bg-surface/50 p-3">
                    <div className="grid grid-cols-[auto_1fr] gap-2">
                      <div>
                        <Label htmlFor="moneda-sena">Moneda</Label>
                        <select
                          id="moneda-sena"
                          className={campo}
                          value={monedaCobro}
                          disabled={cargando}
                          onChange={(e) => {
                            setMonedaCobro(e.target.value as "ARS" | "USD");
                            clave.current = null;
                          }}
                        >
                          <option value="ARS">ARS</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="importe-inicial">
                          Importe de seña ({monedaCobro})
                        </Label>
                        <Input
                          id="importe-inicial"
                          inputMode="decimal"
                          placeholder={
                            monedaCobro === "USD" ? "Ej. 100" : "Ej. 150000"
                          }
                          value={importe}
                          disabled={cargando}
                          onChange={(e) => {
                            setImporte(e.target.value);
                            clave.current = null;
                          }}
                        />
                      </div>
                    </div>

                    {monedaCobro === "USD" && (
                      <div>
                        <Label htmlFor="tc-sena">
                          Cotización (ARS por 1 USD)
                        </Label>
                        <Input
                          id="tc-sena"
                          inputMode="decimal"
                          placeholder="Ej. 1250"
                          value={cotizacionUsd}
                          disabled={cargando}
                          onChange={(e) => {
                            setCotizacionUsd(e.target.value);
                            clave.current = null;
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {modo !== "sin" && (
                  <div>
                    <Label htmlFor="medio-inicial">Medio de pago</Label>
                    <select
                      id="medio-inicial"
                      className={campo}
                      value={medio}
                      disabled={cargando}
                      onChange={(e) => {
                        setMedio(e.target.value);
                        clave.current = null;
                      }}
                    >
                      {METODOS_PAGO_INDIVIDUAL.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <dl className="space-y-2 rounded-md border border-border bg-secondary/30 p-3.5 text-sm">
                  {descuentoCentavos > BigInt(0) && (
                    <>
                      <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                        <dt>Subtotal catálogo</dt>
                        <dd className="font-mono">
                          {dinero(decimal(subtotalCentavos))}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                        <dt>Descuento</dt>
                        <dd className="font-mono">
                          - {dinero(decimal(descuentoCentavos))}
                        </dd>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Total del pedido</dt>
                    <dd className="font-mono font-semibold text-foreground">
                      {dinero(decimal(totalCentavos))}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Seña cobrada hoy</dt>
                    <dd className="font-mono text-num-positive">
                      {importeValido
                        ? dinero(decimal(cobro))
                        : "Revisá el importe"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-border pt-2 font-semibold">
                    <dt>Saldo pendiente</dt>
                    <dd
                      className={`font-mono ${
                        saldo > BigInt(0)
                          ? "text-num-warning"
                          : "text-num-positive"
                      }`}
                    >
                      {saldo >= BigInt(0) && importeValido
                        ? dinero(decimal(saldo))
                        : "Importe inválido"}
                    </dd>
                  </div>
                </dl>

                {error && (
                  <p
                    role="alert"
                    className="text-sm font-medium text-num-negative"
                  >
                    {error}
                  </p>
                )}

                <Button
                  className="w-full"
                  loading={cargando}
                  loadingText="Registrando pedido…"
                  disabled={
                    !items.length || (!nombreClienta.trim() && !clienteId)
                  }
                  onClick={() => void confirmar()}
                >
                  <Calendar className="size-4" />
                  Confirmar pedido
                </Button>
              </div>
            </PanelBody>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
