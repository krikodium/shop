# Plan de rediseño y pedidos por encargo — Shop

Fecha: 2026-09-07. Estado: propuesta para revisar con Mateo; implementación no iniciada.

## Objetivo

Convertir Shop en una herramienta de gestión sobria, completamente monocromática, con registro de ventas y encargos, anticipos, cobros posteriores, seguimiento de cada producto e historial. Preparar las notificaciones de estado por correo para configurarlas en una etapa posterior.

## Situación real del proyecto

- Next.js 16 App Router, React 19, TypeScript, Tailwind 4 y componentes Radix/shadcn. Persistencia con Prisma 7 y PostgreSQL; autenticación con NextAuth. Este proyecto no usa el esquema de Supabase de decodashboard.
- Ya existen ventas, productos, clientes, compras con recepción parcial, consignación, caja chica, reportes, usuarios y estadísticas.
- El directorio de trabajo contiene numerosos cambios locales, incluidos estilos, páginas, autenticación y correo. Antes de implementar se debe acordar el reparto de archivos y registrar el estado inicial para conservar esos cambios.
- El tema mantiene verde azulado, gráficos multicolor y colores explícitos en componentes. Cambiar únicamente el color principal no completa el rediseño.
- Venta tiene notas y estados PENDIENTE/PARCIAL/PAGADO, pero procesarVenta fuerza PAGADO. El formulario de nueva venta no envía notas.
- El pago dividido actual representa dos medios que cubren todo el total en una operación. No representa anticipos ni cobros en distintas fechas.
- Cada venta descuenta stock inmediatamente y puede ignorar la falta de stock. No existe seguimiento de fabricación o entrega.
- Hay infraestructura de correo con Nodemailer para invitaciones y recuperación de contraseñas; no se verificó su configuración ni el envío real.

Referencias principales: prisma/schema.prisma, src/lib/procesarVenta.ts, src/lib/validaciones/ventaSchema.ts, src/app/api/ventas, src/components/punto-venta/CarritoVenta.tsx, src/lib/consignacionHelpers.ts y src/app/globals.css.

## 1. Dirección visual

- Fondo blanco, texto negro y grises neutros para bordes, fondos secundarios y texto auxiliar. Sin acentos de color, degradados decorativos ni texturas.
- Acción principal negra con texto blanco; acciones secundarias con borde; estados diferenciados por texto, icono y tratamiento del borde.
- Tipografía existente, jerarquía consistente y números alineados. Tablas claras, espaciado regular y formularios con etiquetas visibles.
- Evitar grandes bloques decorativos y métricas que ocupan espacio sin ayudar a decidir.
- Estados de error, éxito, carga y vacío también monocromáticos. Foco visible por teclado, contraste legible y movimiento reducido.
- Gráficos con escala de grises, etiquetas y trazos distinguibles. No depender solo del tono para interpretar series.
- Aplicar a navegación, inicio, ventas, pedidos, productos, clientes, proveedores, compras, consignación, caja, reportes, usuarios, ayuda, acceso y comprobantes.
- Interpretación propuesta: la interfaz es monocromática; las fotografías de productos conservan su color real para identificar materiales y variantes.

## 2. Organización de pantallas

Navegación agrupada en Operación (Inicio, Nueva venta, Ventas, Pedidos, Clientes), Mercadería (Productos, Compras, Proveedores, Consignación y Rendiciones) y Administración (Caja, Reportes, Usuarios y estadísticas según permisos). Ayuda permanece accesible.

Inicio prioriza pedidos demorados, productos listos para entregar, saldos por cobrar y actividad del día. Diferenciar siempre total vendido, efectivamente cobrado y pendiente.

### Nueva venta

1. Seleccionar clienta y productos.
2. Indicar por producto si se entrega ahora, queda reservado o se manda a hacer. Permitir una operación mixta.
3. Completar especificaciones: medidas, terminación, proveedor/taller, fecha estimada y anotación interna.
4. Elegir cuánto cobra hoy: Sin pago, Anticipo 50%, Otro importe o Pago total.
5. Seleccionar medio y moneda. Si el cobro se divide entre medios, sus importes deben sumar lo cobrado hoy, no el total del pedido.
6. Mostrar total, cobrado hoy y saldo resultante antes de confirmar.

Clienta identificada y contacto obligatorios para encargos; email opcional hasta habilitar avisos. Venta inmediata puede conservar el flujo de consumidor final.

Los botones deben mostrar el importe calculado. Al cambiar cantidades o descuento se actualiza la opción porcentual. Un importe manual se conserva y se vuelve a validar.

### Pedidos

Bandeja con número, clienta, productos, fecha prometida, estado del producto, total, cobrado, saldo y última actividad. Filtros: pendientes de encargar, en fabricación, listos, con saldo, demorados y finalizados. Búsqueda por número, clienta o producto.

