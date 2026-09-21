"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncAction } from "@/hooks/use-async-action";
import { MarcoAcceso } from "@/app/login/MarcoAcceso";

const claseLinkSecundario =
  "rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const { run: enviar, loading } = useAsyncAction(async () => {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(
        data.message ??
          "Si el email corresponde a una cuenta, te enviamos un enlace."
      );
    } catch {
      // Mensaje genérico igual, para no filtrar estado.
      setMessage(
        "Si el email corresponde a una cuenta, te enviamos un enlace."
      );
    }
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void enviar();
  }

  return (
    <MarcoAcceso
      titulo="Restablecer contraseña"
      descripcion="Te enviamos un enlace para elegir una contraseña nueva."
    >
      {message ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Volver a iniciar sesión</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
              required
              autoComplete="email"
              className="h-10"
            />
          </div>
          <Button type="submit" className="w-full" loading={loading} loadingText="Enviando…">
            Enviar enlace
          </Button>
          <div className="text-center">
            <Link href="/login" className={claseLinkSecundario}>
              Volver a iniciar sesión
            </Link>
          </div>
        </form>
      )}
    </MarcoAcceso>
  );
}
