"use client";

import type { Resolver } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useState, type DragEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Figure, FigureGrid } from "@/components/ui/figure";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { useAsyncAction } from "@/hooks/use-async-action";
import { notificar } from "@/lib/notificar";
import { formatARS } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";
import {
  calcularMargen,
  generarSku,
  normalizarSku,
} from "@/components/productos/producto-form-utils";
import type { ProductoFormValues } from "@/lib/validaciones/productoSchema";
import { productoSchema } from "@/lib/validaciones/productoSchema";
import type {
  Producto,
  Categoria,
  Proveedor,
  ProductoParteProveedor,
} from "@prisma/client";
import { ImageOff, Plus, Trash2, Wand2 } from "lucide-react";

interface ProductoFormProps {
  defaultValues?: ProductoFormValues;
  categorias: Categoria[];
  proveedores: Proveedor[];
  onSubmit: (data: ProductoFormValues) => Promise<void>;
  isLoading?: boolean;
  /** Barra y texto de progreso durante el alta (controlado por la página). */
  submitStatus?: { progress: number; message: string } | null;
  /** Texto del botón de envío (ej. "Crear producto" en alta, "Guardar" en edición). */
  submitActionLabel?: string;
}

const defaultEmpty: ProductoFormValues = {
  sku: "",
  nombre: "",
  descripcion: "",
  categoriaId: null,
  precioCompra: null,
  precioVenta: 0,
  enConsignacion: false,
  comisionConsignacion: null,
  stockActual: 0,
  stockMinimo: 5,
  proveedorId: null,
  imagenUrl: "",
  activo: true,
  partesProveedor: [],
};

/** Convierte producto (API/Prisma) a valores del formulario */
export function productoToFormValues(
  p: Producto & {
    categoria?: Categoria | null;
    proveedor?: Proveedor | null;
    partesProveedor?: ProductoParteProveedor[];
  }
): ProductoFormValues {
  return {
    sku: p.sku,
    nombre: p.nombre,
    descripcion: p.descripcion ?? "",
    categoriaId: p.categoriaId ?? null,
    precioCompra: p.precioCompra != null ? Number(p.precioCompra) : null,
    precioVenta: Number(p.precioVenta),
    enConsignacion: p.enConsignacion,
    comisionConsignacion:
      p.comisionConsignacion != null ? Number(p.comisionConsignacion) : null,
    stockActual: p.stockActual,
    stockMinimo: p.stockMinimo,
    proveedorId: p.proveedorId ?? null,
    imagenUrl: p.imagenUrl ?? "",
    activo: p.activo,
    partesProveedor: (p.partesProveedor ?? []).map((parte, index) => ({
      id: parte.id,
      parteNombre: parte.parteNombre,
      proveedorId: parte.proveedorId,
      costo: parte.costo != null ? Number(parte.costo) : null,
      notas: parte.notas ?? "",
      orden: parte.orden ?? index,
    })),
  };
}

const claseCheckbox = "size-4 rounded border-input accent-foreground";

type EstadoSku =
  | { tipo: "idle" }
  | { tipo: "verificando" }
  | { tipo: "libre" }
  | { tipo: "ocupado"; nombre: string }
  | { tipo: "error" };

/**
 * Avisa si el SKU ya está tomado **antes** de enviar el formulario.
 * Es solo un aviso temprano: la unicidad real la sigue resolviendo el
 * servidor, así que nunca bloquea el envío.
 */
