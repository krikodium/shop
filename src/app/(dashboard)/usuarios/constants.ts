export const ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "VENDEDOR", label: "Vendedor" },
  { value: "VIEWER", label: "Solo lectura" },
] as const;

export const DIAS_SEMANA = [
  { letra: "L", num: 1 },
  { letra: "M", num: 2 },
  { letra: "X", num: 3 },
  { letra: "J", num: 4 },
  { letra: "V", num: 5 },
  { letra: "S", num: 6 },
  { letra: "D", num: 7 },
] as const;

export function parseDiasTrabajo(s: string | null): Set<number> {
  if (!s?.trim()) return new Set();
  return new Set(
    s
      .split(",")
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => n >= 1 && n <= 7)
  );
}

export function serializeDiasTrabajo(set: Set<number>): string {
  return [...set].sort((a, b) => a - b).join(",");
}

export function inicialesUsuario(name: string | null, email: string): string {
  const n = name?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}
