-- Precios originales USD separados de los importes operativos ARS.
ALTER TABLE "Producto"
  ADD COLUMN "precioVentaUsd" DECIMAL(10,2),
  ADD COLUMN "precioCompraUsd" DECIMAL(10,2),
  ADD CONSTRAINT "Producto_precioVentaUsd_positivo" CHECK ("precioVentaUsd" IS NULL OR "precioVentaUsd" > 0),
  ADD CONSTRAINT "Producto_precioCompraUsd_positivo" CHECK ("precioCompraUsd" IS NULL OR "precioCompraUsd" > 0),
  ADD CONSTRAINT "Producto_usd_sin_cotizacion_inactivo" CHECK ("precioVentaUsd" IS NULL OR ("activo" = false AND "precioVenta" = 0));
