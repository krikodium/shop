"use client";

import type { Resolver } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductoFormValues } from "@/lib/validaciones/productoSchema";
import { productoSchema } from "@/lib/validaciones/productoSchema";
import type {
  Producto,
  Categoria,
  Proveedor,
  ProductoParteProveedor,
} from "@prisma/client";
import { toast } from "sonner";
import { Loader2, Package, Plus, Trash2 } from "lucide-react";

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
  const [imagenUploading, setImagenUploading] = useState(false);

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

  const enConsignacion = form.watch("enConsignacion");
  const imagenUrlWatch = form.watch("imagenUrl");
  const proveedoresConsignacion = proveedores.filter(
    (p) => p.tipoProveedor === "CONSIGNACION"
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => onSubmit(data))}
        className="space-y-6"
      >
        <fieldset
          disabled={isLoading}
          className="min-w-0 space-y-6 border-0 p-0 disabled:opacity-80"
        >
          {/* Identificación */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Identificación</CardTitle>
              <CardDescription>
                SKU, nombre y categoría. La vista previa usa la imagen si ya la
                cargaste.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <div className="grid flex-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU *</FormLabel>
                        <FormControl>
                          <Input placeholder="SKU único" {...field} />
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
                <div className="relative mx-auto h-36 w-36 shrink-0 overflow-hidden rounded-xl border bg-muted lg:mx-0">
                  {imagenUrlWatch ? (
                    <img
                      src={imagenUrlWatch}
                      alt="Vista previa"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-14 w-14 text-muted-foreground/45" />
                    </div>
                  )}
                </div>
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
                        className="min-h-[100px] resize-y"
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
                  <FormItem className="max-w-md">
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
            </CardContent>
          </Card>

          {/* Precios */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Precios</CardTitle>
              <CardDescription>
                Precio de venta es obligatorio; compra ayuda al margen.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Proveedor y consignación */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Proveedor y consignación</CardTitle>
              <CardDescription>
                Si es consignación, elegí proveedor y comisión si aplica.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                        className="h-4 w-4 rounded border-input"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">En consignación</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {enConsignacion && (
                <>
                  <FormField
                    control={form.control}
                    name="proveedorId"
                    render={({ field }) => (
                      <FormItem className="max-w-md">
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
                                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                              >
                                <Plus className="size-4 shrink-0" />
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
                      <FormItem className="max-w-sm">
                        <FormLabel>Comisión del shop (%) — override</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            placeholder="Usar la del proveedor"
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
                </>
              )}
            </CardContent>
          </Card>

          {/* Imagen */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Imagen</CardTitle>
              <CardDescription>
                URL o archivo; se optimiza en el servidor al subir.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="imagenUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto del producto</FormLabel>
                    <FormControl>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Input
                          placeholder="URL de imagen o subir archivo"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          className="min-w-0"
                          disabled={imagenUploading}
                        />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id={imagenInputId}
                          disabled={imagenUploading || isLoading}
                          onChange={async (e) => {
                            const input = e.target;
                            const file = input.files?.[0];
                            if (!file) return;
                            setImagenUploading(true);
                            const formData = new FormData();
                            formData.append("file", file);
                            try {
                              const res = await fetch("/api/upload", {
                                method: "POST",
                                body: formData,
                              });
                              const data = await res.json().catch(() => ({}));
                              if (!res.ok) {
                                toast.error(
                                  typeof data.error === "string"
                                    ? data.error
                                    : "No se pudo subir la imagen"
                                );
                                input.value = "";
                                return;
                              }
                              if (data.url) field.onChange(data.url);
                            } catch {
                              toast.error("Error de red al subir la imagen");
                            } finally {
                              setImagenUploading(false);
                              input.value = "";
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0"
                          disabled={imagenUploading || isLoading}
                          onClick={() =>
                            document.getElementById(imagenInputId)?.click()
                          }
                        >
                          {imagenUploading ? (
                            <>
                              <Loader2 className="animate-spin" />
                              Subiendo…
                            </>
                          ) : (
                            "Subir archivo"
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <div className="mt-4 flex items-start gap-4">
                      {imagenUploading ? (
                        <Skeleton className="h-36 w-36 shrink-0 rounded-xl animate-skeleton-shimmer" />
                      ) : field.value ? (
                        <img
                          src={field.value}
                          alt="Preview"
                          className="h-36 w-36 rounded-xl border object-cover shadow-sm"
                        />
                      ) : null}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Partes */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Partes y proveedores</CardTitle>
              <CardDescription>
                Desglose opcional por parte, costo y notas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No hay partes cargadas. Podés agregar una ahora o hacerlo más
                  adelante.
                </div>
              ) : (
                fields.map((fieldItem, index) => (
                  <div
                    key={fieldItem.id}
                    className="space-y-3 rounded-lg border bg-card p-3"
                  >
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
                                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                                  >
                                    <Plus className="size-4 shrink-0" />
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
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
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
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Quitar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <Button
                type="button"
                variant="secondary"
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
                <Plus className="mr-2 h-4 w-4" />
                Agregar parte
              </Button>
            </CardContent>
          </Card>

          {/* Stock y estado */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Stock y estado</CardTitle>
              <CardDescription>
                Inventario inicial y si el ítem está activo en catálogo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                        className="h-4 w-4 rounded border-input"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Activo</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </fieldset>

        <div className="sticky bottom-0 z-10 space-y-4 border-t border-border bg-background/95 py-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 md:py-5">
          {submitStatus ? (
            <div
              className="space-y-2 rounded-lg border bg-muted/30 px-4 py-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                <span>{submitStatus.message}</span>
              </div>
              <Progress value={submitStatus.progress} />
            </div>
          ) : null}
          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            className="w-full sm:w-auto sm:min-w-[200px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Guardando…
              </>
            ) : (
              submitActionLabel
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
