"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { RendicionParams, RendicionPreview } from "@/components/consignacion";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useAsyncAction } from "@/hooks/use-async-action";
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

  const calcularPreviewAccion = async () => {
    if (!proveedorId || !fechaDesde || !fechaHasta) {
      setError("Seleccioná proveedor y rango de fechas");
      return;
    }
    setError(null);
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
    }
  };

  const confirmarRendicionAccion = async () => {
    if (!proveedorId || !fechaDesde || !fechaHasta) return;
    setError(null);
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
    }
  };

  // Cada acción con su propio indicador; mientras una está en vuelo la otra
  // queda deshabilitada (antes compartían un único `isLoading`).
  const { run: calcularPreview, loading: calculando } = useAsyncAction(calcularPreviewAccion);
  const { run: confirmarRendicion, loading: confirmando } =
    useAsyncAction(confirmarRendicionAccion);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/consignacion/rendiciones">← Rendiciones</Link>
      </Button>

      <PageHeader
        overline="Mercadería · Consignación"
        title="Nueva rendición"
        description="Calculá lo vendido en el período y confirmá la liquidación al proveedor."
      />

      <RendicionParams
        proveedores={proveedores}
        proveedorId={proveedorId}
        setProveedorId={setProveedorId}
        fechaDesde={fechaDesde}
        setFechaDesde={setFechaDesde}
        fechaHasta={fechaHasta}
        setFechaHasta={setFechaHasta}
        onCalculate={() => void calcularPreview()}
        isLoading={calculando}
        ocupado={confirmando}
        bloqueado={restriccion ? !restriccion.permitido : false}
      />

      {loadingRestriccion && !restriccion && (
        <p role="status" className="text-sm text-muted-foreground">
          Verificando si el proveedor admite una rendición este mes…
        </p>
      )}

      {restriccion && !restriccion.permitido && (
        <div role="status" className="space-y-1 rounded-lg border border-border px-4 py-3">
          <p className="text-sm font-medium">Rendición no disponible</p>
          <p className="text-sm text-muted-foreground">{restriccion.motivo}</p>
          {restriccion.diasParaUltimaSemana > 0 && (
            <p className="text-xs text-muted-foreground">
              La deuda de consignación se sigue acumulando y se incluirá en la próxima rendición.
            </p>
          )}
        </div>
      )}

      {restriccion?.permitido && restriccion.rendicionExistenteEnMes && (
        <p role="status" className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
          Ya existe una rendición este mes (
          <span className="font-mono text-foreground">
            {restriccion.rendicionExistenteEnMes.numeroRendicion}
          </span>
          ). Estás en la última semana del mes, por lo que podés generar una rendición adicional.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-border px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {preview && (
        <RendicionPreview
          preview={preview}
          onConfirm={() => void confirmarRendicion()}
          isLoading={confirmando}
          ocupado={calculando}
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
