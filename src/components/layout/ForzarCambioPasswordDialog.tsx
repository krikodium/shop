"use client";

import { useState } from "react";
import { signOut, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncAction } from "@/hooks/use-async-action";
import { notificar } from "@/lib/notificar";
import { ShieldAlert, LogOut } from "lucide-react";

interface ForzarCambioPasswordDialogProps {
  open: boolean;
  userEmail: string;
}

export function ForzarCambioPasswordDialog({
  open,
  userEmail,
}: ForzarCambioPasswordDialogProps) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");

  const { run: cambiar, loading: saving } = useAsyncAction(async () => {
    try {
      const res = await fetch("/api/usuarios/cambiar-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual, nueva }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "No se pudo actualizar la contraseña");

      notificar.ok("Contraseña actualizada exitosamente.");

      // Reautenticar con la nueva contraseña para renovar token JWT
      const loginRes = await signIn("credentials", {
        email: userEmail,
        password: nueva,
        redirect: false,
      });

      if (loginRes?.error) {
        window.location.href = "/login";
      } else {
        window.location.reload();
      }
    } catch (err) {
      notificar.error(err instanceof Error ? err.message : "Error al actualizar la contraseña");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (nueva.length < 6) {
      notificar.error("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (nueva === actual) {
      notificar.error("La nueva contraseña debe ser distinta de la contraseña por defecto");
      return;
    }
    if (nueva !== confirmar) {
      notificar.error("Las contraseñas nuevas no coinciden");
      return;
    }

    void cambiar();
  };

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <div className="flex items-center gap-2 text-foreground">
            <ShieldAlert className="size-5 shrink-0" />
            <DialogTitle>Actualización de contraseña obligatoria</DialogTitle>
          </div>
          <DialogDescription className="pt-1.5 text-xs text-muted-foreground leading-relaxed">
            Estás ingresando con la contraseña temporal por defecto. Por seguridad de la cuenta, tenés que configurar tu contraseña personal antes de continuar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="forzar-actual">Contraseña actual (temporal)</Label>
            <Input
              id="forzar-actual"
              type="password"
              placeholder="Contraseña por defecto actual"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="forzar-nueva">Nueva contraseña</Label>
            <Input
              id="forzar-nueva"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="forzar-confirmar">Repetir nueva contraseña</Label>
            <Input
              id="forzar-confirmar"
              type="password"
              placeholder="Repetí la nueva contraseña"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              disabled={saving}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              <LogOut className="size-3.5 mr-1" />
              Cerrar sesión
            </Button>
            <Button type="submit" loading={saving} loadingText="Guardando…">
              Guardar y continuar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
