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
import { useAsyncAction } from "@/hooks/use-async-action";
import { notificar } from "@/lib/notificar";
import { cn } from "@/lib/utils";
import type { Usuario } from "./types";
import { DIAS_SEMANA, ROLES, parseDiasTrabajo, serializeDiasTrabajo } from "./constants";

// Invitación por mail: apagada hasta configurar SMTP (NEXT_PUBLIC_EMAIL_ENABLED)
const EMAIL_ENABLED = process.env.NEXT_PUBLIC_EMAIL_ENABLED === "true";

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
  // Para usuarios nuevos: enviar invitación por mail en vez de fijar contraseña.
  const [invitar, setInvitar] = useState(EMAIL_ENABLED);

  useEffect(() => {
    if (!open) return;
    setInvitar(EMAIL_ENABLED);
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

  const { run: guardar, loading: saving } = useAsyncAction(async () => {
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
        const diasTrabajo =
          form.role === "VENDEDOR"
            ? form.diasTrabajo.trim()
              ? form.diasTrabajo
              : null
            : null;

        if (invitar) {
          // Crear usuario sin contraseña y mandar mail de invitación.
          const res = await fetch("/api/usuarios/invitar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: form.email,
              name: form.name || undefined,
              role: form.role,
              horarioEntrada: form.horarioEntrada || null,
              horarioSalida: form.horarioSalida || null,
              diasTrabajo,
            }),
          });
          const d = await res.json();
          if (!res.ok) throw new Error(d.error ?? "Error");
          onSaved({ ...(d.user as Usuario), tienePassword: false }, "create");
          if (d.emailEnviado) {
            notificar.ok(`Invitación enviada a ${form.email}`);
          } else {
            notificar.advertencia(
              d.error ?? "Usuario creado, pero no se pudo enviar el mail. Reenviá la invitación."
            );
          }
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
              diasTrabajo,
            }),
          });
          if (!res.ok) {
            const d = await res.json();
            throw new Error(d.error ?? "Error");
          }
          const created = (await res.json()) as Usuario;
          onSaved({ ...created, tienePassword: true }, "create");
        }
      }
      onOpenChange(false);
    } catch (err) {
      notificar.error(err instanceof Error ? err.message : "Error al guardar");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void guardar();
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
            <Label htmlFor="usuario-email">Email</Label>
            <Input
              id="usuario-email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              type="email"
              required
              disabled={!!userToEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="usuario-nombre">Nombre</Label>
            <Input
              id="usuario-nombre"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          {!userToEdit && EMAIL_ENABLED && (
            <label className="flex items-start gap-3 rounded-md border border-border p-3">
              <input
                type="checkbox"
                checked={invitar}
                onChange={(e) => setInvitar(e.target.checked)}
                className="mt-0.5 size-4 accent-foreground"
              />
              <span className="text-sm">
                <span className="font-medium">Enviar invitación por email</span>
                <span className="block text-xs text-muted-foreground">
                  El usuario recibe un enlace para definir su propia contraseña.
                  Desmarcá para asignarle una contraseña vos.
                </span>
              </span>
            </label>
          )}
          {(userToEdit || !invitar) && (
            <div className="space-y-2">
              <Label htmlFor="usuario-password">Contraseña {userToEdit && "(dejar vacío para no cambiar)"}</Label>
              <Input
                id="usuario-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                type="password"
                required={!userToEdit && !invitar}
                minLength={6}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="usuario-rol">Rol</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
            >
              <SelectTrigger id="usuario-rol" className="w-full">
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
              <Label htmlFor="usuario-entrada">Horario entrada</Label>
              <Input
                id="usuario-entrada"
                type="time"
                className="font-mono tabular-nums"
                value={form.horarioEntrada}
                onChange={(e) =>
                  setForm((f) => ({ ...f, horarioEntrada: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usuario-salida">Horario salida</Label>
              <Input
                id="usuario-salida"
                type="time"
                className="font-mono tabular-nums"
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
                L a D = lunes a domingo. Marcá los días que trabaja.
              </p>
              <div className="grid max-w-xs grid-cols-7 gap-1">
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
                      aria-pressed={trabaja}
                      className={cn(
                        // Control segmentado compacto: en celular el objetivo táctil
                        // manda, pero siete días tienen que entrar en 375 px.
                        "h-10 w-full rounded-md border font-mono text-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        trabaja
                          ? "border-action bg-action font-medium text-action-foreground"
                          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                      title={trabaja ? "Quitar día" : "Agregar día"}
                    >
                      {letra}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving} loadingText="Guardando…">
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
