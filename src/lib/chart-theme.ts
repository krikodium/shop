/**
 * Tema de gráficos: escala de grises. Las series se distinguen por posición,
 * etiqueta y trazo, nunca solo por el tono (accesibilidad + regla monocroma).
 * Recharts acepta `var(--…)` como color de relleno y trazo.
 */
export const COLORES_GRAFICO = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/** Props compartidas de los ejes: tipografía chica, sin línea de eje. */
export const ejeGrafico = {
  tick: { fontSize: 11, fill: "var(--muted-foreground)" },
  axisLine: false,
  tickLine: false,
} as const;

/** Props del tooltip para que siga la superficie del tema. */
export const tooltipGrafico = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "0.5rem",
    fontSize: "12px",
    padding: "0.5rem 0.625rem",
    boxShadow: "none",
  },
  /** Recharts pinta cada item con el color de su serie: en gris sobre gris no
   *  se lee. Se fuerza el color de texto del popover. */
  itemStyle: { color: "var(--popover-foreground)", padding: 0 },
  labelStyle: {
    color: "var(--muted-foreground)",
    marginBottom: "0.25rem",
    fontSize: "11px",
  },
  cursor: { fill: "var(--accent)" },
} as const;

/** Eje de importes: 260.000 en vez de 260000, y 1,2 M cuando crece. */
export const formatoEjeMonto = (valor: number) =>
  `$ ${new Intl.NumberFormat("es-AR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(valor)}`;

/** Grilla de fondo: solo horizontales, en el color de borde del tema. */
export const grillaGrafico = {
  strokeDasharray: "3 3",
  stroke: "var(--border)",
  vertical: false,
} as const;
