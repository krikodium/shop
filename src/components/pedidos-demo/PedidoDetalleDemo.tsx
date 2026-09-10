"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Factory,
  MessageSquarePlus,
  PackageCheck,
  ReceiptText,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CorreoPendiente,
  DecisionPendiente,
  DemoBadge,
  DemoSection,
  EstadoPagoBadge,
  EstadoProductoBadge,
  formatFechaDemo,
  formatImporteDemo,
  ResumenImportes,
} from "@/components/pedidos-demo/demo-ui";
import type { EventoPedidoDemo, PedidoDemo } from "@/lib/pedidos-demo";
import { cn } from "@/lib/utils";

type OpcionCobroPosterior = "hasta-mitad" | "saldo" | "otro";

function pesosTextoACentavos(valor: string) {
  const normalizado = valor.trim().replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(normalizado)) return null;
  const [enteros, decimales = ""] = normalizado.split(".");
  return Number.parseInt(enteros, 10) * 100 + Number.parseInt(decimales.padEnd(2, "0") || "0", 10);
}

function iconoEvento(tipo: EventoPedidoDemo["tipo"]) {
  if (tipo === "pago") return Banknote;
  if (tipo === "fabricacion") return Factory;
  if (tipo === "recepcion") return Truck;
  if (tipo === "entrega") return PackageCheck;
  if (tipo === "nota") return MessageSquarePlus;
  return ReceiptText;
}

function esPedidoRecorrido(valor: unknown): valor is PedidoDemo {
  if (!valor || typeof valor !== "object") return false;
  const candidato = valor as Partial<PedidoDemo>;
  return Boolean(
    candidato.clienta &&
    Array.isArray(candidato.items) &&
    Array.isArray(candidato.pagos) &&
    Array.isArray(candidato.eventos) &&
    Number.isSafeInteger(candidato.totalCentavos) &&
    Number.isSafeInteger(candidato.cobradoCentavos) &&
    (candidato.totalCentavos ?? -1) >= 0 &&
    (candidato.cobradoCentavos ?? -1) >= 0
  );
}

