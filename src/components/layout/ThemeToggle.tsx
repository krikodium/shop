"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // `resolvedTheme` es `undefined` en el servidor y en el primer render del
  // cliente (hasta que next-themes lee el tema real). Usarlo directamente,
  // en vez de un estado "montado" seteado en un efecto, evita el desajuste
  // de hidratación sin disparar cascading renders.
  const montado = resolvedTheme !== undefined;
  const oscuro = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      onClick={() => setTheme(oscuro ? "light" : "dark")}
    >
      {montado && oscuro ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </Button>
  );
}
