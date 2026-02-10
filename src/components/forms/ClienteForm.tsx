"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { clienteSchema } from "@/lib/validaciones/clienteSchema";
import type { ClienteFormValues } from "@/lib/validaciones/clienteSchema";
import type { Cliente } from "@prisma/client";

interface ClienteFormProps {
  defaultValues?: ClienteFormValues;
  onSubmit: (data: ClienteFormValues) => Promise<void>;
  isLoading?: boolean;
  /** Vista rápida: solo nombre + teléfono, resto en acordeón */
  variant?: "full" | "quick";
}

const defaultEmpty: ClienteFormValues = {
  nombre: "",
  email: "",
  telefono: "",
  dni: "",
  direccion: "",
  recibeNotificaciones: true,
  notas: "",
};

export function clienteToFormValues(c: Cliente): ClienteFormValues {
  return {
    nombre: c.nombre,
    email: c.email ?? "",
    telefono: c.telefono ?? "",
    dni: c.dni ?? "",
    direccion: c.direccion ?? "",
    recibeNotificaciones: c.recibeNotificaciones,
    notas: c.notas ?? "",
  };
}

export function ClienteForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  variant = "quick",
}: ClienteFormProps) {
  const [expandido, setExpandido] = useState(false);
  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema) as Resolver<ClienteFormValues>,
    defaultValues: defaultValues ? { ...defaultEmpty, ...defaultValues } : defaultEmpty,
  });

  const mostrarTodo = variant === "full" || expandido;

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
                <Input placeholder="Nombre del cliente" className="min-h-11 text-base" {...field} />
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
                <Input placeholder="Teléfono" type="tel" inputMode="numeric" className="min-h-11 text-base" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {variant === "quick" && !mostrarTodo && (
          <button
            type="button"
            onClick={() => setExpandido(true)}
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            + Más datos
          </button>
        )}

        {mostrarTodo && (
          <>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@ejemplo.com" className="min-h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dni"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DNI</FormLabel>
                  <FormControl>
                    <Input placeholder="DNI" className="min-h-11" {...field} />
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
                    <Input placeholder="Dirección" className="min-h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recibeNotificaciones"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Recibe notificaciones</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas internas" {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Button type="submit" disabled={isLoading} className="min-h-11 w-full touch-manipulation md:w-auto">
          {isLoading ? "Guardando…" : "Guardar"}
        </Button>
      </form>
    </Form>
  );
}
