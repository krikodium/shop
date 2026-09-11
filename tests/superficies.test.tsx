import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Figure, FigureGrid } from "@/components/ui/figure";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat, StatGrid } from "@/components/ui/stat";

describe("Panel", () => {
  it("es una superficie plana sin borde de color ni degradado ni sombra", () => {
    const { container } = render(
      <Panel>
        <PanelBody>contenido</PanelBody>
      </Panel>
    );
    const clases = container.firstElementChild?.className ?? "";
    expect(clases).toContain("border-border");
    expect(clases).not.toMatch(/border-(?:l|r|t|b)-4/);
    expect(clases).not.toMatch(/bg-gradient/);
    expect(clases).not.toMatch(/shadow-(?:md|lg|xl)/);
  });

  it("PanelHeader muestra título, descripción y acciones", () => {
    render(
      <Panel>
        <PanelHeader
          title="Ventas del mes"
          descripcion="Últimos 30 días"
          acciones={<button>Exportar</button>}
        />
      </Panel>
    );
    expect(screen.getByText("Ventas del mes")).toBeInTheDocument();
    expect(screen.getByText("Últimos 30 días")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar" })).toBeInTheDocument();
  });
});

describe("Figure", () => {
  it("muestra label, valor y hint", () => {
    render(<Figure label="Total" valor="$ 1.000" hint="12 ventas" />);
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("$ 1.000")).toBeInTheDocument();
    expect(screen.getByText("12 ventas")).toBeInTheDocument();
  });

  it("la cifra usa fuente mono tabular", () => {
    render(<Figure label="Total" valor="$ 1.000" />);
    const clases = screen.getByText("$ 1.000").className;
    expect(clases).toContain("font-mono");
    expect(clases).toContain("tabular-nums");
  });

  it("aplica el color SOLO a la cifra según el tono", () => {
    render(<Figure label="Ganancia" valor="$ 500" tono="positivo" />);
    expect(screen.getByText("$ 500").className).toContain("text-num-positive");
    expect(screen.getByText("Ganancia").className).not.toContain("text-num-positive");
  });

  it("el tono neutro no pinta la cifra", () => {
    render(<Figure label="Total" valor="$ 500" />);
    expect(screen.getByText("$ 500").className).not.toMatch(/text-num-/);
  });

  it("FigureGrid separa con divisores de 1px por huecos, no con cajas sueltas", () => {
    const { container } = render(
      <FigureGrid columnas={3}>
        <Figure label="A" valor="1" />
        <Figure label="B" valor="2" />
        <Figure label="C" valor="3" />
      </FigureGrid>
    );
    const grilla = container.firstElementChild as HTMLElement;
    const clasesGrilla = grilla?.className ?? "";
    expect(clasesGrilla).toContain("gap-px");
    expect(clasesGrilla).toContain("bg-border");
    expect(clasesGrilla).toContain("border-border");
    for (const celda of Array.from(grilla.children)) {
      expect((celda as HTMLElement).className).toContain("bg-card");
    }
  });
});

describe("EmptyState", () => {
  it("muestra el título y la acción", () => {
    render(<EmptyState titulo="Sin ventas" accion={<button>Nueva venta</button>} />);
    expect(screen.getByText("Sin ventas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nueva venta" })).toBeInTheDocument();
  });
});

describe("compatibilidad", () => {
  it("Stat y StatGrid siguen funcionando", () => {
    render(
      <StatGrid>
        <Stat label="Total" value="$ 1.000" />
      </StatGrid>
    );
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("$ 1.000")).toBeInTheDocument();
  });

  it("Stat traduce el tone viejo al tono nuevo", () => {
    render(<Stat label="Ganancia" value="$ 500" tone="positive" />);
    expect(screen.getByText("$ 500").className).toContain("text-num-positive");
  });
});
