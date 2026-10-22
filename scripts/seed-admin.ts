/**
 * Seed: crea usuario admin inicial.
 * Uso: npx tsx scripts/seed-admin.ts
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
  const email = process.env.INITIAL_ADMIN_EMAIL || "admin@shop.com";
  const password = process.env.INITIAL_ADMIN_PASSWORD || "InitAdminPass_2026!";
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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
