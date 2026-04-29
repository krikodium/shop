/**
 * Analiza almacenamiento de imágenes de productos:
 * - BD: solo campo texto imagenUrl (sin blobs en PostgreSQL).
 * - Disco: public/uploads
 *
 * Ejecutar: npx tsx scripts/analyze-storage.ts
 */
import "dotenv/config";
import { readdir, stat } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL no está definida en .env");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function main() {
  console.log("=== Almacenamiento de imágenes (Shop) ===\n");

  console.log(
    "PostgreSQL: no hay tablas tipo bucket. Producto.imagenUrl es String opcional (ruta o URL externa).\n"
  );

  const withImg = await prisma.producto.count({
    where: { imagenUrl: { not: null } },
  });
  const total = await prisma.producto.count();
  const samples = await prisma.producto.findMany({
    where: { imagenUrl: { not: null } },
    select: { sku: true, imagenUrl: true },
    take: 5,
  });

  console.log(`Productos con imagenUrl: ${withImg} / ${total}`);
  if (samples.length) {
    console.log("Ejemplos:");
    for (const p of samples) console.log(`  ${p.sku}: ${p.imagenUrl}`);
  }

  console.log("\n--- Carpeta public/uploads ---");
  try {
    const names = await readdir(UPLOAD_DIR);
    let bytes = 0;
    for (const n of names) {
      const st = await stat(path.join(UPLOAD_DIR, n));
      if (st.isFile()) bytes += st.size;
    }
    console.log(`Archivos: ${names.filter((n) => !n.startsWith(".")).length}`);
    console.log(`Tamaño total (aprox.): ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  } catch {
    console.log("(carpeta aún no existe o vacía; se crea al primer upload)");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
