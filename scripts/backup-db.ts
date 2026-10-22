import "dotenv/config";
import { runMaintenance } from "./db-maintenance";
runMaintenance("backup").catch(error => { console.error(error.message); process.exitCode = 1; });
