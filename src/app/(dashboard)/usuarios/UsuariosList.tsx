"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsyncAction } from "@/hooks/use-async-action";
import { cn } from "@/lib/utils";
import type { Usuario } from "./types";
import { ROLES, DIAS_SEMANA, parseDiasTrabajo } from "./constants";

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

/** Días de trabajo en mono: activos marcados con borde, inactivos atenuados. */
function DiasTrabajo({ dias }: { dias: string | null }) {
  const activos = parseDiasTrabajo(dias);
  const nombres = DIAS_SEMANA.filter(({ num }) => activos.has(num))
    .map(({ letra }) => letra)
    .join(" ");
  return (
    <span
      className="inline-flex gap-0.5 font-mono text-[11px]"
      aria-label={nombres ? `Trabaja: ${nombres}` : "Sin días asignados"}
    >
      {DIAS_SEMANA.map(({ letra, num }) => {
        const on = activos.has(num);
        return (
          <span
            key={num}
            aria-hidden="true"
            className={cn(
              "flex size-5 items-center justify-center rounded-sm border",
              on
                ? "border-border-strong font-medium text-foreground"
                : "border-transparent text-muted-foreground/50"
            )}
          >
            {letra}
          </span>
        );
      })}
    </span>
  );
}

/** Cada fila tiene su propio estado de envío: un reenvío no bloquea a los demás. */
function BotonReenviar({
  usuario,
  onResend,
}: {
  usuario: Usuario;
  onResend: (u: Usuario) => Promise<void> | void;
}) {
  const { run, loading } = useAsyncAction(async () => {
    await onResend(usuario);
  });
  const pendiente = usuario.tienePassword === false;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      loading={loading}
      loadingText="Enviando…"
      onClick={() => void run()}
      title={pendiente ? "Reenviar invitación" : "Enviar enlace de restablecimiento"}
    >
      {pendiente ? "Reenviar invitación" : "Restablecer acceso"}
    </Button>
  );
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
  const hayFiltros = searchQuery.trim() !== "" || roleFilter !== "all";

  const filtros = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          placeholder="Nombre o email"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="h-10 w-44 pl-9 sm:w-56"
          aria-label="Buscar usuarios"
        />
      </div>
      <Select value={roleFilter} onValueChange={onRoleFilterChange}>
        <SelectTrigger className="h-10 w-40" aria-label="Filtrar por rol">
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
      {hayFiltros && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onSearchQueryChange("");
            onRoleFilterChange("all");
          }}
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );

  return (
    <Panel>
      <PanelHeader
        title="Equipo"
        descripcion={
          <span className="font-mono tabular-nums">
            {usuarios.length === totalBeforeFilter
              ? `${totalBeforeFilter} usuarios`
              : `${usuarios.length} de ${totalBeforeFilter} usuarios`}
          </span>
        }
        acciones={filtros}
      />
      {showNoResults ? (
        <PanelBody>
          <EmptyState
            titulo="Ningún usuario coincide con los filtros"
            descripcion="Probá otra búsqueda o cambiá el filtro de rol."
          />
        </PanelBody>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Horario</TableHead>
              <TableHead>Días</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="max-w-[18rem]">
                  <p className="truncate font-medium">{u.name?.trim() || "Sin nombre"}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </TableCell>
                <TableCell>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={u.role === "ADMIN" ? "default" : "outline"}>
                      {ROLES.find((r) => r.value === u.role)?.label ?? u.role}
                    </Badge>
                    {u.tienePassword === false && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Acceso pendiente
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm tabular-nums">
                  {u.horarioEntrada && u.horarioSalida ? (
                    `${u.horarioEntrada}–${u.horarioSalida}`
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {u.role === "VENDEDOR" ? (
                    <DiasTrabajo dias={u.diasTrabajo} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center justify-end gap-1">
                    {EMAIL_ENABLED && <BotonReenviar usuario={u} onResend={onResend} />}
                    <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(u)}>
                      Editar
                    </Button>
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
