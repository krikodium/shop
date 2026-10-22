"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reiniciarTutorialGlobal } from "./TutorialGuiado";

interface BotonTutorialProps {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  texto?: string;
}

export function BotonTutorial({
  className,
  variant = "outline",
  size = "sm",
  texto = "Ver tutorial interactivo",
}: BotonTutorialProps) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => reiniciarTutorialGlobal(router)}
    >
      <Sparkles className="size-3.5 mr-1.5" />
      <span>{texto}</span>
    </Button>
  );
}
