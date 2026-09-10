"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { DeudaProveedor } from "@/app/api/consignacion/deudas/route";
import { formatARS } from "@/lib/formatCurrency";

export function ConsignacionDashboard() {
  const [deudas, setDeudas] = useState<DeudaProveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetch("/api/consignacion/deudas")
      .then((res) => res.json())
      .then((data) => setDeudas(Array.isArray(data) ? data : []))
      .catch(() => setDeudas([]))
      .finally(() => setLoading(false));
  }, []);

  // Dispara el crecimiento de las barras de participación tras el primer paint.
  useEffect(() => {
    if (!loading) {
      const id = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id);
    }
  }, [loading]);

  if (loading) return <LedgerSkeleton />;

  if (deudas.length === 0) return <EmptyLedger />;

  const totalDeuda = deudas.reduce((acc, d) => acc + d.deudaPendiente, 0);
  const totalVendido = deudas.reduce((acc, d) => acc + d.totalVendidoPeriodo, 0);
  const proveedoresConDeuda = deudas.filter((d) => d.deudaPendiente > 0).length;

  // Orden contable: primero a quien más se le debe.
  const filas = [...deudas].sort((a, b) => b.deudaPendiente - a.deudaPendiente);

  return (
    <div className="space-y-5">
      {/* ── Masthead: estado de cuenta ───────────────────────────── */}
      <section className="ledger-in relative overflow-hidden rounded-2xl bg-zinc-950 text-zinc-100">
        <div
          aria-hidden
          className="ledger-grid-texture pointer-events-none absolute inset-0 opacity-[0.05]"
        />
        <div className="absolute inset-y-0 left-0 w-[3px] bg-primary" />
        <div className="relative flex flex-col gap-7 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              Deuda pendiente de rendición
            </p>
            <p className="mt-3 font-mono text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
              {formatARS(totalDeuda)}
            </p>
            <p className="mt-2 font-mono text-[11px] text-zinc-600">
              Montos en ARS · saldo acumulado de {deudas.length} proveedores
            </p>
          </div>
          <div className="flex divide-x divide-white/10">
            <div className="pr-6 sm:pr-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Con saldo
              </p>
              <p className="mt-1 font-mono text-2xl tabular-nums">
                {proveedoresConDeuda}
                <span className="text-zinc-600">/{deudas.length}</span>
              </p>
            </div>
            <div className="pl-6 sm:pl-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Vendido en el período
              </p>
              <p className="mt-1 font-mono text-2xl tabular-nums text-emerald-400">
                {formatARS(totalVendido)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Libro mayor de proveedores ───────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border bg-card">
        {/* Encabezado de columnas (desktop) */}
        <div className="hidden grid-cols-[2rem_minmax(0,1fr)_minmax(8rem,11rem)_minmax(9rem,13rem)] items-center gap-5 border-b bg-muted/30 px-5 py-3 md:grid">
          <span />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
            Proveedor
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
            Participación
          </span>
          <span className="text-right font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
            Deuda · acción
          </span>
        </div>

        <ul className="divide-y divide-border/60">
          {filas.map((d, i) => {
            const tieneDeuda = d.deudaPendiente > 0;
            const permitido = d.restriccionRendicion.permitido;
            const share = totalDeuda > 0 ? (d.deudaPendiente / totalDeuda) * 100 : 0;
            const dotClass = !tieneDeuda
              ? "bg-emerald-500"
              : permitido
                ? "bg-primary"
                : "bg-amber-500";

            return (
              <li
                key={d.proveedorId}
                style={{ animationDelay: `${Math.min(i * 45, 360)}ms` }}
                className="ledger-in group grid grid-cols-1 items-center gap-x-5 gap-y-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:px-5 md:grid-cols-[2rem_minmax(0,1fr)_minmax(8rem,11rem)_minmax(9rem,13rem)] md:gap-y-0"
              >
                {/* Índice de asiento */}
                <span className="hidden font-mono text-xs tabular-nums text-muted-foreground/40 md:block">
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Proveedor + último movimiento */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
                    <span className="truncate text-[15px] font-semibold tracking-tight">
                      {d.proveedorNombre}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate pl-3.5 font-mono text-[11px] text-muted-foreground/70">
                    {d.ultimaRendicion
                      ? `Última rendición ${new Date(d.ultimaRendicion.fechaHasta).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} · ${formatARS(d.ultimaRendicion.totalARendir)}`
                      : "Sin rendiciones registradas"}
                  </p>
                </div>

                {/* Participación sobre la deuda total */}
                <div className="hidden md:block">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/80 transition-[width] duration-700 ease-out"
                      style={{ width: mounted && tieneDeuda ? `${Math.max(share, 2)}%` : "0%" }}
                    />
                  </div>
                  <span className="mt-1 block font-mono text-[10px] tabular-nums text-muted-foreground/60">
                    {tieneDeuda ? `${share.toFixed(1)}%` : "—"}
                  </span>
                </div>

                {/* Deuda + acción */}
                <div className="flex items-center justify-between md:block md:text-right">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 md:hidden">
                    Deuda
                  </span>
                  <div>
                    <div
                      className={`font-mono text-lg font-semibold tabular-nums ${tieneDeuda ? "text-foreground" : "text-muted-foreground/40"}`}
                    >
                      {formatARS(d.deudaPendiente)}
                    </div>
                    {tieneDeuda ? (
                      permitido ? (
                        <Link
                          href={`/consignacion/rendiciones/nueva?proveedorId=${d.proveedorId}`}
                          className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] font-medium text-primary transition-all hover:gap-2"
                        >
                          Generar rendición
                          <span aria-hidden>→</span>
                        </Link>
                      ) : (
                        <span className="mt-0.5 inline-block font-mono text-[11px] text-amber-600 dark:text-amber-500">
                          Disponible en {d.restriccionRendicion.diasParaUltimaSemana} d
                        </span>
                      )
                    ) : (
                      <span className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-500">
                        Al día
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function LedgerSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-[148px] rounded-2xl bg-zinc-950/90" />
      <div className="overflow-hidden rounded-2xl border bg-card">
        <ul className="divide-y divide-border/60">
          {[0, 1, 2, 3].map((i) => (
            <li
              key={i}
              className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(8rem,11rem)_minmax(9rem,13rem)] items-center gap-5 px-5 py-5"
            >
              <div className="h-3 w-4 rounded animate-skeleton-shimmer" />
              <div className="space-y-2">
                <div className="h-3.5 w-40 rounded animate-skeleton-shimmer" />
                <div className="h-2.5 w-28 rounded animate-skeleton-shimmer" />
              </div>
              <div className="h-1.5 w-full rounded-full animate-skeleton-shimmer" />
              <div className="ml-auto h-5 w-24 rounded animate-skeleton-shimmer" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function EmptyLedger() {
  return (
    <section className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60">
        Libro vacío
      </p>
      <h3 className="mt-3 text-lg font-semibold tracking-tight">
        No hay proveedores de consignación
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Creá un proveedor con tipo «Consignación» y asignale productos para empezar a
        registrar ventas y rendiciones.
      </p>
      <Link href="/proveedores" className="mt-5 inline-block">
        <Button variant="outline" size="sm">
          Gestionar proveedores
        </Button>
      </Link>
    </section>
  );
}
