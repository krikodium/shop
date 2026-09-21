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
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
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
import { useAsyncAction } from "@/hooks/use-async-action";
import { notificar } from "@/lib/notificar";

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

  // El envío pasa tal cual a `onSubmit` (la página decide endpoint y cuerpo).
  // Acá solo se controla el estado de carga y se avisa si la página lanza.
  const { run: enviar, loading: enviando } = useAsyncAction(
    async (data: ProveedorFormValues) => {
      try {
        await onSubmit(data);
      } catch (e) {
        notificar.error(e instanceof Error ? e.message : "No se pudo guardar el proveedor");
      }
    }
  );
  const ocupado = isLoading || enviando;

  const tipoConsignacion = form.watch("tipoProveedor") === "CONSIGNACION";

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
            <PanelHeader
              title="Datos principales"
              descripcion="Nombre y tipo de relación comercial."
            />
            <PanelBody>
              <div className="grid gap-4 sm:grid-cols-2">
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
                    <FormItem>
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
              </div>
            </PanelBody>
          </Panel>

          {tipoConsignacion && (
            <Panel>
              <PanelHeader
                title="Consignación"
                descripcion="Comisión por defecto y moneda de las rendiciones."
              />
              <PanelBody className="space-y-4">
                <FormField
                  control={form.control}
                  name="comisionPorDefecto"
                  render={({ field }) => (
                    <FormItem className="sm:max-w-[calc(50%-0.5rem)]">
                      <FormLabel>Comisión del shop (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          placeholder="30"
                          className="font-mono tabular-nums"
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
                    <FormItem className="flex flex-row items-start gap-3 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 rounded border-input accent-foreground"
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
              </PanelBody>
            </Panel>
          )}

          <Panel>
            <PanelHeader
              title="Contacto"
              descripcion="Persona de contacto y canales de comunicación."
            />
            <PanelBody className="space-y-4">
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
                        <Input placeholder="Teléfono" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
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
              </div>
            </PanelBody>
          </Panel>
        </fieldset>

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
      </form>
    </Form>
  );
}
