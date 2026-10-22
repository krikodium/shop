"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Calendar,
  Check,
  CreditCard,
  FileText,
  Mail,
  MessageSquarePlus,
  PackageCheck,
  Pencil,
  Phone,
  Truck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { METODO_PAGO_LABEL, METODOS_PAGO_INDIVIDUAL } from "@/lib/constants";
import { usePagosVenta } from "@/components/ventas/usePagosVenta";
import { notificar } from "@/lib/notificar";
import { useAsyncAction } from "@/hooks/use-async-action";
import { Figure, FigureGrid } from "@/components/ui/figure";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTrigger,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Pedido,
  PedidoItem,
  api,
  useConsulta,
  EstadoConsulta,
  estados,
  estadosPago,
  pasosSeguimiento,
  dinero,
  fecha,
  fechaHora,
  fechaInput,
  centavos,
  decimal,
  resumenPedido,
  nombreClientaPedido,
} from "./pedido-ui";

type Accion = { tipo: string; item?: PedidoItem };

const etiquetas: Record<string, string> = {
  CREADO: "Pedido registrado",
  ENCARGADO: "Marcar encargado al taller",
  EN_FABRICACION: "Marcar en fabricación",
  RECEPCION: "Registrar recepción en local",
  ENTREGA: "Registrar entrega a clienta",
  NOTA: "Agregar anotación interna",
  COORDINACION: "Actualizar coordinación",
  CANCELACION: "Pedido cancelado",
  PAGO: "Registrar cobro",
};

const ordenPaso: Record<string, number> = {
  PENDIENTE: 0,
  ENCARGADO: 1,
  EN_FABRICACION: 2,
  LISTO: 3,
  ENTREGADO: 4,
};

const campo =
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm";

