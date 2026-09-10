"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Plus } from "lucide-react";
import type { Usuario } from "./types";
import { UsuariosSkeleton } from "./UsuariosSkeleton";
import { UsuariosList } from "./UsuariosList";
import { UsuarioFormDialog } from "./UsuarioFormDialog";

function sortUsuarios(list: Usuario[]): Usuario[] {
  return [...list].sort((a, b) => {
    const an = (a.name?.trim() || a.email).toLowerCase();
    const bn = (b.name?.trim() || b.email).toLowerCase();
    return an.localeCompare(bn, "es");
  });
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<Usuario | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/usuarios")
      .then((res) => {
        if (!res.ok) throw new Error("No autorizado");
        return res.json();
      })
      .then((data: Usuario[]) => setUsuarios(Array.isArray(data) ? data : []))
      .catch(() => setUsuarios([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
    load();
  }, [load]);

  const filteredUsuarios = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return usuarios.filter((u) => {
      const roleOk = roleFilter === "all" || u.role === roleFilter;
      const nameOk = !q || (u.name?.toLowerCase().includes(q) ?? false);
      const emailOk = !q || u.email.toLowerCase().includes(q);
      const searchOk = !q || nameOk || emailOk;
      return roleOk && searchOk;
    });
  }, [usuarios, searchQuery, roleFilter]);

  const openNew = useCallback(() => {
    setUserToEdit(null);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((u: Usuario) => {
    setUserToEdit(u);
    setDialogOpen(true);
  }, []);

  const handleResend = useCallback(async (u: Usuario) => {
    try {
      const res = await fetch(`/api/usuarios/${u.id}/reenviar`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "No se pudo enviar");
      toast.success(
        d.tipo === "INVITACION"
          ? `Invitación reenviada a ${u.email}`
          : `Enlace de restablecimiento enviado a ${u.email}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al reenviar acceso");
    }
  }, []);

  const handleSaved = useCallback(
    (user: Usuario, mode: "create" | "update") => {
      if (mode === "create") {
        setUsuarios((prev) => sortUsuarios([...prev, user]));
      } else {
        setUsuarios((prev) =>
          prev.map((x) => (x.id === user.id ? { ...x, ...user } : x))
        );
      }
    },
    []
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        overline="Administración · Equipo"
        title="Usuarios"
        description="Equipo del sistema: roles, horarios y acceso"
      >
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </PageHeader>

      {loading ? (
        <UsuariosSkeleton />
      ) : usuarios.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center">
            <p className="text-muted-foreground">
              No hay usuarios o no tenés permiso para verlos
            </p>
            <Button variant="link" className="mt-2" onClick={() => load()}>
              Reintentar carga
            </Button>
          </CardContent>
        </Card>
      ) : (
        <UsuariosList
          usuarios={filteredUsuarios}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          totalBeforeFilter={usuarios.length}
          onEdit={openEdit}
          onResend={handleResend}
        />
      )}

      <UsuarioFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userToEdit={userToEdit}
        onSaved={handleSaved}
      />
    </div>
  );
}
