import "dotenv/config";
import { runMaintenance } from "./db-maintenance";
runMaintenance("clean").catch(() => {
  console.error("Limpieza cancelada y transacción revertida. Revisá conexión, permisos, argumentos y esquema.");
  process.exitCode = 1;
});