function CancelarPedido({
  pedido,
  refrescar,
}: {
  pedido: Pedido;
  refrescar: () => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const operacion = useRef<{ huella: string; clave: string } | null>(null);
  const { run: cancelar, loading } = useAsyncAction(async () => {
    if (motivo.trim().length < 5) {
      notificar.error("Indicá un motivo de al menos 5 caracteres.");
      return;
    }
    try {
      const contenido = { tipo: "CANCELACION", notas: motivo.trim() };
      const huella = JSON.stringify(contenido);
      if (operacion.current?.huella !== huella)
        operacion.current = { huella, clave: crypto.randomUUID() };
      await api(`/api/pedidos/${pedido.id}/eventos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...contenido,
          claveIdempotencia: operacion.current.clave,
        }),
      });
      setAbierto(false);
      operacion.current = null;
      notificar.ok("Pedido cancelado");
      await refrescar();
    } catch (e) {
      notificar.error(
        e instanceof Error ? e.message : "No se pudo cancelar el pedido.",
      );
    }
  });
  return (
    <AlertDialog
      open={abierto}
      onOpenChange={(v) => {
        if (!loading) {
          setAbierto(v);
          if (v) {
            setMotivo("");
          }
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline">Cancelar pedido</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Cancelar {pedido.venta.numeroVenta}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Se anula la venta y la mercadería recibida vuelve al catálogo. Solo
            se pueden cancelar pedidos sin cobros ni entregas registradas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="motivo-cancelacion">Motivo de cancelación</Label>
          <Textarea
            id="motivo-cancelacion"
            placeholder="Explicá por qué se anula el encargo…"
            value={motivo}
            disabled={loading}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={2000}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Volver</AlertDialogCancel>
          <Button
            variant="destructive"
            loading={loading}
            loadingText="Cancelando…"
            onClick={() => void cancelar()}
          >
            Confirmar cancelación
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DetalleCargado({
  pedido: p,
  refrescar,
}: {
  pedido: Pedido;
  refrescar: () => Promise<void>;
}) {
  const pagos = usePagosVenta(p.ventaId);
  const { data: sesion } = useSession();
  const puedeEditar = !!sesion?.user && sesion.user.role !== "VIEWER";
  const esAdmin = sesion?.user?.role === "ADMIN";
  const r = resumenPedido(p);

  const [accion, setAccion] = useState<Accion | null>(null);
  const [notas, setNotas] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [importe, setImporte] = useState("");
  const [medio, setMedio] = useState("EFECTIVO");
  const [moneda, setMoneda] = useState("ARS");
  const [cotizacion, setCotizacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const operacion = useRef<{ huella: string; clave: string } | null>(null);
  const [excepcionSaldo, setExcepcionSaldo] = useState(false);
  const [motivoExcepcion, setMotivoExcepcion] = useState("");

  // Estados de edición de coordinación (general o por ítem)
  const [coordClienteNombre, setCoordClienteNombre] = useState("");
  const [coordClienteTelefono, setCoordClienteTelefono] = useState("");
  const [coordClienteEmail, setCoordClienteEmail] = useState("");
  const [coordFechaPrometida, setCoordFechaPrometida] = useState("");
  const [coordResponsable, setCoordResponsable] = useState("");
  const [coordNotasPedido, setCoordNotasPedido] = useState("");
  const [coordEspecificaciones, setCoordEspecificaciones] = useState("");
  const [coordFechaEstimada, setCoordFechaEstimada] = useState("");

  function abrir(a: Accion) {
    setAccion(a);
    setNotas("");
    if (a.tipo === "RECEPCION" && a.item) {
      setCantidad(
        String(Math.max(1, a.item.cantidad - a.item.cantidadRecibida)),
      );
    } else if (a.tipo === "ENTREGA" && a.item) {
      setCantidad(
        String(Math.max(1, a.item.cantidadRecibida - a.item.cantidadEntregada)),
      );
    } else {
      setCantidad("1");
    }
    if (a.tipo === "COORDINACION") {
      if (a.item) {
        setCoordEspecificaciones(a.item.especificaciones || "");
        setCoordFechaEstimada(fechaInput(a.item.fechaEstimada));
      } else {
        setCoordClienteNombre(
          p.venta.cliente?.nombre || p.venta.clienteNombre || "",
        );
        setCoordClienteTelefono(p.venta.cliente?.telefono || "");
        setCoordClienteEmail(p.venta.cliente?.email || "");
        setCoordFechaPrometida(fechaInput(p.fechaPrometida));
        setCoordResponsable(p.responsable || "");
        setCoordNotasPedido(p.notas || "");
      }
    }
    setImporte(p.saldoPendiente);
    setMedio("EFECTIVO");
    setMoneda("ARS");
    setCotizacion("");
    setError(null);
    setExcepcionSaldo(false);
    setMotivoExcepcion("");
  }

  const pendienteMitad = (() => {
    const mitad = (centavos(p.venta.total) + BigInt(1)) / BigInt(2);
    const falta = mitad - centavos(p.totalPagado);
    return decimal(falta > BigInt(0) ? falta : BigInt(0));
  })();

  function montoArs() {
    const valor = centavos(importe.trim().replace(",", "."));
    if (moneda === "ARS") return decimal(valor);
    const normalizada = cotizacion.trim().replace(",", ".");
    if (!/^\d+(\.\d{1,4})?$/.test(normalizada))
      throw new Error("Ingresá la cotización con hasta cuatro decimales.");
    const [entero, dec = ""] = normalizada.split(".");
    const tc = BigInt(entero) * BigInt(10000) + BigInt(dec.padEnd(4, "0"));
    if (tc <= BigInt(0))
      throw new Error("La cotización debe ser mayor a cero.");
    return decimal((valor * tc + BigInt(5000)) / BigInt(10000));
  }

  const { run: confirmar, loading: cargando } = useAsyncAction(async () => {
    if (!accion) return;
    setError(null);
    async function enviar(url: string, contenido: Record<string, unknown>) {
      const huella = JSON.stringify({ url, ...contenido });
      if (operacion.current?.huella !== huella)
        operacion.current = { huella, clave: crypto.randomUUID() };
      return api(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...contenido,
          claveIdempotencia: operacion.current.clave,
        }),
      });
    }
    try {
      if (accion.tipo === "PAGO") {
        const ars = montoArs();
        if (
          centavos(ars) <= BigInt(0) ||
          centavos(ars) > centavos(p.saldoPendiente)
        )
          throw new Error(
            "El cobro debe ser mayor a cero y no superar el saldo.",
          );
        await enviar(`/api/ventas/${p.ventaId}/pagos`, {
          montoArs: ars,
          metodoPago: medio,
          notas: notas.trim() || undefined,
          ...(moneda === "USD"
            ? {
                montoUsd: importe.trim().replace(",", "."),
                cotizacionUsd: cotizacion.trim().replace(",", "."),
              }
            : {}),
        });
      } else if (accion.tipo === "COORDINACION") {
        if (accion.item) {
          await enviar(`/api/pedidos/${p.id}/eventos`, {
            tipo: "COORDINACION",
            itemId: accion.item.id,
            especificaciones: coordEspecificaciones.trim() || null,
            fechaEstimada: coordFechaEstimada
              ? `${coordFechaEstimada}T12:00:00-03:00`
              : null,
            notas: notas.trim() || undefined,
          });
        } else {
          await enviar(`/api/pedidos/${p.id}/eventos`, {
            tipo: "COORDINACION",
            clienteNombre: coordClienteNombre.trim() || null,
            ...(p.venta.cliente?.id
              ? {
                  clienteTelefono: coordClienteTelefono.trim() || null,
                  clienteEmail: coordClienteEmail.trim() || null,
                }
              : {}),
            fechaPrometida: coordFechaPrometida
              ? `${coordFechaPrometida}T12:00:00-03:00`
              : null,
            responsable: coordResponsable.trim() || null,
            notasPedido: coordNotasPedido.trim() || null,
            notas: notas.trim() || undefined,
          });
        }
      } else {
        const cuenta = Number(cantidad);
        if (
          ["RECEPCION", "ENTREGA"].includes(accion.tipo) &&
          (!Number.isInteger(cuenta) || cuenta <= 0)
        )
          throw new Error("Ingresá una cantidad entera mayor a cero.");
        if (accion.tipo === "NOTA" && !notas.trim())
          throw new Error("Escribí la anotación.");
        await enviar(`/api/pedidos/${p.id}/eventos`, {
          tipo: accion.tipo,
          itemId: accion.item?.id,
          cantidad: ["RECEPCION", "ENTREGA"].includes(accion.tipo)
            ? cuenta
            : undefined,
          notas: notas.trim() || undefined,
          ...(accion.tipo === "ENTREGA" && excepcionSaldo
            ? {
                excepcionSaldo: true,
                motivoExcepcion: motivoExcepcion.trim(),
              }
            : {}),
        });
      }
      setAccion(null);
      operacion.current = null;
      notificar.ok("Pedido actualizado");
      await Promise.all([refrescar(), pagos.refrescar()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar.");
      notificar.error(e instanceof Error ? e.message : "No se pudo registrar.");
    }
  });

  const maxUnidadesModal =
    accion?.tipo === "RECEPCION"
      ? (accion.item?.cantidad || 0) - (accion.item?.cantidadRecibida || 0)
      : accion?.tipo === "ENTREGA"
        ? (accion.item?.cantidadRecibida || 0) -
          (accion.item?.cantidadEntregada || 0)
        : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        overline="Operación · Pedidos"
        title={p.venta.numeroVenta}
        description={nombreClientaPedido(p)}
      >
        <Button asChild variant="outline">
          <Link href="/pedidos">
            <ArrowLeft className="h-4 w-4" />
            Volver a pedidos
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/ventas/${p.ventaId}`}>
            <FileText className="h-4 w-4" />
            Ver comprobante
          </Link>
        </Button>
        {puedeEditar && !p.venta.anulada && p.saldoPendiente !== "0.00" && (
          <Button onClick={() => abrir({ tipo: "PAGO" })}>
            <CreditCard className="h-4 w-4" />
            Registrar cobro
          </Button>
        )}
        {esAdmin &&
          !p.venta.anulada &&
          p.totalPagado === "0.00" &&
          p.venta.items.every((i) => i.cantidadEntregada === 0) && (
            <CancelarPedido pedido={p} refrescar={refrescar} />
          )}
      </PageHeader>

      <FigureGrid columnas={4}>
        <Figure
          label="Total acordado"
          valor={dinero(p.venta.total)}
          hint={`Estado general: ${r.etiquetaEstadoGeneral}`}
        />
        <Figure
          label="Cobrado acumulado"
          valor={dinero(p.totalPagado)}
          tono={r.porcentajePago === 100 ? "positivo" : "neutro"}
          hint={`${r.porcentajePago}% del total cubierto`}
        />
        <Figure
          label="Saldo pendiente"
          valor={dinero(p.saldoPendiente)}
          tono={r.tieneSaldo ? "alerta" : "positivo"}
          hint={
            r.tieneSaldo
              ? "A saldar antes o al momento del retiro"
              : "Pedido saldado por completo"
          }
        />
        <Figure
          label="Unidades entregadas"
          valor={`${r.unidadesEntregadas} / ${r.unidadesTotales}`}
          tono={r.unidadesListasParaEntregar > 0 ? "positivo" : "neutro"}
          hint={`${r.unidadesRecibidas} recibidas en local · ${r.unidadesListasParaEntregar} listas para retirar`}
        />
      </FigureGrid>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        {/* Columna izquierda: Productos y pipeline de entregas */}
        <div className="space-y-6">
          <Panel>
            <PanelHeader
              title="Productos y seguimiento de producción"
              descripcion="Registrá el avance en taller, la entrada al local y el retiro de cada pieza."
              acciones={
                <Badge variant="secondary">{r.etiquetaEstadoGeneral}</Badge>
              }
            />
            <PanelBody>
              <div className="space-y-6">
                {p.venta.items.map((i) => {
                  const pasoActual = ordenPaso[i.seguimientoEstado] ?? -1;
                  const pendientesRecibir = i.cantidad - i.cantidadRecibida;
                  const listasEntregar =
                    i.cantidadRecibida - i.cantidadEntregada;

                  return (
                    <article
                      key={i.id}
                      className="rounded-lg border border-border bg-background/50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                              {i.cantidad} u.
                            </span>
                            <h3 className="text-base font-semibold text-foreground">
                              {i.productoNombre}
                            </h3>
                            <span className="font-mono text-xs text-muted-foreground">
                              {i.productoSku}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Unitario: {dinero(i.precioUnitario)} · Subtotal:{" "}
                            <strong className="font-mono text-foreground">
                              {dinero(i.subtotal)}
                            </strong>{" "}
                            · Modalidad:{" "}
                            {i.modalidad === "ENCARGO"
                              ? "Por encargo / taller"
                              : "Entrega inmediata"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {estados[i.seguimientoEstado] || i.seguimientoEstado}
                          </Badge>
                          {puedeEditar && !p.venta.anulada && (
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() =>
                                abrir({ tipo: "COORDINACION", item: i })
                              }
                            >
                              <Pencil className="h-3 w-3" />
                              Editar medidas
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Stepper visual de etapas */}
                      {i.modalidad === "ENCARGO" &&
                        i.seguimientoEstado !== "CANCELADO" && (
                          <div className="mt-4 grid grid-cols-5 gap-1.5">
                            {pasosSeguimiento.map((paso, idx) => {
                              const completado = pasoActual >= idx;
                              const esActual = pasoActual === idx;
                              return (
                                <div key={paso.id} className="space-y-1">
                                  <div
                                    className={`h-1.5 w-full rounded-full transition-colors ${
                                      completado
                                        ? "bg-foreground"
                                        : "bg-secondary"
                                    }`}
                                  />
                                  <p
                                    className={`truncate text-[11px] ${
                                      esActual
                                        ? "font-semibold text-foreground"
                                        : completado
                                          ? "text-foreground/80"
                                          : "text-muted-foreground"
                                    }`}
                                  >
                                    {paso.label}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}

                      {/* Resumen de cantidades y especificaciones */}
                      <div className="mt-3 grid gap-2 rounded-md border border-border/70 bg-card p-3 text-xs sm:grid-cols-3">
                        <div>
                          <span className="text-muted-foreground">
                            Recibidas en local:{" "}
                          </span>
                          <strong className="font-mono text-foreground">
                            {i.cantidadRecibida} / {i.cantidad}
                          </strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Entregadas a clienta:{" "}
                          </span>
                          <strong className="font-mono text-foreground">
                            {i.cantidadEntregada} / {i.cantidad}
                          </strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Fecha estimada ítem:{" "}
                          </span>
                          <strong className="text-foreground">
                            {fecha(i.fechaEstimada)}
                          </strong>
                        </div>
                      </div>

                      {i.especificaciones && (
                        <div className="mt-2.5 rounded-md bg-secondary/50 px-3 py-2 text-xs">
                          <span className="font-medium text-muted-foreground">
                            Especificaciones / medidas:{" "}
                          </span>
                          <span className="whitespace-pre-wrap text-foreground">
                            {i.especificaciones}
                          </span>
                        </div>
                      )}

                      {/* Botonera operativa del ítem */}
                      {puedeEditar &&
                        !p.venta.anulada &&
                        !["ENTREGADO", "CANCELADO"].includes(
                          i.seguimientoEstado,
                        ) && (
                          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
                            {i.seguimientoEstado === "PENDIENTE" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  abrir({ tipo: "ENCARGADO", item: i })
                                }
                              >
                                Marcar encargado
                              </Button>
                            )}
                            {["PENDIENTE", "ENCARGADO"].includes(
                              i.seguimientoEstado,
                            ) &&
                              i.cantidadRecibida < i.cantidad && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    abrir({ tipo: "EN_FABRICACION", item: i })
                                  }
                                >
                                  En fabricación
                                </Button>
                              )}
                            {pendientesRecibir > 0 &&
                              [
                                "PENDIENTE",
                                "ENCARGADO",
                                "EN_FABRICACION",
                                "LISTO",
                              ].includes(i.seguimientoEstado) && (
                                <Button
                                  size="sm"
                                  variant={
                                    listasEntregar === 0 ? "default" : "outline"
                                  }
                                  onClick={() =>
                                    abrir({ tipo: "RECEPCION", item: i })
                                  }
                                >
                                  <PackageCheck className="h-3.5 w-3.5" />
                                  Registrar recepción ({pendientesRecibir}{" "}
                                  pend.)
                                </Button>
                              )}
                            {listasEntregar > 0 && (
                              <Button
                                size="sm"
                                variant="default"
                                disabled={
                                  p.saldoPendiente !== "0.00" && !esAdmin
                                }
                                onClick={() =>
                                  abrir({ tipo: "ENTREGA", item: i })
                                }
                              >
                                <Truck className="h-3.5 w-3.5" />
                                Registrar entrega ({listasEntregar} lista
                                {listasEntregar > 1 ? "s" : ""})
                              </Button>
                            )}
                          </div>
                        )}
                    </article>
                  );
                })}
              </div>

              {p.saldoPendiente !== "0.00" && !p.venta.anulada && (
                <p className="mt-4 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                  Para registrar la entrega final a la clienta, primero registrá
                  el cobro del saldo pendiente ({dinero(p.saldoPendiente)})
                  {esAdmin
                    ? " o autorizá una excepción con motivo como administrador."
                    : "."}
                </p>
              )}
            </PanelBody>
          </Panel>

          {/* Historial de cobros */}
          <Panel>
            <PanelHeader
              title="Historial de cobros"
              descripcion="Seña inicial y pagos aplicados sobre el pedido."
              acciones={
                puedeEditar &&
                !p.venta.anulada &&
                p.saldoPendiente !== "0.00" ? (
                  <Button size="sm" onClick={() => abrir({ tipo: "PAGO" })}>
                    Registrar cobro
                  </Button>
                ) : undefined
              }
            />
            <PanelBody>
              <EstadoConsulta
                error={pagos.error}
                cargando={pagos.cargando && !pagos.datos}
                reintentar={() => void pagos.refrescar()}
              />
              {pagos.datos &&
                !pagos.error &&
                (pagos.datos.pagos.length ? (
                  <div className="divide-y divide-border">
                    {pagos.datos.pagos.map((pago) => (
                      <div
                        key={pago.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {METODO_PAGO_LABEL[pago.metodoPago] ||
                              pago.metodoPago}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {fechaHora(pago.fecha)} ·{" "}
                            {pago.registradoPor || "Usuario registrado"}
                          </p>
                          {pago.notas && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {pago.notas}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-mono font-semibold tabular-nums text-num-positive">
                            {dinero(pago.montoArs)}
                          </p>
                          {pago.montoUsd && (
                            <p className="font-mono text-xs text-muted-foreground">
                              US$ {pago.montoUsd} · TC {pago.cotizacionUsd}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    titulo="Sin cobros registrados"
                    descripcion="La seña y los pagos posteriores quedan asentados acá."
                  />
                ))}
            </PanelBody>
          </Panel>
        </div>

        {/* Columna derecha: Coordinación y bitácora de eventos */}
        <div className="space-y-6">
          <Panel>
            <PanelHeader
              title="Clienta y coordinación"
              acciones={
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {estadosPago[p.venta.estadoPago] || p.venta.estadoPago}
                  </Badge>
                  {puedeEditar && !p.venta.anulada && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => abrir({ tipo: "COORDINACION" })}
                    >
                      <Pencil className="h-3 w-3" />
                      Editar
                    </Button>
                  )}
                </div>
              }
            />
            <PanelBody>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                  <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <UserRound className="h-3.5 w-3.5" />
                    Clienta
                  </dt>
                  <dd className="font-semibold text-foreground">
                    {nombreClientaPedido(p)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                  <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    Teléfono
                  </dt>
                  <dd className="font-medium text-foreground">
                    {p.venta.cliente?.telefono || "Sin teléfono"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                  <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </dt>
                  <dd className="truncate font-medium text-foreground">
                    {p.venta.cliente?.email || "Sin email"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                  <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Fecha prometida
                  </dt>
                  <dd
                    className={`font-medium ${
                      r.estaDemorado ? "text-num-warning" : "text-foreground"
                    }`}
                  >
                    {fecha(p.fechaPrometida)}
                    {r.estaDemorado ? " (Demorado)" : ""}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <UserRound className="h-3.5 w-3.5" />
                    Responsable / taller
                  </dt>
                  <dd className="font-medium text-foreground">
                    {p.responsable || "Sin asignar"}
                  </dd>
                </div>
              </dl>

              {p.notas && (
                <div className="mt-4 rounded-md border border-border bg-secondary/40 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Notas del pedido
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                    {p.notas}
                  </p>
                </div>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Bitácora de actividad"
              acciones={
                puedeEditar && !p.venta.anulada ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => abrir({ tipo: "NOTA" })}
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    Agregar nota
                  </Button>
                ) : undefined
              }
            />
            <PanelBody>
              {p.eventos.length ? (
                <ol className="space-y-4">
                  {p.eventos.map((e) => (
                    <li
                      key={e.id}
                      className="border-l-2 border-border pl-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <p className="font-medium text-foreground">
                          {etiquetas[e.tipo] || e.tipo}
                          {e.cantidad ? ` · ${e.cantidad} u.` : ""}
                        </p>
                        <span className="text-[11px] text-muted-foreground">
                          {fechaHora(e.fecha)}
                        </span>
                      </div>
                      {e.itemNombre && (
                        <p className="text-xs font-medium text-muted-foreground">
                          Producto: {e.itemNombre}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Por:{" "}
                        {e.registradoPor ||
                          e.usuario?.nombre ||
                          "Usuario registrado"}
                      </p>
                      {e.notas && (
                        <p className="mt-1.5 rounded bg-secondary/50 px-2.5 py-1.5 whitespace-pre-wrap text-xs text-foreground">
                          {e.notas}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState
                  titulo="Sin movimientos registrados"
                  descripcion="Las anotaciones, recepciones y entregas aparecen acá."
                />
              )}
            </PanelBody>
          </Panel>
        </div>
      </div>

      {/* Modal de acciones operativas y cobros */}
      <Dialog
        open={!!accion}
        onOpenChange={(v) => {
          if (!v && !cargando) setAccion(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accion ? etiquetas[accion.tipo] || accion.tipo : ""}
            </DialogTitle>
            <DialogDescription>
              {accion?.item?.productoNombre ||
                "El movimiento queda asentado con fecha y operador responsable."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {accion?.tipo === "PAGO" && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMoneda("ARS");
                      setImporte(p.saldoPendiente);
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Saldar total ({dinero(p.saldoPendiente)})
                  </Button>
                  {pendienteMitad !== "0.00" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMoneda("ARS");
                        setImporte(pendienteMitad);
                      }}
                    >
                      Completar 50% ({dinero(pendienteMitad)})
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="moneda-cobro">Moneda</Label>
                    <select
                      id="moneda-cobro"
                      className={campo}
                      value={moneda}
                      onChange={(e) => {
                        setMoneda(e.target.value);
                        setImporte("");
                      }}
                    >
                      <option>ARS</option>
                      <option>USD</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="importe-cobro">Importe ({moneda})</Label>
                    <Input
                      id="importe-cobro"
                      inputMode="decimal"
                      value={importe}
                      onChange={(e) => setImporte(e.target.value)}
                    />
                  </div>
                </div>
                {moneda === "USD" && (
                  <div>
                    <Label htmlFor="tc-cobro">Cotización (ARS por 1 USD)</Label>
                    <Input
                      id="tc-cobro"
                      inputMode="decimal"
                      placeholder="Ej. 1250"
                      value={cotizacion}
                      onChange={(e) => setCotizacion(e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="medio-cobro">Medio de pago</Label>
                  <select
                    id="medio-cobro"
                    className={campo}
                    value={medio}
                    onChange={(e) => setMedio(e.target.value)}
                  >
                    {METODOS_PAGO_INDIVIDUAL.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {accion?.tipo === "COORDINACION" && !accion.item && (
              <>
                <div>
                  <Label htmlFor="coord-cliente-nombre">
                    Nombre de la clienta
                  </Label>
                  <Input
                    id="coord-cliente-nombre"
                    placeholder="Nombre de la clienta"
                    value={coordClienteNombre}
                    maxLength={200}
                    onChange={(e) => setCoordClienteNombre(e.target.value)}
                  />
                </div>
                {p.venta.cliente?.id && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="coord-cliente-tel">Teléfono</Label>
                      <Input
                        id="coord-cliente-tel"
                        placeholder="Teléfono / WhatsApp"
                        value={coordClienteTelefono}
                        onChange={(e) =>
                          setCoordClienteTelefono(e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="coord-cliente-email">Email</Label>
                      <Input
                        id="coord-cliente-email"
                        type="email"
                        placeholder="email@ejemplo.com"
                        value={coordClienteEmail}
                        onChange={(e) => setCoordClienteEmail(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="coord-fecha-prometida">
                      Fecha prometida
                    </Label>
                    <Input
                      id="coord-fecha-prometida"
                      type="date"
                      value={coordFechaPrometida}
                      onChange={(e) => setCoordFechaPrometida(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="coord-responsable">
                      Responsable / taller
                    </Label>
                    <Input
                      id="coord-responsable"
                      placeholder="Nombre del taller o responsable"
                      value={coordResponsable}
                      maxLength={200}
                      onChange={(e) => setCoordResponsable(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="coord-notas-pedido">
                    Notas generales del pedido
                  </Label>
                  <Textarea
                    id="coord-notas-pedido"
                    value={coordNotasPedido}
                    maxLength={2000}
                    onChange={(e) => setCoordNotasPedido(e.target.value)}
                  />
                </div>
              </>
            )}

            {accion?.tipo === "COORDINACION" && accion.item && (
              <>
                <div>
                  <Label htmlFor="coord-especificaciones">
                    Medidas, material y terminación
                  </Label>
                  <Textarea
                    id="coord-especificaciones"
                    value={coordEspecificaciones}
                    maxLength={2000}
                    onChange={(e) => setCoordEspecificaciones(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="coord-fecha-estimada">
                    Fecha estimada del producto
                  </Label>
                  <Input
                    id="coord-fecha-estimada"
                    type="date"
                    value={coordFechaEstimada}
                    onChange={(e) => setCoordFechaEstimada(e.target.value)}
                  />
                </div>
              </>
            )}

            {accion && ["RECEPCION", "ENTREGA"].includes(accion.tipo) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cantidad-evento">Cantidad de unidades</Label>
                  <span className="text-xs text-muted-foreground">
                    Máximo disponible: {maxUnidadesModal} u.
                  </span>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="cantidad-evento"
                    type="number"
                    min="1"
                    step="1"
                    max={maxUnidadesModal}
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                  />
                  {maxUnidadesModal > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCantidad(String(maxUnidadesModal))}
                    >
                      Todas ({maxUnidadesModal})
                    </Button>
                  )}
                </div>
              </div>
            )}

            {accion?.tipo === "ENTREGA" &&
              p.saldoPendiente !== "0.00" &&
              esAdmin && (
                <div className="space-y-2 rounded-md border border-border bg-secondary/40 p-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={excepcionSaldo}
                      onChange={(e) => setExcepcionSaldo(e.target.checked)}
                    />
                    Autorizar entrega con saldo pendiente
                  </label>
                  <Label htmlFor="motivo-excepcion">
                    Motivo de la excepción
                  </Label>
                  <Textarea
                    id="motivo-excepcion"
                    placeholder="Indicá por qué se entrega antes de saldar…"
                    value={motivoExcepcion}
                    onChange={(e) => setMotivoExcepcion(e.target.value)}
                    minLength={5}
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground">
                    Queda registrado quién autorizó la entrega y por qué.
                  </p>
                </div>
              )}

            <div>
              <Label htmlFor="nota-evento">
                Anotación en bitácora{" "}
                {accion?.tipo === "NOTA" ? "" : "(opcional)"}
              </Label>
              <Textarea
                id="nota-evento"
                placeholder="Observaciones internas sobre este movimiento…"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                maxLength={1000}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-num-negative">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={cargando}
                onClick={() => setAccion(null)}
              >
                Cancelar
              </Button>
              <Button
                loading={cargando}
                loadingText="Guardando…"
                onClick={() => void confirmar()}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PedidoDetalle({ id }: { id: string }) {
  const consulta = useConsulta<Pedido>(`/api/pedidos/${id}`);
  return consulta.datos && !consulta.error ? (
    <DetalleCargado pedido={consulta.datos} refrescar={consulta.refrescar} />
  ) : (
    <EstadoConsulta
      error={consulta.error}
      cargando={consulta.cargando}
      reintentar={() => void consulta.refrescar()}
    />
  );
}
