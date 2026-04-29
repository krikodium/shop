-- CreateEnum
CREATE TYPE "MonedaLiquidacion" AS ENUM ('ARS', 'USD');

-- AlterTable
ALTER TABLE "Proveedor" ADD COLUMN "liquidacionUsd" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Rendicion" ADD COLUMN "monedaLiquidacion" "MonedaLiquidacion" NOT NULL DEFAULT 'ARS';
ALTER TABLE "Rendicion" ADD COLUMN "cotizacionUsd" DECIMAL(12,4);
ALTER TABLE "Rendicion" ADD COLUMN "totalARendirUsd" DECIMAL(12,2);
