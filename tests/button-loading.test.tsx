import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

function EnlaceDePrueba({ children }: { children: ReactNode }) {
  return <a href="/destino">{children}</a>;
}

describe("Button con estado de carga", () => {
  it("sin loading no muestra indicador y es clickeable", async () => {
    const alHacerClic = vi.fn();
    render(<Button onClick={alHacerClic}>Guardar</Button>);
    const boton = screen.getByRole("button", { name: "Guardar" });
    expect(boton).not.toHaveAttribute("aria-busy", "true");
    expect(boton.querySelector("[data-slot='spinner']")).toBeNull();
    await userEvent.click(boton);
    expect(alHacerClic).toHaveBeenCalledOnce();
  });

  it("con loading muestra el spinner, queda deshabilitado y marca aria-busy", () => {
    render(<Button loading>Guardar</Button>);
    const boton = screen.getByRole("button");
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute("aria-busy", "true");
    expect(boton.querySelector("[data-slot='spinner']")).not.toBeNull();
  });

  it("con loading no dispara onClick", async () => {
    const alHacerClic = vi.fn();
    render(
      <Button loading onClick={alHacerClic}>
        Guardar
      </Button>
    );
    await userEvent.click(screen.getByRole("button"));
    expect(alHacerClic).not.toHaveBeenCalled();
  });

  it("conserva el texto original si no se pasa loadingText", () => {
    render(<Button loading>Guardar</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Guardar");
  });

  it("usa loadingText cuando se lo pasan", () => {
    render(
      <Button loading loadingText="Guardando…">
        Guardar
      </Button>
    );
    expect(screen.getByRole("button")).toHaveTextContent("Guardando…");
  });

  it("respeta disabled propio aunque no esté cargando", () => {
    render(<Button disabled>Guardar</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("con asChild sigue renderizando un único hijo, sin inyectar el spinner", () => {
    render(
      <Button asChild>
        <EnlaceDePrueba>Ir al destino</EnlaceDePrueba>
      </Button>
    );
    const enlace = screen.getByRole("link", { name: "Ir al destino" });
    expect(enlace).toHaveAttribute("href", "/destino");
    expect(enlace.querySelector("[data-slot='spinner']")).toBeNull();
  });
});
