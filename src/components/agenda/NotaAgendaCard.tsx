"use client";

import { useState } from "react";
import {
  Calendar,
  CalendarClock,
  Check,
  Clock,
  Copy,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PackageCheck,
  Palette,
  Pencil,
  Pin,
  Sparkles,
  Store,
  Trash2,
  Truck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  analizarTiempoNota,
  COLORES_NOTA,
  ColorNota,
  CONTEXTOS_NOTA,
  ContextoNota,
  fechaLocalISO,
  HORARIOS_RAPIDOS,
  NotaAgenda,
  PRIORIDADES_NOTA,
  PrioridadNota,
} from "@/lib/agenda-gledis";
import { cn } from "@/lib/utils";

export function IconoContexto({
  contexto,
  className,
}: {
  contexto: ContextoNota;
  className?: string;
}) {
  switch (contexto) {
    case "entrega":
      return <PackageCheck className={className} aria-hidden="true" />;
    case "clienta":
      return <UserRound className={className} aria-hidden="true" />;
    case "proveedor":
      return <Truck className={className} aria-hidden="true" />;
    case "local":
      return <Store className={className} aria-hidden="true" />;
    case "personal":
    default:
      return <Sparkles className={className} aria-hidden="true" />;
  }
}

function sumarUnaHora(horaActual: string): string {
  if (!horaActual) return "10:00";
  const [h, m] = horaActual.split(":").map((n) => Number.parseInt(n, 10));
  const nuevaHora = ((Number.isNaN(h) ? 9 : h) + 1) % 24;
  const min = Number.isNaN(m) ? 0 : m;
  return `${String(nuevaHora).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

interface NotaAgendaCardProps {
  nota: NotaAgenda;
  ahora: Date;
  onActualizar: (id: string, cambios: Partial<NotaAgenda>) => void;
  onDuplicar: (nota: NotaAgenda) => void;
  onEliminar: (id: string) => void;
  onCompletadaAnimada?: () => void;
}

export function NotaAgendaCard({
  nota,
  ahora,
  onActualizar,
  onDuplicar,
  onEliminar,
  onCompletadaAnimada,
}: NotaAgendaCardProps) {
  const [editando, setEditando] = useState(false);
  const [editandoFecha, setEditandoFecha] = useState(false);
  const [animarCheck, setAnimarCheck] = useState(false);
  const [enviandoCompletada, setEnviandoCompletada] = useState(false);

  const [tituloTemp, setTituloTemp] = useState(nota.titulo);
  const [detalleTemp, setDetalleTemp] = useState(nota.detalle);
  const [contactoTemp, setContactoTemp] = useState(nota.contacto);

  const configColor =
    COLORES_NOTA.find((c) => c.id === nota.color) ?? COLORES_NOTA[0];
  const configContexto =
    CONTEXTOS_NOTA.find((c) => c.id === nota.contexto) ?? CONTEXTOS_NOTA[0];
  const tiempo = analizarTiempoNota(
    nota.fecha,
    nota.hora,
    nota.completada,
    ahora,
  );

  const visualmenteCompletada = nota.completada || enviandoCompletada;

  const abrirEdicion = () => {
    setTituloTemp(nota.titulo);
    setDetalleTemp(nota.detalle);
    setContactoTemp(nota.contacto);
    setEditando(true);
  };

  const guardarEdicion = () => {
    const limpio = tituloTemp.trim();
    if (!limpio) return;
    onActualizar(nota.id, {
      titulo: limpio,
      detalle: detalleTemp.trim(),
      contacto: contactoTemp.trim(),
    });
    setEditando(false);
  };

  const alternarCompletada = () => {
    if (enviandoCompletada) return;
    setAnimarCheck(true);
    setTimeout(() => setAnimarCheck(false), 360);

    if (!nota.completada) {
      setEnviandoCompletada(true);
      setTimeout(() => {
        onActualizar(nota.id, { completada: true });
        onCompletadaAnimada?.();
        setEnviandoCompletada(false);
      }, 560);
    } else {
      onActualizar(nota.id, { completada: false });
    }
  };

  return (
    <article
      className={cn(
        "agenda-nota-card anim-agenda-nota group relative flex flex-col justify-between overflow-hidden rounded-xl border",
        configColor.claseTema,
        nota.tamano === "grande" && "md:col-span-2",
        nota.completada && !enviandoCompletada && "opacity-65",
        enviandoCompletada && "anim-agenda-envio",
      )}
    >
      {/* Línea superior sutil de color de la nota */}
      <div className="agenda-nota-barra h-1.5 w-full shrink-0 opacity-75" />

      <div className="flex flex-1 flex-col justify-between gap-4 p-5 sm:p-6">
        {/* Fila superior limpia: Check + Contexto + Fecha/Hora a la izq, Menú desplegable a la der */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={alternarCompletada}
              aria-label={
                visualmenteCompletada
                  ? "Marcar como pendiente"
                  : "Marcar como completada"
              }
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-md border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                visualmenteCompletada
                  ? "border-foreground bg-foreground text-background shadow-xs"
                  : "border-border-strong bg-background/85 hover:scale-110 hover:border-foreground",
                animarCheck && "anim-agenda-check",
              )}
            >
              {visualmenteCompletada && (
                <Check className="size-3.5 stroke-[2.75]" />
              )}
            </button>

            <span className="agenda-nota-chip inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium">
              <IconoContexto contexto={nota.contexto} className="size-3" />
              <span>{configContexto.etiqueta}</span>
            </span>

            <button
              type="button"
              onClick={() => setEditandoFecha((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-md bg-background/65 px-2.5 py-0.5 font-mono text-xs font-medium text-foreground transition-colors hover:bg-background"
              title="Cambiar fecha u horario"
            >
              <span>{tiempo.etiquetaDia}</span>
              {nota.hora && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="tabular-nums">{nota.hora} hs</span>
                </>
              )}
            </button>

            {enviandoCompletada ? (
              <span className="anim-entrada inline-flex items-center gap-1 rounded-md bg-foreground px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-background">
                <Check className="size-3 stroke-[2.5]" />
                Enviada a completadas
              </span>
            ) : (
              nota.prioridad === "urgente" &&
              !nota.completada && (
                <span className="rounded-md bg-foreground px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-background">
                  Urgente
                </span>
              )
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {nota.fijada && (
              <button
                type="button"
                onClick={() => onActualizar(nota.id, { fijada: false })}
                title="Nota fijada arriba (clic para soltar)"
                className="inline-flex size-7 items-center justify-center rounded-md text-foreground/80 hover:bg-background/60"
              >
                <Pin className="size-3.5 fill-current" />
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Opciones de la nota"
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-transparent bg-background/55 text-foreground/80 transition-colors hover:border-border hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={6}
                className="w-72 p-3"
              >
                {/* Colores rápidos con buen aire */}
                <div className="space-y-2 pb-1">
                  <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Palette className="size-3" />
                    Color de nota
                  </span>
                  <div className="flex items-center justify-between px-1 py-0.5">
                    {COLORES_NOTA.map((c) => {
                      const activo = c.id === nota.color;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            onActualizar(nota.id, { color: c.id as ColorNota })
                          }
                          title={c.nombre}
                          aria-label={`Color ${c.nombre}`}
                          className={cn(
                            "flex size-7 items-center justify-center rounded-full border transition-transform hover:scale-110",
                            c.claseSwatch,
                            activo &&
                              "ring-2 ring-foreground ring-offset-2 ring-offset-popover scale-105",
                          )}
                        >
                          {activo && (
                            <Check className="size-3.5 text-foreground stroke-[2.5]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <DropdownMenuSeparator className="my-2.5" />

                {/* Contexto en grilla de 2 columnas bien espaciada */}
                <div className="space-y-2">
                  <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Contexto
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CONTEXTOS_NOTA.map((ctx) => {
                      const activo = ctx.id === nota.contexto;
                      return (
                        <button
                          key={ctx.id}
                          type="button"
                          onClick={() =>
                            onActualizar(nota.id, { contexto: ctx.id })
                          }
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

                {/* Prioridad con espacio amplio para que ningún texto se corte */}
                <div className="space-y-1.5">
                  <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Prioridad
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PRIORIDADES_NOTA.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          onActualizar(nota.id, {
                            prioridad: p.id as PrioridadNota,
                          })
                        }
                        className={cn(
                          "rounded-lg border px-2 py-1.5 text-center text-[11px] font-medium transition-colors",
                          nota.prioridad === p.id
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

                {/* Mover fecha y hora rápido */}
                <div className="space-y-1.5">
                  <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Mover rápido
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onActualizar(nota.id, {
                          fecha: fechaLocalISO(0, ahora),
                        })
                      }
                      className="rounded-lg border border-border bg-surface px-2 py-1.5 text-center text-[11px] font-medium transition-colors hover:bg-accent"
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onActualizar(nota.id, {
                          fecha: fechaLocalISO(1, ahora),
                        })
                      }
                      className="rounded-lg border border-border bg-surface px-2 py-1.5 text-center text-[11px] font-medium transition-colors hover:bg-accent"
                    >
                      Mañana
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onActualizar(nota.id, {
                          hora: sumarUnaHora(nota.hora),
                        })
                      }
                      className="rounded-lg border border-border bg-surface px-2 py-1.5 text-center text-[11px] font-medium transition-colors hover:bg-accent"
                    >
                      +1 hora
                    </button>
                  </div>
                </div>

                <DropdownMenuSeparator className="my-2.5" />

                <DropdownMenuGroup className="space-y-0.5">
                  <DropdownMenuItem
                    onClick={abrirEdicion}
                    className="gap-2.5 rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    <Pencil className="size-3.5" />
                    <span>Editar texto</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setEditandoFecha((prev) => !prev)}
                    className="gap-2.5 rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    <CalendarClock className="size-3.5" />
                    <span>Cambiar fecha u hora</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() =>
                      onActualizar(nota.id, { fijada: !nota.fijada })
                    }
                    className="gap-2.5 rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    <Pin className="size-3.5" />
                    <span>{nota.fijada ? "Soltar nota" : "Fijar arriba"}</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() =>
                      onActualizar(nota.id, {
                        tamano: nota.tamano === "grande" ? "normal" : "grande",
                      })
                    }
                    className="gap-2.5 rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    {nota.tamano === "grande" ? (
                      <>
                        <Minimize2 className="size-3.5" />
                        <span>Tamaño normal</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="size-3.5" />
                        <span>Nota ancha (2 columnas)</span>
                      </>
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => onDuplicar(nota)}
                    className="gap-2.5 rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    <Copy className="size-3.5" />
                    <span>Duplicar</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="my-2" />

                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onEliminar(nota.id)}
                  className="gap-2.5 rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <Trash2 className="size-3.5" />
                  <span>Eliminar nota</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Selector inline de fecha/hora solo cuando se hace clic en la fecha */}
        {editandoFecha && (
          <div className="anim-entrada flex flex-wrap items-center gap-2 rounded-lg border border-border-strong/50 bg-background/90 p-2.5">
            <Calendar className="size-3.5 text-muted-foreground" />
            <Input
              type="date"
              value={nota.fecha}
              onChange={(e) =>
                e.target.value &&
                onActualizar(nota.id, { fecha: e.target.value })
              }
              className="h-8 w-auto font-mono text-xs"
            />
            <Clock className="ml-1 size-3.5 text-muted-foreground" />
            <Input
              type="time"
              value={nota.hora}
              onChange={(e) => onActualizar(nota.id, { hora: e.target.value })}
              className="h-8 w-auto font-mono text-xs"
            />
            <div className="flex flex-wrap gap-1">
              {HORARIOS_RAPIDOS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => onActualizar(nota.id, { hora: h })}
                  className={cn(
                    "rounded border px-2 py-0.5 font-mono text-[11px]",
                    nota.hora === h
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-surface text-muted-foreground hover:text-foreground",
                  )}
                >
                  {h}
                </button>
              ))}
            </div>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => setEditandoFecha(false)}
              className="ml-auto"
            >
              Listo
            </Button>
          </div>
        )}

        {/* Contenido principal de la nota */}
        {editando ? (
          <div className="anim-entrada space-y-2.5 rounded-lg border border-border-strong/60 bg-background/95 p-3">
            <Input
              value={tituloTemp}
              onChange={(e) => setTituloTemp(e.target.value)}
              placeholder="Título de la nota..."
              className="font-medium"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  guardarEdicion();
                }
              }}
            />
            <Textarea
              value={detalleTemp}
              onChange={(e) => setDetalleTemp(e.target.value)}
              rows={2}
              placeholder="Nota o aclaración..."
              className="resize-none text-sm"
            />
            <Input
              value={contactoTemp}
              onChange={(e) => setContactoTemp(e.target.value)}
              placeholder="Clienta, taller o referencia (opcional)"
              className="h-8 text-xs"
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditando(false)}
              >
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={guardarEdicion}>
                Guardar
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={abrirEdicion}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                abrirEdicion();
              }
            }}
            className="cursor-pointer space-y-1.5 rounded-lg py-1 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Clic para editar la nota"
          >
            <h3
              className={cn(
                "text-lg font-semibold leading-snug tracking-tight text-foreground transition-colors",
                nota.completada &&
                  !enviandoCompletada &&
                  "line-through text-muted-foreground",
                enviandoCompletada && "text-muted-foreground",
              )}
            >
              <span
                className={cn(enviandoCompletada && "anim-agenda-tachado")}
              >
                {nota.titulo}
              </span>
            </h3>
            {nota.detalle && (
              <p
                className={cn(
                  "whitespace-pre-line text-sm leading-relaxed text-foreground/80 transition-colors",
                  nota.completada &&
                    !enviandoCompletada &&
                    "line-through text-muted-foreground",
                  enviandoCompletada && "text-muted-foreground",
                )}
              >
                <span
                  className={cn(enviandoCompletada && "anim-agenda-tachado")}
                >
                  {nota.detalle}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Pie ligero solo si tiene persona/referencia anotada */}
        {nota.contacto && !editando && (
          <div className="flex items-center gap-1.5 pt-1 text-xs font-medium text-foreground/75">
            <UserRound className="size-3.5 shrink-0 opacity-70" />
            <span>{nota.contacto}</span>
          </div>
        )}
      </div>
    </article>
  );
}
