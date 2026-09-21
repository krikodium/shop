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

interface CambiarPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CambiarPasswordDialog({
  open,
  onOpenChange,
}: CambiarPasswordDialogProps) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");

  useEffect(() => {
    if (!open) return;
    setActual("");
    setNueva("");
    setConfirmar("");
  }, [open]);

  const { run: cambiar, loading: saving } = useAsyncAction(async () => {
    try {
      const res = await fetch("/api/usuarios/cambiar-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual, nueva }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "No se pudo cambiar la contraseña");
      notificar.ok("Contraseña actualizada");
      onOpenChange(false);
    } catch (err) {
      notificar.error(err instanceof Error ? err.message : "Error al cambiar la contraseña");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (nueva.length < 6) {
      notificar.error("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (nueva !== confirmar) {
      notificar.error("Las contraseñas nuevas no coinciden");
      return;
    }

    void cambiar();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            Ingresá tu contraseña actual y elegí una nueva.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="actual">Contraseña actual</Label>
            <Input
              id="actual"
              type="password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nueva">Nueva contraseña</Label>
            <Input
              id="nueva"
              type="password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmar">Repetir nueva contraseña</Label>
            <Input
              id="confirmar"
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={saving} loadingText="Guardando…">
              Cambiar contraseña
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