### Detalle del pedido

- Encabezado con clienta y resumen económico.
- Lista de productos, especificaciones, responsable/proveedor y cantidades recibidas/entregadas.
- Historial de pagos y comprobantes.
- Cronología de anotaciones, cambios de estado y entregas con autor y fecha.
- Acciones según estado: Registrar pago, Marcar encargado, Registrar recepción, Registrar entrega y Agregar anotación.
- Al volver a cobrar: Completar hasta 50%, Cobrar saldo y Otro importe. Completar hasta 50% significa alcanzar la mitad del total acumulado, no volver a cobrar la mitad.
- Anotaciones internas separadas de mensajes visibles para la clienta.

## 3. Reglas de negocio propuestas

Pago y producto se siguen por separado:

| Seguimiento | Estados |
| --- | --- |
| Pago | Pendiente, Parcial, Pagado; devoluciones registradas explícitamente |
| Producto | Pendiente de encargar, Encargado, En fabricación, Listo para entregar, Entregado, Cancelado |

El estado general del pedido se resume desde sus productos y cantidades. Una entrega parcial no marca todo el pedido como entregado. Pagar el saldo no modifica el estado físico.

Ejemplo: pedido de ARS 200.000, anticipo ARS 100.000, saldo ARS 100.000. Puede figurar Pagado mientras sigue En fabricación, o Listo para entregar con pago Parcial.

Propuestas iniciales pendientes de validar con Mateo:

- Precio fijado al registrar el encargo. Si se necesita ajuste, agregar una revisión explícita con motivo, autor y nuevo saldo; no sobrescribir el acuerdo silenciosamente.
- No entregar con saldo salvo excepción autorizada por administrador y registrada.
- Cancelar un pedido no equivale a devolver dinero: registrar por separado cancelación, devolución y efecto sobre inventario.
- Definir cuándo un encargo en consignación genera deuda exigible al proveedor antes de habilitar ese caso. No asumir que cobrar una seña liquida toda la consignación.

## 4. Datos y comportamiento técnico

- Conservar Venta como documento comercial para evitar duplicar totales entre módulos.
- Incorporar Pedido opcional vinculado uno a uno con Venta: clienta, fecha prometida, responsable y datos generales del encargo.
- Seguimiento por ítem y cantidades, con eventos de recepción y entrega. Permitir separación de líneas del mismo producto cuando tengan especificaciones distintas.
- Incorporar PagoVenta uno a muchos: monto y moneda originales, tipo de cambio propio del cobro, equivalente imputado en ARS, medio, fecha, usuario, referencia y clave para evitar duplicados. Correcciones mediante reversión trazable.
- Mantener la denominación ARS de las ventas actuales; pagos en USD conservan USD originales y cotización del día del cobro. No revalorizar cobros anteriores al cambiar el tipo de cambio.
- Usar Decimal desde el cálculo inicial y contratos monetarios como strings decimales. Redondeo explícito de importes a dos decimales; documentar precisión del tipo de cambio y reparto del último centavo.
- Recalcular precios autorizados, descuentos, costos y deuda en servidor a partir de productos y reglas. No aceptar subtotales o costos del navegador como fuente de verdad.
- Transacciones para cobro, saldo, historial y eventual movimiento asociado; protección contra doble clic, reintentos y cobros simultáneos.
- No representar encargos con stock negativo. Separar existencias físicas, reservas y pendiente de recibir. Recepción, reserva y entrega deben tener efectos definidos y no duplicar movimientos de compras.
- Cobrar cuotas posteriores no vuelve a descontar stock, incrementar ventas ni generar ganancias.
- Caja chica actualmente tiene su propio circuito. Definir la imputación de cobros según medio y caja, evitando duplicar ingresos ya registrados manualmente; guardar vínculo único si corresponde.

### Compatibilidad y migración

- Migraciones aditivas, ensayadas sobre copia y con conciliación antes/después.
- Preservar ventas históricas y su condición de registros anteriores; no inventar estados de fabricación o fechas de entrega.
- Reconstruir pagos históricos solo donde los datos lo permitan, identificando su origen. Los pagos con datos incompletos requieren conciliación, no suposiciones.
- No producir movimientos nuevos de caja ni stock al reconstruir registros históricos.
- Consignación debe identificar los ítems realmente incluidos en cada rendición. Hoy se infiere por rango de fecha de venta, lo que puede ocultar encargos que se vuelvan exigibles después de cerrar ese período.
- Actualizar dashboard, reportes, exportaciones, cliente y comprobantes para distinguir ventas, cobros y saldos. Los cobros se consultan por fecha efectiva de pago.

## 5. Correo, en una etapa posterior

Preparar eventos para Pedido confirmado, Cambio relevante de estado y Listo para retirar. Guardar notificación asociada al evento, destinatario, estado y error; enviar fuera de la transacción comercial, con reintentos y control de duplicados.