function useSkuDisponible(sku: string, skuOriginal: string): EstadoSku {
  // Guardamos el resultado junto al SKU que lo produjo: así el estado se
  // deriva en el render (nada de setState sincrónico dentro del efecto) y una
  // respuesta vieja nunca se muestra sobre un SKU nuevo.
  const [resultado, setResultado] = useState<{ sku: string; estado: EstadoSku } | null>(
    null
  );

  const buscado = normalizarSku(sku);
  const sinVerificar = !buscado || buscado === normalizarSku(skuOriginal);

  useEffect(() => {
    if (sinVerificar) return;

    const controlador = new AbortController();
    const temporizador = setTimeout(() => {
      // `activo=false` en esta API significa "sin filtrar por activo": así el
      // aviso también contempla productos dados de baja, que igual ocupan SKU.
      fetch(`/api/productos?q=${encodeURIComponent(buscado)}&activo=false`, {
        signal: controlador.signal,
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("http"))))
        .then((datos: unknown) => {
          const lista = (
            Array.isArray(datos)
              ? datos
              : ((datos as { productos?: unknown })?.productos ?? [])
          ) as Array<{ sku?: string; nombre?: string }>;
          const choque = lista.find(
            (p) => normalizarSku(p?.sku ?? "") === buscado
          );
          setResultado({
            sku: buscado,
            estado: choque
              ? { tipo: "ocupado", nombre: choque.nombre ?? "otro producto" }
              : { tipo: "libre" },
          });
        })
        .catch((e: unknown) => {
          if (e instanceof Error && e.name === "AbortError") return;
          setResultado({ sku: buscado, estado: { tipo: "error" } });
        });
    }, 450);

    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [buscado, sinVerificar]);

  if (sinVerificar) return { tipo: "idle" };
  if (resultado?.sku === buscado) return resultado.estado;
  return { tipo: "verificando" };
}

function AvisoSku({ estado }: { estado: EstadoSku }) {
  if (estado.tipo === "idle") return null;
  if (estado.tipo === "verificando") {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Spinner className="size-3" />
        Verificando si el SKU está libre…
      </p>
    );
  }
  if (estado.tipo === "libre") {
    return <p className="text-xs text-muted-foreground">SKU disponible.</p>;
  }
  if (estado.tipo === "ocupado") {
    return (
      <p className="text-xs text-muted-foreground">
        Ya hay un producto con este SKU: <strong className="font-medium text-foreground">{estado.nombre}</strong>.
        Cambialo o el servidor va a rechazar el alta.
      </p>
    );
  }
  return (
    <p className="text-xs text-muted-foreground">
      No se pudo verificar el SKU ahora; el servidor lo valida igual al guardar.
    </p>
  );
}

