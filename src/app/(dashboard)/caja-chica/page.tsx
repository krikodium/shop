"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Wallet, Plus, Users, User, ArrowLeft, ShieldCheck } from "lucide-react";
import { formatARS, formatUSD } from "@/lib/formatCurrency";

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
  const [saving, setSaving] = useState(false);
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
        toast.error("Error al cargar datos");
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

  const handleAbrir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montoInicial <= 0 && montoInicialUsd <= 0) {
      toast.error("Ingresá al menos un monto inicial (ARS o USD)");
      return;
    }
    setSaving(true);
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
      toast.success("Caja abierta correctamente");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCerrar = async () => {
    if (!cajaActual || !esMiCaja) return;
    setSaving(true);
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
      toast.success("Caja cerrada correctamente");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12 animate-in fade-in duration-300">
      <PageHeader
        overline="Gestión · Tesorería"
        title="Caja chica"
        description="Movimientos de efectivo y control del turno"
      >
          {isAdmin && (
            <div className="flex rounded-lg border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => {
                  setVistaAdmin(false);
                  setCajaSeleccionada(null);
                }}
                className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  !vistaAdmin
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="h-4 w-4" />
                Mi caja
              </button>
              <button
                type="button"
                onClick={() => {
                  setVistaAdmin(true);
                  setCajaSeleccionada(null);
                }}
                className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  vistaAdmin
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-4 w-4" />
                Empleados
              </button>
            </div>
          )}
      </PageHeader>

      {loading && !cajaActual ? (
        <CajaChicaSkeleton />
      ) : (
        <div className="space-y-8">
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
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al listado
                </Button>
              )}

              {!cajaActual && !vistaAdmin ? (
                <Card className="border border-dashed border-border bg-muted/20">
                  <CardContent className="flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                        <Wallet className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-lg font-semibold tracking-tight">Sin caja abierta</h2>
                        <p className="max-w-md text-sm text-muted-foreground">
                          Abrí una caja para registrar ingresos y egresos de este turno.
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => setAbrirModal(true)} className="shrink-0 gap-2">
                      <Plus className="h-4 w-4" />
                      Abrir caja
                    </Button>
                  </CardContent>
                </Card>
              ) : cajaActual ? (
                <div className="space-y-8">
                  <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 sm:items-center">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Turno
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="font-semibold">
                            {cajaActual.user?.name ?? "Usuario"}
                          </span>
                          {cajaActual.estado === "ABIERTA" ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                              Abierta
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Cerrada</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                      <div className="text-sm sm:text-right">
                        <p className="text-xs font-medium text-muted-foreground">Apertura</p>
                        <p className="font-medium tabular-nums">
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
              <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAbrirModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Abriendo…" : "Abrir caja"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={cierreModal} onOpenChange={setCierreModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cerrar caja</DialogTitle>
            <DialogDescription>
              No podrás registrar más movimientos en esta caja hasta abrir un nuevo turno.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Saldo final ARS</span>
              <span className="font-semibold tabular-nums">{formatARS(saldos.ars)}</span>
            </div>
            {saldos.usd !== 0 && (
              <div className="flex justify-between gap-4 border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">Saldo final USD</span>
                <span className="font-semibold tabular-nums">{formatUSD(saldos.usd)}</span>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button variant="destructive" className="w-full" onClick={handleCerrar} disabled={saving}>
              {saving ? "Cerrando…" : "Confirmar cierre"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setCierreModal(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
