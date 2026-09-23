import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  SelectorVistaCatalogo,
  VISTAS_CATALOGO,
  esVistaCatalogo,
} from "@/components/punto-venta/SelectorVistaCatalogo";

describe("SelectorVistaCatalogo", () => {
  it("es un radiogroup accesible con nombre", () => {
    render(<SelectorVistaCatalogo valor="fotos" onCambiar={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: "Vista del catálogo" })).toBeInTheDocument();
  });

  it("ofrece tres opciones con aria-label que empieza por su texto visible", () => {
    render(<SelectorVistaCatalogo valor="fotos" onCambiar={() => {}} />);
    const opciones = screen.getAllByRole("radio");
    expect(opciones).toHaveLength(3);
    expect(opciones.map((o) => o.textContent)).toEqual(["Fotos", "Lista", "Compacta"]);
    for (const opcion of opciones) {
      expect(opcion.getAttribute("aria-label")?.startsWith(opcion.textContent ?? "")).toBe(true);
    }
  });

  it("marca solo la activa con aria-checked", () => {
    render(<SelectorVistaCatalogo valor="lista" onCambiar={() => {}} />);
    expect(screen.getByRole("radio", { name: /^Lista/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /^Fotos/ })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: /^Compacta/ })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("avisa el cambio al hacer clic en otra vista", async () => {
    const alCambiar = vi.fn();
    render(<SelectorVistaCatalogo valor="fotos" onCambiar={alCambiar} />);
    await userEvent.click(screen.getByRole("radio", { name: /^Compacta/ }));
    expect(alCambiar).toHaveBeenCalledExactlyOnceWith("compacta");
  });

  it("no avisa si se hace clic en la que ya está activa", async () => {
    const alCambiar = vi.fn();
    render(<SelectorVistaCatalogo valor="fotos" onCambiar={alCambiar} />);
    await userEvent.click(screen.getByRole("radio", { name: /^Fotos/ }));
    expect(alCambiar).not.toHaveBeenCalled();
  });

  it("con flechas mueve la selección, como un grupo de radios", async () => {
    const alCambiar = vi.fn();
    render(<SelectorVistaCatalogo valor="fotos" onCambiar={alCambiar} />);
    const activa = screen.getByRole("radio", { name: /^Fotos/ });
    expect(activa).toHaveAttribute("tabindex", "0");
    activa.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(alCambiar).toHaveBeenLastCalledWith("lista");
    expect(screen.getByRole("radio", { name: /^Lista/ })).toHaveFocus();
  });

  it("desde la primera, flecha izquierda da la vuelta a la última", async () => {
    const alCambiar = vi.fn();
    render(<SelectorVistaCatalogo valor="fotos" onCambiar={alCambiar} />);
    screen.getByRole("radio", { name: /^Fotos/ }).focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(alCambiar).toHaveBeenLastCalledWith("compacta");
  });
});

describe("configuración de vistas", () => {
  it("tamaños de página: fotos 12, lista 25, compacta 40", () => {
    expect(Object.fromEntries(VISTAS_CATALOGO.map((v) => [v.id, v.porPagina]))).toEqual({
      fotos: 12,
      lista: 25,
      compacta: 40,
    });
  });

  it("reconoce solo las vistas válidas", () => {
    expect(esVistaCatalogo("lista")).toBe(true);
    expect(esVistaCatalogo("grilla")).toBe(false);
    expect(esVistaCatalogo(null)).toBe(false);
  });
});