En la primera entrega los avisos quedan deshabilitados y la interfaz muestra que falta configuración. No enviar mensajes reales ni acumular mensajes antiguos para enviarlos masivamente al activar el correo. Luego definir remitente, plantillas, preferencias y destinatarios de prueba. Nunca incluir anotaciones internas, costos o márgenes.

## 6. Etapas y entregables

| Etapa | Entrega | Criterio de cierre |
| --- | --- | --- |
| 0. Preparación | Estado inicial, reparto Sol/Claude, decisiones de precios, entrega y consignación | Cambios en curso identificados; archivos compartidos con un único responsable |
| 1. Dirección visual | Base monocromática y primera muestra de Nueva venta, Pedidos y Detalle con datos ficticios | Revisar con Mateo legibilidad, densidad y flujo antes de extender |
| 2. Base financiera | Validación, permisos, cálculos decimales, pagos e historial; estrategia de migración | Invariantes monetarias y concurrencia comprobadas |
| 3. Encargos completos | Alta con seña, cobros sucesivos, fabricación, recepción y entrega parcial | Ejemplo completo de pedido con saldo y seguimiento probado |
| 4. Integración | Caja, clientes, reportes, comprobantes y consignación compatible | Sin doble contabilización ni cambios inesperados en históricos |
| 5. Rediseño integral | Resto de módulos, responsive, carga, errores y accesibilidad | Consistencia visual en todos los recorridos, escritorio y móvil |
| 6. Correo | Configuración y prueba controlada de notificaciones | Evento correcto, destinatario correcto, sin duplicados ni notas internas |

Las etapas 2–4 forman una entrega funcional coherente: no habilitar anticipos en uso real mientras reportes, saldos e inventario sigan suponiendo que todo está pagado y entregado.

## 7. Reparto entre modelos

- Astra: análisis y revisión de arquitectura. Entregó hallazgos parciales sobre pagos, seguimiento por ítem y consignación; su ejecución terminó por límite de uso antes de una síntesis final completa. Este documento integra esos hallazgos con la revisión local.
- GPT-5.6 Sol: construcción principal por etapas y verificación de cada entrega.
- Claude: colaboración propuesta en revisión funcional/visual y auditoría, con tareas y archivos delimitados antes de editar. No se inició ni coordinó una sesión de Claude en esta etapa.
- Un único responsable de schema, migraciones y cálculo financiero. Evitar edición simultánea de esos archivos. Los demás trabajan sobre contratos definidos y cambios revisables.
- No cambiar de modelo de forma implícita ni dar por hecha una revisión que no se ejecutó.

## 8. Verificación obligatoria

1. Venta inmediata conserva cobro, stock y comprobante correctos.
2. Anticipo 50%, sin pago y anticipo manual generan saldos exactos.
3. Cobros sucesivos, medios mixtos y USD con distintas cotizaciones no recalculan el pasado.
4. Doble clic, reintento y dos usuarios cobrando a la vez no duplican cobros ni sobrepasan el saldo.
5. Pedido mixto y entregas parciales conservan cantidades; recepción y entrega no duplican movimientos.
6. Cancelación y devolución revierten exclusivamente los efectos que existieron.
7. Reportes separan vendido/cobrado/pendiente y preservan totales históricos conciliados.
8. Encargo que entra a consignación después de una rendición anterior no se pierde ni se rinde dos veces.
9. Usuarios sin sesión o sin permiso no leen ni modifican recursos protegidos.
10. Correo deshabilitado no envía; un fallo de envío no deshace un pago; reintento no duplica la notificación.
11. Compilación, lint pertinente y recorridos reales en escritorio/móvil, teclado, errores y estados vacíos.

### Revisión financiera requerida por AGENTS.md

Antes de declarar terminada la implementación: autorización por recurso, SQL parametrizado, precisión numérica, ARS/USD y cotización, atomicidad, validación del servidor y rastro de autor/fecha. No se encontró un security-auditor de proyecto disponible en la inspección; si sigue ausente, Codex debe documentar explícitamente los siete puntos según la sección 9 del AGENTS.md.

Riesgos observados que deben resolverse en la base financiera: las APIs de ventas inspeccionadas no exigen sesión en todos sus handlers y el proxy excluye /api; el servidor acepta cálculos monetarios enviados por el cliente; los cálculos usan number antes de convertirse a Decimal; numeración y actualizaciones de stock necesitan control de concurrencia. Son hallazgos de lectura, no una auditoría completa ni pruebas de explotación.

## Próximo paso

Construir con Sol la primera muestra monocromática del flujo Nueva venta → Pedidos → Detalle y revisarla con Mateo. Antes de habilitar la funcionalidad real, resolver las decisiones comerciales pendientes y completar la base financiera e integraciones.
