import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("sonner", () => {
  const base = vi.fn(() => 1);
  return {
    toast: Object.assign(base, {
      success: vi.fn(() => 2),
      error: vi.fn(() => 3),
      warning: vi.fn(() => 4),
      promise: vi.fn(() => 5),
    }),
  };
});

import { toast } from "sonner";
import { notificar } from "@/lib/notificar";

describe("notificar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ok delega en toast.success", () => {
    notificar.ok("Guardado");
    expect(toast.success).toHaveBeenCalledWith("Guardado", expect.any(Object));
  });

  it("error delega en toast.error", () => {
    notificar.error("Falló");
    expect(toast.error).toHaveBeenCalledWith("Falló", expect.any(Object));
  });

  it("advertencia delega en toast.warning", () => {
    notificar.advertencia("Ojo");
    expect(toast.warning).toHaveBeenCalledWith("Ojo", expect.any(Object));
  });

  it("info delega en toast()", () => {
    notificar.info("Dato");
    expect(toast).toHaveBeenCalledWith("Dato", expect.any(Object));
  });

  it("traduce descripcion y duracion a la API de sonner", () => {
    notificar.ok("Guardado", { descripcion: "Cliente V-001", duracion: 8000 });
    expect(toast.success).toHaveBeenCalledWith("Guardado", {
      description: "Cliente V-001",
      duration: 8000,
    });
  });

  it("error acepta un Error y usa su message", () => {
    notificar.error(new Error("Sin stock"));
    expect(toast.error).toHaveBeenCalledWith("Sin stock", expect.any(Object));
  });

  it("error con valor desconocido usa un mensaje genérico", () => {
    notificar.error(undefined);
    expect(toast.error).toHaveBeenCalledWith(
      "Ocurrió un error inesperado",
      expect.any(Object)
    );
  });

  it("promesa delega en toast.promise con las claves de sonner", () => {
    const p = Promise.resolve("x");
    notificar.promesa(p, { cargando: "Guardando…", ok: "Listo", error: "Falló" });
    expect(toast.promise).toHaveBeenCalledWith(p, {
      loading: "Guardando…",
      success: "Listo",
      error: "Falló",
    });
  });
});
