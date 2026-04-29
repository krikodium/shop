"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Wallet, Plus, Users, User, ArrowLeft, MoreHorizontal, ShieldCheck } from "lucide-react";
import { formatARS, formatUSD } from "@/lib/formatCurrency";

// Modular Components
import { 
  BalanceCards, 
  TransactionForm, 
  TransactionList, 
  CajaSelector, 
  MonthlyClosure 
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
  const [cierreMensual, setCierreMensual] = useState<any>(null);

  const cajaActual = vistaAdmin ? cajaSeleccionada : cajas.find((c) => c.estado === "ABIERTA") ?? null;
  const esMiCaja = cajaActual && session?.user?.id === cajaActual.userId;

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch("/api/caja-chica").then((r) => r.json()),
      isAdmin ? fetch("/api/caja-chica?todas=true").then((r) => r.json()) : Promise.resolve([]),
    ])
      .then(([misCajas, todas]) => {
        setCajas(Array.isArray(misCajas) ? misCajas : []);
        setCajasTodas(Array.isArray(todas) ? todas : []);
        
        // If we are not in admin view, auto-select our open box
        if (!vistaAdmin) {
          const abierta = (Array.isArray(misCajas) ? misCajas : []).find(
            (c: CajaChica) => c.estado === "ABIERTA"
          );
          setCajaSeleccionada(abierta ?? null);
        } else if (cajaSeleccionada) {
          // Update selected box if it's already selected
          const updated = (Array.isArray(todas) ? todas : []).find(c => c.id === cajaSeleccionada.id);
          if (updated) setCajaSeleccionada(updated);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error al cargar datos");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [isAdmin, vistaAdmin]);

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
      setAbrirModal(false);
      setMontoInicial(0);
      setMontoInicialUsd(0);
      load();
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
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tighter sm:text-4xl text-foreground">
              Caja Chica
            </h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            Gestión de flujo de efectivo, gastos operativos e ingresos diarios.
          </p>
        </div>

        {isAdmin && (
          <div className="flex p-1 bg-muted rounded-xl shadow-inner divide-x divide-white/10">
            <Button
              variant={!vistaAdmin ? "ghost" : "ghost"}
              size="sm"
              onClick={() => {
                setVistaAdmin(false);
                setCajaSeleccionada(null);
              }}
              className={`rounded-lg px-6 h-10 transition-all font-bold text-xs uppercase tracking-wider ${
                !vistaAdmin ? "bg-white shadow-sm text-primary dark:bg-zinc-800" : "text-muted-foreground hover:bg-white/50"
              }`}
            >
              <User className="h-4 w-4 mr-2" />
              Mi caja
            </Button>
            <Button
              variant={vistaAdmin ? "ghost" : "ghost"}
              size="sm"
              onClick={() => {
                setVistaAdmin(true);
                setCajaSeleccionada(null);
              }}
              className={`rounded-lg px-6 h-10 transition-all font-bold text-xs uppercase tracking-wider ${
                vistaAdmin ? "bg-white shadow-sm text-primary dark:bg-zinc-800" : "text-muted-foreground hover:bg-white/50"
              }`}
            >
              <Users className="h-4 w-4 mr-2" />
              Empleados
            </Button>
          </div>
        )}
      </div>

      {loading && !cajaActual ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4 opacity-50">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          <p className="text-sm font-bold tracking-widest uppercase">Cargando datos...</p>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Admin Switcher View */}
          {vistaAdmin && !cajaSeleccionada && (
            <CajaSelector 
                cajas={cajasTodas} 
                cajaSeleccionada={cajaSeleccionada} 
                onSelect={(c) => setCajaSeleccionada(c)} 
            />
          )}

          {/* Individual Caja View (Mine or Selected) */}
          {(!vistaAdmin || cajaSeleccionada) && (
            <>
              {/* Back button for admin when viewing someone else's box */}
              {vistaAdmin && cajaSeleccionada && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setCajaSeleccionada(null)}
                    className="mb-2 -ml-2 text-muted-foreground hover:text-primary transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver al listado de cajas
                </Button>
              )}

              {/* Caja Status Header */}
              {!cajaActual && !vistaAdmin ? (
                <Card className="border-none shadow-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                      <Wallet className="h-32 w-32" />
                  </div>
                  <CardContent className="p-8 relative z-10">
                    <div className="max-w-md space-y-6">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-black tracking-tight">Caja Cerrada</h2>
                        <p className="text-primary-foreground/80 font-medium">
                          No tenés una caja abierta para este turno. Empezá abriendo una para registrar tus movimientos de hoy.
                        </p>
                      </div>
                      <Button 
                        onClick={() => setAbrirModal(true)} 
                        size="lg"
                        className="bg-white text-primary hover:bg-white/90 font-bold px-8 shadow-lg shadow-black/20"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Abrir Nueva Caja
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : cajaActual ? (
                <div className="space-y-8">
                  {/* Status Banner */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-muted/30 p-4 rounded-2xl border border-dashed border-border shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm border">
                            <ShieldCheck className="h-6 w-6 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Turno Actual</p>
                            <h3 className="font-bold flex items-center gap-2">
                                {cajaActual.user?.name ?? "Usuario"} 
                                {cajaActual.estado === "ABIERTA" ? (
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                ) : (
                                    <Badge variant="secondary" className="h-4 text-[9px]">CERRADA</Badge>
                                )}
                            </h3>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Apertura</p>
                            <p className="text-sm font-semibold">{new Date(cajaActual.fechaApertura).toLocaleString()}</p>
                        </div>
                        {esMiCaja && cajaActual.estado === "ABIERTA" && (
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => setCierreModal(true)}
                                className="font-bold uppercase tracking-wider text-[10px] px-4 shadow-md bg-red-600 hover:bg-red-700"
                            >
                                Cerrar Caja
                            </Button>
                        )}
                    </div>
                  </div>

                  {/* Main Stats */}
                  <BalanceCards ars={saldos.ars} usd={saldos.usd} />

                  {/* Transaction Entry Form */}
                  {esMiCaja && cajaActual.estado === "ABIERTA" && (
                    <TransactionForm 
                        cajaId={cajaActual.id} 
                        onSuccess={load} 
                        saving={saving} 
                    />
                  )}

                  {/* Transaction List */}
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

          {/* Monthly Closure Section */}
          <MonthlyClosure 
            cierreMensual={cierreMensual} 
            onLoad={loadCierreMensual} 
            loading={loadingCierre} 
          />
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={abrirModal} onOpenChange={setAbrirModal}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl">
          <DialogHeader className="space-y-3 pb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">Abrir Nueva Caja</DialogTitle>
            <DialogDescription className="font-medium">
              Ingresá el monto inicial con el que comenzás tu turno.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAbrir} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Monto ARS</Label>
                <CurrencyInput
                  value={montoInicial}
                  onChange={(v) => setMontoInicial(v ?? 0)}
                  placeholder="0.00"
                  className="bg-muted/50 border-none focus:ring-1 h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Monto USD</Label>
                <CurrencyInput
                  value={montoInicialUsd}
                  onChange={(v) => setMontoInicialUsd(v ?? 0)}
                  placeholder="0.00"
                  className="bg-muted/50 border-none focus:ring-1 h-12"
                />
              </div>
            </div>
            {error && <p className="text-sm font-bold text-red-500 bg-red-500/10 p-3 rounded-lg">{error}</p>}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setAbrirModal(false)} className="font-bold">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="font-black px-8 shadow-lg shadow-primary/20">
                {saving ? "Abriendo..." : "Abrir Caja"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={cierreModal} onOpenChange={setCierreModal}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl">
          <DialogHeader className="space-y-3 pb-4">
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">Cerrar Caja</DialogTitle>
            <DialogDescription className="font-medium">
              Al cerrar la caja ya no podrás registrar nuevos movimientos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-muted/50 p-6 rounded-2xl space-y-4">
             <div className="flex justify-between items-center group">
                 <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">Saldo Final ARS</span>
                 <span className="text-2xl font-black text-emerald-600 tabular-nums">{formatARS(saldos.ars)}</span>
             </div>
             {saldos.usd !== 0 && (
                 <div className="flex justify-between items-center group pt-4 border-t border-white/10">
                     <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">Saldo Final USD</span>
                     <span className="text-xl font-black text-blue-600 tabular-nums">{formatUSD(saldos.usd)}</span>
                 </div>
             )}
          </div>

          <div className="space-y-4 pt-4">
            {error && <p className="text-sm font-bold text-red-500 bg-red-500/10 p-3 rounded-lg">{error}</p>}
            <div className="flex flex-col gap-3">
              <Button variant="destructive" onClick={handleCerrar} disabled={saving} className="h-12 font-black shadow-lg shadow-red-500/20">
                {saving ? "Cerrando Turno..." : "Confirmar Cierre de Caja"}
              </Button>
              <Button variant="ghost" onClick={() => setCierreModal(false)} className="font-bold text-muted-foreground">
                Cancelar y Volver
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
