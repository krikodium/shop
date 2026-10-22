"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Plus, UserCog } from "lucide-react";
import { notificar } from "@/lib/notificar";
import { Resumen } from "@/components/ui/resumen";
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

  const metricas = useMemo(() => {
    const total = usuarios.length;
    const admins = usuarios.filter((u) => u.role === "ADMIN").length;
    const vendedores = usuarios.filter((u) => u.role === "VENDEDOR").length;
    const activos = usuarios.filter((u) => u.tienePassword !== false).length;
    return { total, admins, vendedores, activos };
  }, [usuarios]);

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
      notificar.ok(
        d.tipo === "INVITACION"
          ? `Invitación reenviada a ${u.email}`
          : `Enlace de restablecimiento enviado a ${u.email}`
      );
    } catch (err) {
      notificar.error(err instanceof Error ? err.message : "Error al reenviar acceso");
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
    <div className="space-y-6">
      <PageHeader
        overline="Administración · Equipo"
        title="Usuarios"
        description="Equipo del sistema: roles, horarios y acceso"
      >
        <Button onClick={openNew}>
          <Plus aria-hidden="true" />
          Nuevo usuario
        </Button>
      </PageHeader>

      {loading ? (
        <UsuariosSkeleton />
      ) : usuarios.length === 0 ? (
        <EmptyState
          icono={UserCog}
          titulo="No hay usuarios para mostrar"
          descripcion="O no tenés permiso para verlos."
          accion={
            <Button variant="outline" size="sm" onClick={() => load()}>
              Reintentar carga
            </Button>
          }
        />
      ) : (
        <>
          <Resumen
            items={[
              {
                label: "Equipo total",
                valor: metricas.total,
                hint: "Cuentas registradas en el sistema",
              },
              {
                label: "Administradores",
                valor: metricas.admins,
                hint: "Acceso completo a gestión y reportes",
              },
              {
                label: "Vendedores",
                valor: metricas.vendedores,
                hint: "Operación en salón, caja y pedidos",
              },
              {
                label: "Acceso activo",
                valor: `${metricas.activos}/${metricas.total}`,
                hint: "Con contraseña configurada",
              },
            ]}
          />
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
        </>
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
