"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut, KeyRound } from "lucide-react";
import { CambiarPasswordDialog } from "./CambiarPasswordDialog";

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export function UserMenu() {
  const { data: session } = useSession();
  const [passwordOpen, setPasswordOpen] = useState(false);

  if (!session?.user) return null;

  const displayName = session.user.name ?? session.user.email ?? "Usuario";
  const initials = getInitials(session.user.name, session.user.email);

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-auto w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-accent"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-medium text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {displayName}
            </p>
            {session.user.email && (
              <p className="truncate text-xs text-muted-foreground">
                {session.user.email}
              </p>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem
          onClick={() => setPasswordOpen(true)}
          className="gap-2"
        >
          <KeyRound className="size-4" />
          Cambiar contraseña
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="gap-2"
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <CambiarPasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  );
}
