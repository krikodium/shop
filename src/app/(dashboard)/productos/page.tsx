"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
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

export default function ProductosPage() {
  const searchParams = useSearchParams();
  const proveedorIdFromUrl = searchParams.get("proveedorId");

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("__all__");
  const [filtroProveedor, setFiltroProveedor] = useState<string>(
    proveedorIdFromUrl ?? "__all__"
  );
  const [filtroConsignacion, setFiltroConsignacion] = useState<string>("__all__");
  const [filtroStock, setFiltroStock] = useState<string>("__all__");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [modalCarga, setModalCarga] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<{
    creados: number;
    errores: number;
    mensajesError: string[];
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

  const { run: handleCargaMasiva, loading: cargando } = useAsyncAction(async () => {
    if (!archivo) return;
    setResultado(null);
    try {
      const formData = new FormData();
      formData.append("file", archivo);
      const res = await fetch("/api/productos/carga-masiva", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setResultado({
        creados: data.creados ?? 0,
        errores: data.errores ?? 0,
        mensajesError: data.mensajesError ?? [],
      });
      setArchivo(null);
      if (data.creados > 0) {
        window.location.reload();
      }
    } catch (err) {
      setResultado({
        creados: 0,
        errores: 1,
        mensajesError: [err instanceof Error ? err.message : "Error al procesar"],
      });
    }
  });

  const limpiarFiltros = () => {
    setFiltroBusqueda("");
    setFiltroCategoria("__all__");
    setFiltroProveedor(proveedorIdFromUrl ?? "__all__");
    setFiltroConsignacion("__all__");
    setFiltroStock("__all__");
  };

  const queryParams = new URLSearchParams();
  if (filtroCategoria && filtroCategoria !== "__all__") queryParams.set("categoriaId", filtroCategoria);
  if (filtroProveedor && filtroProveedor !== "__all__") queryParams.set("proveedorId", filtroProveedor);
  if (filtroConsignacion && filtroConsignacion !== "__all__") queryParams.set("enConsignacion", filtroConsignacion);
  if (filtroStock && filtroStock !== "__all__") queryParams.set("stockBajo", filtroStock);
  if (filtroBusqueda) queryParams.set("q", filtroBusqueda);

  const hayFiltros =
    filtroBusqueda !== "" ||
    filtroCategoria !== "__all__" ||
    filtroProveedor !== (proveedorIdFromUrl ?? "__all__") ||
    filtroConsignacion !== "__all__" ||
    filtroStock !== "__all__";

  const filtros = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[12rem] flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="filtro-busqueda"
          placeholder="Buscar por nombre o SKU"
          aria-label="Buscar producto"
          value={filtroBusqueda}
          onChange={(e) => setFiltroBusqueda(e.target.value)}
          className="h-9 pl-9"
        />
      </div>

      <Label htmlFor="filtro-categoria" className="sr-only">
        Categoría
      </Label>
      <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
        <SelectTrigger id="filtro-categoria" className="h-9 w-full sm:w-44">
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
        <SelectTrigger id="filtro-proveedor" className="h-9 w-full sm:w-44">
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
        Tipo de producto
      </Label>
      <Select value={filtroConsignacion} onValueChange={setFiltroConsignacion}>
        <SelectTrigger id="filtro-tipo" className="h-9 w-full sm:w-36">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos los tipos</SelectItem>
          <SelectItem value="true">Consignación</SelectItem>
          <SelectItem value="false">Regular</SelectItem>
        </SelectContent>
      </Select>

      <Label htmlFor="filtro-stock" className="sr-only">
        Estado de stock
      </Label>
      <Select value={filtroStock} onValueChange={setFiltroStock}>
        <SelectTrigger id="filtro-stock" className="h-9 w-full sm:w-36">
          <SelectValue placeholder="Stock" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todo el stock</SelectItem>
          <SelectItem value="bajo">Stock bajo</SelectItem>
          <SelectItem value="sin">Sin stock</SelectItem>
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
  );

  return (
    <div className="space-y-6">
      <PageHeader
        overline="Mercadería"
        title="Productos"
        description="Catálogo e inventario"
      >
        <Dialog open={modalCarga} onOpenChange={setModalCarga}>
          <DialogTrigger asChild>
            <Button variant="outline">Carga masiva Excel</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
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
                    Columnas obligatorias: <strong className="text-foreground">SKU</strong> y{" "}
                    <strong className="text-foreground">Nombre</strong>.
                  </li>
                  <li>SKU debe ser único (no puede repetirse).</li>
                  <li>Precio venta es obligatorio y debe ser mayor a 0.</li>
                  <li>Categoría y Proveedor: usar el nombre exacto como está en el sistema.</li>
                  <li>Consignación: S, Si, Yes, 1 o True para sí; cualquier otro valor = no.</li>
                  <li>
                    <strong className="text-foreground">Porcentaje consignación (propio)</strong>: solo
                    si Consignación = S — porcentaje que se queda el negocio; el proveedor recibe el
                    resto. Vacío = usar el % por defecto del proveedor en ventas (si no hay, la lógica
                    del sistema).
                  </li>
                  <li>Imagen URL: URL completa de la imagen (ej: https://...). Dejar vacío si no tiene.</li>
                </ul>
              </section>

              <section className="space-y-2 border-t border-border pt-4">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Descargar modelo
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href="/api/productos/plantilla" download="plantilla-productos.xlsx">
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
                <p className="text-xs text-muted-foreground">
                  El modelo de prueba incluye 1 fila con URL de imagen y 1 sin imagen.
                </p>
              </section>

              <section className="space-y-3 border-t border-border pt-4">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Importar archivo
                </h3>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  aria-label="Archivo Excel"
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                />
                {resultado && (
                  <div className="space-y-1 text-sm" aria-live="polite">
                    <p>
                      <span className="font-mono font-semibold tabular-nums text-num-positive">
                        {resultado.creados}
                      </span>{" "}
                      productos creados
                    </p>
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
                <Button
                  onClick={() => void handleCargaMasiva()}
                  disabled={!archivo}
                  loading={cargando}
                  loadingText="Procesando…"
                >
                  Importar
                </Button>
              </section>
            </div>
          </DialogContent>
        </Dialog>
        <Button asChild>
          <Link href="/productos/nuevo">Nuevo producto</Link>
        </Button>
      </PageHeader>

      <ProductosTable
        queryParams={queryParams.toString()}
        onRefresh={() => window.location.reload()}
        filtros={filtros}
      />
    </div>
  );
}
