"use client";

import { useEffect, useState } from "react";
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
import type { Usuario } from "./types";

interface CambiarPasswordDialogProps {
  usuario: Usuario | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (usuario: Usuario) => void;
}

export function CambiarPasswordDialog({
  usuario,
  onOpenChange,
  onSaved,
}: CambiarPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");

  useEffect(() => {
    setPassword("");
    setConfirmar("");
  }, [usuario]);

  const { run: guardar, loading } = useAsyncAction(async () => {
    if (!usuario) return;
    if (password.length < 6) {
      notificar.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirmar) {
      notificar.error("Las contraseñas no coinciden");
      return;
    }
    try {
      const res = await fetch(`/api/usuarios/${usuario.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "No se pudo cambiar la contraseña");
      notificar.ok(`Contraseña de ${usuario.email} actualizada`);
      onSaved({ ...usuario, tienePassword: true });
      onOpenChange(false);
    } catch (err) {
      notificar.error(err instanceof Error ? err.message : "Error al cambiar la contraseña");
    }
  });

  return (
    <Dialog open={usuario !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            {usuario?.name?.trim() || usuario?.email}: se cierran sus sesiones abiertas y tendrá
            que ingresar con la nueva contraseña.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void guardar();
          }}
          className="space-y-4 pt-2"
        >
          <div className="space-y-2">
            <Label htmlFor="nueva-password">Nueva contraseña</Label>
            <Input
              id="nueva-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmar-password">Repetir contraseña</Label>
            <Input
              id="confirmar-password"
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={loading} loadingText="Guardando…">
              Cambiar contraseña
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
