"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { PageHeader } from "@/components/ui/page-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Users, User, ArrowLeft } from "lucide-react";
import { formatARS, formatUSD } from "@/lib/formatCurrency";
import { useAsyncAction } from "@/hooks/use-async-action";
import { notificar } from "@/lib/notificar";
import { cn } from "@/lib/utils";

import {
  BalanceCards,
  TransactionForm,
  TransactionList,
  CajaSelector,
  MonthlyClosure,
  CajaChicaSkeleton,
} from "@/components/caja-chica";

interface Movimiento {
  id: string;
  tipo: string;
  monto: number;
  moneda?: string;
  concepto: string | null;
  fecha: string;
}

interface CajaChica {
  id: string;
  userId: string;
  fechaApertura: string;
  fechaCierre: string | null;
  montoInicial: number;
  montoInicialUsd?: number | null;
  estado: string;
  movimientos: Movimiento[];
  user?: { id: string; name: string | null; email: string };
}

function sortCajasPorFecha<T extends { fechaApertura: string }>(list: T[]): T[] {
  return [...list].sort(
    (a, b) =>
      new Date(b.fechaApertura).getTime() - new Date(a.fechaApertura).getTime()
  );
}

export default function CajaChicaPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [cajas, setCajas] = useState<CajaChica[]>([]);
  const [cajasTodas, setCajasTodas] = useState<CajaChica[]>([]);
  const [vistaAdmin, setVistaAdmin] = useState(false);
  const [cajaSeleccionada, setCajaSeleccionada] = useState<CajaChica | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCierre, setLoadingCierre] = useState(false);
  const [abrirModal, setAbrirModal] = useState(false);
  const [cierreModal, setCierreModal] = useState(false);
  const [montoInicial, setMontoInicial] = useState(0);
  const [montoInicialUsd, setMontoInicialUsd] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cierreMensual, setCierreMensual] = useState<unknown>(null);

  const cajaActual = vistaAdmin ? cajaSeleccionada : cajas.find((c) => c.estado === "ABIERTA") ?? null;
  const esMiCaja = Boolean(cajaActual && session?.user?.id === cajaActual.userId);

  const mergeCajaEnEstado = useCallback((caja: CajaChica) => {
    setCajas((prev) => {
      const idx = prev.findIndex((c) => c.id === caja.id);
      if (idx === -1) return sortCajasPorFecha([caja, ...prev]);
      const next = [...prev];
      next[idx] = caja;
      return next;
    });
    setCajasTodas((prev) => {
      const idx = prev.findIndex((c) => c.id === caja.id);
      if (idx === -1) return sortCajasPorFecha([caja, ...prev]);
      const next = [...prev];
      next[idx] = caja;
      return next;
    });
    setCajaSeleccionada((sel) => (sel?.id === caja.id ? caja : sel));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch("/api/caja-chica").then((r) => r.json()),
      isAdmin ? fetch("/api/caja-chica?todas=true").then((r) => r.json()) : Promise.resolve([]),
    ])
      .then(([misCajas, todas]) => {
        setCajas(Array.isArray(misCajas) ? misCajas : []);
        setCajasTodas(Array.isArray(todas) ? todas : []);

        setCajaSeleccionada((prev) => {
          if (!vistaAdmin) {
            const abierta = (Array.isArray(misCajas) ? misCajas : []).find(
              (c: CajaChica) => c.estado === "ABIERTA"
            );
            return abierta ?? null;
          }
          if (prev) {
            const updated = (Array.isArray(todas) ? todas : []).find(
              (c: CajaChica) => c.id === prev.id
            );
            return updated ?? prev;
          }
          return prev;
        });
      })
      .catch((err) => {
        console.error(err);
        notificar.error("Error al cargar datos");
      })
      .finally(() => setLoading(false));
  }, [isAdmin, vistaAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const loadCierreMensual = (mes: string, ano: string) => {
    setLoadingCierre(true);
    fetch(`/api/caja-chica/cierre-mensual?mes=${mes}&ano=${ano}`)
      .then((res) => res.json())
      .then(setCierreMensual)
      .catch(() => setCierreMensual(null))
      .finally(() => setLoadingCierre(false));
  };

  const abrir = useAsyncAction(async () => {
    setError(null);
    try {
      const res = await fetch("/api/caja-chica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "abrir",
          montoInicial: montoInicial || 0,
          montoInicialUsd: montoInicialUsd || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      const caja = data as CajaChica;
      mergeCajaEnEstado(caja);
      setAbrirModal(false);
      setMontoInicial(0);
      setMontoInicialUsd(0);
      if (!vistaAdmin) setCajaSeleccionada(caja);
      notificar.ok("Caja abierta correctamente");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setError(msg);
      notificar.error(msg);
    }
  });

  const handleAbrir = (e: React.FormEvent) => {
    e.preventDefault();
    if (montoInicial <= 0 && montoInicialUsd <= 0) {
      notificar.error("Ingresá al menos un monto inicial (ARS o USD)");
      return;
    }
    void abrir.run();
  };

  const cerrar = useAsyncAction(async () => {
    if (!cajaActual || !esMiCaja) return;
    setError(null);
    try {
      const res = await fetch(`/api/caja-chica/${cajaActual.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "cerrar" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setCierreModal(false);
      setCajaSeleccionada(null);
      load();
      notificar.ok("Caja cerrada correctamente");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setError(msg);
      notificar.error(msg);
    }
  });

  /** Alguna acción de caja (abrir / cerrar) en vuelo. */
  const saving = abrir.loading || cerrar.loading;

  const calcularSaldos = () => {
    if (!cajaActual) return { ars: 0, usd: 0 };
    const initArs = Number(cajaActual.montoInicial ?? 0);
    const initUsd = Number(cajaActual.montoInicialUsd ?? 0);
    const movs = cajaActual.movimientos ?? [];
    const ars = movs
      .filter((m) => (m.moneda ?? "ARS") === "ARS")
      .reduce((s, m) => s + (m.tipo === "INGRESO" ? Number(m.monto) : -Number(m.monto)), 0);
    const usd = movs
      .filter((m) => (m.moneda ?? "ARS") === "USD")
      .reduce((s, m) => s + (m.tipo === "INGRESO" ? Number(m.monto) : -Number(m.monto)), 0);
    return { ars: initArs + ars, usd: initUsd + usd };
  };

  const saldos = calcularSaldos();

  const claseSegmento = (activo: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      activo
        ? "bg-background text-foreground shadow-xs"
        : "text-muted-foreground hover:text-foreground"
    );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        overline="Administración"
        title="Caja chica"
        description="Movimientos de efectivo y control del turno"
      >
        {isAdmin && (
          <div
            role="group"
            aria-label="Vista de caja"
            className="inline-flex rounded-lg border border-border bg-muted p-0.5"
          >
            <button
              type="button"
              aria-pressed={!vistaAdmin}
              onClick={() => {
                setVistaAdmin(false);
                setCajaSeleccionada(null);
              }}
              className={claseSegmento(!vistaAdmin)}
            >
              <User className="size-4" aria-hidden="true" />
              Mi caja
            </button>
            <button
              type="button"
              aria-pressed={vistaAdmin}
              onClick={() => {
                setVistaAdmin(true);
                setCajaSeleccionada(null);
              }}
              className={claseSegmento(vistaAdmin)}
            >
              <Users className="size-4" aria-hidden="true" />
              Empleados
            </button>
          </div>
        )}
      </PageHeader>

      {loading && !cajaActual ? (
        <CajaChicaSkeleton conEncabezado={false} />
      ) : (
        <div className="space-y-6">
          {vistaAdmin && !cajaSeleccionada && (
            <CajaSelector
              cajas={cajasTodas}
              cajaSeleccionada={cajaSeleccionada}
              onSelect={(c) => setCajaSeleccionada(c)}
            />
          )}

          {(!vistaAdmin || cajaSeleccionada) && (
            <>
              {vistaAdmin && cajaSeleccionada && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCajaSeleccionada(null)}
                  className="-ml-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Volver al listado
                </Button>
              )}

              {!cajaActual && !vistaAdmin ? (
                <div className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Sin caja abierta</p>
                    <p className="text-xs text-muted-foreground">
                      Abrí una caja para registrar ingresos y egresos de este turno.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setAbrirModal(true)} className="shrink-0">
                    <Plus className="size-4" aria-hidden="true" />
                    Abrir caja
                  </Button>
                </div>
              ) : cajaActual ? (
                <div className="space-y-6">
                  <div className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        Turno
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {cajaActual.user?.name ?? "Usuario"}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {cajaActual.estado === "ABIERTA" ? "Abierta" : "Cerrada"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      <div className="sm:text-right">
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          Apertura
                        </p>
                        <p className="mt-0.5 font-mono text-sm tabular-nums">
                          {new Date(cajaActual.fechaApertura).toLocaleString("es-AR")}
                        </p>
                      </div>
                      {esMiCaja && cajaActual.estado === "ABIERTA" && (
                        <Button variant="outline" size="sm" onClick={() => setCierreModal(true)}>
                          Cerrar caja
                        </Button>
                      )}
                    </div>
                  </div>

                  <BalanceCards ars={saldos.ars} usd={saldos.usd} />

                  {esMiCaja && cajaActual.estado === "ABIERTA" && (
                    <TransactionForm cajaId={cajaActual.id} onSuccess={mergeCajaEnEstado} saving={saving} />
                  )}

                  <TransactionList
                    movimientos={cajaActual.movimientos ?? []}
                    fechaApertura={cajaActual.fechaApertura}
                    montoInicial={cajaActual.montoInicial}
                    montoInicialUsd={cajaActual.montoInicialUsd}
                  />
                </div>
              ) : null}
            </>
          )}

          <MonthlyClosure
            cierreMensual={cierreMensual as never}
            onLoad={loadCierreMensual}
            loading={loadingCierre}
          />
        </div>
      )}

      <Dialog open={abrirModal} onOpenChange={setAbrirModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir caja</DialogTitle>
            <DialogDescription>Monto inicial del turno en pesos y/o dólares.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAbrir} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Monto ARS</Label>
                <CurrencyInput
                  value={montoInicial}
                  onChange={(v) => setMontoInicial(v ?? 0)}
                  placeholder="0.00"
                  className="border-border bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Monto USD</Label>
                <CurrencyInput
                  value={montoInicialUsd}
                  onChange={(v) => setMontoInicialUsd(v ?? 0)}
                  placeholder="0.00"
                  className="border-border bg-background"
                />
              </div>
            </div>
            {error && (
              <p className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAbrirModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={abrir.loading} loadingText="Abriendo…">
                Abrir caja
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={cierreModal}
        onOpenChange={(abierto) => {
          // Mientras el cierre está en vuelo el diálogo no se puede descartar.
          if (!cerrar.loading) setCierreModal(abierto);
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar la caja?</AlertDialogTitle>
            <AlertDialogDescription>
              El cierre no se puede deshacer. No vas a poder registrar más movimientos en esta
              caja hasta abrir un nuevo turno.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <dl className="divide-y divide-border rounded-lg border border-border text-sm">
            <div className="flex justify-between gap-4 px-4 py-2.5">
              <dt className="text-muted-foreground">Saldo final ARS</dt>
              <dd
                className={cn(
                  "font-mono font-semibold tabular-nums",
                  saldos.ars < 0 && "text-num-negative"
                )}
              >
                {formatARS(saldos.ars)}
              </dd>
            </div>
            {saldos.usd !== 0 && (
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-muted-foreground">Saldo final USD</dt>
                <dd
                  className={cn(
                    "font-mono font-semibold tabular-nums",
                    saldos.usd < 0 && "text-num-negative"
                  )}
                >
                  {formatUSD(saldos.usd)}
                </dd>
              </div>
            )}
          </dl>

          {error && (
            <p className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setCierreModal(false)}
              disabled={cerrar.loading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void cerrar.run()}
              loading={cerrar.loading}
              loadingText="Cerrando…"
            >
              Confirmar cierre
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
