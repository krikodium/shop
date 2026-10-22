# Dashboard y pedidos — estado verificado al 9 de octubre de 2026

## Implementado

- Pedidos reales: alta de clienta con contacto, productos y especificaciones, fecha prometida, responsable, señas, pagos posteriores, anotaciones y seguimiento por cantidades.
- Recepción y entrega parcial independientes del estado de pago. Stock recibido de un encargo dedicado al pedido; no se cuenta como stock libre del catálogo.
- Entrega con saldo requiere administrador y motivo. Cancelación sin cobros ni entregas requiere administrador y motivo; devuelve al catálogo únicamente unidades recibidas y revierte estadísticas.
- Checkout con centavos en interfaz y Decimal en servidor; precios, costos y comisiones recalculados desde catálogo. Total confirmado obligatorio: un cambio de precio invalida la confirmación antes de registrar un cobro.
- Cobros ARS/USD con cotización propia persistida, transacciones serializables e idempotencia obligatoria de altas, cobros y eventos.
- Dashboard, clientas, reportes, CSV y PDF separan vendido, cobrado y saldo. Cobros del período por fecha efectiva; fechas comerciales de Buenos Aires. Los filtros de proveedor/categoría en ventas seleccionan operaciones completas; pantalla y PDF lo explicitan.
- Catálogo: plantilla vacía, validación y vista previa de Excel/CSV, importación completa transaccional con categorías/proveedores, precisión decimal y movimientos de stock auditados. Importación solo ADMIN.
- APIs requieren sesión y VIEWER no escribe; el rol se consulta nuevamente al usar una sesión existente.

## Base conectada

Se aplicaron las migraciones `20260923120000_pagos_venta` y `20261009183000_pedidos_reales`. El archivo de migración de pagos tenía modificaciones anteriores a esta tarea y se preservó intacto.

La CLI usa conexión directa de Neon para migrar; la app conserva su pooler. `DIRECT_URL`, cuando existe, tiene prioridad en la CLI. Se resolvió un bloqueo de migración abandonado únicamente en la conexión ociosa identificada como usada por el esquema aislado de esta verificación.

Se generaron respaldos antes y después de migrar. El respaldo posterior es `backups/shop-2026-10-09T17-10-10-655Z.json`: checksum e ida/vuelta JSON a tipos PostgreSQL verificados en transacción de solo lectura. Incluye datos personales y hashes; está excluido de Git. Restauración directa exige mismo destino y esquema, y datos comerciales vacíos.

El usuario autorizó la limpieza y se ejecutó el 9 de octubre de 2026 a las 14:19 de Buenos Aires. Se creó y verificó un respaldo nuevo antes del borrado: `backups/shop-2026-10-09T17-19-57-397Z.json`. La transacción y una consulta posterior verificaron las 16 tablas comerciales en cero. Se conservaron los 2 usuarios, tokens, jornadas y las 13 migraciones, comprobando que los registros preservados no cambiaron.

Se recibió `C:/Users/mateo/Downloads/inventario-final-01-HC.xlsx` y se inspeccionó inicialmente sin modificarlo. La hoja principal contiene 149 objetos; el propio archivo indica que faltan 624 ítems por revisar. El 19 de octubre el usuario volvió a adjuntar el archivo en la raíz del proyecto y autorizó su carga. Se importaron los 149 productos, 11 categorías y 27 proveedores en una sola transacción: 43 activos y 106 inactivos por datos pendientes, con 193 unidades efectivamente contadas. Los importes de moneda dudosa quedaron sin precio operativo y no se infirieron comisiones desde el margen. Datos originales, motivos, actor delegado y hash de fuente se conservaron en cada descripción. Respaldo previo: `backups/shop-2026-10-19T14-48-39-508Z.json`. Detalle en `docs/inventario-hc-pendientes-2026-10-19.md`. Importador revisado por subagente security-auditor: SIN HALLAZGOS luego de incorporar trazabilidad para productos sin stock.

## Verificación

- 162 pruebas unitarias/de componentes aprobadas; TypeScript aprobado, lint sin errores (9 advertencias preexistentes), build de producción aprobado.
- PostgreSQL en esquema aislado: migraciones desde cero, venta inmediata, alta idempotente, restricción VIEWER, seña/saldo, dos cobros concurrentes sin sobrecobro, reintento sin duplicación, recepción/entrega parcial y stock correcto.
- Navegador real: inicio de sesión, indicadores, alta de pedido ARS 333,25 con seña ARS 166,63, cobro de saldo ARS 166,62, encargo, recepción y entrega; comprobación móvil a 390 px.
- El script `npm run test:db-pedidos` reproduce el flujo y comprueba que un precio cambiado se rechaza; usa un schema temporal separado de public y lo elimina al terminar.
- Reejecución final del flujo PostgreSQL aprobada, incluido rechazo por cambio de precio. CSV y PDF descargados desde el navegador; PDF renderizado e inspeccionado, una página con cifras conciliadas. Ambos esquemas temporales y el servidor de prueba de esta sesión fueron eliminados/cerrados.

## Auditoría financiera

Subagente `security-auditor`, con las instrucciones de `.claude/agents/security-auditor.md`: **SIN HALLAZGOS** en el diff revisado luego de las correcciones. Alcance: pedidos, ventas/cobros, clientas, dashboard, reportes CSV/PDF, catálogo, mantenimiento, autenticación y migración aditiva. No es una auditoría de todas las funciones preexistentes del ERP.

| Punto | Evidencia revisada |
| --- | --- |
| Autorización | Sesión y roles actualizados; VIEWER sin escritura; excepciones/cancelaciones ADMIN; actor de sesión |
| SQL | Valores bindeados; identificadores de mantenimiento en lista fija |
| Precisión | Decimal y centavos; ROUND_HALF_UP; montos serializados como strings |
| Monedas | USD original y cotización persistida; equivalencia ARS validada |
| Atomicidad | Serializable, idempotencia, saldo derivado de cobros, importación transaccional |
| Validación | Schemas de servidor, estados/cantidades/stock, límites de archivos, total esperado |
| Auditoría | Autor/fecha, motivo de anulación, eventos e historial de cobros protegidos |

## Trabajo pendiente para cierre total

- Completar los datos pendientes de los 106 productos importados inactivos antes de habilitarlos para venta. El catálogo cargado contiene los 149 registros del Excel recibido, no los 624 ítems que el propio documento declara pendientes de revisar.
- Reembolsos y cancelaciones con cobros o entregas necesitan un circuito explícito de reversión. Actualmente se rechazan; no se borra ni se simula dinero devuelto.
- Encargos consignados están bloqueados hasta definir exigibilidad y liquidación a proveedores.
- Correo de pedidos no se implementó; no se enviaron mensajes reales.
- No se publicó un despliegue nuevo ni se hicieron commits.
