import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";

// Hijos primero. Ningún usuario, token ni jornada se borra.
export const BUSINESS_TABLES = ["EventoPedido", "Pedido", "PagoVenta", "ItemVenta", "ItemOrdenCompra", "MovimientoStock", "MovimientoCaja", "ProductoParteProveedor", "CajaChica", "Rendicion", "OrdenCompra", "Venta", "Producto", "Cliente", "Proveedor", "Categoria"] as const;
export const PRESERVED_TABLES = ["User", "PasswordToken", "JornadaLaboral", "_prisma_migrations"] as const;
type Snapshot = { format: "shop-reset-v1"; createdAt: string; target: string; schema: string; tables: Record<string, string[]>; checksum: string };
type Db = Prisma.TransactionClient;
export const snapshotHash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const knownTables = new Set<string>([...BUSINESS_TABLES, ...PRESERVED_TABLES]);
export function databaseTarget(connection: string) {
  const url = new URL(connection);
  if ((url.searchParams.get("schema") ?? "public") !== "public") throw new Error("El mantenimiento solo admite schema=public; no se permite apuntar un entorno de prueba a datos comerciales");
  return `${url.hostname}:${url.port || "5432"}${url.pathname}`;
}
export function maintenanceOptions(args: string[]) {
  for (let i = 0; i < args.length; i++) {
    if (!["--apply", "--backup", "--confirm-target"].includes(args[i])) throw new Error("Argumento desconocido");
    if (args[i] !== "--apply" && (!args[i + 1] || args[++i].startsWith("--"))) throw new Error("Falta valor");
  }
  const value = (key: string) => args.includes(key) ? args[args.indexOf(key) + 1] : undefined;
  return { apply: args.includes("--apply"), backup: value("--backup"), target: value("--confirm-target") };
}
async function schemaSignature(db: Db) {
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
  if (tables.some((t) => !knownTables.has(t.tablename))) throw new Error("Hay tablas no contempladas por el plan");
  const columns = await db.$queryRaw`SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`;
  return { signature: snapshotHash(columns), tables: tables.map((t) => t.tablename) };
}
async function capture(db: Db, names: string[]) {
  const tables: Record<string, string[]> = {};
  for (const name of names) {
    // Solo identificadores de lista fija. Los valores se bindean en restauración.
    if (!knownTables.has(name)) throw new Error("Tabla no permitida");
    const rows = await db.$queryRawUnsafe<{ row: string }[]>(`SELECT row_to_json(t)::text AS row FROM public."${name}" t ORDER BY id`);
    // JSON textual de PostgreSQL conserva numeric exacto, sin convertirlo a float.
    tables[name] = rows.map((r) => r.row);
  }
  return tables;
}
async function verifyTypedRows(db: Db, tables: Record<string, string[]>) {
  for (const [name, rows] of Object.entries(tables)) {
    if (!knownTables.has(name)) throw new Error("Tabla no permitida");
    for (const row of rows) {
      const result = await db.$queryRawUnsafe<{ row: string }[]>(`SELECT row_to_json(json_populate_record(NULL::public."${name}", $1::json))::text AS row`, row);
      if (result[0]?.row !== row) throw new Error("Respaldo no reproduce los tipos originales");
    }
  }
}
export function verifySnapshot(value: unknown): Snapshot {
  const backup = value as Snapshot;
  if (!backup || backup.format !== "shop-reset-v1" || !backup.tables || !backup.schema || !backup.target) throw new Error("Formato inválido");
  if (snapshotHash(backup.tables) !== backup.checksum) throw new Error("Respaldo alterado");
  for (const [name, rows] of Object.entries(backup.tables)) {
    if (!knownTables.has(name) || !Array.isArray(rows)) throw new Error("Tabla no permitida");
    for (const row of rows) if (typeof row !== "string" || !JSON.parse(row).id) throw new Error("Fila inválida");
  }
  return backup;
}
export async function runMaintenance(mode: "clean" | "restore" | "backup") {
  const options = maintenanceOptions(process.argv.slice(2));
  const connection = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connection) throw new Error("Falta conexión");
  const target = databaseTarget(connection);
  console.log(`Destino: ${target}. Modo: ${options.apply ? "APLICAR" : "simulación sin escrituras"}.`);
  if (mode === "backup" && options.apply) throw new Error("El respaldo no requiere --apply");
  if (options.apply && options.target !== target) throw new Error("Confirmá --confirm-target");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  try {
    await prisma.$transaction(async (db) => {
      await db.$executeRawUnsafe(options.apply ? "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE" : "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const schema = await schemaSignature(db);
      if (options.apply) for (const name of [...BUSINESS_TABLES, ...PRESERVED_TABLES].filter((n) => schema.tables.includes(n))) await db.$executeRawUnsafe(`LOCK TABLE public."${name}" IN ACCESS EXCLUSIVE MODE`);
      const tables = await capture(db, schema.tables);
      if (mode === "backup") {
        await verifyTypedRows(db, tables);
        const backupPath = resolve(options.backup ?? `backups/shop-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
        const backup: Snapshot = { format: "shop-reset-v1", createdAt: new Date().toISOString(), target, schema: schema.signature, tables, checksum: snapshotHash(tables) };
        await mkdir(dirname(backupPath), { recursive: true });
        await writeFile(backupPath, JSON.stringify(backup), { flag: "wx", mode: 0o600 });
        verifySnapshot(JSON.parse(await readFile(backupPath, "utf8")));
        console.log(`Respaldo verificado sin modificar BD: ${backupPath}`);
        return;
      }
      await verifyTypedRows(db, tables);
      console.table(Object.entries(tables).map(([tabla, rows]) => ({ tabla, registros: rows.length, accion: BUSINESS_TABLES.includes(tabla as never) ? mode : "preservar" })));
      if (mode === "restore") {
        if (!options.backup) throw new Error("Falta --backup");
        const backup = verifySnapshot(JSON.parse(await readFile(resolve(options.backup), "utf8")));
        if (backup.target !== target || backup.schema !== schema.signature || Object.keys(backup.tables).sort().join() !== schema.tables.sort().join()) throw new Error("Esquema/destino distintos");
        if (BUSINESS_TABLES.some((name) => tables[name]?.length)) throw new Error("Se requiere destino comercial vacío");
        const userIds = new Set((tables.User ?? []).map((row) => JSON.parse(row).id));
        if ((backup.tables.User ?? []).some((row) => !userIds.has(JSON.parse(row).id))) throw new Error("Faltan usuarios originales");
        await verifyTypedRows(db, backup.tables);
        if (!options.apply) return;
        for (const name of [...BUSINESS_TABLES].reverse()) for (const row of backup.tables[name] ?? []) await db.$executeRawUnsafe(`INSERT INTO public."${name}" SELECT (json_populate_record(NULL::public."${name}", $1::json)).*`, row);
        const restored = await capture(db, schema.tables);
        for (const name of BUSINESS_TABLES) if (snapshotHash(restored[name]) !== snapshotHash(backup.tables[name])) throw new Error("Restauración no coincide");
        console.log("Restauración verificada.");
        return;
      }
      if (!options.apply) return;
      const backupPath = resolve(options.backup ?? `backups/shop-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
      const backup: Snapshot = { format: "shop-reset-v1", createdAt: new Date().toISOString(), target, schema: schema.signature, tables, checksum: snapshotHash(tables) };
      await mkdir(dirname(backupPath), { recursive: true });
      await writeFile(backupPath, JSON.stringify(backup), { flag: "wx", mode: 0o600 });
      verifySnapshot(JSON.parse(await readFile(backupPath, "utf8")));
      console.log(`Respaldo verificado: ${backupPath}`);
      for (const name of BUSINESS_TABLES.filter((n) => schema.tables.includes(n))) await db.$executeRawUnsafe(`DELETE FROM public."${name}"`);
      const remaining = await capture(db, schema.tables);
      if (BUSINESS_TABLES.some((name) => remaining[name]?.length)) throw new Error("Quedaron registros");
      for (const name of PRESERVED_TABLES) if (snapshotHash(remaining[name]) !== snapshotHash(tables[name])) throw new Error("Cambió tabla preservada");
      console.log("Limpieza verificada; usuarios, tokens y jornadas preservados.");
    }, { timeout: 120000, maxWait: 10000 });
  } finally { await prisma.$disconnect(); }
}
