/**
 * Seed: crea usuario admin inicial.
 * Uso: npx tsx scripts/seed-admin.ts
 * Email: admin@shop.com / Password: admin123
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL no está definida en .env");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "admin@shop.com";
  const password = "admin123";
  const hash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { password: hash, role: "ADMIN" },
    create: {
      email,
      name: "Administrador",
      password: hash,
      role: "ADMIN",
    },
  });

  console.log("Admin creado:", admin.email);
  console.log("Contraseña: admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
