-- Aditiva: preserva históricos, no altera la migración de cobros existente.
ALTER TABLE "Venta" ADD COLUMN "claveIdempotencia" TEXT, ADD COLUMN "huellaSolicitud" TEXT;
CREATE UNIQUE INDEX "Venta_claveIdempotencia_key" ON "Venta"("claveIdempotencia");
ALTER TABLE "PagoVenta" ADD COLUMN "claveIdempotencia" TEXT, ADD COLUMN "huellaSolicitud" TEXT;
CREATE UNIQUE INDEX "PagoVenta_claveIdempotencia_key" ON "PagoVenta"("claveIdempotencia");
ALTER TABLE "PagoVenta" DROP CONSTRAINT "PagoVenta_ventaId_fkey";
ALTER TABLE "PagoVenta" ADD CONSTRAINT "PagoVenta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ItemVenta" ADD COLUMN "modalidad" TEXT NOT NULL DEFAULT 'INMEDIATA', ADD COLUMN "seguimientoEstado" TEXT NOT NULL DEFAULT 'ENTREGADO', ADD COLUMN "especificaciones" TEXT, ADD COLUMN "fechaEstimada" TIMESTAMP(3), ADD COLUMN "cantidadRecibida" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "cantidadEntregada" INTEGER NOT NULL DEFAULT 0;
-- Legacy: expresa únicamente que el flujo anterior descontó la venta completa.
UPDATE "ItemVenta" SET "cantidadRecibida" = "cantidad", "cantidadEntregada" = "cantidad";
ALTER TABLE "ItemVenta" ADD CONSTRAINT "ItemVenta_seguimiento_cantidades_check" CHECK ("cantidadRecibida" >= 0 AND "cantidadEntregada" >= 0 AND "cantidadEntregada" <= "cantidadRecibida" AND "cantidadRecibida" <= "cantidad");
CREATE TABLE "Pedido" ("id" TEXT NOT NULL, "ventaId" TEXT NOT NULL, "fechaPrometida" TIMESTAMP(3), "responsable" TEXT, "notas" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Pedido_ventaId_key" ON "Pedido"("ventaId");
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "EventoPedido" ("id" TEXT NOT NULL, "pedidoId" TEXT NOT NULL, "itemId" TEXT, "tipo" TEXT NOT NULL, "cantidad" INTEGER, "notas" TEXT, "usuarioId" TEXT NOT NULL, "claveIdempotencia" TEXT NOT NULL, "huellaSolicitud" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "EventoPedido_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "EventoPedido_claveIdempotencia_key" ON "EventoPedido"("claveIdempotencia");
CREATE INDEX "EventoPedido_pedidoId_createdAt_idx" ON "EventoPedido"("pedidoId", "createdAt");
ALTER TABLE "EventoPedido" ADD CONSTRAINT "EventoPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventoPedido" ADD CONSTRAINT "EventoPedido_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemVenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
