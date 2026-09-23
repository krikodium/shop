"use client";

import type { Resolver } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, type DragEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAsyncAction } from "@/hooks/use-async-action";
import { notificar } from "@/lib/notificar";
import { cn } from "@/lib/utils";
import type { ProductoFormValues } from "@/lib/validaciones/productoSchema";
import { productoSchema } from "@/lib/validaciones/productoSchema";
import type {
  Producto,
  Categoria,
  Proveedor,
  ProductoParteProveedor,
} from "@prisma/client";
import { ImageOff, Plus, Trash2 } from "lucide-react";

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
  const proveedoresConsignacion = proveedores.filter(
    (p) => p.tipoProveedor === "CONSIGNACION"
  );

  const soltarArchivo = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setArrastrando(false);
    if (imagenUploading || ocupado) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) void subirImagen(file);
    else if (file) notificar.advertencia("El archivo no es una imagen");
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => enviar(data))}
        className="space-y-6"
      >
        <fieldset
          disabled={ocupado}
          className="min-w-0 space-y-6 border-0 p-0 disabled:opacity-80"
        >
          <Panel>
            <PanelHeader title="Identificación" descripcion="SKU, nombre y categoría." />
            <PanelBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU *</FormLabel>
                      <FormControl>
                        <Input placeholder="SKU único" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
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
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Precios"
              descripcion="El de venta es obligatorio; el de compra ayuda a calcular el margen."
            />
            <PanelBody>
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
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Proveedor y consignación"
              descripcion="Si es consignación, elegí el proveedor y, si aplica, la comisión."
            />
            <PanelBody className="space-y-4">
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
                    <FormLabel className="font-normal">En consignación</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {enConsignacion && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="proveedorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proveedor (consignación)</FormLabel>
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
                            {proveedoresConsignacion.map((p) => (
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
                    name="comisionConsignacion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comisión del shop (%) — override</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Imagen"
              descripcion="Pegá una URL o subí un archivo; se optimiza en el servidor."
            />
            <PanelBody>
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
                      <span className="text-sm text-muted-foreground">
                        {imagenUploading
                          ? "Subiendo imagen…"
                          : field.value
                            ? "Arrastrá otra imagen para reemplazarla, o hacé clic para elegir un archivo."
                            : "Arrastrá una imagen acá, o hacé clic para elegir un archivo."}
                      </span>
                    </button>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Partes y proveedores"
              descripcion="Desglose opcional por parte, costo y notas."
              acciones={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      parteNombre: "",
                      proveedorId: "",
                      costo: null,
                      notas: "",
                      orden: fields.length,
                    })
                  }
                >
                  <Plus aria-hidden="true" />
                  Agregar parte
                </Button>
              }
            />
            {fields.length === 0 ? (
              <PanelBody>
                <p className="text-sm text-muted-foreground">
                  No hay partes cargadas. Podés agregarlas ahora o más adelante.
                </p>
              </PanelBody>
            ) : (
              <ol className="divide-y divide-border">
                {fields.map((fieldItem, index) => (
                  <li key={fieldItem.id} className="space-y-3 px-4 py-4 sm:px-5">
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
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Stock y estado"
              descripcion="Inventario y visibilidad en el catálogo."
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
        </fieldset>

        <BarraEnvio
          ocupado={ocupado}
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
  submitStatus,
  submitActionLabel,
}: {
  ocupado: boolean;
  submitStatus: { progress: number; message: string } | null;
  submitActionLabel: string;
}) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-border bg-background/95 py-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 sm:flex-row sm:items-center">
      <Button
        type="submit"
        loading={ocupado}
        loadingText="Guardando…"
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
    </div>
  );
}
