"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const suscribirNada = () => () => {};

/**
 * true solo después de hidratar; false en el servidor y en el render de
 * hidratación. `next-themes` lee el tema guardado de forma síncrona en el
 * inicializador de su propio estado, así que `resolvedTheme` ya puede valer
 * "dark" en el PRIMER render del cliente — usarlo solo no evita el mismatch.
 * `useSyncExternalStore` sí: devuelve el snapshot del servidor durante la
 * hidratación y recién después el del cliente, sin setState en un efecto.
 */
function useMontado() {
  return useSyncExternalStore(suscribirNada, () => true, () => false);
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const montado = useMontado();
  // `oscuro` solo se usa DESPUÉS de montar. Todo lo que se renderiza (ícono y
  // aria-label) tiene que salir de `oscuroVisible`: si alguna parte del DOM
  // usara `oscuro` a secas, el servidor y el primer render del cliente
  // diferirían y React tiraría un error de hidratación.
  const oscuro = resolvedTheme === "dark";
  const oscuroVisible = montado && oscuro;

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={oscuroVisible ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      onClick={() => setTheme(oscuro ? "light" : "dark")}
    >
      {oscuroVisible ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </Button>
  );
}
