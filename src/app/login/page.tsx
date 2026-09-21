"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncAction } from "@/hooks/use-async-action";
import { notificar } from "@/lib/notificar";
import { MarcoAcceso, MarcoAccesoCargando } from "./MarcoAcceso";

// Recuperación por mail: apagada hasta configurar SMTP (NEXT_PUBLIC_EMAIL_ENABLED)
const EMAIL_ENABLED = process.env.NEXT_PUBLIC_EMAIL_ENABLED === "true";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const { run: ingresar, loading } = useAsyncAction(async () => {
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        notificar.error("Email o contraseña incorrectos");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      notificar.error("Error al iniciar sesión");
    }
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void ingresar();
  }

  return (
    <MarcoAcceso titulo="Iniciar sesión" descripcion="Ingresá con tu cuenta para continuar.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@shop.com"
            required
            autoComplete="email"
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="h-10"
          />
        </div>
        <Button type="submit" className="w-full" loading={loading} loadingText="Entrando…">
          Ingresar
        </Button>
        {EMAIL_ENABLED && (
          <div className="text-center">
            <Link
              href="/forgot-password"
              className="rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        )}
      </form>
    </MarcoAcceso>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<MarcoAccesoCargando titulo="Iniciar sesión" />}>
      <LoginForm />
    </Suspense>
  );
}
