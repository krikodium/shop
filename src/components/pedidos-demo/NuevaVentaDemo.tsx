"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Boxes, Check, ChevronDown, Clock3, PackageCheck, Plus, Save, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { CorreoPendiente, DecisionPendiente, DemoBadge, DemoSection, formatFechaDemo, formatImporteDemo, ResumenImportes } from "@/components/pedidos-demo/demo-ui";
import { inventarioDemo, pedidoPrincipalDemo, productosNuevaVentaDemo, type ItemPedidoDemo, type ModoEntregaDemo, type PedidoDemo } from "@/lib/pedidos-demo";
import { cn } from "@/lib/utils";

type OpcionCobro = "sin-pago" | "mitad" | "otro" | "total";
type ModoPanel = "inventario" | "nuevo";

function pesosTextoACentavos(valor: string) {
  const normalizado = valor.trim().replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(normalizado)) return null;
  const [enteros, decimales = ""] = normalizado.split(".");
  return Number.parseInt(enteros, 10) * 100 + Number.parseInt(decimales.padEnd(2, "0") || "0", 10);
}

function sumarDiasHabiles(origen: Date, cantidad: number) {
  const resultado = new Date(origen);
  let agregados = 0;
  while (agregados < cantidad) {
    resultado.setDate(resultado.getDate() + 1);
    const dia = resultado.getDay();
    if (dia !== 0 && dia !== 6) agregados += 1;
  }
  resultado.setHours(18, 0, 0, 0);
  return resultado.toISOString();
}

