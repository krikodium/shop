/**
 * Script de aprovisionamiento y reseteo de usuarios de Hermanas Caradonti.
 * Establece la contraseña por defecto "Hermanascaradonti3468" y passwordChangedAt: null
 * para obligar a cambiar la contraseña en el primer inicio de sesión.
 */

import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL no está definida");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = "Hermanascaradonti3468";

interface UsuarioDef {
  email: string;
  name: string;
  role: UserRole;
}

const USUARIOS: UsuarioDef[] = [
  { email: "gestion@hermanascaradonti.com", name: "Mateo", role: "ADMIN" },
  { email: "store@hermanascaradonti.com", name: "Store", role: "VENDEDOR" },
  { email: "administracion@hermanascaradonti.com", name: "Administración", role: "ADMIN" },
  { email: "lola@hermanascaradonti.com", name: "Lola", role: "ADMIN" },
  { email: "agus@hermanascaradonti.com", name: "Agus", role: "ADMIN" },
  { email: "paz@hermanascaradonti.com", name: "Paz", role: "ADMIN" },
  { email: "pagos@hermanascaradonti.com", name: "Arturo", role: "ADMIN" },
];

async function main() {
  console.log("Iniciando reseteo y aprovisionamiento de usuarios...");
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 1. Upsert o actualización de los 7 usuarios
  for (const u of USUARIOS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        password: hash,
        passwordChangedAt: null, // Forzar cambio en primer ingreso
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: hash,
        passwordChangedAt: null,
      },
    });
    console.log(`[OK] Usuario configurado: ${user.email} (${user.role}) - debe cambiar clave`);
  }

  // 2. Limpieza de usuarios no solicitados (ej: admin@shop.com)
  const emailsPermitidos = USUARIOS.map((u) => u.email);
  const otros = await prisma.user.findMany({
    where: {
      email: { notIn: emailsPermitidos },
    },
    select: { id: true, email: true },
  });

  for (const u of otros) {
    // Si no tiene ventas o cajas asociadas se elimina limpiamente
    const ventasCount = await prisma.venta.count({ where: { usuarioId: u.id } });
    if (ventasCount === 0) {
      await prisma.user.delete({ where: { id: u.id } });
      console.log(`[ELIMINADO] Usuario obsoleto retirado: ${u.email}`);
    } else {
      console.log(`[AVISO] Usuario ${u.email} conservado por tener ventas asociadas`);
    }
  }

  const totales = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, passwordChangedAt: true },
  });
  console.log("\nLista final de usuarios en base de datos:");
  console.table(totales);
}

main()
  .catch((e) => {
    console.error("Error al resetear usuarios:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
