"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { RendicionParams, RendicionPreview } from "@/components/consignacion";
import { ArrowLeft, AlertTriangle, Lock, Calendar } from "lucide-react";
import type { Proveedor } from "@prisma/client";
import { parseCurrencyInput } from "@/lib/formatCurrency";

interface PreviewItem {
  ventaId: string;
  productoNombre: string;
  productoSku: string;
  cantidad: number;
  precioVenta: number;
  totalVenta: number;
  comisionShop: number | null;
  montoProveedor: number;
}

interface RestriccionMes {
  permitido: boolean;
  motivo: string | null;
  esUltimaSemana: boolean;
  diasParaUltimaSemana: number;
  rendicionExistenteEnMes: {
    id: string;
    numeroRendicion: string;
    fechaRendicion: string;
  } | null;
}

interface PreviewData {
  totalVendido: number;
  comisionShop: number;
  totalARendir: number;
  items: PreviewItem[];
  proveedorNombre: string;
  fechaDesde: string;
  fechaHasta: string;
  todasRendidas?: boolean;
  restriccionMes?: RestriccionMes;
}

function NuevaRendicionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const proveedorIdParam = searchParams.get("proveedorId");

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorId, setProveedorId] = useState<string>(proveedorIdParam ?? "");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monedaLiquidacion, setMonedaLiquidacion] = useState<"ARS" | "USD">("ARS");
  const [cotizacionUsd, setCotizacionUsd] = useState("");
  const [restriccion, setRestriccion] = useState<RestriccionMes | null>(null);
  const [loadingRestriccion, setLoadingRestriccion] = useState(false);

  useEffect(() => {
    fetch("/api/proveedores")
      .then((res) => res.json())
      .then((data) => {
        const provs = (Array.isArray(data) ? data : []).filter(
          (p: Proveedor) => p.tipoProveedor === "CONSIGNACION"
        );
        setProveedores(provs);
        if (proveedorIdParam && provs.some((p: Proveedor) => p.id === proveedorIdParam)) {
          setProveedorId(proveedorIdParam);
        } else if (provs.length > 0 && !proveedorId) {
          setProveedorId(provs[0].id);
        }
      });
  }, [proveedorIdParam]);

  useEffect(() => {
    const p = proveedores.find((x) => x.id === proveedorId);
    if (!p) return;
    setMonedaLiquidacion(p.liquidacionUsd ? "USD" : "ARS");
    setCotizacionUsd("");
  }, [proveedorId, proveedores]);

  // Fechas por defecto
  useEffect(() => {
    const toYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const hoy = new Date();
    const hoyStr = toYMD(hoy);

    if (!proveedorId) {
      const haceUnMes = new Date();
      haceUnMes.setMonth(haceUnMes.getMonth() - 1);
      setFechaDesde(toYMD(haceUnMes));
      setFechaHasta(hoyStr);
      return;
    }

    fetch(`/api/consignacion/rendiciones?proveedorId=${proveedorId}`)
      .then((r) => r.json())
      .then((rendiciones: Array<{ fechaHasta: string }>) => {
        const list = Array.isArray(rendiciones) ? rendiciones : [];
        const ultima = list.length > 0
          ? list.reduce((a, b) =>
              new Date(b.fechaHasta) > new Date(a.fechaHasta) ? b : a
            )
          : null;
        if (ultima?.fechaHasta) {
          const diaSiguiente = new Date(ultima.fechaHasta);
          diaSiguiente.setDate(diaSiguiente.getDate() + 1);
          setFechaDesde(toYMD(diaSiguiente));
          setFechaHasta(hoyStr);
        } else {
          const haceUnMes = new Date();
          haceUnMes.setMonth(haceUnMes.getMonth() - 1);
          setFechaDesde(toYMD(haceUnMes));
          setFechaHasta(hoyStr);
        }
      })
      .catch(() => {
        const haceUnMes = new Date();
        haceUnMes.setMonth(haceUnMes.getMonth() - 1);
        setFechaDesde(toYMD(haceUnMes));
        setFechaHasta(hoyStr);
      });
  }, [proveedorId]);

  useEffect(() => {
    if (!proveedorId) {
      setRestriccion(null);
      return;
    }
    setLoadingRestriccion(true);
    fetch("/api/consignacion/deudas")
      .then((r) => r.json())
      .then((deudas: Array<{ proveedorId: string; restriccionRendicion: RestriccionMes }>) => {
        const match = (Array.isArray(deudas) ? deudas : []).find(
          (d) => d.proveedorId === proveedorId
        );
        setRestriccion(match?.restriccionRendicion ?? null);
      })
      .catch(() => setRestriccion(null))
      .finally(() => setLoadingRestriccion(false));
  }, [proveedorId]);

  const calcularPreview = async () => {
    if (!proveedorId || !fechaDesde || !fechaHasta) {
      setError("Seleccioná proveedor y rango de fechas");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/consignacion/rendiciones/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proveedorId,
          fechaDesde,
          fechaHasta,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al calcular");
      }
      const data = await res.json();
      setPreview(data);
      if (data.restriccionMes) setRestriccion(data.restriccionMes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmarRendicion = async () => {
    if (!proveedorId || !fechaDesde || !fechaHasta) return;
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/consignacion/rendiciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proveedorId,
          fechaDesde,
          fechaHasta,
          monedaLiquidacion,
          cotizacionUsd:
            monedaLiquidacion === "USD" ? parseCurrencyInput(cotizacionUsd) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al crear");
      }
      const rendicion = await res.json();
      router.push(`/consignacion/rendiciones/${rendicion.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
            <Link href="/consignacion" className="group flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-2">
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-wider">Volver al Dashboard</span>
            </Link>
            <h1 className="text-3xl font-black tracking-tighter sm:text-4xl text-foreground">
                Nueva Rendición
            </h1>
        </div>
      </div>

      <RendicionParams 
        proveedores={proveedores}
        proveedorId={proveedorId}
        setProveedorId={setProveedorId}
        fechaDesde={fechaDesde}
        setFechaDesde={setFechaDesde}
        fechaHasta={fechaHasta}
        setFechaHasta={setFechaHasta}
        onCalculate={calcularPreview}
        isLoading={isLoading}
        bloqueado={restriccion ? !restriccion.permitido : false}
      />

      {restriccion && !restriccion.permitido && (
        <div className="rounded-lg bg-amber-500/10 p-5 border border-amber-500/20 space-y-2">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Lock className="h-4 w-4 shrink-0" />
                Rendición no disponible
            </p>
            <p className="text-sm text-amber-700/80 dark:text-amber-400/80">
                {restriccion.motivo}
            </p>
            {restriccion.diasParaUltimaSemana > 0 && (
              <p className="text-xs text-amber-600/60 dark:text-amber-500/60 flex items-center gap-1.5 mt-1">
                <Calendar className="h-3 w-3" />
                La deuda de consignación se sigue acumulando y se incluirá en la próxima rendición.
              </p>
            )}
        </div>
      )}

      {restriccion?.permitido && restriccion.rendicionExistenteEnMes && (
        <div className="rounded-lg bg-blue-500/10 p-4 border border-blue-500/20">
            <p className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0" />
                Ya existe una rendición este mes ({restriccion.rendicionExistenteEnMes.numeroRendicion}). 
                Estás en la última semana del mes, por lo que podés generar una rendición adicional.
            </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 p-4 border border-red-500/20">
            <p className="text-sm font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {error}
            </p>
        </div>
      )}

      {preview && (
        <RendicionPreview
          preview={preview}
          onConfirm={confirmarRendicion}
          isLoading={isLoading}
          monedaLiquidacion={monedaLiquidacion}
          onMonedaLiquidacionChange={setMonedaLiquidacion}
          cotizacionUsd={cotizacionUsd}
          onCotizacionUsdChange={setCotizacionUsd}
        />
      )}
    </div>
  );
}

export default function NuevaRendicionPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
      <NuevaRendicionContent />
    </Suspense>
  );
}
