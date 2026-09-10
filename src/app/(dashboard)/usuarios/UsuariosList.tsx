"use client";

import { useState } from "react";
import { Search, Pencil, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Usuario } from "./types";
import { ROLES, DIAS_SEMANA, parseDiasTrabajo, inicialesUsuario } from "./constants";

// Reenvío por mail: apagado hasta configurar SMTP (NEXT_PUBLIC_EMAIL_ENABLED)
const EMAIL_ENABLED = process.env.NEXT_PUBLIC_EMAIL_ENABLED === "true";

interface UsuariosListProps {
  usuarios: Usuario[];
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  roleFilter: string;
  onRoleFilterChange: (role: string) => void;
  totalBeforeFilter: number;
  onEdit: (u: Usuario) => void;
  onResend: (u: Usuario) => Promise<void> | void;
}

export function UsuariosList({
  usuarios,
  searchQuery,
  onSearchQueryChange,
  roleFilter,
  onRoleFilterChange,
  totalBeforeFilter,
  onEdit,
  onResend,
}: UsuariosListProps) {
  const showNoResults = totalBeforeFilter > 0 && usuarios.length === 0;
  const [resendingId, setResendingId] = useState<string | null>(null);

  const handleResend = async (u: Usuario) => {
    setResendingId(u.id);
    try {
      await onResend(u);
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email…"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="border-border/80 bg-background/80 pl-9 shadow-sm transition-shadow focus-visible:shadow-md"
          />
        </div>
        <Select value={roleFilter} onValueChange={onRoleFilterChange}>
          <SelectTrigger className="w-full border-border/80 bg-background/80 shadow-sm sm:w-[200px]">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showNoResults ? (
        <Card className="border-dashed bg-muted/20 py-14 text-center">
          <p className="text-muted-foreground">
            No hay usuarios que coincidan con los filtros.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Probá otra búsqueda o cambiá el filtro de rol.
          </p>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {usuarios.map((u) => (
            <li key={u.id}>
              <Card className="group h-full overflow-hidden border-border/70 bg-card/80 p-5 shadow-sm transition-all duration-200 hover:border-primary/25 hover:shadow-md">
                <div className="flex gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary transition-colors group-hover:bg-primary/15"
                    aria-hidden
                  >
                    {inicialesUsuario(u.name, u.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold leading-tight text-foreground">
                      {u.name?.trim() || "Sin nombre"}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{u.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                        {ROLES.find((r) => r.value === u.role)?.label ?? u.role}
                      </Badge>
                      {u.tienePassword === false && (
                        <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                          Acceso pendiente
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                  <span>
                    {u.horarioEntrada && u.horarioSalida
                      ? `${u.horarioEntrada} – ${u.horarioSalida}`
                      : "Sin horario"}
                  </span>
                </div>

                {u.role === "VENDEDOR" && (
                  <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Días de trabajo">
                    {DIAS_SEMANA.map(({ letra, num }) => {
                      const activos = parseDiasTrabajo(u.diasTrabajo);
                      const on = activos.has(num);
                      return (
                        <span
                          key={num}
                          className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-semibold ${
                            on
                              ? "bg-green-600/90 text-white"
                              : "bg-muted text-muted-foreground/70"
                          }`}
                          title={on ? `Trabaja ${letra}` : `No ${letra}`}
                        >
                          {letra}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 gap-2 transition-colors hover:bg-primary/10 hover:text-primary"
                    onClick={() => onEdit(u)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  {EMAIL_ENABLED && (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    disabled={resendingId === u.id}
                    onClick={() => handleResend(u)}
                    title={
                      u.tienePassword === false
                        ? "Reenviar invitación"
                        : "Enviar enlace de restablecimiento"
                    }
                  >
                    <Send className="h-4 w-4" />
                    {resendingId === u.id
                      ? "Enviando…"
                      : u.tienePassword === false
                        ? "Reenviar"
                        : "Reset"}
                  </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
