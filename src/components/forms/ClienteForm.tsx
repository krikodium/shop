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
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { useAsyncAction } from "@/hooks/use-async-action";
import { notificar } from "@/lib/notificar";
import { clienteSchema } from "@/lib/validaciones/clienteSchema";
import type { ClienteFormValues } from "@/lib/validaciones/clienteSchema";
import type { Cliente } from "@prisma/client";

interface ClienteFormProps {
  defaultValues?: ClienteFormValues;
  /**
   * Guarda el cliente. Si falla, tiene que tirar un Error con el mensaje para
   * el usuario: el formulario lo muestra con `notificar.error`.
   */
  onSubmit: (data: ClienteFormValues) => Promise<void>;
  isLoading?: boolean;
  /** Vista rápida: solo nombre + teléfono, resto desplegable */
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

  const { run: guardar, loading: guardando } = useAsyncAction(async (data: ClienteFormValues) => {
    try {
      await onSubmit(data);
    } catch (e) {
      notificar.error(e instanceof Error ? e.message : "No se pudo guardar el cliente");
    }
  });

  const mostrarTodo = variant === "full" || expandido;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (data) => {
          await guardar(data);
        })}
        className="space-y-4"
      >
        <Panel>
          <PanelHeader
            title="Contacto"
            descripcion={variant === "quick" ? "Nombre y teléfono. El resto es opcional." : undefined}
          />
          <PanelBody className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del cliente" className="h-10" {...field} />
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
                    <Input
                      placeholder="Teléfono"
                      type="tel"
                      inputMode="numeric"
                      className="h-10 font-mono tabular-nums"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mostrarTodo && (
              <>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@ejemplo.com" className="h-10" {...field} />
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
                        <Input placeholder="DNI" className="h-10 font-mono tabular-nums" {...field} />
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
                        <Input placeholder="Dirección" className="h-10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {variant === "quick" && !mostrarTodo && (
              <div className="sm:col-span-2">
                <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={() => setExpandido(true)}>
                  + Más datos
                </Button>
              </div>
            )}
          </PanelBody>
        </Panel>

        {mostrarTodo && (
          <Panel>
            <PanelHeader title="Preferencias y notas" />
            <PanelBody className="space-y-4">
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
                        className="size-4 rounded border-border accent-foreground"
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
            </PanelBody>
          </Panel>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            loading={guardando || isLoading}
            loadingText="Guardando…"
            className="w-full sm:w-auto"
          >
            Guardar
          </Button>
        </div>
      </form>
    </Form>
  );
}
