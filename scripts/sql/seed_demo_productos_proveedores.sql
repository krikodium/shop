-- Seed de prueba: proveedores (regular + consignación) y 10 productos vinculados.
-- Ejecutar contra la misma base que usa Prisma (PostgreSQL).
-- Si ya corriste el script, borrá los registros manualmente o cambiá los SKUs.

BEGIN;

-- ─── Categorías (nombres únicos para no chocar con datos reales) ─────────────
INSERT INTO "Categoria" ("id", "nombre", "descripcion", "createdAt")
VALUES
  ('seed_cat_demo_acc', 'Accesorios (demo seed)', 'Datos de prueba', CURRENT_TIMESTAMP),
  ('seed_cat_demo_ind', 'Indumentaria (demo seed)', 'Datos de prueba', CURRENT_TIMESTAMP),
  ('seed_cat_demo_hog', 'Hogar y oficina (demo seed)', 'Datos de prueba', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- ─── Proveedores: 2 REGULAR (compra directa) + 2 CONSIGNACION ────────────────
INSERT INTO "Proveedor" (
  "id", "nombre", "contacto", "telefono", "email", "direccion",
  "tipoProveedor", "comisionPorDefecto", "liquidacionUsd", "createdAt", "updatedAt"
) VALUES
  (
    'seed_prv_demo_reg01',
    'Distribuidora Norte SRL',
    'María Gómez',
    '+54 11 4000-1111',
    'compras@distribuidoranorte.demo',
    'Av. Corrientes 1234, CABA',
    'REGULAR',
    NULL,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'seed_prv_demo_reg02',
    'Importaciones Sur',
    'Carlos Pérez',
    '+54 11 4000-2222',
    'ventas@importsur.demo',
    'Zona Sur, Buenos Aires',
    'REGULAR',
    NULL,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'seed_prv_demo_con01',
    'Arte y Diseño (Consignación)',
    'Laura Martínez',
    '+54 11 4000-3333',
    'hola@arteydiseno.demo',
    'Palermo, CABA',
    'CONSIGNACION',
    30.00,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'seed_prv_demo_con02',
    'Indumentaria Express Consigna',
    'Roberto Díaz',
    '+54 11 4000-4444',
    'info@indumentariaexpress.demo',
    'Caballito, CABA',
    'CONSIGNACION',
    25.00,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("id") DO NOTHING;

-- ─── 10 productos: 5 consignación + 5 compra regular ─────────────────────────
-- Consignación: sin precioCompra obligatorio, enConsignacion true, comisión shop.
-- Regular: precioCompra con margen, enConsignacion false.

INSERT INTO "Producto" (
  "id", "sku", "nombre", "descripcion", "categoriaId",
  "precioCompra", "precioVenta", "enConsignacion", "comisionConsignacion",
  "stockActual", "stockMinimo", "proveedorId", "imagenUrl", "activo", "createdAt", "updatedAt"
) VALUES
  -- Consignación (proveedores CONSIGNACION)
  (
    'seed_prod_demo_01',
    'DEMO-CNS-001',
    'Remera básica algodón',
    'Seed demo – consignación',
    'seed_cat_demo_ind',
    NULL,
    18990.00,
    true,
    NULL,
    12,
    3,
    'seed_prv_demo_con01',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'seed_prod_demo_02',
    'DEMO-CNS-002',
    'Pantalón jean slim',
    'Seed demo – consignación',
    'seed_cat_demo_ind',
    NULL,
    45990.00,
    true,
    30.00,
    8,
    2,
    'seed_prv_demo_con01',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'seed_prod_demo_03',
    'DEMO-CNS-003',
    'Bufanda tejida lana',
    'Seed demo – consignación',
    'seed_cat_demo_acc',
    NULL,
    12990.00,
    true,
    NULL,
    15,
    5,
    'seed_prv_demo_con02',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'seed_prod_demo_04',
    'DEMO-CNS-004',
    'Cartera cuero sintético',
    'Seed demo – consignación',
    'seed_cat_demo_acc',
    NULL,
    34990.00,
    true,
    25.00,
    6,
    2,
    'seed_prv_demo_con02',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'seed_prod_demo_05',
    'DEMO-CNS-005',
    'Vestido casual verano',
    'Seed demo – consignación',
    'seed_cat_demo_ind',
    NULL,
    52990.00,
    true,
    NULL,
    5,
    2,
    'seed_prv_demo_con02',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  -- Compra regular (proveedores REGULAR)
  (
    'seed_prod_demo_06',
    'DEMO-REG-001',
    'Mate térmico con bombilla',
    'Seed demo – compra directa',
    'seed_cat_demo_hog',
    4500.00,
    8990.00,
    false,
    NULL,
    40,
    10,
    'seed_prv_demo_reg01',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'seed_prod_demo_07',
    'DEMO-REG-002',
    'Termo acero 1 L',
    'Seed demo – compra directa',
    'seed_cat_demo_hog',
    12000.00,
    22990.00,
    false,
    NULL,
    25,
    8,
    'seed_prv_demo_reg01',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'seed_prod_demo_08',
    'DEMO-REG-003',
    'Auriculares Bluetooth',
    'Seed demo – compra directa',
    'seed_cat_demo_acc',
    8500.00,
    15990.00,
    false,
    NULL,
    30,
    10,
    'seed_prv_demo_reg02',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'seed_prod_demo_09',
    'DEMO-REG-004',
    'Resma A4 75g x500',
    'Seed demo – compra directa',
    'seed_cat_demo_hog',
    3200.00,
    6490.00,
    false,
    NULL,
    100,
    20,
    'seed_prv_demo_reg02',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'seed_prod_demo_10',
    'DEMO-REG-005',
    'Lámpara LED escritorio',
    'Seed demo – compra directa',
    'seed_cat_demo_hog',
    6800.00,
    13990.00,
    false,
    NULL,
    18,
    5,
    'seed_prv_demo_reg02',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("sku") DO NOTHING;

COMMIT;

-- Verificación rápida (opcional):
-- SELECT p."sku", p."nombre", p."enConsignacion", pr."nombre" AS proveedor, pr."tipoProveedor"
-- FROM "Producto" p
-- LEFT JOIN "Proveedor" pr ON pr."id" = p."proveedorId"
-- WHERE p."id" LIKE 'seed_prod_demo_%'
-- ORDER BY p."sku";