export function NuevaVentaDemo() {
  const router = useRouter();
  const [items, setItems] = useState<ItemPedidoDemo[]>(productosNuevaVentaDemo);
  const [inventarioAbierto, setInventarioAbierto] = useState(false);
  const [modoPanel, setModoPanel] = useState<ModoPanel>("inventario");
  const [busqueda, setBusqueda] = useState("");
  const [itemEditando, setItemEditando] = useState<string | null>(null);
  const [opcionCobro, setOpcionCobro] = useState<OpcionCobro>("mitad");
  const [otroImporte, setOtroImporte] = useState("120000");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [precioNuevo, setPrecioNuevo] = useState("");
  const [categoriaNueva, setCategoriaNueva] = useState("");
  const [especificacionNueva, setEspecificacionNueva] = useState("");
  const [responsableNuevo, setResponsableNuevo] = useState("");
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null);

  const totalCentavos = useMemo(
    () => items.reduce((total, item) => total + item.precioUnitarioCentavos * item.cantidad, 0),
    [items]
  );
  const mitadCentavos = Math.floor(totalCentavos / 2);
  const otroCentavos = pesosTextoACentavos(otroImporte);
  const cobradoCentavos = opcionCobro === "sin-pago" ? 0 : opcionCobro === "mitad" ? mitadCentavos : opcionCobro === "total" ? totalCentavos : Math.min(otroCentavos ?? 0, totalCentavos);

  const productosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es");
    if (!termino) return inventarioDemo;
    return inventarioDemo.filter((producto) => `${producto.nombre} ${producto.sku}`.toLocaleLowerCase("es").includes(termino));
  }, [busqueda]);

  const abrirInventario = (modo: ModoPanel = "inventario") => {
    setModoPanel(modo);
    setInventarioAbierto(true);
    setErrorNuevo(null);
  };

  const agregarProducto = (producto: ItemPedidoDemo) => {
    setItems((actuales) => {
      const existente = actuales.find((item) => item.id === producto.id);
      if (existente) return actuales.map((item) => {
        if (item.id !== producto.id) return item;
        const cantidad = item.cantidad + 1;
        return {
          ...item,
          cantidad,
          cantidadEntregada: item.modoEntrega === "Entrega inmediata" ? cantidad : item.cantidadEntregada,
        };
      });
      return [...actuales, { ...producto }];
    });
    setInventarioAbierto(false);
    setBusqueda("");
    setMensaje(`${producto.nombre} agregado desde el inventario ficticio.`);
  };

  const agregarProductoTemporal = () => {
    const precioCentavos = pesosTextoACentavos(precioNuevo);
    if (!nombreNuevo.trim() || precioCentavos == null || precioCentavos <= 0) {
      setErrorNuevo("Para venderlo ahora solo necesitamos un nombre corto y el precio acordado.");
      return;
    }
    const nuevo: ItemPedidoDemo = {
      id: `demo-temporal-${Date.now()}`,
      nombre: nombreNuevo.trim(),
      sku: "TEMP-PENDIENTE",
      cantidad: 1,
      precioUnitarioCentavos: precioCentavos,
      moneda: "ARS",
      modoEntrega: "Por encargo",
      estadoProducto: "Pendiente de encargar",
      especificaciones: especificacionNueva.trim() ? [especificacionNueva.trim()] : ["Pendiente de completar"],
      anotacionInterna: "Ficha provisoria creada durante la venta.",
      responsable: responsableNuevo.trim() || "Pendiente de asignar",
      cantidadRecibida: 0,
      cantidadEntregada: 0,
      estadoCarga: "En proceso de carga",
      categoriaProvisoria: categoriaNueva.trim() || "Pendiente de categorizar",
      venceCarga: sumarDiasHabiles(new Date(), 5),
    };
    setItems((actuales) => [...actuales, nuevo]);
    setItemEditando(nuevo.id);
    setInventarioAbierto(false);
    setModoPanel("inventario");
    setNombreNuevo("");
    setPrecioNuevo("");
    setCategoriaNueva("");
    setEspecificacionNueva("");
    setResponsableNuevo("");
    setMensaje(`${nuevo.nombre} se agregó como producto en proceso de carga. Hay cinco días hábiles para completar su ficha.`);
  };

  const actualizarItem = (id: string, cambios: Partial<ItemPedidoDemo>) => {
    setItems((actuales) => actuales.map((item) => item.id === id ? { ...item, ...cambios } : item));
  };

  const cambiarModo = (id: string, modoEntrega: ModoEntregaDemo) => {
    setItems((actuales) => actuales.map((item) => item.id === id ? {
      ...item,
      modoEntrega,
      estadoProducto: modoEntrega === "Entrega inmediata" ? "Entregado" : "Pendiente de encargar",
      cantidadEntregada: modoEntrega === "Entrega inmediata" ? item.cantidad : 0,
    } : item));
  };

  const crearMuestra = () => {
    if (items.length === 0) {
      setError("Agregá al menos un producto, aunque todavía no exista en el inventario.");
      return;
    }
    if (opcionCobro === "otro" && (otroCentavos == null || otroCentavos < 0 || otroCentavos > totalCentavos)) {
      setError("Ingresá un importe entre $ 0 y el total del pedido.");
      return;
    }
    setError(null);
    setGuardando(true);
    const pedidoRecorrido: PedidoDemo = {
      ...pedidoPrincipalDemo,
      items,
      totalCentavos,
      cobradoCentavos,
      estadoPago: cobradoCentavos === 0 ? "Pendiente" : cobradoCentavos === totalCentavos ? "Pagado" : "Parcial",
      pagos: cobradoCentavos > 0 ? pedidoPrincipalDemo.pagos.map((pago, index) => index === 0 ? { ...pago, importeCentavos: cobradoCentavos } : pago) : [],
    };
    window.sessionStorage.setItem("muestra-pedido-reciente", JSON.stringify(pedidoRecorrido));
    window.setTimeout(() => router.push("/muestra-pedidos/pedidos/pedido-demo-1048?creado=1"), 650);
  };

  const opciones: Array<{ id: OpcionCobro; label: string; importe: number }> = [
    { id: "sin-pago", label: "Sin pago", importe: 0 },
    { id: "mitad", label: "Anticipo 50%", importe: mitadCentavos },
    { id: "otro", label: "Otro importe", importe: otroCentavos ?? 0 },
    { id: "total", label: "Pago total", importe: totalCentavos },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">Paso 1 de 3</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Nueva venta</h1>
          <p className="mt-1 text-base text-zinc-600">Cargá lo vendido primero; completá el resto solo cuando haga falta.</p>
        </div>
        <DemoBadge>Venta demo · PD-1048</DemoBadge>
      </div>

      {mensaje ? (
        <div role="status" aria-live="polite" className="flex items-start justify-between gap-3 rounded-lg border border-zinc-950 bg-zinc-100 px-4 py-3 text-sm">
          <span className="font-medium">{mensaje}</span>
          <button type="button" onClick={() => setMensaje(null)} className="shrink-0 underline underline-offset-4">Cerrar</button>
        </div>
      ) : null}

      <div className="grid gap-3 rounded-xl border border-zinc-300 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-4">
        <button type="button" onClick={() => abrirInventario("inventario")} className="flex min-h-12 items-center gap-3 rounded-lg border border-zinc-300 bg-zinc-50 px-4 text-left text-zinc-500 hover:border-zinc-950 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2">
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="text-sm">Buscar por nombre o SKU…</span>
          <span className="ml-auto hidden text-xs font-medium text-zinc-950 sm:inline">El inventario se abre al buscar</span>
        </button>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" className="h-12 border-zinc-300" onClick={() => abrirInventario("inventario")}><Boxes className="size-4" />Inventario</Button>
          <Button className="h-12 bg-zinc-950 text-white hover:bg-zinc-800" onClick={() => abrirInventario("nuevo")}><Plus className="size-4" />Producto nuevo</Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <DemoSection title="Venta" description="Clienta y nota general quedan en un bloque breve.">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="demo-clienta">Clienta</Label><Input id="demo-clienta" defaultValue="Sofía Acosta (ficticia)" /></div>
              <div className="space-y-1.5"><Label htmlFor="demo-contacto">Contacto</Label><Input id="demo-contacto" defaultValue="+54 11 5555 0148" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="demo-nota-general">Anotación general</Label><Input id="demo-nota-general" defaultValue="Regalo de aniversario. Avisar antes del retiro." /></div>
            </div>
          </DemoSection>

          <DemoSection title={`Productos (${items.length})`} description="La ficha detallada queda cerrada hasta que necesites editarla." action={<Button variant="outline" size="sm" className="border-zinc-300" onClick={() => abrirInventario("inventario")}><Plus className="size-4" />Agregar</Button>}>
            {items.length === 0 ? (
              <div className="py-8 text-center"><p className="font-semibold">Todavía no agregaste productos</p><p className="mt-1 text-sm text-zinc-600">Podés elegir uno del inventario o vender uno nuevo sin ficha previa.</p></div>
            ) : (
              <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-300">
                {items.map((item, index) => {
                  const abierto = itemEditando === item.id;
                  const temporal = item.estadoCarga === "En proceso de carga";
                  return (
                    <article key={item.id} className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.nombre}</p>{temporal ? <DemoBadge className="border-dashed">En proceso de carga</DemoBadge> : null}</div>
                          <p className="mt-1 font-mono text-xs text-zinc-500">{item.sku} · Cantidad {item.cantidad}</p>
                        </div>
                        <p className="shrink-0 font-mono text-lg font-semibold tabular-nums">{formatImporteDemo(item.precioUnitarioCentavos * item.cantidad)}</p>
                      </div>

                      {temporal ? <div className="mt-3 flex items-start gap-2 rounded-md border border-dashed border-zinc-400 bg-zinc-50 p-3 text-sm"><Bell className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p><strong>Completar antes del {item.venceCarga ? formatFechaDemo(item.venceCarga) : "plazo indicado"}.</strong> Se notifica durante el plazo; al vencer se elimina la ficha temporal, no el registro de esta venta.</p></div> : null}

                      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                          {(["Entrega inmediata", "Por encargo"] as const).map((modo) => {
                            const activo = item.modoEntrega === modo;
                            return <button key={modo} type="button" aria-pressed={activo} onClick={() => cambiarModo(item.id, modo)} className={cn("inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950", activo ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-300 bg-white hover:bg-zinc-100")}>{modo === "Entrega inmediata" ? <PackageCheck className="size-3.5" /> : <Clock3 className="size-3.5" />}{modo}</button>;
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setItemEditando(abierto ? null : item.id)} className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950" aria-expanded={abierto}>{abierto ? "Ocultar datos" : "Completar datos"}<ChevronDown className={cn("size-4 transition-transform motion-reduce:transition-none", abierto && "rotate-180")} /></button>
                          <button type="button" aria-label={`Quitar ${item.nombre}`} onClick={() => setItems((actuales) => actuales.filter((actual) => actual.id !== item.id))} className="inline-flex size-10 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"><Trash2 className="size-4" /></button>
                        </div>
                      </div>

                      {abierto ? (
                        <div className="mt-4 grid gap-3 border-t border-zinc-200 pt-4 sm:grid-cols-2">
                          <div className="space-y-1.5"><Label htmlFor={`demo-especificaciones-${index}`}>Especificaciones</Label><Textarea id={`demo-especificaciones-${index}`} value={item.especificaciones.join(" · ")} onChange={(event) => actualizarItem(item.id, { especificaciones: [event.target.value] })} className="min-h-20" placeholder="Puede completarse después" /></div>
                          <div className="space-y-1.5"><Label htmlFor={`demo-nota-${index}`}>Anotación interna</Label><Textarea id={`demo-nota-${index}`} value={item.anotacionInterna} onChange={(event) => actualizarItem(item.id, { anotacionInterna: event.target.value })} className="min-h-20" placeholder="Puede completarse después" /></div>
                          {item.modoEntrega === "Por encargo" ? <><div className="space-y-1.5"><Label htmlFor={`demo-taller-${index}`}>Proveedor o taller</Label><Input id={`demo-taller-${index}`} value={item.responsable} onChange={(event) => actualizarItem(item.id, { responsable: event.target.value })} placeholder="Pendiente de asignar" /></div><div className="space-y-1.5"><Label htmlFor={`demo-fecha-${index}`}>Fecha estimada</Label><Input id={`demo-fecha-${index}`} type="date" defaultValue="2026-09-18" /></div></> : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </DemoSection>
          <CorreoPendiente />
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-24 xl:self-start">
          <DemoSection title="Cobro de hoy" description="Elegí el importe; el saldo se actualiza en el momento.">
            <fieldset>
              <legend className="sr-only">Elegir importe a cobrar</legend>
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
                {opciones.map((opcion) => {
                  const activa = opcionCobro === opcion.id;
                  return <button key={opcion.id} type="button" aria-pressed={activa} onClick={() => { setOpcionCobro(opcion.id); setError(null); }} className={cn("flex min-h-14 items-center justify-between gap-2 rounded-md border px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2", activa ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-300 bg-white hover:bg-zinc-100")}><span className="text-sm font-medium">{opcion.label}</span><span className="font-mono text-xs font-semibold tabular-nums">{formatImporteDemo(opcion.importe)}</span></button>;
                })}
              </div>
            </fieldset>
            {opcionCobro === "otro" ? <div className="mt-3 space-y-1.5"><Label htmlFor="demo-otro-importe">Importe en ARS</Label><Input id="demo-otro-importe" inputMode="decimal" value={otroImporte} onChange={(event) => { setOtroImporte(event.target.value); setError(null); }} aria-invalid={Boolean(error)} /></div> : null}
            <div className="mt-4 space-y-4 border-t border-zinc-200 pt-4">
              <ResumenImportes totalCentavos={totalCentavos} cobradoCentavos={cobradoCentavos} cobradoLabel="Cobrado hoy" apilado />
              <div className="space-y-1.5"><Label htmlFor="demo-medio">Medio de pago</Label><select id="demo-medio" disabled={cobradoCentavos === 0} className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm disabled:bg-zinc-100 disabled:text-zinc-500"><option>Transferencia</option><option>Efectivo</option><option>Tarjeta</option></select></div>
              {error ? <div role="alert" className="rounded-md border border-zinc-950 bg-zinc-100 p-3 text-sm font-medium">{error}</div> : null}
              <Button className="h-12 w-full bg-zinc-950 text-white hover:bg-zinc-800" onClick={crearMuestra} disabled={guardando}>{guardando ? <><span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" aria-hidden="true" />Creando muestra…</> : <><Save className="size-4" />Crear pedido de muestra</>}</Button>
            </div>
          </DemoSection>
          <DecisionPendiente />
        </aside>
      </div>

      <Sheet open={inventarioAbierto} onOpenChange={setInventarioAbierto}>
        <SheetContent className="w-full gap-0 border-zinc-300 bg-white p-0 sm:max-w-lg lg:max-w-xl" showCloseButton>
          <SheetHeader className="border-b border-zinc-200 px-5 py-5 pr-12">
            <SheetTitle>{modoPanel === "inventario" ? "Inventario" : "Producto no registrado"}</SheetTitle>
            <SheetDescription>{modoPanel === "inventario" ? "Buscá y agregá sin perder la venta que estás armando." : "Registrá la venta ahora y completá la ficha después."}</SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 border-b border-zinc-200 p-3">
            <button type="button" onClick={() => setModoPanel("inventario")} className={cn("min-h-10 rounded-md text-sm font-medium", modoPanel === "inventario" ? "bg-zinc-950 text-white" : "hover:bg-zinc-100")}>Buscar inventario</button>
            <button type="button" onClick={() => setModoPanel("nuevo")} className={cn("min-h-10 rounded-md text-sm font-medium", modoPanel === "nuevo" ? "bg-zinc-950 text-white" : "hover:bg-zinc-100")}>Vender producto nuevo</button>
          </div>

          {modoPanel === "inventario" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-zinc-200 p-4"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" /><Input autoFocus value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Nombre o SKU" className="pl-9" aria-label="Buscar en el inventario ficticio" /></div></div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {productosFiltrados.length > 0 ? (
                  <div className="space-y-2">
                    {productosFiltrados.map((producto) => {
                      const cantidadAgregada = items.find((item) => item.id === producto.id)?.cantidad ?? 0;
                      return <button key={producto.id} type="button" onClick={() => agregarProducto(producto)} className="flex min-h-20 w-full items-center gap-3 rounded-lg border border-zinc-300 p-3 text-left hover:border-zinc-950 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"><span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-zinc-100"><Boxes className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate font-medium">{producto.nombre}</span><span className="mt-1 block font-mono text-xs text-zinc-500">{producto.sku}{cantidadAgregada ? ` · ${cantidadAgregada} en la venta` : ""}</span></span><span className="font-mono text-sm font-semibold tabular-nums">{formatImporteDemo(producto.precioUnitarioCentavos)}</span></button>;
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-400 bg-zinc-50 p-5"><p className="font-semibold">No encontramos “{busqueda}”</p><p className="mt-2 text-sm leading-6 text-zinc-600">Podés venderlo igual. Se crea una ficha breve en proceso de carga y el pedido conserva un resumen del producto.</p><Button className="mt-4 bg-zinc-950 text-white hover:bg-zinc-800" onClick={() => { setNombreNuevo(busqueda); setModoPanel("nuevo"); }}><Plus className="size-4" />Continuar sin ficha previa</Button></div>
                )}
              </div>
              <div className="border-t border-zinc-200 p-4"><Button variant="outline" className="w-full border-zinc-300" onClick={() => setModoPanel("nuevo")}><Plus className="size-4" />El producto no está cargado</Button></div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="rounded-lg border border-dashed border-zinc-400 bg-zinc-50 p-4 text-sm leading-6"><p className="font-semibold">Informe corto de la ficha provisoria</p><ul className="mt-2 space-y-1 text-zinc-700"><li>— Se guarda un resumen dentro de la venta.</li><li>— Queda marcado como “En proceso de carga”.</li><li>— Hay cinco días hábiles para completar categoría, SKU y proveedor.</li><li>— Se notifica antes de vencer; luego caduca la ficha temporal.</li></ul></div>
              <div className="mt-5 space-y-4">
                <div className="space-y-1.5"><Label htmlFor="demo-nuevo-nombre">Nombre corto *</Label><Input id="demo-nuevo-nombre" autoFocus value={nombreNuevo} onChange={(event) => setNombreNuevo(event.target.value)} placeholder="Ej. Anillo con piedra verde" /></div>
                <div className="space-y-1.5"><Label htmlFor="demo-nuevo-precio">Precio acordado en ARS *</Label><Input id="demo-nuevo-precio" inputMode="decimal" value={precioNuevo} onChange={(event) => setPrecioNuevo(event.target.value)} placeholder="0,00" /></div>
                <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="demo-nueva-categoria">Categoría <span className="font-normal text-zinc-500">(opcional)</span></Label><Input id="demo-nueva-categoria" value={categoriaNueva} onChange={(event) => setCategoriaNueva(event.target.value)} placeholder="Completar después" /></div><div className="space-y-1.5"><Label htmlFor="demo-nuevo-responsable">Proveedor o taller <span className="font-normal text-zinc-500">(opcional)</span></Label><Input id="demo-nuevo-responsable" value={responsableNuevo} onChange={(event) => setResponsableNuevo(event.target.value)} placeholder="Completar después" /></div></div>
                <div className="space-y-1.5"><Label htmlFor="demo-nueva-especificacion">Descripción o especificación <span className="font-normal text-zinc-500">(opcional)</span></Label><Textarea id="demo-nueva-especificacion" value={especificacionNueva} onChange={(event) => setEspecificacionNueva(event.target.value)} placeholder="Material, medida, color o cualquier dato disponible" className="min-h-20" /></div>
                {errorNuevo ? <p role="alert" className="rounded-md border border-zinc-950 bg-zinc-100 p-3 text-sm font-medium">{errorNuevo}</p> : null}
                <div className="flex items-start gap-2 rounded-md border border-zinc-300 p-3 text-sm"><Bell className="mt-0.5 size-4 shrink-0" /><p><strong>Vence cinco días hábiles después de confirmar.</strong> La notificación de seguimiento queda simulada en esta muestra.</p></div>
                <Button className="h-12 w-full bg-zinc-950 text-white hover:bg-zinc-800" onClick={agregarProductoTemporal}><Check className="size-4" />Agregar a la venta y completar después</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
