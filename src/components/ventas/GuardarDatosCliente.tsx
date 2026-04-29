"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [loading, setLoading] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tieneAlgo = (nombre?.trim() || email?.trim() || telefono?.trim() || dni?.trim());

  const handleGuardar = async () => {
    if (!tieneAlgo) {
      setError("Agregá al menos un dato");
      return;
    }
    setLoading(true);
    setError(null);
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
      onGuardado?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-2 pb-2">
        <CardTitle className="text-base">Guardar datos del cliente</CardTitle>
        <p className="text-sm text-muted-foreground">
          Podés guardar nombre, email, teléfono y DNI para futuras difusiones. Ningún campo es obligatorio.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {guardado ? (
          <p className="text-sm text-green-600">Datos guardados correctamente.</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  placeholder="Nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dni">DNI</Label>
                <Input
                  id="dni"
                  placeholder="DNI"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                />
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
            <p className="text-xs text-muted-foreground pt-1">
              Estos datos permitirán en el futuro enviar difusiones por email y teléfono automáticamente.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleGuardar} disabled={loading} className="mt-2">
              {loading ? "Guardando…" : "Guardar"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
