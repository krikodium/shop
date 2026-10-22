"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { useAsyncAction } from "@/hooks/use-async-action";
import { ProductosTable } from "./ProductosTable";
import type { Categoria, Proveedor } from "@prisma/client";

const claseFiltro =
  "h-9 w-[calc(50%-0.25rem)] min-w-0 flex-1 sm:w-44 sm:flex-none";
const claseFiltroCorto =
  "h-9 w-[calc(50%-0.25rem)] min-w-0 flex-1 sm:w-36 sm:flex-none";

export default function ProductosPage() {
  const searchParams = useSearchParams();
  const proveedorIdFromUrl = searchParams.get("proveedorId");

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("__all__");
  const [filtroProveedor, setFiltroProveedor] = useState<string>(
    proveedorIdFromUrl ?? "__all__",
  );
  const [filtroConsignacion, setFiltroConsignacion] =
    useState<string>("__all__");
  const [filtroDisponibilidad, setFiltroDisponibilidad] = useState<
    "ALL" | "CON_STOCK" | "SIN_STOCK" | "BAJO"
  >("ALL");
  const [filtroMoneda, setFiltroMoneda] = useState<"ALL" | "ARS" | "USD">(
    "ALL",
  );
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [incluirInactivos, setIncluirInactivos] = useState(true);
  const [modalCarga, setModalCarga] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<{
    creados: number;
    errores: number;
    mensajesError: string[];
    validos?: number;
    modo?: string;
    nuevasCategorias?: string[];
    nuevosProveedores?: string[];
    vistaPrevia?: {
      sku: string;
      nombre: string;
      precioVenta: string;
      stockActual: number;
    }[];
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/categorias").then((r) => r.json()),
      fetch("/api/proveedores").then((r) => r.json()),
    ]).then(([cats, provs]) => {
      setCategorias(Array.isArray(cats) ? cats : []);
      setProveedores(Array.isArray(provs) ? provs : []);
    });
  }, []);

  useEffect(() => {
    if (proveedorIdFromUrl) setFiltroProveedor(proveedorIdFromUrl);
  }, [proveedorIdFromUrl]);

  const { run: handleCargaMasiva, loading: cargando } = useAsyncAction(
    async (modo: "preview" | "importar") => {
      if (!archivo) return;
      setResultado(null);
      try {
        const formData = new FormData();
        formData.append("file", archivo);
        formData.append("modo", modo);
        const res = await fetch("/api/productos/carga-masiva", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok && !data.mensajesError)
          throw new Error(data.error ?? "Error");
        setResultado({
          creados: data.creados ?? 0,
          errores: data.errores ?? 0,
          mensajesError: data.mensajesError ?? [],
          validos: data.validos,
          modo: data.modo,
          nuevasCategorias: data.nuevasCategorias,
          nuevosProveedores: data.nuevosProveedores,
          vistaPrevia: data.vistaPrevia,
        });
        if (data.creados > 0) {
          window.location.reload();
        }
      } catch (err) {
        setResultado({
          creados: 0,
          errores: 1,
          mensajesError: [
            err instanceof Error ? err.message : "Error al procesar",
          ],
        });
      }
    },
  );

  const limpiarFiltros = () => {
    setFiltroBusqueda("");
    setIncluirInactivos(true);
    setFiltroCategoria("__all__");
    setFiltroProveedor(proveedorIdFromUrl ?? "__all__");
    setFiltroConsignacion("__all__");
    setFiltroDisponibilidad("ALL");
    setFiltroMoneda("ALL");
  };

  const queryParams = new URLSearchParams();
  if (filtroCategoria && filtroCategoria !== "__all__")
    queryParams.set("categoriaId", filtroCategoria);
  if (filtroProveedor && filtroProveedor !== "__all__")
    queryParams.set("proveedorId", filtroProveedor);
  if (filtroConsignacion && filtroConsignacion !== "__all__")
    queryParams.set("enConsignacion", filtroConsignacion);
  if (filtroBusqueda) queryParams.set("q", filtroBusqueda);
  if (incluirInactivos) queryParams.set("activo", "false");

  const hayFiltros =
    !incluirInactivos ||
    filtroBusqueda !== "" ||
    filtroCategoria !== "__all__" ||
    filtroProveedor !== (proveedorIdFromUrl ?? "__all__") ||
    filtroConsignacion !== "__all__" ||
    filtroDisponibilidad !== "ALL" ||
    filtroMoneda !== "ALL";

  const filtros = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative basis-full sm:min-w-[14rem] sm:flex-1 sm:basis-auto">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="filtro-busqueda"
            placeholder="Buscar por nombre o SKU…"
            aria-label="Buscar producto"
            value={filtroBusqueda}
            onChange={(e) => setFiltroBusqueda(e.target.value)}
            className="h-9 w-full pl-9"
          />
        </div>

        <Label htmlFor="filtro-categoria" className="sr-only">
          Categoría
        </Label>
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger id="filtro-categoria" className={claseFiltro}>
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas las categorías</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Label htmlFor="filtro-proveedor" className="sr-only">
          Proveedor
        </Label>
        <Select value={filtroProveedor} onValueChange={setFiltroProveedor}>
          <SelectTrigger id="filtro-proveedor" className={claseFiltro}>
            <SelectValue placeholder="Proveedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos los proveedores</SelectItem>
            {proveedores.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Label htmlFor="filtro-tipo" className="sr-only">
          Régimen
        </Label>
        <Select
          value={filtroConsignacion}
          onValueChange={setFiltroConsignacion}
        >
          <SelectTrigger id="filtro-tipo" className={claseFiltroCorto}>
            <SelectValue placeholder="Régimen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos los regímenes</SelectItem>
            <SelectItem value="false">Propios</SelectItem>
            <SelectItem value="true">Consignación</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={limpiarFiltros}
          disabled={!hayFiltros}
          className="text-muted-foreground"
        >
          Limpiar
        </Button>
      </div>

      {/* Segunda fila de filtros rápidos: Disponibilidad y Moneda */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-muted-foreground">
            Disponibilidad:
          </span>
          {(
            [
              { id: "ALL", label: "Todos" },
              { id: "CON_STOCK", label: "Con stock en salón" },
              { id: "SIN_STOCK", label: "Sin stock / encargo" },
              { id: "BAJO", label: "Alerta reposición" },
            ] as const
          ).map((op) => (
            <Button
              key={op.id}
              type="button"
              size="xs"
              variant={filtroDisponibilidad === op.id ? "default" : "outline"}
              onClick={() => setFiltroDisponibilidad(op.id)}
            >
              {op.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              Moneda:
            </span>
            {(
              [
                { id: "ALL", label: "Todas" },
                { id: "ARS", label: "ARS" },
                { id: "USD", label: "USD" },
              ] as const
            ).map((m) => (
              <Button
                key={m.id}
                type="button"
                size="xs"
                variant={filtroMoneda === m.id ? "default" : "outline"}
                onClick={() => setFiltroMoneda(m.id)}
              >
                {m.label}
              </Button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={incluirInactivos}
              onChange={(event) => setIncluirInactivos(event.target.checked)}
            />
            Incluir dados de baja
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        overline="Mercadería · Catálogo"
        title="Productos"
        description="Gestión de catálogo, precios en ARS y USD, stock en salón y artículos por encargo."
      >
        <Dialog open={modalCarga} onOpenChange={setModalCarga}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Upload className="size-4" />
              Carga masiva Excel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Carga masiva desde Excel</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              <section className="space-y-2 text-sm">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Instrucciones
                </h3>
                <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                  <li>La primera fila debe contener los encabezados exactos.</li>
                  <li>
                    Columnas obligatorias:{" "}
                    <strong className="text-foreground">SKU</strong> y{" "}
                    <strong className="text-foreground">Nombre</strong>.
                  </li>
                  <li>SKU debe ser único (no puede repetirse).</li>
                  <li>Precio venta es obligatorio y debe ser mayor a 0.</li>
                  <li>
                    Las categorías y proveedores nuevos se crearán al confirmar
                    la importación.
                  </li>
                  <li>
                    Consignación: S o N. Si el proveedor no tiene comisión por
                    defecto, indicá el porcentaje propio.
                  </li>
                  <li>
                    Primero validá el archivo. La importación es completa: si
                    una fila tiene errores, no se carga ninguna.
                  </li>
                </ul>
              </section>

              <section className="space-y-2 border-t border-border pt-4">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Descargar modelo
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a
                      href="/api/productos/plantilla"
                      download="plantilla-productos.xlsx"
                    >
                      Plantilla vacía
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a
                      href="/api/productos/plantilla?modelo=prueba"
                      download="modelo-prueba-productos.xlsx"
                    >
                      Modelo de prueba (2 ejemplos)
                    </a>
                  </Button>
                </div>
              </section>

              <section className="space-y-3 border-t border-border pt-4">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Importar archivo
                </h3>
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  aria-label="Archivo Excel"
                  onChange={(e) => {
                    setArchivo(e.target.files?.[0] ?? null);
                    setResultado(null);
                  }}
                />
                {resultado && (
                  <div className="space-y-1 text-sm" aria-live="polite">
                    <p>
                      <span className="font-mono font-semibold tabular-nums text-num-positive">
                        {resultado.creados}
                      </span>{" "}
                      productos creados
                    </p>
                    {resultado.modo === "preview" && (
                      <p>
                        {resultado.validos} productos válidos. Revisá antes de
                        confirmar.
                      </p>
                    )}
                    {!!resultado.nuevasCategorias?.length && (
                      <p>
                        Categorías nuevas:{" "}
                        {resultado.nuevasCategorias.join(", ")}
                      </p>
                    )}
                    {!!resultado.nuevosProveedores?.length && (
                      <p>
                        Proveedores nuevos:{" "}
                        {resultado.nuevosProveedores.join(", ")}
                      </p>
                    )}
                    {!!resultado.vistaPrevia?.length && (
                      <ul className="max-h-40 overflow-auto text-xs">
                        {resultado.vistaPrevia.map((p) => (
                          <li key={p.sku}>
                            {p.sku} · {p.nombre} · ARS {p.precioVenta} · stock{" "}
                            {p.stockActual}
                          </li>
                        ))}
                      </ul>
                    )}
                    {resultado.errores > 0 && (
                      <p>
                        <span className="font-mono font-semibold tabular-nums text-num-negative">
                          {resultado.errores}
                        </span>{" "}
                        errores
                      </p>
                    )}
                    {resultado.mensajesError.length > 0 && (
                      <ul className="mt-2 max-h-32 space-y-0.5 overflow-auto font-mono text-xs text-muted-foreground">
                        {resultado.mensajesError.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void handleCargaMasiva("preview")}
                    disabled={!archivo}
                    loading={cargando}
                    loadingText="Procesando…"
                  >
                    Validar y revisar
                  </Button>
                  <Button
                    onClick={() => void handleCargaMasiva("importar")}
                    disabled={
                      !archivo ||
                      resultado?.modo !== "preview" ||
                      resultado.errores > 0 ||
                      !resultado.validos ||
                      cargando
                    }
                  >
                    Confirmar importación
                  </Button>
                </div>
              </section>
            </div>
          </DialogContent>
        </Dialog>
        <Button asChild>
          <Link href="/productos/nuevo">
            <Plus className="size-4" />
            Nuevo producto
          </Link>
        </Button>
      </PageHeader>

      <ProductosTable
        queryParams={queryParams.toString()}
        monedaFiltro={filtroMoneda}
        disponibilidadFiltro={filtroDisponibilidad}
        onRefresh={() => window.location.reload()}
        filtros={filtros}
      />
    </div>
  );
}
