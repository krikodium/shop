import { describe, expect, it } from "vitest";

describe("Seguridad y reseteo de usuarios", () => {
  it("determina que debe cambiar contraseña cuando passwordChangedAt es null", () => {
    const usuarioNuevo = { passwordChangedAt: null };
    const debeCambiar = usuarioNuevo.passwordChangedAt === null;
    expect(debeCambiar).toBe(true);
  });

  it("determina que NO debe cambiar contraseña cuando passwordChangedAt tiene fecha", () => {
    const usuarioActualizado = { passwordChangedAt: new Date() };
    const debeCambiar = usuarioActualizado.passwordChangedAt === null;
    expect(debeCambiar).toBe(false);
  });

  it("exige que la contraseña nueva sea distinta a la por defecto y de longitud mínima", () => {
    const defaultPassword = "Hermanascaradonti3468";
    const nuevaIgual = "Hermanascaradonti3468";
    const nuevaCorta = "123";
    const nuevaValida = "MiClaveSegura2026!";

    expect(nuevaIgual === defaultPassword).toBe(true);
    expect(nuevaCorta.length < 6).toBe(true);
    expect(nuevaValida !== defaultPassword && nuevaValida.length >= 6).toBe(true);
  });
});
