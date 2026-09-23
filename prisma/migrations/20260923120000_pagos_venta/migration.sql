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

-- Relleno de historial: hasta ahora toda venta se registraba como PAGADO y no
-- existía registro del cobro. Sin esta fila, una venta vieja se leería como
-- "saldo = total", es decir como si nadie hubiera pagado nunca.
-- El id es determinista (<ventaId>-inicial) para que reaplicar no duplique.
INSERT INTO "PagoVenta" ("id", "ventaId", "fecha", "montoArs", "metodoPago", "notas", "usuarioId", "createdAt")
SELECT
    v."id" || '-inicial',
    v."id",
    v."fecha",
    v."total",
    v."metodoPago",
    'Cobro anterior al seguimiento de pagos (registrado automáticamente)',
    v."usuarioId",
    NOW()
FROM "Venta" v
WHERE v."anulada" = false
  AND v."estadoPago" = 'PAGADO'
ON CONFLICT ("id") DO NOTHING;
