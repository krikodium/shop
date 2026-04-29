-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "metodoPagoSecundario" "MetodoPago",
ADD COLUMN     "montoPago1Ars" DECIMAL(12,2),
ADD COLUMN     "montoPago2Ars" DECIMAL(12,2),
ADD COLUMN     "usdPago1" DECIMAL(12,2),
ADD COLUMN     "usdPago2" DECIMAL(12,2),
ADD COLUMN     "cotizacionUsd" DECIMAL(12,4);