export function ProductoForm({
  defaultValues,
  categorias,
  proveedores,
  onSubmit,
  isLoading = false,
  submitStatus = null,
  submitActionLabel = "Guardar",
}: ProductoFormProps) {
  const imagenInputId = useId();
  const [arrastrando, setArrastrando] = useState(false);

  const form = useForm<ProductoFormValues>({
    resolver: zodResolver(productoSchema) as Resolver<ProductoFormValues>,
    defaultValues: defaultValues
      ? { ...defaultEmpty, ...defaultValues }
      : defaultEmpty,
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "partesProveedor",
  });

  // El envío pasa tal cual a `onSubmit` (la página decide endpoint y cuerpo).
  // Acá solo se controla el estado de carga y se avisa si la página lanza.
  // Importante: ante un error del servidor NO se resetea el formulario, así
  // no se pierde nada de lo cargado y se puede reintentar.
  const { run: enviar, loading: enviando } = useAsyncAction(
    async (data: ProductoFormValues) => {
      try {
        await onSubmit(data);
      } catch (e) {
        notificar.error(e instanceof Error ? e.message : "No se pudo guardar el producto");
      }
    }
  );
  const ocupado = isLoading || enviando;

  const { run: subirImagen, loading: imagenUploading } = useAsyncAction(
    async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          notificar.error(
            typeof data.error === "string"
              ? data.error
              : "No se pudo subir la imagen"
          );
          return;
        }
        if (data.url) {
          form.setValue("imagenUrl", data.url, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      } catch {
        notificar.error("Error de red al subir la imagen");
      }
    }
  );

  const enConsignacion = form.watch("enConsignacion");
  const nombre = form.watch("nombre");
  const sku = form.watch("sku");
  const precioCompra = form.watch("precioCompra");
  const precioVenta = form.watch("precioVenta");
  const stockActual = form.watch("stockActual");
  const stockMinimo = form.watch("stockMinimo");

  const estadoSku = useSkuDisponible(sku ?? "", defaultValues?.sku ?? "");

  // 🔴 Dato derivado, solo para mostrar: no se guarda ni se envía.
  const margen = calcularMargen(precioCompra, precioVenta);

  const proveedoresConsignacion = proveedores.filter(
    (p) => p.tipoProveedor === "CONSIGNACION"
  );
  const proveedoresDisponibles = enConsignacion
    ? proveedoresConsignacion
    : proveedores;

  const [modoProveedor, setModoProveedor] = useState<"unico" | "partes">(
    (defaultValues?.partesProveedor?.length ?? 0) > 0 ? "partes" : "unico"
  );
  // En consignación siempre hace falta el proveedor dueño de la mercadería,
  // aunque además haya desglose por partes.
  const mostrarProveedorUnico = modoProveedor === "unico" || enConsignacion;

  const agregarParte = () =>
    append({
      parteNombre: "",
      proveedorId: "",
      costo: null,
      notas: "",
      orden: fields.length,
    });

  const cambiarModo = (modo: "unico" | "partes") => {
    if (modo === modoProveedor) return;
    if (modo === "unico") {
      // Al volver a "proveedor único" se descartan solo las filas vacías, que
      // de otro modo bloquearían el guardado sin que se vean.
      const valores = form.getValues("partesProveedor") ?? [];
      const vacias = valores
        .map((parte, i) => ({ parte, i }))
        .filter(
          ({ parte }) =>
            !parte.parteNombre?.trim() &&
            !parte.proveedorId &&
            parte.costo == null &&
            !parte.notas?.trim()
        )
        .map(({ i }) => i);
      if (vacias.length > 0) remove(vacias);
    }
    setModoProveedor(modo);
  };

  const soltarArchivo = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setArrastrando(false);
    if (imagenUploading || ocupado) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) void subirImagen(file);
    else if (file) notificar.advertencia("El archivo no es una imagen");
  };

  const estadoStock =
    stockActual <= 0
      ? "Hoy figura sin stock."
      : stockMinimo > 0 && stockActual <= stockMinimo
        ? "Hoy figura en alerta de reposición."
        : "Hoy figura con stock suficiente.";

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => enviar(data))}
        className="max-w-3xl space-y-6"
      >
        <fieldset
          disabled={ocupado}
          className="min-w-0 space-y-6 border-0 p-0 disabled:opacity-80"
        >
          {/* 1 — Identificación */}
          <Reveal indice={0}>
            <Panel>
              <PanelHeader
                title="Identificación"
                descripcion="Cómo se reconoce el producto: código, nombre, categoría y foto."
              />
              <PanelBody className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between gap-2">
                          <FormLabel>SKU *</FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            className="text-muted-foreground"
                            disabled={!nombre?.trim()}
                            onClick={() =>
                              form.setValue("sku", generarSku(nombre ?? ""), {
                                shouldDirty: true,
                                shouldValidate: true,
                              })
                            }
                          >
                            <Wand2 aria-hidden="true" />
                            Generar
                          </Button>
                        </div>
                        <FormControl>
                          <Input
                            placeholder="SKU único"
                            autoComplete="off"
                            className="font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <AvisoSku estado={estadoSku} />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre del producto" {...field} />
                        </FormControl>
                        <FormDescription>
                          Con el nombre cargado podés generar el SKU automáticamente.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción opcional"
                          className="min-h-[88px] resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoriaId"
                  render={({ field }) => (
                    <FormItem className="sm:max-w-[calc(50%-0.5rem)]">
                      <FormLabel>Categoría</FormLabel>
                      <Select
                        onValueChange={(v) =>
                          field.onChange(v === "__none__" ? null : v)
                        }
                        value={field.value ?? "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Sin categoría</SelectItem>
                          {categorias.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imagenUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Foto del producto</FormLabel>
                      <FormControl>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Input
                            placeholder="https://…"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            className="min-w-0 font-mono text-xs"
                            disabled={imagenUploading}
                          />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id={imagenInputId}
                            disabled={imagenUploading || ocupado}
                            onChange={(e) => {
                              const input = e.target;
                              const file = input.files?.[0];
                              input.value = "";
                              if (file) void subirImagen(file);
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="shrink-0"
                            disabled={ocupado}
                            loading={imagenUploading}
                            loadingText="Subiendo…"
                            onClick={() =>
                              document.getElementById(imagenInputId)?.click()
                            }
                          >
                            Subir archivo
                          </Button>
                        </div>
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => document.getElementById(imagenInputId)?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (!arrastrando) setArrastrando(true);
                        }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setArrastrando(false);
                          }
                        }}
                        onDrop={soltarArchivo}
                        disabled={imagenUploading || ocupado}
                        aria-label="Arrastrá una imagen o hacé clic para elegir un archivo"
                        className={cn(
                          "mt-3 flex w-full items-center gap-4 rounded-lg border border-dashed p-3 text-left transition-colors duration-[--dur-fast] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          arrastrando ? "border-border-strong" : "border-border"
                        )}
                      >
                        {imagenUploading ? (
                          <span className="size-24 shrink-0 animate-skeleton-shimmer rounded-md" />
                        ) : field.value ? (
                          <img
                            src={field.value}
                            alt="Vista previa"
                            className="size-24 shrink-0 rounded-md object-cover"
                          />
                        ) : (
                          <span className="flex size-24 shrink-0 items-center justify-center">
                            <ImageOff className="size-4 text-muted-foreground" aria-hidden="true" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                          {imagenUploading ? (
                            <span className="flex flex-col gap-2" aria-live="polite">
                              <span className="flex items-center gap-2">
                                <Spinner className="size-3" />
                                Subiendo imagen…
                              </span>
                              <Progress
                                value={65}
                                className="h-1 w-full max-w-56 animate-pulse motion-reduce:animate-none"
                              />
                            </span>
                          ) : field.value ? (
                            "Arrastrá otra imagen para reemplazarla, o hacé clic para elegir un archivo."
                          ) : (
                            "Arrastrá una imagen acá, o hacé clic para elegir un archivo."
                          )}
                        </span>
                      </button>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </PanelBody>
            </Panel>
          </Reveal>

          {/* 2 — Precios */}
          <Reveal indice={1}>
            <Panel>
              <PanelHeader
                title="Precios"
                descripcion="El de venta es obligatorio; el de compra habilita el margen."
              />
              <PanelBody className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="precioCompra"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio de compra</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            value={field.value ?? null}
                            onChange={field.onChange}
                            nullable
                            placeholder="0"
                            className="font-mono tabular-nums"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="precioVenta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio de venta *</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            value={field.value ?? 0}
                            onChange={field.onChange}
                            placeholder="0"
                            className="font-mono tabular-nums"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FigureGrid columnas={2}>
                  <Figure
                    label="Ganancia por unidad"
                    valor={margen ? formatARS(margen.ganancia) : "—"}
                    tono={
                      margen ? (margen.ganancia >= 0 ? "positivo" : "negativo") : "neutro"
                    }
                  />
                  <Figure
                    label="Margen s/ venta"
                    valor={margen ? `${margen.porcentaje.toFixed(1)}%` : "—"}
                    tono={
                      margen ? (margen.porcentaje >= 0 ? "positivo" : "negativo") : "neutro"
                    }
                    hint={
                      margen
                        ? "Informativo: se calcula para mostrar, no se guarda."
                        : "Cargá precio de compra y de venta para verlo."
                    }
                  />
                </FigureGrid>
              </PanelBody>
            </Panel>
          </Reveal>

          {/* 3 — Stock */}
          <Reveal indice={2}>
            <Panel>
              <PanelHeader
                title="Stock"
                descripcion="Existencias actuales y umbral de reposición."
              />
              <PanelBody className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="stockActual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock actual</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            className="font-mono tabular-nums"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stockMinimo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock mínimo</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            className="font-mono tabular-nums"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Cuando el stock actual queda en este número o por debajo, el
                          producto entra en la alerta de reposición del listado y del
                          inicio. {estadoStock}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="activo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className={claseCheckbox}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Activo en el catálogo</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </PanelBody>
            </Panel>
          </Reveal>

          {/* 4 — Proveedor */}
          <Reveal indice={3}>
            <Panel>
              <PanelHeader
                title="Proveedor"
                descripcion="De dónde sale el producto: un proveedor único o varias partes."
                acciones={
                  modoProveedor === "partes" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={agregarParte}
                    >
                      <Plus aria-hidden="true" />
                      Agregar parte
                    </Button>
                  ) : undefined
                }
              />
              <PanelBody className="space-y-4">
                <div>
                  <div
                    role="group"
                    aria-label="Forma de cargar el proveedor"
                    className="inline-flex w-auto gap-1 rounded-md border border-border p-1"
                  >
                    {(
                      [
                        ["unico", "Proveedor único"],
                        ["partes", "Desglose por partes"],
                      ] as const
                    ).map(([valor, etiqueta]) => (
                      <Button
                        key={valor}
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-pressed={modoProveedor === valor}
                        onClick={() => cambiarModo(valor)}
                        className={cn(
                          "border-transparent bg-transparent shadow-none dark:bg-transparent",
                          modoProveedor === valor &&
                            "border-foreground bg-accent text-accent-foreground"
                        )}
                      >
                        {etiqueta}
                      </Button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Usá <strong className="font-medium text-foreground">proveedor único</strong> cuando
                    comprás el producto ya armado a un solo proveedor. Usá{" "}
                    <strong className="font-medium text-foreground">desglose por partes</strong> cuando
                    lo fabrican entre varios (carpintería, tapizado, herrajes) y querés
                    registrar el costo de cada parte por separado.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="enConsignacion"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className={claseCheckbox}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        En consignación (la mercadería sigue siendo del proveedor)
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {mostrarProveedorUnico && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="proveedorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {enConsignacion ? "Proveedor (consignación)" : "Proveedor"}
                          </FormLabel>
                          <Select
                            onValueChange={(v) =>
                              field.onChange(v === "__none__" ? null : v)
                            }
                            value={field.value ?? "__none__"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar proveedor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <div
                                className="p-1"
                                onPointerDown={(e) => e.preventDefault()}
                              >
                                <Link
                                  href="/proveedores/nuevo"
                                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                  Nuevo proveedor
                                </Link>
                              </div>
                              <SelectSeparator />
                              <SelectItem value="__none__">Sin proveedor</SelectItem>
                              {proveedoresDisponibles.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {enConsignacion && (
                            <FormDescription>
                              Solo se listan proveedores de consignación.
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {enConsignacion && (
                      <FormField
                        control={form.control}
                        name="comisionConsignacion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Comisión del shop (%) — override</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                max={100}
                                step={0.01}
                                placeholder="Usar la del proveedor"
                                className="font-mono tabular-nums"
                                value={field.value ?? ""}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value === ""
                                      ? null
                                      : Number(e.target.value)
                                  )
                                }
                              />
                            </FormControl>
                            <FormDescription>
                              Vacío = se usa la comisión configurada en el proveedor.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                )}
              </PanelBody>

              {modoProveedor === "partes" &&
                (fields.length === 0 ? (
                  <PanelBody className="border-t border-border">
                    <div className="flex flex-col items-start gap-3">
                      <p className="text-sm text-muted-foreground">
                        Todavía no hay partes. Agregá una por cada proveedor que
                        interviene en el producto.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={agregarParte}
                      >
                        <Plus aria-hidden="true" />
                        Agregar la primera parte
                      </Button>
                    </div>
                  </PanelBody>
                ) : (
                  <ol className="divide-y divide-border border-t border-border">
                    {fields.map((fieldItem, index) => (
                      <Reveal
                        as="li"
                        indice={index}
                        key={fieldItem.id}
                        className="block space-y-3 px-4 py-4 sm:px-5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                            Parte {index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => remove(index)}
                          >
                            <Trash2 aria-hidden="true" />
                            Quitar
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name={`partesProveedor.${index}.parteNombre`}
                            render={({ field: parteField }) => (
                              <FormItem>
                                <FormLabel>Parte</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Ej: Carpintería"
                                    {...parteField}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`partesProveedor.${index}.proveedorId`}
                            render={({ field: proveedorField }) => (
                              <FormItem>
                                <FormLabel>Proveedor</FormLabel>
                                <Select
                                  value={proveedorField.value || "__none__"}
                                  onValueChange={(value) =>
                                    proveedorField.onChange(
                                      value === "__none__" ? "" : value
                                    )
                                  }
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleccionar proveedor" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <div
                                      className="p-1"
                                      onPointerDown={(e) => e.preventDefault()}
                                    >
                                      <Link
                                        href="/proveedores/nuevo"
                                        className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                      >
                                        <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                        Nuevo proveedor
                                      </Link>
                                    </div>
                                    <SelectSeparator />
                                    <SelectItem value="__none__">
                                      Seleccionar proveedor
                                    </SelectItem>
                                    {proveedores.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.nombre}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`partesProveedor.${index}.costo`}
                            render={({ field: costoField }) => (
                              <FormItem>
                                <FormLabel>Costo</FormLabel>
                                <FormControl>
                                  <CurrencyInput
                                    value={costoField.value ?? null}
                                    onChange={costoField.onChange}
                                    nullable
                                    placeholder="Opcional"
                                    className="font-mono tabular-nums"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`partesProveedor.${index}.notas`}
                            render={({ field: notasField }) => (
                              <FormItem>
                                <FormLabel>Notas</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Opcional"
                                    value={notasField.value ?? ""}
                                    onChange={notasField.onChange}
                                    onBlur={notasField.onBlur}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </Reveal>
                    ))}
                  </ol>
                ))}
            </Panel>
          </Reveal>
        </fieldset>

        <BarraEnvio
          ocupado={ocupado}
          imagenUploading={imagenUploading}
          submitStatus={submitStatus}
          submitActionLabel={submitActionLabel}
        />
      </form>
    </Form>
  );
}

/** Pie fijo del formulario: estado del alta (si lo hay) y botón de guardar. */
function BarraEnvio({
  ocupado,
  imagenUploading,
  submitStatus,
  submitActionLabel,
}: {
  ocupado: boolean;
  imagenUploading: boolean;
  submitStatus: { progress: number; message: string } | null;
  submitActionLabel: string;
}) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-border bg-background/95 py-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 sm:flex-row sm:items-center">
      <Button
        type="submit"
        loading={ocupado}
        loadingText="Guardando…"
        disabled={imagenUploading}
        className="w-full sm:w-auto sm:min-w-40"
      >
        {submitActionLabel}
      </Button>
      {submitStatus ? (
        <div className="min-w-0 flex-1 space-y-1.5" aria-live="polite">
          <p className="text-xs text-muted-foreground">{submitStatus.message}</p>
          <Progress value={submitStatus.progress} className="h-1" />
        </div>
      ) : null}
      {!submitStatus && imagenUploading ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Esperá a que termine de subir la imagen para guardar.
        </p>
      ) : null}
    </div>
  );
}
