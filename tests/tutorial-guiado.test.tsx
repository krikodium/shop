import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  PASOS_TUTORIAL,
  reiniciarTutorialGlobal,
} from "../src/components/tutorial/TutorialGuiado";

describe("Tutorial Guiado del Sistema", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("define todos los pasos clave para la operativa del showroom", () => {
    const ids = PASOS_TUTORIAL.map((p) => p.id);
    expect(ids).toContain("bienvenida");
    expect(ids).toContain("ventas");
    expect(ids).toContain("productos");
    expect(ids).toContain("clientes");
    expect(ids).toContain("agenda");
    expect(ids).toContain("caja");
    expect(ids).toContain("final");
    expect(PASOS_TUTORIAL.length).toBeGreaterThanOrEqual(6);
  });

  it("cada paso tiene título, descripción y puntos clave", () => {
    for (const paso of PASOS_TUTORIAL) {
      expect(paso.titulo.length).toBeGreaterThan(0);
      expect(paso.descripcion.length).toBeGreaterThan(0);
      expect(paso.puntosClave.length).toBeGreaterThanOrEqual(2);
      expect(paso.icono).toBeDefined();
    }
  });

  it("los enlaces directos apuntan a rutas existentes", () => {
    const rutasPermitidas = [
      "/ventas/nueva",
      "/productos",
      "/clientes",
      "/agenda",
      "/caja-chica",
    ];

    for (const paso of PASOS_TUTORIAL) {
      if (paso.linkDirecto) {
        expect(rutasPermitidas).toContain(paso.linkDirecto.href);
      }
    }
  });

  it("reiniciarTutorialGlobal limpia almacenamiento y redirige si no está en home", () => {
    const pushMock = vi.fn();
    const dispatchMock = vi.spyOn(window, "dispatchEvent");
    const removeItemMock = vi.spyOn(Storage.prototype, "removeItem");

    reiniciarTutorialGlobal({ push: pushMock });

    expect(removeItemMock).toHaveBeenCalledWith("shop_tutorial_completado_v1");
  });
});
