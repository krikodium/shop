"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncAction } from "@/hooks/use-async-action";
import { notificar } from "@/lib/notificar";
import { MarcoAcceso, MarcoAccesoCargando } from "@/app/login/MarcoAcceso";

function SetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  const sinToken = !token;

  const { run: guardar, loading } = useAsyncAction(async () => {
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        notificar.error(data.error ?? "No se pudo definir la contraseña");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch {
      notificar.error("Error de conexión. Intentá de nuevo.");
    }
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 6) {
      notificar.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      notificar.error("Las contraseñas no coinciden");
      return;
    }

    void guardar();
  }

  return (
    <MarcoAcceso
      titulo="Definir contraseña"
      descripcion={
        done ? "Listo: tu contraseña quedó guardada." : "Elegí una contraseña para tu cuenta del Shop."
      }
    >
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground" role="status">
            Te llevamos al inicio de sesión…
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Ir a iniciar sesión</Link>
          </Button>
        </div>
      ) : sinToken ? (
        <div className="space-y-4">
          <p className="text-sm">
            Falta el token o el enlace es inválido. Pedí una nueva invitación o un
            restablecimiento de contraseña.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/forgot-password">Restablecer contraseña</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Repetir contraseña</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="h-10"
            />
          </div>
          <Button type="submit" className="w-full" loading={loading} loadingText="Guardando…">
            Guardar contraseña
          </Button>
        </form>
      )}
    </MarcoAcceso>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<MarcoAccesoCargando titulo="Definir contraseña" />}>
      <SetPasswordForm />
    </Suspense>
  );
}
