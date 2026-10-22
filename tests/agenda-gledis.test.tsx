import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  analizarTiempoNota,
  COLORES_NOTA,
  CONTEXTOS_NOTA,
  crearNotasInicialesGledis,
  fechaLocalISO,
} from "@/lib/agenda-gledis";
import { gruposNav } from "@/lib/nav-config";
import { AgendaGledis } from "@/components/agenda/AgendaGledis";

describe("Agenda de Gledis", () => {
  it("aparece en el panel lateral dentro del grupo Operación", () => {
    const grupos = gruposNav(false);
    const operacion = grupos.find((g) => g.titulo === "Operación");
    expect(operacion?.items.some((i) => i.href === "/agenda")).toBe(true);
  });

  it("calcula el contexto temporal de fecha y horario correctamente", () => {
    const base = new Date(2026, 9, 19, 14, 0); // 19 Oct 2026 14:00
    const hoy = fechaLocalISO(0, base);
    const manana = fechaLocalISO(1, base);
    const ayer = fechaLocalISO(-1, base);

    const estadoHoy = analizarTiempoNota(hoy, "16:00", false, base);
    expect(estadoHoy.estado).toBe("hoy");
    expect(estadoHoy.etiquetaDia).toBe("Hoy");
    expect(estadoHoy.etiquetaRelativa).toContain("2 h");

    const estadoManana = analizarTiempoNota(manana, "10:30", false, base);
    expect(estadoManana.estado).toBe("manana");
    expect(estadoManana.etiquetaDia).toBe("Mañana");

    const estadoVencida = analizarTiempoNota(ayer, "18:00", false, base);
    expect(estadoVencida.estado).toBe("vencida");
    expect(estadoVencida.esUrgentePorTiempo).toBe(true);
  });

  it("dispone de paleta de colores y contextos operativos para Gledis", () => {
    expect(COLORES_NOTA.length).toBeGreaterThanOrEqual(6);
    expect(CONTEXTOS_NOTA.map((c) => c.id)).toEqual([
      "entrega",
      "clienta",
      "proveedor",
      "local",
      "personal",
    ]);
    expect(crearNotasInicialesGledis().length).toBeGreaterThan(0);
  });

  it("renderiza el tablero de Agenda Gledys y permite agendar una nota rápida", () => {
    render(<AgendaGledis />);
    expect(screen.getByText("Agenda de Gledys")).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Pasa Lucía a retirar/i);
    fireEvent.change(input, {
      target: { value: "Confirmar entrega de sillón con Marta" },
    });

    const botonAgendar = screen.getByRole("button", { name: /^Agendar$/i });
    fireEvent.click(botonAgendar);

    expect(
      screen.getByText("Confirmar entrega de sillón con Marta"),
    ).toBeInTheDocument();
  });
});
