import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const count = await prisma.user.count();
  console.log("Conexión OK. Usuarios en BD:", count);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
