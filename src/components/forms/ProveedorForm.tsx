"use client";

import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import type { ProveedorFormValues } from "@/lib/validaciones/proveedorSchema";
import { proveedorSchema } from "@/lib/validaciones/proveedorSchema";
import type { Proveedor } from "@prisma/client";
import { Loader2 } from "lucide-react";

interface ProveedorFormProps {
  defaultValues?: ProveedorFormValues;
  onSubmit: (data: ProveedorFormValues) => Promise<void>;
  isLoading?: boolean;
  submitStatus?: { progress: number; message: string } | null;
  submitActionLabel?: string;
}

const defaultEmpty: ProveedorFormValues = {
  nombre: "",
  contacto: "",
  telefono: "",
  email: "",
  direccion: "",
  tipoProveedor: "REGULAR",
  comisionPorDefecto: null,
  liquidacionUsd: false,
};

/** Convierte un proveedor (API/Prisma) a valores del formulario */
export function proveedorToFormValues(p: Proveedor): ProveedorFormValues {
  return {
    nombre: p.nombre,
    contacto: p.contacto ?? "",
    telefono: p.telefono ?? "",
    email: p.email ?? "",
    direccion: p.direccion ?? "",
    tipoProveedor: p.tipoProveedor,
    comisionPorDefecto:
      p.comisionPorDefecto != null ? Number(p.comisionPorDefecto) : null,
    liquidacionUsd: Boolean(p.liquidacionUsd),
  };
}

export function ProveedorForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  submitStatus = null,
  submitActionLabel = "Guardar",
}: ProveedorFormProps) {
  const form = useForm<ProveedorFormValues>({
    resolver: zodResolver(proveedorSchema) as Resolver<ProveedorFormValues>,
    defaultValues: defaultValues
      ? { ...defaultEmpty, ...defaultValues }
      : defaultEmpty,
  });

  const tipoConsignacion = form.watch("tipoProveedor") === "CONSIGNACION";

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
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Datos principales</CardTitle>
              <CardDescription>
                Nombre y tipo de relación comercial con el proveedor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del proveedor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipoProveedor"
                render={({ field }) => (
                  <FormItem className="max-w-md">
                    <FormLabel>Tipo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo de proveedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="REGULAR">
                          Regular (compra directa)
                        </SelectItem>
                        <SelectItem value="CONSIGNACION">Consignación</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {tipoConsignacion && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Parámetros de consignación</CardTitle>
                <CardDescription>
                  Comisión por defecto y preferencia de moneda en rendiciones.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="comisionPorDefecto"
                  render={({ field }) => (
                    <FormItem className="max-w-sm">
                      <FormLabel>Comisión del shop (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          placeholder="30"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="liquidacionUsd"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-lg border border-border/60 p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-input"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel className="!mt-0">
                          Liquidar rendiciones en dólares (USD)
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Al generar la rendición vas a indicar el tipo de cambio
                          ARS por USD en ese momento.
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Contacto</CardTitle>
              <CardDescription>
                Persona de contacto y canales para comunicación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contacto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contacto</FormLabel>
                      <FormControl>
                        <Input placeholder="Persona de contacto" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="Teléfono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="max-w-md">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@ejemplo.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="direccion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input placeholder="Dirección" {...field} />
                    </FormControl>
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
