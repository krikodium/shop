"use client";

import { useState } from "react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncAction } from "@/hooks/use-async-action";
import { notificar } from "@/lib/notificar";

interface GuardarDatosClienteProps {
  ventaId: string;
  clienteActual?: { nombre: string; email?: string | null; telefono?: string | null; dni?: string | null } | null;
  clienteNombre?: string | null;
  onGuardado?: () => void;
}

export function GuardarDatosCliente({
  ventaId,
  clienteActual,
  clienteNombre,
  onGuardado,
}: GuardarDatosClienteProps) {
  const [nombre, setNombre] = useState(clienteActual?.nombre ?? clienteNombre ?? "");
  const [email, setEmail] = useState(clienteActual?.email ?? "");
  const [telefono, setTelefono] = useState(clienteActual?.telefono ?? "");
  const [dni, setDni] = useState(clienteActual?.dni ?? "");
  const [guardado, setGuardado] = useState(false);

  const tieneAlgo = Boolean(nombre?.trim() || email?.trim() || telefono?.trim() || dni?.trim());

  const { run: guardar, loading } = useAsyncAction(async () => {
    if (!tieneAlgo) {
      notificar.advertencia("Agregá al menos un dato para guardar");
      return;
    }
    try {
      const res = await fetch(`/api/ventas/${ventaId}/cliente`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim() || undefined,
          email: email.trim() || undefined,
          telefono: telefono.trim() || undefined,
          dni: dni.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al guardar");
      }
      setGuardado(true);
      notificar.ok("Datos guardados correctamente");
      onGuardado?.();
    } catch (err) {
      notificar.error(err instanceof Error ? err.message : "Error al guardar");
    }
  });

  return (
    <Panel>
      <PanelHeader
        title="Guardar datos del cliente"
        descripcion="Nombre, email, teléfono y DNI para futuras difusiones. Ningún campo es obligatorio."
      />
      <PanelBody className="space-y-5">
        {guardado ? (
          <p className="text-sm text-muted-foreground">Datos guardados correctamente.</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dni">DNI</Label>
                <Input id="dni" placeholder="DNI" value={dni} onChange={(e) => setDni(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  placeholder="Teléfono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Estos datos permitirán en el futuro enviar difusiones por email y teléfono automáticamente.
            </p>
            <Button loading={loading} onClick={() => void guardar()}>
              Guardar
            </Button>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
