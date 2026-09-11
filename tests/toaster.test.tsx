import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const capturado: Record<string, unknown> = {};
vi.mock("sonner", () => ({
  Toaster: (props: Record<string, unknown>) => {
    Object.assign(capturado, props);
    return <div data-testid="toaster" />;
  },
}));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));

import { Toaster } from "@/components/ui/sonner";

describe("Toaster", () => {
  it("se ubica abajo a la derecha", () => {
    render(<Toaster />);
    expect(capturado.position).toBe("bottom-right");
  });

  it("no usa richColors (paleta saturada de sonner)", () => {
    render(<Toaster />);
    expect(capturado.richColors).toBeFalsy();
  });

  it("sigue el tema resuelto en vez de fijar light", () => {
    render(<Toaster />);
    expect(capturado.theme).toBe("light");
  });
});
