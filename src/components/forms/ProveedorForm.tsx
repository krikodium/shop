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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProveedorFormValues } from "@/lib/validaciones/proveedorSchema";
import { proveedorSchema } from "@/lib/validaciones/proveedorSchema";
import type { Proveedor } from "@prisma/client";

interface ProveedorFormProps {
  defaultValues?: ProveedorFormValues;
  onSubmit: (data: ProveedorFormValues) => Promise<void>;
  isLoading?: boolean;
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
    comisionPorDefecto: p.comisionPorDefecto != null ? Number(p.comisionPorDefecto) : null,
    liquidacionUsd: Boolean(p.liquidacionUsd),
  };
}

export function ProveedorForm({
  defaultValues,
  onSubmit,
  isLoading = false,
}: ProveedorFormProps) {
  const form = useForm<ProveedorFormValues>({
    resolver: zodResolver(proveedorSchema) as Resolver<ProveedorFormValues>,
    defaultValues: defaultValues ? { ...defaultEmpty, ...defaultValues } : defaultEmpty,
  });

  const tipoConsignacion = form.watch("tipoProveedor") === "CONSIGNACION";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => onSubmit(data))} className="space-y-4">
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
                  <SelectItem value="REGULAR">Regular (compra directa)</SelectItem>
                  <SelectItem value="CONSIGNACION">Consignación</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {tipoConsignacion && (
          <>
            <FormField
              control={form.control}
              name="comisionPorDefecto"
              render={({ field }) => (
                <FormItem>
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
                      Al generar la rendición vas a indicar el tipo de cambio ARS por USD en ese momento.
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </>
        )}
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
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="email@ejemplo.com" {...field} />
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
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando…" : "Guardar"}
        </Button>
      </form>
    </Form>
  );
}
