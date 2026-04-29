-- AlterTable
ALTER TABLE "CajaChica" ADD COLUMN     "montoInicialUsd" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "MovimientoCaja" ADD COLUMN     "moneda" TEXT NOT NULL DEFAULT 'ARS';
