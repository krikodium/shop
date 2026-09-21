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
| 2026-09-17 | Hoja Ventas | `src/app/(dashboard)/ventas/VentasTable.tsx` + `src/app/api/ventas/route.ts` | El listado suma "Total facturado" y "Ganancia" en el cliente sobre lo que devuelve la API, que tiene `take: 100`. Hoy se aclara en pantalla que el agregado es "suma de las ventas listadas" y se avisa al alcanzar el tope, pero el total real del período debe venir del servidor | Total de plata incompleto presentado como total del período |
| 2026-09-21 | Área Caja (subagente) | `src/app/api/caja-chica/cierre-mensual/route.ts` | El cierre mensual suma movimientos en USD dentro de los totales en pesos, ignora la apertura en USD y suma con `number` (float) | Totales de caja mezclando monedas y con precisión flotante |
| 2026-09-21 | Área Caja (subagente) | `src/app/(dashboard)/caja-chica/page.tsx` | El saldo del turno se calcula en el navegador con `number` (float). Preexistente, no se tocó | Precisión de saldo de caja |
| 2026-09-21 | Área Consignación (subagente) | `src/app/(dashboard)/consignacion/rendiciones/[id]/page.tsx` | Una rendición en estado `PARCIAL` no se puede pagar desde la UI: "Confirmar pago" solo aparece en `PENDIENTE` | Pagos a proveedores que no se pueden completar |
| 2026-09-21 | Área Consignación (subagente) | `src/components/consignacion/rendicion-preview.tsx` | El equivalente USD de la preview se calcula en el cliente con float; el server calcula su propio `totalARendirUsd`. Pueden no coincidir por redondeo | Diferencia entre lo que se ve y lo que se registra |
| 2026-09-21 | Área Consignación (subagente) | `src/app/(dashboard)/compras/nueva/page.tsx` | Subtotal y total se calculan en float en el cliente (solo display). Confirmar que el server recalcula el total | Precisión de montos de compra |
| 2026-09-21 | Área Consignación (subagente) | `src/app/api/consignacion/deudas/route.ts` | Suma con `Number()` (float). Además, "Vendido en el período" era en realidad lo vendido todavía no rendido: se corrigió el rótulo, no el cálculo | Precisión de deuda con proveedores |
| 2026-09-21 | Área Consignación (subagente) | `src/app/api/consignacion/rendiciones/route.ts` | El listado trae `take: 50` y no avisa cuando se corta | Historial de pagos incompleto sin aviso |
