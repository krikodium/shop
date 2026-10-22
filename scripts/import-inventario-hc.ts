/** Importación inicial conservadora: los datos dudosos quedan guardados e inactivos. */
import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";

const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const DEFAULT_FILE = "inventario-final-01-HC.xlsx";
const EXPECTED_HEADERS = ["SKU", "Nombre", "Categoría", "Proveedor", "Régimen", "Código proveedor", "Precio final (ARS c/IVA)", "Costo (ARS)", "Margen %", "Stock real contado", "Stock declarado (viejo)", "Alto cm", "Ancho cm", "Prof cm", "Peso kg", "Lead time días", "Reponible", "Materiales", "Descripción de venta", "Archivo de foto", "Identificador URL", "Ubicación en el local", "Zona", "Completitud", "Listo para publicar", "Origen", "Nota del recorrido"];

function options(args: string[]) {
  const result = { apply: false, verify: false, actor: "", file: DEFAULT_FILE, target: "" };
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (seen.has(flag)) throw new Error(`Argumento repetido: ${flag}`);
    seen.add(flag);
    if (flag === "--apply") result.apply = true;
    else if (flag === "--verify") result.verify = true;
    else if (flag === "--actor" || flag === "--file" || flag === "--confirm-target") {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error(`Falta valor para ${flag}`);
      if (flag === "--actor") result.actor = value;
      else if (flag === "--confirm-target") result.target = value;
      else result.file = value;
    } else throw new Error(`Argumento desconocido: ${flag}`);
  }
  if (result.apply && !result.actor) throw new Error("--apply requiere --actor con ID de administrador explícito");
  if (result.apply && result.verify) throw new Error("--apply y --verify son excluyentes");
  return result;
}

