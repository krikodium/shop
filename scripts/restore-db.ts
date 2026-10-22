import "dotenv/config";
import { runMaintenance } from "./db-maintenance";
runMaintenance("restore").catch(() => {
  console.error("Restauración cancelada y transacción revertida. Revisá respaldo, conexión, argumentos y esquema.");
  process.exitCode = 1;
});
