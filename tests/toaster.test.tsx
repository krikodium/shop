import { describe, expect, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const capturado: Record<string, unknown> = {};
let mockResolvedTheme: string | undefined = "light";

vi.mock("sonner", () => ({
  Toaster: (props: Record<string, unknown>) => {
    Object.assign(capturado, props);
    return <div data-testid="toaster" />;
  },
}));
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: mockResolvedTheme }),
}));

import { Toaster } from "@/components/ui/sonner";

describe("Toaster", () => {
  beforeEach(() => {
    mockResolvedTheme = "light";
    Object.keys(capturado).forEach((k) => delete capturado[k]);
  });

  it("se ubica abajo a la derecha", () => {
    render(<Toaster />);
    expect(capturado.position).toBe("bottom-right");
  });

  it("no usa richColors (paleta saturada de sonner)", () => {
    render(<Toaster />);
    expect(capturado.richColors).toBeFalsy();
  });

  it("con tema dark, pasa theme: dark", () => {
    mockResolvedTheme = "dark";
    render(<Toaster />);
    expect(capturado.theme).toBe("dark");
  });

  it("con tema undefined, pasa theme: system", () => {
    mockResolvedTheme = undefined;
    render(<Toaster />);
    expect(capturado.theme).toBe("system");
  });
});