function importe(value: unknown, label: string): Prisma.Decimal | null {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error(`${label}: importe inválido; máximo dos decimales`);
  const decimal = new Prisma.Decimal(text);
  if (decimal.greaterThan("99999999.99")) throw new Error(`${label}: importe fuera de rango`);
  // No se redondean importes con precisión excedente: ya fueron rechazados arriba.
  return decimal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

async function main() {
  const opts = options(process.argv.slice(2));
  const file = resolve(opts.file);
  const bytes = await readFile(file);
  const sourceSha256 = sha256(bytes);
  const workbook = XLSX.read(bytes, { type: "buffer" });
  const sheet = workbook.Sheets["Inventario final"];
  if (!sheet) throw new Error("Falta la hoja Inventario final");
  const sourceRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, range: 3, raw: true, defval: null });
  assert.deepEqual(sourceRows[0]?.slice(0, EXPECTED_HEADERS.length), EXPECTED_HEADERS, "Los encabezados cambiaron; revisar el mapeo");
  const rows = sourceRows.slice(1).map((row, index) => ({ row, excelRow: index + 5 })).filter(({ row }) => row.some(value => value !== null && value !== ""));
  assert.equal(rows.length, 149, "Se esperaban exactamente 149 productos; revisar la fuente");
  const skus = new Set<string>();
  const products = rows.map(({ row, excelRow }) => {
    const text = (index: number) => String(row[index] ?? "").trim();
    const sku = text(0), nombre = text(1), categoria = text(2), proveedor = text(3), regimen = text(4);
    if (!sku || sku.length > 100 || !nombre || nombre.length > 200 || skus.has(sku)) throw new Error(`Fila ${excelRow}: SKU/nombre inválido o duplicado`);
    skus.add(sku);
    if (!["Disponible", "Disponible (consignación)", "A pedido"].includes(regimen)) throw new Error(`Fila ${excelRow}: régimen no reconocido`);
    const pending: string[] = [];
    const precioOriginal = importe(row[6], `${sku} precio`);
    const precioCompra = importe(row[7], `${sku} costo`);
    if (!precioOriginal || precioOriginal.lessThanOrEqualTo(0)) pending.push("Precio de venta pendiente de confirmar");
    const monedaDudosa = Boolean(precioOriginal && precioOriginal.lessThan(10000)) || /usd/i.test(text(26));
    if (monedaDudosa) pending.push("Moneda del precio ambigua: posible USD; no convertido a ARS; importes operativos vacíos");
    if (!precioCompra) pending.push("Costo pendiente de confirmar");
    if (precioCompra && precioOriginal && precioCompra.greaterThan(precioOriginal)) pending.push("Costo superior al precio: confirmar moneda e importes");
    const enConsignacion = regimen === "Disponible (consignación)";
    if (enConsignacion) pending.push("Comisión de consignación pendiente: margen contable no usado como comisión");
    const stockUnknown = row[9] === null || row[9] === undefined || row[9] === "";
    const stockActual = stockUnknown ? 0 : Number(row[9]);
    if (!Number.isSafeInteger(stockActual) || stockActual < 0 || stockActual > 2147483647) throw new Error(`${sku}: stock contado inválido`);
    if (stockUnknown) pending.push("Stock real no contado: cero preventivo, no representa un conteo");
    if (!categoria) pending.push("Categoría pendiente");
    if (!proveedor) pending.push("Proveedor pendiente");
    if (/precio/i.test(text(26))) pending.push("Nota del recorrido requiere revisar precio/IVA");
    const source = Object.fromEntries(EXPECTED_HEADERS.map((header, index) => [header, row[index] ?? null]));
    const descripcion = [text(18), `IMPORTACION_HC_SHA256:${sourceSha256}`, JSON.stringify({ archivo: DEFAULT_FILE, hoja: "Inventario final", fila: excelRow, fuenteSha256: sourceSha256, operadorDelegadoId: opts.actor || null, ejecucion: "Carga autorizada por Mateo y ejecutada por operador delegado; no representa inicio de sesión del administrador", monedaDeclaradaEncabezado: "ARS", pendientes: pending, original: source })].filter(Boolean).join("\n");
    return { sku, nombre, categoria, proveedor, precioVenta: monedaDudosa ? new Prisma.Decimal(0) : precioOriginal ?? new Prisma.Decimal(0), precioCompra: monedaDudosa ? null : precioCompra, stockActual, enConsignacion, activo: pending.length === 0, descripcion, pending };
  });
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Falta DATABASE_URL");
  const target = new URL(connectionString);
  if ((target.searchParams.get("schema") ?? "public") !== "public") throw new Error("Solo se admite schema public");
  const destination = `${target.hostname}:${target.port || "5432"}${target.pathname}`;
  if (opts.apply && opts.target !== destination) throw new Error(`--apply requiere --confirm-target ${destination}`);
  console.log(JSON.stringify({ modo: opts.apply ? "aplicar" : "simulacion", destino: `${target.hostname}:${target.port || "5432"}${target.pathname}`, fuenteSha256: sourceSha256, productos: products.length, activos: products.filter(p => p.activo).length, inactivos: products.filter(p => !p.activo).length, stockContado: products.reduce((sum, p) => sum + p.stockActual, 0), categorias: new Set(products.map(p => p.categoria).filter(Boolean)).size, proveedores: new Set(products.map(p => p.proveedor).filter(Boolean)).size, pendientes: products.filter(p => p.pending.length).map(p => ({ sku: p.sku, motivos: p.pending })) }, null, 2));
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await db.$transaction(async tx => {
      if (opts.apply) await tx.$executeRaw`LOCK TABLE "Producto", "Categoria", "Proveedor", "MovimientoStock", "User" IN ACCESS EXCLUSIVE MODE`;
      else await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const usersBefore = sha256(JSON.stringify(await tx.user.findMany({ orderBy: { id: "asc" } })));
      const admins = await tx.user.findMany({ where: { role: "ADMIN" }, select: { id: true, name: true, role: true } });
      if (opts.actor && !admins.some(user => user.id === opts.actor)) throw new Error("El actor indicado no es un administrador vigente");
      const counts = { productos: await tx.producto.count(), categorias: await tx.categoria.count(), proveedores: await tx.proveedor.count(), movimientos: await tx.movimientoStock.count() };
      console.log(JSON.stringify({ existentes: counts, administradores: admins }));
      if (!opts.verify && Object.values(counts).some(count => count !== 0)) throw new Error("La importación inicial exige catálogo y movimientos vacíos; no se modificó ningún registro existente");
      assert.equal(sha256(await readFile(file)), sourceSha256, "La fuente cambió durante la revisión");
      if (opts.verify) {
        assert.equal(counts.productos, 149);
        const cats = await tx.categoria.findMany();
        const provs = await tx.proveedor.findMany();
        assert.equal(cats.length, new Set(products.map(p => p.categoria).filter(Boolean)).size);
        assert.equal(provs.length, new Set(products.map(p => p.proveedor).filter(Boolean)).size);
        for (const product of products) {
          const actual = await tx.producto.findUniqueOrThrow({ where: { sku: product.sku } });
          assert.equal(actual.nombre, product.nombre);
          assert.equal(actual.descripcion, product.descripcion);
          assert.equal(actual.precioVenta.toFixed(2), product.precioVenta.toFixed(2));
          assert.equal(actual.precioCompra?.toFixed(2) ?? null, product.precioCompra?.toFixed(2) ?? null);
          assert.equal(actual.stockActual, product.stockActual);
          assert.equal(actual.stockMinimo, 0);
          assert.equal(actual.activo, product.activo);
          assert.equal(actual.enConsignacion, product.enConsignacion);
          assert.equal(actual.comisionConsignacion, null);
          assert.equal(actual.categoriaId, cats.find(c => c.nombre === product.categoria)?.id ?? null);
          assert.equal(actual.proveedorId, provs.find(p => p.nombre === product.proveedor)?.id ?? null);
          const movements = await tx.movimientoStock.findMany({ where: { productoId: actual.id } });
          assert.equal(movements.length, product.stockActual > 0 ? 1 : 0);
          for (const movement of movements) {
            assert.equal(movement.cantidad, product.stockActual);
            assert.equal(movement.stockAnterior, 0);
            assert.equal(movement.stockNuevo, product.stockActual);
            assert.equal(movement.tipo, "ENTRADA_AJUSTE");
            assert.equal(movement.referencia, `IMPORTACION_HC_SHA256:${sourceSha256}`);
            if (opts.actor) assert.equal(movement.usuario, opts.actor);
          }
        }
        console.log("VERIFICADO: 149 productos y campos exactos contra la fuente; sin escrituras");
        return;
      }
      if (!opts.apply) { console.log("SIMULACIÓN: no se escribió ningún dato"); return; }
      const categorias = new Map<string, string>();
      const proveedores = new Map<string, string>();
      for (const nombre of new Set(products.map(p => p.categoria).filter(Boolean))) categorias.set(nombre, (await tx.categoria.create({ data: { nombre } })).id);
      for (const nombre of new Set(products.map(p => p.proveedor).filter(Boolean))) proveedores.set(nombre, (await tx.proveedor.create({ data: { nombre, tipoProveedor: products.some(p => p.proveedor === nombre && p.enConsignacion) ? "CONSIGNACION" : "REGULAR" } })).id);
      for (const product of products) {
        const data = { sku: product.sku, nombre: product.nombre, descripcion: product.descripcion, categoriaId: categorias.get(product.categoria) ?? null, proveedorId: proveedores.get(product.proveedor) ?? null, precioVenta: product.precioVenta, precioCompra: product.precioCompra, stockActual: product.stockActual, stockMinimo: 0, enConsignacion: product.enConsignacion, comisionConsignacion: null, activo: product.activo };
        const created = await tx.producto.create({ data });
        const persisted = await tx.producto.findUniqueOrThrow({ where: { id: created.id } });
        for (const [key, expected] of Object.entries(data)) {
          const actual = persisted[key as keyof typeof persisted];
          if (expected instanceof Prisma.Decimal) assert.equal(String(actual), expected.toString(), `${product.sku}: ${key}`);
          else assert.equal(actual, expected, `${product.sku}: ${key}`);
        }
        if (product.stockActual > 0) await tx.movimientoStock.create({ data: { productoId: created.id, tipo: "ENTRADA_AJUSTE", cantidad: product.stockActual, stockAnterior: 0, stockNuevo: product.stockActual, motivo: "Inventario físico HC: carga inicial autorizada por Mateo y ejecutada por operador delegado; cantidades contadas únicamente", referencia: `IMPORTACION_HC_SHA256:${sourceSha256}`, usuario: opts.actor } });
      }
      assert.equal(await tx.producto.count(), 149);
      assert.equal(await tx.categoria.count(), categorias.size);
      assert.equal(await tx.proveedor.count(), proveedores.size);
      assert.equal(await tx.movimientoStock.count(), products.filter(p => p.stockActual > 0).length);
      assert.equal(sha256(JSON.stringify(await tx.user.findMany({ orderBy: { id: "asc" } }))), usersBefore, "Los usuarios deben conservarse exactamente");
      assert.equal(sha256(await readFile(file)), sourceSha256, "La fuente cambió antes de confirmar");
      console.log("Validaciones dentro de la transacción completas: 149 productos, precios y stock exactos, usuarios preservados");
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120000, maxWait: 10000 });
    if (opts.apply) console.log("IMPORTACIÓN CONFIRMADA");
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Error de importación"); process.exitCode = 1; });
