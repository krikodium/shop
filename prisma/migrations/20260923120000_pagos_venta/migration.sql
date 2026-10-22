-- Cobros de una venta: seña hoy, saldo después.
-- El total pagado y el saldo se derivan de estas filas, no de un campo suelto
-- en Venta que pueda quedar desincronizado.

CREATE TABLE "PagoVenta" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montoArs" DECIMAL(12,2) NOT NULL,
    "metodoPago" "MetodoPago" NOT NULL,
    "montoUsd" DECIMAL(12,2),
    "cotizacionUsd" DECIMAL(12,4),
    "notas" TEXT,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoVenta_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PagoVenta_ventaId_idx" ON "PagoVenta"("ventaId");
CREATE INDEX "PagoVenta_fecha_idx" ON "PagoVenta"("fecha");

ALTER TABLE "PagoVenta"
  ADD CONSTRAINT "PagoVenta_ventaId_fkey"
  FOREIGN KEY ("ventaId") REFERENCES "Venta"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PagoVenta"
  ADD CONSTRAINT "PagoVenta_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- Relleno de historial
-- ============================================================
-- Hasta ahora toda venta se registraba como PAGADO y no existía registro del
-- cobro. Sin estas filas, una venta vieja se leería como "saldo = total", es
-- decir como si nadie hubiera pagado nunca.
--
-- Las dos cláusulas que hacen esto seguro:
--   * `NOT EXISTS (… FROM "PagoVenta" …)` — solo rellena ventas que NO tienen
--     ningún cobro. Sin esto, reaplicar el archivo sobre una base donde ya se
--     cobró con el mecanismo nuevo agregaría un cobro fantasma por el total
--     encima de los reales (una venta de 400.000 cobrada 200.000 + 200.000
--     pasaría a tener 600.000 cobrados).
--   * ids deterministas — reaplicar no duplica las filas que esta misma
--     sentencia creó.

-- Caso 1: venta con pago dividido en dos medios. Se reconstruyen los DOS
-- tramos, cada uno con su método, sus dólares y la cotización usada. Colapsar
-- todo en una fila falsearía el desglose por medio de pago y perdería el USD.
INSERT INTO "PagoVenta" ("id", "ventaId", "fecha", "montoArs", "metodoPago", "montoUsd", "cotizacionUsd", "notas", "usuarioId", "createdAt")
SELECT
    v."id" || '-inicial-1',
    v."id",
    v."fecha",
    COALESCE(v."montoPago1Ars", v."total"),
    v."metodoPago",
    v."usdPago1",
    v."cotizacionUsd",
    'Primer tramo del pago dividido, anterior al seguimiento de cobros',
    v."usuarioId",
    NOW()
FROM "Venta" v
WHERE v."anulada" = false
  AND v."estadoPago" = 'PAGADO'
  AND v."metodoPagoSecundario" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "PagoVenta" p WHERE p."ventaId" = v."id")
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "PagoVenta" ("id", "ventaId", "fecha", "montoArs", "metodoPago", "montoUsd", "cotizacionUsd", "notas", "usuarioId", "createdAt")
SELECT
    v."id" || '-inicial-2',
    v."id",
    v."fecha",
    COALESCE(v."montoPago2Ars", 0),
    v."metodoPagoSecundario",
    v."usdPago2",
    v."cotizacionUsd",
    'Segundo tramo del pago dividido, anterior al seguimiento de cobros',
    v."usuarioId",
    NOW()
FROM "Venta" v
WHERE v."anulada" = false
  AND v."estadoPago" = 'PAGADO'
  AND v."metodoPagoSecundario" IS NOT NULL
  AND COALESCE(v."montoPago2Ars", 0) > 0
  AND NOT EXISTS (
        SELECT 1 FROM "PagoVenta" p
        WHERE p."ventaId" = v."id" AND p."id" <> v."id" || '-inicial-1'
      )
ON CONFLICT ("id") DO NOTHING;

-- Caso 2: venta con un solo medio de pago.
INSERT INTO "PagoVenta" ("id", "ventaId", "fecha", "montoArs", "metodoPago", "montoUsd", "cotizacionUsd", "notas", "usuarioId", "createdAt")
SELECT
    v."id" || '-inicial',
    v."id",
    v."fecha",
    v."total",
    v."metodoPago",
    v."usdPago1",
    v."cotizacionUsd",
    'Cobro anterior al seguimiento de pagos (registrado automáticamente)',
    v."usuarioId",
    NOW()
FROM "Venta" v
WHERE v."anulada" = false
  AND v."estadoPago" = 'PAGADO'
  AND v."metodoPagoSecundario" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "PagoVenta" p WHERE p."ventaId" = v."id")
ON CONFLICT ("id") DO NOTHING;

-- Las ventas anuladas quedaron con estadoPago = 'PAGADO' por el código viejo y
-- no reciben fila de cobro. Sin este reset, el detalle mostraría "Cobrado 0" y
-- "Saldo = total" sobre una venta que no existe comercialmente, y cualquier
-- reporte de saldos por cobrar la incluiría.
UPDATE "Venta" SET "estadoPago" = 'PENDIENTE' WHERE "anulada" = true;
