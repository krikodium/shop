-- Ventas con productos en USD: se guarda el precio en dólares y la cotización usada.
ALTER TABLE "Venta" ADD COLUMN "cotizacionItemsUsd" DECIMAL(12,4);
ALTER TABLE "ItemVenta" ADD COLUMN "precioUnitarioUsd" DECIMAL(10,2);
