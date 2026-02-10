"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight } from "lucide-react";

const formatMoney = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

interface Movimiento {
  id: string;
  tipo: string;
  monto: number;
  concepto: string | null;
  fecha: string;
}

interface CajaChica {
  id: string;
  fechaApertura: string;
  fechaCierre: string | null;
  montoInicial: number;
  estado: string;
  movimientos: Movimiento[];
}

export default function CajaChicaPage() {
  const [cajas, setCajas] = useState<CajaChica[]>([]);
  const [cajaActual, setCajaActual] = useState<CajaChica | null>(null);
  const [loading, setLoading] = useState(true);
  const [abrirModal, setAbrirModal] = useState(false);
  const [cierreModal, setCierreModal] = useState(false);
  const [montoInicial, setMontoInicial] = useState("");
  const [movTipo, setMovTipo] = useState<"INGRESO" | "EGRESO">("EGRESO");
  const [movMonto, setMovMonto] = useState("");
  const [movConcepto, setMovConcepto] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mes, setMes] = useState(() =>
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [ano, setAno] = useState(() => String(new Date().getFullYear()));
  const [cierreMensual, setCierreMensual] = useState<{
    cajas: Array<{
      id: string;
      user: string;
      fechaApertura: string;
      fechaCierre: string;
      montoInicial: number;
      totalIngresos: number;
      totalEgresos: number;
      saldoFinal: number;
    }>;
    totales: {
      montoInicial: number;
      totalIngresos: number;
      totalEgresos: number;
      saldoFinal: number;
    };
  } | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/caja-chica")
      .then((res) => res.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        setCajas(lista);
        const abierta = lista.find((c: CajaChica) => c.estado === "ABIERTA");
        setCajaActual(abierta ?? null);
      })
      .catch(() => setCajas([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const loadCierreMensual = () => {
    fetch(`/api/caja-chica/cierre-mensual?mes=${mes}&ano=${ano}`)
      .then((res) => res.json())
      .then(setCierreMensual)
      .catch(() => setCierreMensual(null));
  };

  const handleAbrir = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/caja-chica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "abrir",
          montoInicial: Number(montoInicial) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setAbrirModal(false);
      setMontoInicial("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cajaActual) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/caja-chica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "movimiento",
          cajaId: cajaActual.id,
          tipo: movTipo,
          monto: Number(movMonto),
          concepto: movConcepto || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setMovMonto("");
      setMovConcepto("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleCerrar = async () => {
    if (!cajaActual) return;
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
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const calcularSaldo = () => {
    if (!cajaActual) return 0;
    const init = Number(cajaActual.montoInicial);
    const ingresos = cajaActual.movimientos
      .filter((m) => m.tipo === "INGRESO")
      .reduce((s, m) => s + Number(m.monto), 0);
    const egresos = cajaActual.movimientos
      .filter((m) => m.tipo === "EGRESO")
      .reduce((s, m) => s + Number(m.monto), 0);
    return init + ingresos - egresos;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Caja chica</h1>
        <p className="text-muted-foreground">
          Gestioná ingresos y egresos de tu caja
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : !cajaActual ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              No tenés caja abierta
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Abrí una caja para registrar movimientos
            </p>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setAbrirModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Abrir caja
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Caja abierta
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Abierta desde{" "}
                  {new Date(cajaActual.fechaApertura).toLocaleString("es-AR")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  {formatMoney(calcularSaldo())}
                </p>
                <p className="text-xs text-muted-foreground">Saldo actual</p>
              </div>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMovTipo("INGRESO")}
                className="gap-1"
              >
                <ArrowDownLeft className="h-4 w-4" />
                Ingreso
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMovTipo("EGRESO")}
                className="gap-1"
              >
                <ArrowUpRight className="h-4 w-4" />
                Egreso
              </Button>
              <Button
                variant="destructive"
                onClick={() => setCierreModal(true)}
              >
                Cerrar caja
              </Button>
            </CardContent>
          </Card>

          {/* Formulario de gastos e ingresos */}
          <Card>
            <CardHeader>
              <CardTitle>Registrar movimiento</CardTitle>
              <p className="text-sm text-muted-foreground">
                Gastos, ingresos, aportes, etc.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMovimiento} className="space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex gap-2">
                    <Label className="sr-only">Tipo</Label>
                    <Button
                      type="button"
                      variant={movTipo === "INGRESO" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMovTipo("INGRESO")}
                      className="gap-1"
                    >
                      <ArrowDownLeft className="h-4 w-4" />
                      Ingreso
                    </Button>
                    <Button
                      type="button"
                      variant={movTipo === "EGRESO" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMovTipo("EGRESO")}
                      className="gap-1"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      Egreso
                    </Button>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="concepto-mov">Concepto rápido</Label>
                    <Select
                      onValueChange={(v) => setMovConcepto(v)}
                    >
                      <SelectTrigger id="concepto-mov" className="mt-1">
                        <SelectValue placeholder="Elegir o escribir abajo" />
                      </SelectTrigger>
                      <SelectContent>
                        {movTipo === "EGRESO" ? (
                          <>
                            <SelectItem value="Gasto - Delivery">Gasto - Delivery</SelectItem>
                            <SelectItem value="Gasto - Compras">Gasto - Compras</SelectItem>
                            <SelectItem value="Gasto - Flete">Gasto - Flete</SelectItem>
                            <SelectItem value="Gasto - Viáticos">Gasto - Viáticos</SelectItem>
                            <SelectItem value="Gasto - Otros">Gasto - Otros</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="Aporte a caja">Aporte a caja</SelectItem>
                            <SelectItem value="Ingreso - Venta">Ingreso - Venta</SelectItem>
                            <SelectItem value="Ingreso - Sobrante">Ingreso - Sobrante</SelectItem>
                            <SelectItem value="Ingreso - Otros">Ingreso - Otros</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="concepto-text">Concepto (o escribir libre)</Label>
                    <Input
                      id="concepto-text"
                      value={movConcepto}
                      onChange={(e) => setMovConcepto(e.target.value)}
                      placeholder={
                        movTipo === "EGRESO"
                          ? "Ej: pago delivery, compras..."
                          : "Ej: aporte, venta..."
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="w-32">
                    <Label htmlFor="monto-mov">Monto</Label>
                    <Input
                      id="monto-mov"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={movMonto}
                      onChange={(e) => setMovMonto(e.target.value)}
                      placeholder="0"
                      required
                      className="mt-1"
                    />
                  </div>
                  <Button type="submit" disabled={saving} className="gap-1">
                    {saving ? "Guardando…" : "Registrar"}
                  </Button>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cajaActual.movimientos.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        {new Date(m.fecha).toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            m.tipo === "INGRESO" ? "default" : "secondary"
                          }
                        >
                          {m.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>{m.concepto ?? "—"}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          m.tipo === "INGRESO" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {m.tipo === "INGRESO" ? "+" : "-"}
                        {formatMoney(Number(m.monto))}
                      </TableCell>
                    </TableRow>
                  ))}
                  {cajaActual.movimientos.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        Sin movimientos
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Cierre mensual */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cierre mensual</CardTitle>
          <div className="flex gap-2">
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => ({
                  value: String(i + 1).padStart(2, "0"),
                  label: new Date(2000, i, 1).toLocaleString("es-AR", {
                    month: "long",
                  }),
                })).map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(
                  (a) => (
                    <SelectItem key={a} value={String(a)}>
                      {a}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadCierreMensual}>
              Ver
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cierreMensual ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total ingresos
                  </p>
                  <p className="font-semibold text-green-600">
                    {formatMoney(cierreMensual.totales.totalIngresos)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total egresos
                  </p>
                  <p className="font-semibold text-red-600">
                    {formatMoney(cierreMensual.totales.totalEgresos)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo final</p>
                  <p className="font-bold">
                    {formatMoney(cierreMensual.totales.saldoFinal)}
                  </p>
                </div>
              </div>
              {cierreMensual.cajas.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Cierre</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cierreMensual.cajas.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.user}</TableCell>
                        <TableCell>
                          {new Date(c.fechaCierre).toLocaleDateString("es-AR")}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMoney(c.saldoFinal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {cierreMensual.cajas.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay cajas cerradas en este período
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Hacé clic en "Ver" para cargar el cierre mensual
            </p>
          )}
        </CardContent>
      </Card>

      {/* Modal abrir */}
      <Dialog open={abrirModal} onOpenChange={setAbrirModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir caja</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAbrir} className="space-y-4">
            <div>
              <Label>Monto inicial</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={montoInicial}
                onChange={(e) => setMontoInicial(e.target.value)}
                placeholder="0"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAbrirModal(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Abriendo…" : "Abrir"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal cerrar */}
      <Dialog open={cierreModal} onOpenChange={setCierreModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar caja</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Se cerrará la caja con saldo actual:{" "}
              <strong>{formatMoney(calcularSaldo())}</strong>
            </p>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCierreModal(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleCerrar} disabled={saving}>
              {saving ? "Cerrando…" : "Cerrar caja"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
