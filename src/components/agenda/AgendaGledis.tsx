"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  CalendarClock,
  Check,
  ChevronDown,
  Clock,
  Maximize2,
  Palette,
  Pin,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePreferenciaLocal } from "@/hooks/use-preferencia-local";
import { notificar } from "@/lib/notificar";
import {
  analizarTiempoNota,
  COLORES_NOTA,
  ColorNota,
  CONTEXTOS_NOTA,
  ContextoNota,
  crearNotasInicialesGledis,
  fechaLocalISO,
  HORARIOS_RAPIDOS,
  NotaAgenda,
  PRIORIDADES_NOTA,
  PrioridadNota,
  TamanoNota,
} from "@/lib/agenda-gledis";
import { IconoContexto, NotaAgendaCard } from "./NotaAgendaCard";
import { cn } from "@/lib/utils";

type FiltroTiempoId = "activas" | "hoy" | "manana" | "completadas" | "todas";

const NOTAS_POR_DEFECTO = crearNotasInicialesGledis();

function sincronizarServidor(notas: NotaAgenda[]) {
  void fetch("/api/agenda", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notas }),
  }).catch(() => {});
}

export function AgendaGledis() {
  const [notas, setNotasLocal] = usePreferenciaLocal<NotaAgenda[]>(
    "agenda-gledys-notas-v2",
    NOTAS_POR_DEFECTO,
  );

  const inputTituloRef = useRef<HTMLInputElement>(null);
  const [titulo, setTitulo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [contacto, setContacto] = useState("");
  const [fecha, setFecha] = useState(() => fechaLocalISO(0));
  const [hora, setHora] = useState("16:00");
  const [contexto, setContexto] = useState<ContextoNota>("entrega");
  const [color, setColor] = useState<ColorNota>("ambar");
  const [colorElegidoManual, setColorElegidoManual] = useState(false);
  const [prioridad, setPrioridad] = useState<PrioridadNota>("normal");
  const [tamano, setTamano] = useState<TamanoNota>("normal");
  const [fijadaNueva, setFijadaNueva] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  const [filtroTiempo, setFiltroTiempo] = useState<FiltroTiempoId>("activas");
  const [busqueda, setBusqueda] = useState("");
  const [animarTabCompletadas, setAnimarTabCompletadas] = useState(false);

  const notificarCompletadaAnimada = () => {
    setAnimarTabCompletadas(true);
    setTimeout(() => setAnimarTabCompletadas(false), 450);
    notificar.ok("Nota enviada a completadas");
  };

  useEffect(() => {
    let cancelado = false;
    async function cargarRemoto() {
      try {
        const res = await fetch("/api/agenda", { cache: "no-store" });
        if (!res.ok || cancelado) return;
        const data = (await res.json()) as { notas?: NotaAgenda[] };
        if (cancelado || !Array.isArray(data.notas) || data.notas.length === 0) {
          return;
        }
        const tieneLocal = window.localStorage.getItem("agenda-gledys-notas-v2");
        if (!tieneLocal) {
          setNotasLocal(data.notas);
        }
      } catch {
        // Usa copia local
      }
    }
    void cargarRemoto();
    return () => {
      cancelado = true;
    };
  }, [setNotasLocal]);

  const guardarNotas = (nuevas: NotaAgenda[]) => {
    setNotasLocal(nuevas);
    sincronizarServidor(nuevas);
  };

  const ahora = useMemo(() => new Date(), []);
  const hoyISO = useMemo(() => fechaLocalISO(0, ahora), [ahora]);
  const mananaISO = useMemo(() => fechaLocalISO(1, ahora), [ahora]);

  const configColorActivo =
    COLORES_NOTA.find((c) => c.id === color) ?? COLORES_NOTA[0];
  const configContextoActivo =
    CONTEXTOS_NOTA.find((c) => c.id === contexto) ?? CONTEXTOS_NOTA[0];

  const seleccionarContexto = (nuevoCtx: ContextoNota) => {
    setContexto(nuevoCtx);
    if (!colorElegidoManual) {
      const cfg = CONTEXTOS_NOTA.find((c) => c.id === nuevoCtx);
      if (cfg) setColor(cfg.colorSugerido);
    }
  };

  const seleccionarColor = (nuevoColor: ColorNota) => {
    setColor(nuevoColor);
    setColorElegidoManual(true);
  };

  const crearNotaRapida = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const tituloLimpio = titulo.trim();
    if (!tituloLimpio) {
      notificar.advertencia("Escribí qué querés agendar");
      inputTituloRef.current?.focus();
      return;
    }

    const isoAhora = new Date().toISOString();
    const nueva: NotaAgenda = {
      id: `nota-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      titulo: tituloLimpio,
      detalle: detalle.trim(),
      fecha: fecha || hoyISO,
      hora,
      color,
      contexto,
      prioridad,
      tamano,
      contacto: contacto.trim(),
      referencia: "",
      fijada: fijadaNueva,
      completada: false,
      subtareas: [],
      creadaEn: isoAhora,
      actualizadaEn: isoAhora,
    };

    guardarNotas([nueva, ...notas]);
    notificar.ok("Agendado en la agenda de Gledys");

    setTitulo("");
    setDetalle("");
    setContacto("");
    setPrioridad("normal");
    setTamano("normal");
    setFijadaNueva(false);
    setColorElegidoManual(false);
    setMostrarDetalle(false);
    inputTituloRef.current?.focus();
  };

  const actualizarNota = (id: string, cambios: Partial<NotaAgenda>) => {
    guardarNotas(
      notas.map((n) =>
        n.id === id
          ? { ...n, ...cambios, actualizadaEn: new Date().toISOString() }
          : n,
      ),
    );
  };

  const duplicarNota = (original: NotaAgenda) => {
    const isoAhora = new Date().toISOString();
    const copia: NotaAgenda = {
      ...original,
      id: `nota-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      titulo: `${original.titulo} (copia)`,
      completada: false,
      creadaEn: isoAhora,
      actualizadaEn: isoAhora,
    };
    guardarNotas([copia, ...notas]);
    notificar.ok("Nota duplicada");
  };

  const eliminarNota = (id: string) => {
    guardarNotas(notas.filter((n) => n.id !== id));
    notificar.info("Nota eliminada");
  };

  const limpiarCompletadas = () => {
    guardarNotas(notas.filter((n) => !n.completada));
    notificar.ok("Notas completadas limpiadas");
  };

  const conteos = useMemo(() => {
    let hoy = 0;
    let completadas = 0;
    for (const n of notas) {
      if (n.completada) {
        completadas += 1;
      } else if (n.fecha === hoyISO) {
        hoy += 1;
      }
    }
    return { hoy, completadas };
  }, [notas, hoyISO]);

  const notasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return notas
      .filter((n) => {
        switch (filtroTiempo) {
          case "activas":
            if (n.completada) return false;
            break;
          case "hoy":
            if (n.completada || n.fecha !== hoyISO) return false;
            break;
          case "manana":
            if (n.completada || n.fecha !== mananaISO) return false;
            break;
          case "completadas":
            if (!n.completada) return false;
            break;
          case "todas":
          default:
            break;
        }

        if (!q) return true;
        return `${n.titulo} ${n.detalle} ${n.contacto}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        if (a.completada !== b.completada) return a.completada ? 1 : -1;
        if (a.fijada !== b.fijada) return a.fijada ? -1 : 1;
        const ta = analizarTiempoNota(a.fecha, a.hora, a.completada, ahora);
        const tb = analizarTiempoNota(b.fecha, b.hora, b.completada, ahora);
        if (ta.ordenTimestamp !== tb.ordenTimestamp) {
          return ta.ordenTimestamp - tb.ordenTimestamp;
        }
        return b.creadaEn.localeCompare(a.creadaEn);
      });
  }, [notas, filtroTiempo, busqueda, ahora, hoyISO, mananaISO]);

  return (
    <div className="space-y-6">
      <PageHeader
        overline="Operación · Agenda"
        title="Agenda de Gledys"
        description="Notas rápidas con fecha, horario y color para organizar entregas, talleres y avisos."
      />

      {/* Compositor limpio y directo estilo nota grande */}
      <section
        aria-label="Agendar nueva nota"
        className={cn(
          "agenda-nota-card overflow-hidden rounded-xl border",
          configColorActivo.claseTema,
        )}
      >
        <div className="agenda-nota-barra h-1.5 w-full opacity-80" />

        <form onSubmit={crearNotaRapida} className="space-y-3.5 p-4 sm:p-5">
          {/* Fila principal: Input de título + Menú desplegable de opciones/colores + Botón Agendar */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <Input
              ref={inputTituloRef}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder={configContextoActivo.placeholderTitulo}
              className="h-11 flex-1 border-border-strong/60 bg-background/95 text-base font-medium"
            />

            <div className="flex items-center gap-2">
              {/* Menú desplegable único para elegir color, contexto, prioridad y tamaño */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center gap-2 rounded-md border border-border-strong/60 bg-background/90 px-3 text-xs font-medium text-foreground transition-colors hover:bg-background"
                  >
                    <span
                      className={cn(
                        "size-3 rounded-full border",
                        configColorActivo.claseSwatch,
                      )}
                    />
                    <IconoContexto contexto={contexto} className="size-3.5" />
                    <span>{configContextoActivo.etiqueta}</span>
                    <SlidersHorizontal className="size-3.5 text-muted-foreground" />
                    <ChevronDown className="size-3 opacity-70" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  sideOffset={6}
                  className="w-72 p-3"
                >
                  <div className="space-y-2 pb-1">
                    <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Palette className="size-3" />
                      Color ({configColorActivo.nombre})
                    </span>
                    <div className="flex items-center justify-between px-1 py-0.5">
                      {COLORES_NOTA.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => seleccionarColor(c.id)}
                          className={cn(
                            "flex size-7 items-center justify-center rounded-full border transition-transform hover:scale-110",
                            c.claseSwatch,
                            color === c.id &&
                              "ring-2 ring-foreground ring-offset-2 ring-offset-popover scale-105",
                          )}
                          title={c.nombre}
                        >
                          {color === c.id && (
                            <Check className="size-3.5 text-foreground stroke-[2.5]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <DropdownMenuSeparator className="my-2.5" />

                  <div className="space-y-2">
                    <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Contexto
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {CONTEXTOS_NOTA.map((ctx) => {
                        const activo = contexto === ctx.id;
                        return (
                          <button
                            key={ctx.id}
                            type="button"
                            onClick={() => seleccionarContexto(ctx.id)}
                            className={cn(
                              "flex items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                              activo
                                ? "border-foreground bg-accent text-foreground"
                                : "border-border bg-surface/60 text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-1.5">
                              <IconoContexto
                                contexto={ctx.id}
                                className="size-3.5 shrink-0"
                              />
                              <span className="truncate">{ctx.etiqueta}</span>
                            </span>
                            {activo && (
                              <Check className="size-3 shrink-0 stroke-[2.5]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <DropdownMenuSeparator className="my-2.5" />

                  <div className="space-y-1.5">
                    <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Prioridad
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {PRIORIDADES_NOTA.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPrioridad(p.id)}
                          className={cn(
                            "rounded-lg border px-2 py-1.5 text-center text-[11px] font-medium transition-colors",
                            prioridad === p.id
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-surface text-muted-foreground hover:bg-accent hover:text-foreground",
                          )}
                        >
                          {p.etiqueta}
                        </button>
                      ))}
                    </div>
                  </div>

                  <DropdownMenuSeparator className="my-2.5" />

                  <DropdownMenuGroup className="space-y-0.5">
                    <DropdownMenuItem
                      onClick={() =>
                        setTamano((prev) =>
                          prev === "grande" ? "normal" : "grande",
                        )
                      }
                      className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <Maximize2 className="size-3.5" />
                        <span>Nota ancha (2 columnas)</span>
                      </span>
                      {tamano === "grande" && <Check className="size-3.5" />}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setFijadaNueva((prev) => !prev)}
                      className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <Pin className="size-3.5" />
                        <span>Fijar arriba</span>
                      </span>
                      {fijadaNueva && <Check className="size-3.5" />}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button type="submit" size="lg" className="h-11 px-5">
                <Plus className="size-4" />
                Agendar
              </Button>
            </div>
          </div>

          {/* Segunda fila compacta: Fecha + Hora + botón opcional para agregar nota de detalle */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* Fecha rápida */}
              <div className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background/80 p-1">
                <Calendar className="ml-1.5 size-3.5 text-muted-foreground" />
                {[
                  { label: "Hoy", valor: hoyISO },
                  { label: "Mañana", valor: mananaISO },
                ].map((atajo) => (
                  <button
                    key={atajo.label}
                    type="button"
                    onClick={() => setFecha(atajo.valor)}
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                      fecha === atajo.valor
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {atajo.label}
                  </button>
                ))}
                <Input
                  type="date"
                  value={fecha}
                  onChange={(e) => e.target.value && setFecha(e.target.value)}
                  aria-label="Fecha"
                  className="h-6 w-auto border-0 bg-transparent px-1.5 font-mono text-xs shadow-none focus-visible:ring-0"
                />
              </div>

              {/* Hora rápida */}
              <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-border/80 bg-background/80 p-1">
                <Clock className="ml-1.5 size-3.5 text-muted-foreground" />
                {HORARIOS_RAPIDOS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHora(h)}
                    className={cn(
                      "rounded px-2 py-0.5 font-mono text-xs font-medium tabular-nums transition-colors",
                      hora === h
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {h}
                  </button>
                ))}
                <Input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  aria-label="Hora"
                  className="h-6 w-auto border-0 bg-transparent px-1.5 font-mono text-xs shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMostrarDetalle((prev) => !prev)}
              className="text-xs font-medium text-foreground/75 underline-offset-4 hover:text-foreground hover:underline"
            >
              {mostrarDetalle
                ? "Ocultar aclaración"
                : "+ Agregar aclaración o persona"}
            </button>
          </div>

          {mostrarDetalle && (
            <div className="anim-entrada grid gap-2.5 pt-1 sm:grid-cols-[minmax(0,1fr)_16rem]">
              <Textarea
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                rows={2}
                placeholder="Aclaración o detalle de lo agendado..."
                className="resize-none bg-background/95 text-sm"
              />
              <Input
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder="Clienta o taller (opcional)"
                className="h-10 bg-background/95 text-sm"
              />
            </div>
          )}
        </form>
      </section>

      {/* Filtros simples y buscador */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              { id: "activas", label: "Pendientes" },
              { id: "hoy", label: `Hoy (${conteos.hoy})` },
              { id: "manana", label: "Mañana" },
              {
                id: "completadas",
                label: `Completadas (${conteos.completadas})`,
              },
              { id: "todas", label: "Todas" },
            ] as Array<{ id: FiltroTiempoId; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFiltroTiempo(tab.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                filtroTiempo === tab.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                tab.id === "completadas" &&
                  animarTabCompletadas &&
                  "anim-agenda-tab-bump ring-2 ring-foreground/40",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en notas..."
              className="h-8 pl-8 text-xs"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {conteos.completadas > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={limpiarCompletadas}
              className="h-8 text-xs text-muted-foreground"
            >
              <Trash2 className="size-3.5" />
              Limpiar listas
            </Button>
          )}
        </div>
      </div>

      {/* Grilla de Notas Grandes */}
      {notasFiltradas.length === 0 ? (
        <EmptyState
          icono={CalendarClock}
          titulo="No hay notas en esta vista"
          descripcion="Agendá algo nuevo arriba o cambiá el filtro."
          accion={
            filtroTiempo !== "activas" || busqueda ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFiltroTiempo("activas");
                  setBusqueda("");
                }}
              >
                <RotateCcw className="size-3.5" />
                Ver pendientes
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {notasFiltradas.map((nota) => (
            <NotaAgendaCard
              key={nota.id}
              nota={nota}
              ahora={ahora}
              onActualizar={actualizarNota}
              onDuplicar={duplicarNota}
              onEliminar={eliminarNota}
              onCompletadaAnimada={notificarCompletadaAnimada}
            />
          ))}
        </div>
      )}
    </div>
  );
}
