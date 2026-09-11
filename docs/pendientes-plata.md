# Pendientes que tocan plata

Buzón del plan de rediseño monocromo (2026-09-10). Nada de acá se toca en ese
plan: son cambios que mueven montos, monedas, saldos o payloads de APIs de plata,
y por AGENTS.md §3 tienen que pasar por el subagente `security-auditor` dentro
del plan de pagos/señas.

| Fecha | Tarea que lo encontró | Archivo:línea | Qué se detectó | Por qué es plata |
| --- | --- | --- | --- | --- |
| 2026-09-10 | Relevamiento | `src/lib/procesarVenta.ts` | `estadoPago` se fuerza a `"PAGADO"` siempre | Impide señas y cobros parciales |
| 2026-09-10 | Relevamiento | `src/lib/procesarVenta.ts` | Aritmética en `number` (float) antes de convertir a `Prisma.Decimal` | Precisión de montos |
| 2026-09-11 | Tarea 4 (revisión) | `src/hooks/use-async-action.ts` | Los POST de plata (ventas, cierre de caja, rendiciones) no son idempotentes: si una request cuelga, reintentar puede duplicar el registro. El hook ya no rehabilita el botón, pero la solución de fondo es AbortController + clave de idempotencia en los endpoints | Duplicado de movimientos de plata |
