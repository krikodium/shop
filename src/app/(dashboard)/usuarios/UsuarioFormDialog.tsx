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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Usuario } from "./types";
import { DIAS_SEMANA, ROLES, parseDiasTrabajo, serializeDiasTrabajo } from "./constants";

interface UsuarioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit: Usuario | null;
  onSaved: (user: Usuario, mode: "create" | "update") => void;
}

export function UsuarioFormDialog({
  open,
  onOpenChange,
  userToEdit,
  onSaved,
}: UsuarioFormDialogProps) {
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    role: "VENDEDOR",
    horarioEntrada: "",
    horarioSalida: "",
    diasTrabajo: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (userToEdit) {
      setForm({
        email: userToEdit.email,
        name: userToEdit.name ?? "",
        password: "",
        role: userToEdit.role,
        horarioEntrada: userToEdit.horarioEntrada ?? "",
        horarioSalida: userToEdit.horarioSalida ?? "",
        diasTrabajo: userToEdit.diasTrabajo ?? "",
      });
    } else {
      setForm({
        email: "",
        name: "",
        password: "",
        role: "VENDEDOR",
        horarioEntrada: "",
        horarioSalida: "",
        diasTrabajo: "",
      });
    }
  }, [open, userToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (userToEdit) {
        const body: Record<string, unknown> = {
          name: form.name || undefined,
          role: form.role,
          horarioEntrada: form.horarioEntrada || null,
          horarioSalida: form.horarioSalida || null,
        };
        if (form.role === "VENDEDOR") {
          body.diasTrabajo = form.diasTrabajo.trim() ? form.diasTrabajo : null;
        } else {
          body.diasTrabajo = null;
        }
        if (form.password) body.password = form.password;
        const res = await fetch(`/api/usuarios/${userToEdit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? "Error");
        }
        const updated = (await res.json()) as Usuario;
        onSaved(updated, "update");
      } else {
        if (!form.password || form.password.length < 6) {
          throw new Error("La contraseña debe tener al menos 6 caracteres");
        }
        const res = await fetch("/api/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            name: form.name || undefined,
            password: form.password,
            role: form.role,
            horarioEntrada: form.horarioEntrada || null,
            horarioSalida: form.horarioSalida || null,
            diasTrabajo:
              form.role === "VENDEDOR"
                ? form.diasTrabajo.trim()
                  ? form.diasTrabajo
                  : null
                : null,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? "Error");
        }
        const created = (await res.json()) as Usuario;
        onSaved(created, "create");
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{userToEdit ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {userToEdit
              ? "Actualizá datos del usuario. Dejá la contraseña vacía para no cambiarla."
              : "Completá los datos para crear una cuenta con rol y horarios opcionales."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              type="email"
              required
              disabled={!!userToEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Contraseña {userToEdit && "(dejar vacío para no cambiar)"}</Label>
            <Input
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              type="password"
              required={!userToEdit}
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Horario entrada</Label>
              <Input
                type="time"
                value={form.horarioEntrada}
                onChange={(e) =>
                  setForm((f) => ({ ...f, horarioEntrada: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Horario salida</Label>
              <Input
                type="time"
                value={form.horarioSalida}
                onChange={(e) =>
                  setForm((f) => ({ ...f, horarioSalida: e.target.value }))
                }
              />
            </div>
          </div>
          {form.role === "VENDEDOR" && (
            <div className="space-y-2">
              <Label>Días de trabajo habitual</Label>
              <p className="text-xs text-muted-foreground">
                L a D = lunes a domingo. Verde = trabaja ese día.
              </p>
              <div className="flex flex-wrap items-center gap-1">
                {DIAS_SEMANA.map(({ letra, num }) => {
                  const activos = parseDiasTrabajo(form.diasTrabajo || null);
                  const trabaja = activos.has(num);
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        const nuevo = new Set(activos);
                        if (nuevo.has(num)) nuevo.delete(num);
                        else nuevo.add(num);
                        setForm((f) => ({
                          ...f,
                          diasTrabajo: serializeDiasTrabajo(nuevo),
                        }));
                      }}
                      className={`h-8 w-8 rounded font-semibold text-sm transition-colors ${
                        trabaja
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                      title={trabaja ? "Quitar día" : "Agregar día"}
                    >
                      {letra}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
