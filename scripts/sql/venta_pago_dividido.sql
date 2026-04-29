-- =============================================================================
-- Venta: columnas de pago dividido (segundo método, montos ARS/USD, cotización)
-- =============================================================================
-- Requisito: PostgreSQL 11+ (ADD COLUMN IF NOT EXISTS)
--
-- Aplicar:
--   npm run db:aplicar-pago-dividido
--   npx prisma generate
--
-- El enum "MetodoPago" debe existir (migración inicial). Si falla, revisá
-- prisma/migrations/20260210132620_init/migration.sql
-- =============================================================================

ALTER TABLE "Venta" ADD COLUMN IF NOT EXISTS "metodoPagoSecundario" "MetodoPago";

ALTER TABLE "Venta" ADD COLUMN IF NOT EXISTS "montoPago1Ars" DECIMAL(12, 2);

ALTER TABLE "Venta" ADD COLUMN IF NOT EXISTS "montoPago2Ars" DECIMAL(12, 2);

ALTER TABLE "Venta" ADD COLUMN IF NOT EXISTS "usdPago1" DECIMAL(12, 2);

ALTER TABLE "Venta" ADD COLUMN IF NOT EXISTS "usdPago2" DECIMAL(12, 2);

ALTER TABLE "Venta" ADD COLUMN IF NOT EXISTS "cotizacionUsd" DECIMAL(12, 4);
