"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Inbox, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DemoBadge,
  DemoSkeleton,
  EstadoPagoBadge,
  EstadoProductoBadge,
  formatFechaDemo,
  formatImporteDemo,
} from "@/components/pedidos-demo/demo-ui";
import { pedidosDemo, type PedidoDemo } from "@/lib/pedidos-demo";
import { cn } from "@/lib/utils";

type FiltroPedido =
  | "Todos"
  | "Pendientes de encargar"
  | "En fabricación"
  | "Listos"
  | "Con saldo"
  | "Demorados"
  | "Finalizados";

type VistaDemo = "datos" | "cargando" | "error" | "vacio";

const filtros: FiltroPedido[] = [
  "Todos",
  "Pendientes de encargar",
  "En fabricación",
  "Listos",
  "Con saldo",
  "Demorados",
  "Finalizados",
];

function coincideFiltro(pedido: PedidoDemo, filtro: FiltroPedido) {
  if (filtro === "Todos") return true;
  if (filtro === "Pendientes de encargar") return pedido.estadoProducto === "Pendiente de encargar";
  if (filtro === "En fabricación") return pedido.estadoProducto === "En fabricación" || pedido.estadoProducto === "Encargado";
  if (filtro === "Listos") return pedido.estadoProducto === "Listo para entregar";
  if (filtro === "Con saldo") return pedido.cobradoCentavos < pedido.totalCentavos;
  if (filtro === "Demorados") return pedido.demorado;
  return pedido.estadoProducto === "Entregado" || pedido.estadoProducto === "Cancelado";
}

