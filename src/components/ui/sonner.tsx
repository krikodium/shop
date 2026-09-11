"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Avisos de sistema: abajo a la derecha, monocromos y con la jerarquía dada
 * por el borde y el ícono, no por un fondo de color.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      position="bottom-right"
      richColors={false}
      closeButton
      duration={5000}
      gap={10}
      offset={20}
      toastOptions={{
        classNames: {
          toast:
            "group rounded-lg border border-border bg-popover text-popover-foreground shadow-sm",
          title: "text-sm font-medium",
          description: "text-xs text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          closeButton: "border-border bg-popover text-muted-foreground",
          success: "border-border",
          error: "border-destructive/50",
          warning: "border-border-strong",
          info: "border-border",
          loading: "border-border",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
