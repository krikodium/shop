-- Permite que todo el catálogo del Inventario final (ARS y USD) esté activo en línea.
ALTER TABLE "Producto"
  DROP CONSTRAINT IF EXISTS "Producto_usd_sin_cotizacion_inactivo",
  ADD CONSTRAINT "Producto_usd_sin_cotizacion_inactivo" CHECK ("precioVentaUsd" IS NULL OR "precioVenta" >= 0);

UPDATE "Producto" SET "activo" = true WHERE "activo" = false;