export function PedidosBandejaDemo() {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroPedido>("Todos");
  const [vista, setVista] = useState<VistaDemo>("datos");

  const pedidosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es");
    return pedidosDemo.filter((pedido) => {
      const texto = [
        pedido.numero,
        pedido.clienta.nombre,
        ...pedido.items.map((item) => item.nombre),
      ]
        .join(" ")
        .toLocaleLowerCase("es");
      return coincideFiltro(pedido, filtro) && (!termino || texto.includes(termino));
    });
  }, [busqueda, filtro]);

  const listaVisible = vista === "vacio" ? [] : pedidosFiltrados;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">Paso 2 de 3</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Pedidos</h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-zinc-600">
            Una bandeja para decidir qué encargar, qué cobrar y qué entregar sin mezclar esos estados.
          </p>
        </div>
        <Link href="/muestra-pedidos/nueva-venta" className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2">
          Nueva venta ficticia
        </Link>
      </div>

      <section className="rounded-xl border border-zinc-300 bg-white">
        <div className="space-y-4 border-b border-zinc-200 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
              <Input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar por número, clienta o producto"
                aria-label="Buscar pedidos ficticios"
                className="pl-9"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              Estado de interfaz
              <select
                value={vista}
                onChange={(event) => setVista(event.target.value as VistaDemo)}
                className="min-h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950"
              >
                <option value="datos">Con datos</option>
                <option value="cargando">Cargando</option>
                <option value="vacio">Vacío</option>
                <option value="error">Error</option>
              </select>
            </label>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtrar pedidos">
            {filtros.map((item) => {
              const activo = filtro === item;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setFiltro(item)}
                  className={cn(
                    "min-h-10 shrink-0 rounded-full border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
                    activo ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-300 bg-white hover:bg-zinc-100"
                  )}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {vista === "cargando" ? <DemoSkeleton rows={5} /> : null}

          {vista === "error" ? (
            <div role="alert" className="mx-auto max-w-lg rounded-xl border border-zinc-950 bg-zinc-50 p-6 text-center">
              <p className="text-lg font-semibold">No pudimos cargar los pedidos</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">Estado ficticio para revisar el mensaje, el foco y la acción de reintento.</p>
              <Button className="mt-5 bg-zinc-950 text-white hover:bg-zinc-800" onClick={() => setVista("datos")}>
                <RotateCcw className="size-4" />
                Reintentar
              </Button>
            </div>
          ) : null}

          {vista !== "cargando" && vista !== "error" && listaVisible.length === 0 ? (
            <div className="mx-auto max-w-lg py-12 text-center">
              <Inbox className="mx-auto size-10 text-zinc-400" aria-hidden="true" />
              <p className="mt-4 text-lg font-semibold">No hay pedidos para mostrar</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Probá otro filtro o limpiá la búsqueda. En el producto real este estado no oculta los controles.
              </p>
              <Button
                variant="outline"
                className="mt-5 border-zinc-300"
                onClick={() => {
                  setBusqueda("");
                  setFiltro("Todos");
                  setVista("datos");
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          ) : null}

          {vista === "datos" && listaVisible.length > 0 ? (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[980px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-300 text-left text-xs uppercase tracking-wider text-zinc-500">
                      <th className="px-3 py-3 font-medium">Pedido</th>
                      <th className="px-3 py-3 font-medium">Clienta y productos</th>
                      <th className="px-3 py-3 font-medium">Prometido</th>
                      <th className="px-3 py-3 font-medium">Estados</th>
                      <th className="px-3 py-3 text-right font-medium">Total</th>
                      <th className="px-3 py-3 text-right font-medium">Cobrado</th>
                      <th className="px-3 py-3 text-right font-medium">Saldo</th>
                      <th className="px-3 py-3 font-medium"><span className="sr-only">Abrir</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaVisible.map((pedido) => (
                      <tr key={pedido.id} className="border-b border-zinc-200 align-top last:border-0 hover:bg-zinc-50">
                        <td className="px-3 py-4">
                          <Link href={`/muestra-pedidos/pedidos/${pedido.id}`} className="font-mono font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950">
                            {pedido.numero}
                          </Link>
                          <p className="mt-1 text-xs text-zinc-500">{formatFechaDemo(pedido.ultimaActividad, true)}</p>
                        </td>
                        <td className="max-w-64 px-3 py-4">
                          <p className="font-medium">{pedido.clienta.nombre}</p>
                          <p className="mt-1 truncate text-xs text-zinc-500">{pedido.items.map((item) => item.nombre).join(", ") || "Producto ficticio pendiente"}</p>
                        </td>
                        <td className="px-3 py-4">
                          <p>{formatFechaDemo(pedido.fechaPrometida)}</p>
                          {pedido.demorado ? <DemoBadge className="mt-2 border-dashed">Demorado</DemoBadge> : null}
                        </td>
                        <td className="space-y-1.5 px-3 py-4">
                          <EstadoPagoBadge estado={pedido.estadoPago} />
                          <EstadoProductoBadge estado={pedido.estadoProducto} />
                        </td>
                        <td className="px-3 py-4 text-right font-mono tabular-nums">{formatImporteDemo(pedido.totalCentavos)}</td>
                        <td className="px-3 py-4 text-right font-mono tabular-nums">{formatImporteDemo(pedido.cobradoCentavos)}</td>
                        <td className="px-3 py-4 text-right font-mono font-semibold tabular-nums">{formatImporteDemo(pedido.totalCentavos - pedido.cobradoCentavos)}</td>
                        <td className="px-3 py-4 text-right">
                          <Link href={`/muestra-pedidos/pedidos/${pedido.id}`} aria-label={`Abrir ${pedido.numero}`} className="inline-flex size-9 items-center justify-center rounded-md border border-zinc-300 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950">
                            <ArrowRight className="size-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 lg:hidden">
                {listaVisible.map((pedido) => (
                  <Link key={pedido.id} href={`/muestra-pedidos/pedidos/${pedido.id}`} className="block rounded-lg border border-zinc-300 p-4 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-mono text-sm font-semibold">{pedido.numero}</p>
                        <p className="mt-1 font-medium">{pedido.clienta.nombre}</p>
                      </div>
                      <ArrowRight className="mt-1 size-4 shrink-0" aria-hidden="true" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <EstadoPagoBadge estado={pedido.estadoPago} />
                      <EstadoProductoBadge estado={pedido.estadoProducto} />
                      {pedido.demorado ? <DemoBadge className="border-dashed">Demorado</DemoBadge> : null}
                    </div>
                    <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-200 pt-3 text-xs">
                      <div><dt className="text-zinc-500">Total</dt><dd className="mt-1 font-mono font-semibold">{formatImporteDemo(pedido.totalCentavos)}</dd></div>
                      <div><dt className="text-zinc-500">Cobrado</dt><dd className="mt-1 font-mono font-semibold">{formatImporteDemo(pedido.cobradoCentavos)}</dd></div>
                      <div><dt className="text-zinc-500">Saldo</dt><dd className="mt-1 font-mono font-semibold">{formatImporteDemo(pedido.totalCentavos - pedido.cobradoCentavos)}</dd></div>
                    </dl>
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
