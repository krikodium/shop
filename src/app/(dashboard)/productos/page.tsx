"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [cargando, setCargando] = useState(false);
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

  const handleCargaMasiva = async () => {
    if (!archivo) return;
    setCargando(true);
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
    } finally {
      setCargando(false);
    }
  };

  const queryParams = new URLSearchParams();
  if (filtroCategoria && filtroCategoria !== "__all__") queryParams.set("categoriaId", filtroCategoria);
  if (filtroProveedor && filtroProveedor !== "__all__") queryParams.set("proveedorId", filtroProveedor);
  if (filtroConsignacion && filtroConsignacion !== "__all__") queryParams.set("enConsignacion", filtroConsignacion);
  if (filtroStock && filtroStock !== "__all__") queryParams.set("stockBajo", filtroStock);
  if (filtroBusqueda) queryParams.set("q", filtroBusqueda);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Productos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Catálogo e inventario</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={modalCarga} onOpenChange={setModalCarga}>
            <DialogTrigger asChild>
              <Button variant="outline">Carga masiva Excel</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Carga masiva desde Excel</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 pt-4">
                {/* Instrucciones */}
                <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-4">
                  <p className="font-medium">Instrucciones</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>La primera fila debe contener los encabezados exactos.</li>
                    <li>Columnas obligatorias: <strong>SKU</strong> y <strong>Nombre</strong>.</li>
                    <li>SKU debe ser único (no puede repetirse).</li>
                    <li>Precio venta es obligatorio y debe ser mayor a 0.</li>
                    <li>Categoría y Proveedor: usar el nombre exacto como está en el sistema.</li>
                    <li>Consignación: S, Si, Yes, 1 o True para sí; cualquier otro valor = no.</li>
                    <li>
                      <strong>Porcentaje consignación (propio)</strong>: solo si Consignación = S — porcentaje
                      que se queda el negocio; el proveedor recibe el resto. Vacío = usar el % por defecto
                      del proveedor en ventas (si no hay, la lógica del sistema).
                    </li>
                    <li>Imagen URL: URL completa de la imagen (ej: https://...). Dejar vacío si no tiene.</li>
                  </ul>
                </div>

                {/* Descargas */}
                <div className="flex flex-col gap-3">
                  <p className="font-medium text-sm">Descargar modelo</p>
                  <div className="flex gap-2 flex-wrap">
                    <a
                      href="/api/productos/plantilla"
                      download="plantilla-productos.xlsx"
                    >
                      <Button variant="outline" size="sm" type="button">
                        Plantilla vacía
                      </Button>
                    </a>
                    <a
                      href="/api/productos/plantilla?modelo=prueba"
                      download="modelo-prueba-productos.xlsx"
                    >
                      <Button variant="outline" size="sm" type="button">
                        Modelo de prueba (2 ejemplos)
                      </Button>
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El modelo de prueba incluye 1 fila con URL de imagen y 1 sin imagen.
                  </p>
                </div>

                {/* Importar */}
                <div className="space-y-3 pt-4 border-t">
                  <p className="font-medium text-sm">Importar archivo</p>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                  />
                {resultado && (
                  <div className="rounded border p-3 text-sm">
                    <p className="font-medium text-green-600">
                      {resultado.creados} productos creados
                    </p>
                    {resultado.errores > 0 && (
                      <p className="text-destructive">
                        {resultado.errores} errores
                      </p>
                    )}
                    {resultado.mensajesError.length > 0 && (
                      <ul className="mt-2 max-h-32 overflow-auto text-muted-foreground">
                        {resultado.mensajesError.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <Button
                  onClick={handleCargaMasiva}
                  disabled={!archivo || cargando}
                >
                  {cargando ? "Procesando…" : "Importar"}
                </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Link href="/productos/nuevo">
            <Button>Nuevo producto</Button>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nombre o SKU..."
          value={filtroBusqueda}
          onChange={(e) => setFiltroBusqueda(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroProveedor} onValueChange={setFiltroProveedor}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Proveedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {proveedores.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroConsignacion} onValueChange={setFiltroConsignacion}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            <SelectItem value="true">Consignación</SelectItem>
            <SelectItem value="false">Regular</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroStock} onValueChange={setFiltroStock}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            <SelectItem value="bajo">Stock bajo</SelectItem>
            <SelectItem value="sin">Sin stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ProductosTable
        queryParams={queryParams.toString()}
        onRefresh={() => window.location.reload()}
      />
    </div>
  );
}
