"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";

const formatMoney = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

const DIAS = [
  { letra: "L", num: 1 },
  { letra: "M", num: 2 },
  { letra: "X", num: 3 },
  { letra: "J", num: 4 },
  { letra: "V", num: 5 },
  { letra: "S", num: 6 },
  { letra: "D", num: 7 },
] as const;

interface VendedorStats {
  id: string;
  name: string | null;
  email: string;
  horarioEntrada: string | null;
  horarioSalida: string | null;
  diasTrabajo: string | null;
  diasTrabajados: number;
  cantidadVentas: number;
  totalVentas: number;
}

interface ApiResponse {
  fechaDesde: string;
  fechaHasta: string;
  vendedores: VendedorStats[];
}

function parseDiasTrabajo(s: string | null): Set<number> {
  if (!s?.trim()) return new Set();
  return new Set(s.split(",").map((n) => parseInt(n.trim(), 10)).filter((n) => n >= 1 && n <= 7));
}

function serializeDiasTrabajo(set: Set<number>): string {
  return [...set].sort((a, b) => a - b).join(",");
}

function DiasTrabajoEditable({
  diasTrabajo,
  onSave,
}: {
  diasTrabajo: string | null;
  onSave: (dias: string) => Promise<void>;
}) {
  const [dias, setDias] = useState(() => parseDiasTrabajo(diasTrabajo));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDias(parseDiasTrabajo(diasTrabajo));
  }, [diasTrabajo]);

  const toggle = async (num: number) => {
    const nuevo = new Set(dias);
    if (nuevo.has(num)) {
      nuevo.delete(num);
    } else {
      nuevo.add(num);
    }
    setDias(nuevo);
    setSaving(true);
    try {
      await onSave(serializeDiasTrabajo(nuevo));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {DIAS.map(({ letra, num }) => {
        const trabaja = dias.has(num);
        return (
          <button
            key={num}
            type="button"
            onClick={() => toggle(num)}
            disabled={saving}
            className={`w-8 h-8 rounded font-semibold text-sm transition-colors ${
              trabaja
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-red-500/80 text-white hover:bg-red-600/80"
            } ${saving ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
            title={trabaja ? "Trabaja - Clic para quitar" : "No trabaja - Clic para agregar"}
          >
            {letra}
          </button>
        );
      })}
    </div>
  );
}

export default function EstadisticasVendedoresPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return String(d.getMonth() + 1).padStart(2, "0");
  });
  const [ano, setAno] = useState(() => String(new Date().getFullYear()));

  const refresh = useCallback(() => {
    setLoading(true);
    fetch(`/api/estadisticas-vendedores?mes=${mes}&ano=${ano}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [mes, ano]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSaveDias = async (userId: string, dias: string) => {
    const res = await fetch(`/api/usuarios/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diasTrabajo: dias || null }),
    });
    if (!res.ok) throw new Error("Error al guardar");
    refresh();
  };

  const meses = [
    { value: "01", label: "Enero" },
    { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" },
    { value: "06", label: "Junio" },
    { value: "07", label: "Julio" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ];

  const anios = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estadísticas de vendedores</h1>
          <p className="text-muted-foreground">
            Días de trabajo, horarios y ventas por período
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {meses.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {anios.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : !data ? (
        <p className="text-destructive">No tenés permiso para ver esta página.</p>
      ) : !data.vendedores || data.vendedores.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay vendedores registrados
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(data.vendedores ?? []).map((v) => (
            <Card key={v.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center gap-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5" />
                    {v.name ?? v.email}
                  </CardTitle>
                  <DiasTrabajoEditable
                    diasTrabajo={v.diasTrabajo}
                    onSave={(dias) => handleSaveDias(v.id, dias)}
                  />
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                  <span>Horario: {v.horarioEntrada ?? "—"} - {v.horarioSalida ?? "—"}</span>
                  <span>Días trabajados (mes): {v.diasTrabajados}</span>
                  <span>Ventas: {v.cantidadVentas}</span>
                  <span className="font-semibold text-foreground">
                    Total: {formatMoney(v.totalVentas)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  L M X J V S D = Lunes a Domingo. Verde = trabaja, rojo = no trabaja. Clic para editar.
                </p>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