export function PedidoDetalleDemo({ pedido }: { pedido: PedidoDemo }) {
  const [pedidoActual, setPedidoActual] = useState(pedido);
  const [panelCobro, setPanelCobro] = useState(false);
  const [opcionCobro, setOpcionCobro] = useState<OpcionCobroPosterior>("hasta-mitad");
  const [otroImporte, setOtroImporte] = useState("49000");
  const [cobradoAcumulado, setCobradoAcumulado] = useState(pedido.cobradoCentavos);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("creado") !== "1") return;
    const temporizador = window.setTimeout(() => {
      const guardado = window.sessionStorage.getItem("muestra-pedido-reciente");
      if (!guardado) return;
      try {
        const recorrido: unknown = JSON.parse(guardado);
        if (!esPedidoRecorrido(recorrido)) return;
        setPedidoActual(recorrido);
        setCobradoAcumulado(recorrido.cobradoCentavos);
      } catch {
        window.sessionStorage.removeItem("muestra-pedido-reciente");
      }
    }, 0);
    return () => window.clearTimeout(temporizador);
  }, []);

  const saldoCentavos = Math.max(0, pedidoActual.totalCentavos - cobradoAcumulado);
  const mitadCentavos = Math.floor(pedidoActual.totalCentavos / 2);
  const completarMitadCentavos = Math.max(0, mitadCentavos - cobradoAcumulado);
  const otroCentavos = pesosTextoACentavos(otroImporte);
  const importeSeleccionado =
    opcionCobro === "hasta-mitad"
      ? completarMitadCentavos
      : opcionCobro === "saldo"
        ? saldoCentavos
        : Math.min(otroCentavos ?? 0, saldoCentavos);

  const estadoPagoActual = cobradoAcumulado === 0 ? "Pendiente" : saldoCentavos === 0 ? "Pagado" : "Parcial";
  const opciones = useMemo(
    () => [
      { id: "hasta-mitad" as const, label: "Completar hasta 50%", importe: completarMitadCentavos },
      { id: "saldo" as const, label: "Cobrar saldo", importe: saldoCentavos },
      { id: "otro" as const, label: "Otro importe", importe: otroCentavos ?? 0 },
    ],
    [completarMitadCentavos, saldoCentavos, otroCentavos]
  );

  const simularCobro = () => {
    if (importeSeleccionado <= 0 || importeSeleccionado > saldoCentavos) {
      setError("Ingresá un importe mayor a cero y que no supere el saldo pendiente.");
      return;
    }
    setError(null);
    setGuardando(true);
    window.setTimeout(() => {
      setCobradoAcumulado((actual) => actual + importeSeleccionado);
      setGuardando(false);
      setPanelCobro(false);
      setMensaje(`Cobro ficticio de ${formatImporteDemo(importeSeleccionado)} aplicado solo en esta pantalla.`);
    }, 600);
  };

  const simularAccion = (accion: string) => {
    setMensaje(`${accion}: acción ficticia, sin cambios persistidos.`);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/muestra-pedidos/pedidos" className="inline-flex min-h-10 items-center gap-2 rounded-md text-sm font-medium text-zinc-600 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a pedidos
        </Link>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">Paso 3 de 3 · Pedido ficticio</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{pedidoActual.numero}</h1>
              <span className="font-mono text-sm text-zinc-500">Creado {formatFechaDemo(pedidoActual.fecha, true)}</span>
            </div>
            <p className="mt-2 text-base text-zinc-700">{pedidoActual.clienta.nombre} · {pedidoActual.clienta.telefono}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <EstadoPagoBadge estado={estadoPagoActual} />
            <EstadoProductoBadge estado={pedidoActual.estadoProducto} />
          </div>
        </div>
      </div>

      {mensaje ? (
        <div role="status" aria-live="polite" className="flex items-center justify-between gap-3 rounded-lg border border-zinc-950 bg-zinc-100 px-4 py-3 text-sm font-medium">
          <span>{mensaje}</span>
          <button type="button" onClick={() => setMensaje(null)} className="min-h-10 shrink-0 rounded-md px-3 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950">
            Cerrar
          </button>
        </div>
      ) : null}

      <ResumenImportes totalCentavos={pedidoActual.totalCentavos} cobradoCentavos={cobradoAcumulado} />

      <div className="flex flex-wrap gap-2" aria-label="Acciones del pedido ficticio">
        <Button className="bg-zinc-950 text-white hover:bg-zinc-800" onClick={() => setPanelCobro((actual) => !actual)}>
          <Banknote className="size-4" />
          Registrar pago
        </Button>
        <Button variant="outline" className="border-zinc-300" onClick={() => simularAccion("Marcar encargado")}>
          <Factory className="size-4" /> Marcar encargado
        </Button>
        <Button variant="outline" className="border-zinc-300" onClick={() => simularAccion("Registrar recepción")}>
          <Truck className="size-4" /> Registrar recepción
        </Button>
        <Button variant="outline" className="border-zinc-300" onClick={() => simularAccion("Registrar entrega")}>
          <PackageCheck className="size-4" /> Registrar entrega
        </Button>
        <Button variant="outline" className="border-zinc-300" onClick={() => simularAccion("Agregar anotación")}>
          <MessageSquarePlus className="size-4" /> Agregar anotación
        </Button>
      </div>

      {panelCobro ? (
        <section aria-labelledby="titulo-cobro-demo" className="rounded-xl border-2 border-zinc-950 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 id="titulo-cobro-demo" className="text-lg font-semibold">Registrar pago posterior</h2>
              <p className="mt-1 text-sm leading-6 text-zinc-600">Completar hasta 50% alcanza la mitad acumulada; no vuelve a cobrar el 50% entero.</p>
            </div>
            <DemoBadge>Saldo actual {formatImporteDemo(saldoCentavos)}</DemoBadge>
          </div>
          <div className="mt-5 grid gap-2 lg:grid-cols-3">
            {opciones.map((opcion) => {
              const activa = opcionCobro === opcion.id;
              const deshabilitada = opcion.id === "hasta-mitad" && opcion.importe === 0;
              return (
                <button
                  key={opcion.id}
                  type="button"
                  disabled={deshabilitada}
                  aria-pressed={activa}
                  onClick={() => {
                    setOpcionCobro(opcion.id);
                    setError(null);
                  }}
                  className={cn(
                    "flex min-h-16 items-center justify-between gap-3 rounded-md border px-3 text-left disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
                    activa ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-300 bg-white hover:bg-zinc-100"
                  )}
                >
                  <span className="text-sm font-medium">{opcion.label}</span>
                  <span className="font-mono text-sm font-semibold tabular-nums">{formatImporteDemo(opcion.importe)}</span>
                </button>
              );
            })}
          </div>
          {opcionCobro === "otro" ? (
            <div className="mt-4 max-w-sm space-y-2">
              <Label htmlFor="demo-otro-pago">Importe en ARS</Label>
              <Input id="demo-otro-pago" inputMode="decimal" value={otroImporte} onChange={(event) => setOtroImporte(event.target.value)} aria-invalid={Boolean(error)} />
            </div>
          ) : null}
          {error ? <p role="alert" className="mt-4 rounded-md border border-zinc-950 bg-zinc-100 p-3 text-sm font-medium">{error}</p> : null}
          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-end">
            <Button variant="outline" className="border-zinc-300" onClick={() => setPanelCobro(false)}>Cancelar</Button>
            <Button className="bg-zinc-950 text-white hover:bg-zinc-800" onClick={simularCobro} disabled={guardando || saldoCentavos === 0}>
              {guardando ? (
                <><span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" aria-hidden="true" />Registrando…</>
              ) : (
                <>Confirmar {formatImporteDemo(importeSeleccionado)}</>
              )}
            </Button>
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
        <div className="min-w-0 space-y-6">
          <DemoSection title="Productos y seguimiento" description="Cantidades recibidas y entregadas se controlan por línea.">
            <div className="space-y-4">
              {pedidoActual.items.map((item) => (
                <article key={item.id} className="rounded-lg border border-zinc-300 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold">{item.nombre}</p>
                      <p className="mt-1 font-mono text-xs text-zinc-500">{item.sku} · {item.modoEntrega}</p>
                    </div>
                    <EstadoProductoBadge estado={item.estadoProducto} />
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Especificaciones</p>
                      <ul className="mt-2 space-y-1.5 text-sm leading-6">
                        {item.especificaciones.map((especificacion) => <li key={especificacion} className="flex gap-2"><span aria-hidden="true">—</span>{especificacion}</li>)}
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <div><p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Responsable</p><p className="mt-1 text-sm">{item.responsable}</p></div>
                      <div><p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Anotación interna</p><p className="mt-1 text-sm leading-6">{item.anotacionInterna}</p></div>
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-3 overflow-hidden rounded-lg border border-zinc-300 text-sm">
                    <div className="p-3"><dt className="text-xs text-zinc-500">Pedidas</dt><dd className="mt-1 font-mono text-lg font-semibold">{item.cantidad}</dd></div>
                    <div className="border-l border-zinc-300 p-3"><dt className="text-xs text-zinc-500">Recibidas</dt><dd className="mt-1 font-mono text-lg font-semibold">{item.cantidadRecibida}</dd></div>
                    <div className="border-l border-zinc-300 p-3"><dt className="text-xs text-zinc-500">Entregadas</dt><dd className="mt-1 font-mono text-lg font-semibold">{item.cantidadEntregada}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </DemoSection>

          <DemoSection title="Historial de pagos" description="Cada cobro conserva fecha, medio, referencia, moneda y autor.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead><tr className="border-b border-zinc-300 text-left text-xs uppercase tracking-wider text-zinc-500"><th className="px-2 py-3 font-medium">Fecha</th><th className="px-2 py-3 font-medium">Medio</th><th className="px-2 py-3 font-medium">Referencia</th><th className="px-2 py-3 font-medium">Autor</th><th className="px-2 py-3 text-right font-medium">Importe</th></tr></thead>
                <tbody>
                  {pedidoActual.pagos.map((pago) => (
                    <tr key={pago.id} className="border-b border-zinc-200 last:border-0"><td className="px-2 py-3">{formatFechaDemo(pago.fecha, true)}</td><td className="px-2 py-3">{pago.medio}</td><td className="px-2 py-3 font-mono text-xs">{pago.referencia}</td><td className="px-2 py-3">{pago.autor}</td><td className="px-2 py-3 text-right font-mono font-semibold tabular-nums">{formatImporteDemo(pago.importeCentavos, pago.moneda)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500">Comprobantes: pendientes para la etapa de pagos persistidos. No se genera ningún documento real en esta muestra.</p>
          </DemoSection>
        </div>

        <div className="min-w-0 space-y-6">
          <DemoSection title="Anotaciones" description="Las notas internas no se incluyen en comunicaciones a la clienta.">
            <div className="space-y-4">
              <div><p className="text-xs font-medium uppercase tracking-wider text-zinc-500">General</p><p className="mt-2 text-sm leading-6">{pedidoActual.anotacionGeneral}</p></div>
              <div className="border-t border-zinc-200 pt-4"><p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Visible para la clienta</p><p className="mt-2 text-sm italic text-zinc-500">Sin mensaje cargado.</p></div>
            </div>
          </DemoSection>

          <DemoSection title="Actividad" description="Fabricación, pagos, notas y entregas quedan en una cronología auditable.">
            <ol className="space-y-0">
              {pedidoActual.eventos.map((evento, index) => {
                const Icon = iconoEvento(evento.tipo);
                return (
                  <li key={evento.id} className="relative grid grid-cols-[2rem_1fr] gap-3 pb-5 last:pb-0">
                    {index < pedidoActual.eventos.length - 1 ? <span className="absolute bottom-0 left-[0.94rem] top-8 w-px bg-zinc-300" aria-hidden="true" /> : null}
                    <span className="relative z-10 flex size-8 items-center justify-center rounded-full border border-zinc-300 bg-white"><Icon className="size-3.5" aria-hidden="true" /></span>
                    <div>
                      <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-semibold">{evento.titulo}</p><time className="font-mono text-xs text-zinc-500">{formatFechaDemo(evento.fecha, true)}</time></div>
                      <p className="mt-1 text-sm leading-6 text-zinc-600">{evento.detalle}</p>
                      <p className="mt-1 text-xs text-zinc-500">Por {evento.autor}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </DemoSection>

          <CorreoPendiente />
          <DecisionPendiente />
        </div>
      </div>
    </div>
  );
}
