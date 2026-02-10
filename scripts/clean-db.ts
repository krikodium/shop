/**
 * Script para limpiar la base de datos (datos de prueba).
 * Ejecutar: npx tsx scripts/clean-db.ts
 *
 * Elimina todos los registros en orden para respetar las foreign keys.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL no está definida en .env");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function cleanDb() {
  console.log("🧹 Limpiando base de datos...\n");

  try {
    const steps = [
      { name: "ItemVenta", fn: () => prisma.itemVenta.deleteMany() },
      { name: "ItemOrdenCompra", fn: () => prisma.itemOrdenCompra.deleteMany() },
      { name: "MovimientoStock", fn: () => prisma.movimientoStock.deleteMany() },
      { name: "MovimientoCaja", fn: () => prisma.movimientoCaja.deleteMany() },
      { name: "CajaChica", fn: () => prisma.cajaChica.deleteMany() },
      { name: "JornadaLaboral", fn: () => prisma.jornadaLaboral.deleteMany() },
      { name: "Rendicion", fn: () => prisma.rendicion.deleteMany() },
      { name: "OrdenCompra", fn: () => prisma.ordenCompra.deleteMany() },
      { name: "Venta", fn: () => prisma.venta.deleteMany() },
      { name: "Producto", fn: () => prisma.producto.deleteMany() },
      { name: "Cliente", fn: () => prisma.cliente.deleteMany() },
      { name: "Proveedor", fn: () => prisma.proveedor.deleteMany() },
      { name: "Categoria", fn: () => prisma.categoria.deleteMany() },
      { name: "User", fn: () => prisma.user.deleteMany() },
    ];

    for (const { name, fn } of steps) {
      const result = await fn();
      const count = "count" in result ? result.count : 0;
      console.log(`  ✓ ${name}: ${count} registros eliminados`);
    }

    console.log("\n✅ Base de datos limpiada correctamente.");
  } catch (error) {
    console.error("\n❌ Error al limpiar:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDb();
