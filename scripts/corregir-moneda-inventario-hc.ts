/** Corrección delegada autorizada: conserva USD originales sin inventar cotización. */
import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";

const SOURCE_SHA = "bf72e97a8af0d14ffe51479a2c134361ff61e4c52f4fdde88c0b55b004dfb3fe";
const HEADERS = ["SKU", "Nombre", "Categoría", "Proveedor", "Régimen", "Código proveedor", "Precio final (ARS c/IVA)", "Costo (ARS)", "Margen %", "Stock real contado", "Stock declarado (viejo)", "Alto cm", "Ancho cm", "Prof cm", "Peso kg", "Lead time días", "Reponible", "Materiales", "Descripción de venta", "Archivo de foto", "Identificador URL", "Ubicación en el local", "Zona", "Completitud", "Listo para publicar", "Origen", "Nota del recorrido"];
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const marker = `IMPORTACION_HC_SHA256:${SOURCE_SHA}`;
const REASON = "Mateo confirmó precios de venta en Inventario final y que los importes ARS comienzan en 20–30 mil pesos; brecha fuente 1888 a 21000. USD se conservan sin conversión.";

function options(args: string[]) {
  const opts = { apply: false, verify: false, actor: "", file: "inventario-final-01-HC.xlsx", target: "" };
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (seen.has(flag)) throw new Error(`Argumento repetido: ${flag}`);
    seen.add(flag);
    if (flag === "--apply") opts.apply = true;
    else if (flag === "--verify") opts.verify = true;
    else if (["--actor", "--file", "--confirm-target"].includes(flag)) {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error(`Falta valor para ${flag}`);
      if (flag === "--actor") opts.actor = value;
      else if (flag === "--file") opts.file = value;
      else opts.target = value;
    } else throw new Error(`Argumento desconocido: ${flag}`);
  }
  if (opts.apply && (!opts.actor || opts.verify)) throw new Error("--apply requiere --actor y no admite --verify");
  return opts;
}

function amount(value: unknown): Prisma.Decimal | null {
  if (value === null || value === "" || value === undefined) return null;
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error(`Importe inválido: ${text}`);
  const result = new Prisma.Decimal(text);
  assert(result.lessThanOrEqualTo("99999999.99"), "Importe fuera de rango");
  return result.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

async function main() {
  const opts = options(process.argv.slice(2));
  const file = resolve(opts.file);
  const bytes = await readFile(file);
  assert.equal(sha(bytes), SOURCE_SHA, "La fuente cambió: requiere revisión nueva");
  const workbook = XLSX.read(bytes, { type: "buffer" });
  assert(workbook.Sheets["Inventario final"], "Falta Inventario final");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets["Inventario final"], { header: 1, range: 3, raw: true, defval: null });
  assert.deepEqual(rows[0]?.slice(0, HEADERS.length), HEADERS, "Encabezados distintos");
  const sources = rows.slice(1).map((row, i) => ({ row, excelRow: i + 5 })).filter(({ row }) => row.some(v => v !== null && v !== ""));
  assert.equal(sources.length, 149);
  const skus = sources.map(({ row }) => String(row[0] ?? "").trim());
  assert.equal(new Set(skus).size, 149);
  assert(skus.every(s => s.length > 0 && s.length <= 100));
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  assert(connectionString, "Falta DATABASE_URL");
  const url = new URL(connectionString);
  assert.equal(url.searchParams.get("schema") ?? "public", "public");
  const target = `${url.hostname}:${url.port || "5432"}${url.pathname}`;
  if (opts.apply) assert.equal(opts.target, target, "Confirmar destino mediante --confirm-target");
  console.log(JSON.stringify({ modo: opts.apply ? "aplicar" : opts.verify ? "verificar" : "simulacion", destino: target }));
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  let report = "";
  try {
    await db.$transaction(async tx => {
      if (opts.apply) await tx.$executeRaw`LOCK TABLE "Producto", "User" IN ACCESS EXCLUSIVE MODE`;
      else await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const usersBefore = sha(JSON.stringify(await tx.user.findMany({ orderBy: { id: "asc" } })));
      if (opts.actor) assert(await tx.user.findFirst({ where: { id: opts.actor, role: "ADMIN" }, select: { id: true } }), "Actor no administrador");
      const products = await tx.producto.findMany({ include: { categoria: true, proveedor: true, _count: { select: { itemsVenta: true, itemsOrdenCompra: true } } } });
      assert.equal(products.length, 149, "El catálogo cambió; revisar antes de corregir");
      assert.deepEqual(products.map(p => p.sku).sort(), [...skus].sort());
      const changes = [];
      for (const { row, excelRow } of sources) {
        const text = (i: number) => String(row[i] ?? "").trim();
        const product = products.find(p => p.sku === text(0))!;
        const original = Object.fromEntries(HEADERS.map((h, i) => [h, row[i] ?? null]));
        const prefix = [text(18), marker].filter(Boolean).join("\n") + "\n";
        assert(product.descripcion?.startsWith(prefix), `${product.sku}: descripción editada`);
        const metadata = JSON.parse(product.descripcion.slice(prefix.length));
        assert.equal(metadata.fuenteSha256, SOURCE_SHA);
        assert.equal(metadata.hoja, "Inventario final");
        assert.equal(metadata.fila, excelRow);
        assert.deepEqual(metadata.original, original, `${product.sku}: origen distinto`);
        const sale = amount(row[6]), cost = amount(row[7]);
        const usd = Boolean(sale?.greaterThan(0) && sale.lessThan(20000));
        const oldAmbiguous = Boolean(sale && sale.lessThan(10000)) || /usd/i.test(text(26));
        // Únicamente los 36 precios USD y el ARS ya convertido cuya nota menciona USD.
        if (!usd && !oldAmbiguous) continue;
        assert.equal(product.nombre, text(1), `${product.sku}: nombre editado`);
        assert.equal(product.categoria?.nombre ?? "", text(2));
        assert.equal(product.proveedor?.nombre ?? "", text(3));
        const stockUnknown = row[9] === null || row[9] === "" || row[9] === undefined;
        const stock = stockUnknown ? 0 : Number(row[9]);
        assert(Number.isSafeInteger(stock) && stock >= 0);
        assert.equal(product.stockActual, stock, `${product.sku}: stock editado`);
        assert.equal(product.stockMinimo, 0);
        assert.equal(product.enConsignacion, text(4) === "Disponible (consignación)");
        assert.equal(product.comisionConsignacion, null);
        assert.equal(product._count.itemsVenta + product._count.itemsOrdenCompra, 0, `${product.sku}: ya utilizado en operaciones`);
        const pending: string[] = [];
        if (!sale || sale.lessThanOrEqualTo(0)) pending.push("Precio de venta pendiente de confirmar");
        if (usd) pending.push("Precio USD conservado: falta cotización explícita para habilitar venta ARS");
        if (!cost) pending.push("Costo pendiente de confirmar");
        const costUsd = usd && cost?.greaterThan(0) && cost.lessThan(20000) ? cost : null;
        const costArs = costUsd ? null : cost;
        if (usd && costArs) pending.push("Venta en USD y costo en ARS: no se compara margen sin cotización explícita");
        if (!usd && cost && sale && cost.greaterThan(sale)) pending.push("Costo superior al precio: confirmar moneda e importes");
        if (product.enConsignacion) pending.push("Comisión de consignación pendiente: margen contable no usado como comisión");
        if (stockUnknown) pending.push("Stock real no contado: cero preventivo, no representa un conteo");
        if (!text(2)) pending.push("Categoría pendiente");
        if (!text(3)) pending.push("Proveedor pendiente");
        if (/precio/i.test(text(26))) pending.push("Nota del recorrido requiere revisar precio/IVA");
        const data = { precioVenta: usd ? new Prisma.Decimal(0) : sale ?? new Prisma.Decimal(0), precioCompra: costArs, precioVentaUsd: usd ? sale : null, precioCompraUsd: costUsd, activo: pending.length === 0 };
        if (opts.verify) {
          for (const key of ["precioVenta", "precioCompra", "precioVentaUsd", "precioCompraUsd"] as const) assert.equal(product[key]?.toString() ?? null, data[key]?.toString() ?? null, `${product.sku}: ${key}`);
          assert.equal(product.activo, data.activo);
          assert.deepEqual(metadata.pendientes, pending);
          assert.equal(metadata.correccionMoneda?.fuenteSha256, SOURCE_SHA);
          assert.equal(metadata.correccionMoneda?.motivo, REASON);
          assert(metadata.correccionMoneda?.actorId && !Number.isNaN(Date.parse(metadata.correccionMoneda?.fecha)));
          if (opts.actor) assert.equal(metadata.correccionMoneda.actorId, opts.actor);
        } else {
          assert(!metadata.correccionMoneda, `${product.sku}: corrección ya ejecutada; usar --verify`);
          assert.equal(product.precioVenta.toString(), (oldAmbiguous ? new Prisma.Decimal(0) : sale ?? new Prisma.Decimal(0)).toString(), `${product.sku}: precio ARS editado`);
          assert.equal(product.precioCompra?.toString() ?? null, oldAmbiguous ? null : cost?.toString() ?? null, `${product.sku}: costo editado`);
          assert.equal(product.precioVentaUsd, null);
          assert.equal(product.precioCompraUsd, null);
          assert.equal(product.activo, false);
          const priorPending = metadata.pendientes;
          assert(Array.isArray(priorPending));
          const expectedOldPending: string[] = [];
          if (!sale || sale.lessThanOrEqualTo(0)) expectedOldPending.push("Precio de venta pendiente de confirmar");
          if (oldAmbiguous) expectedOldPending.push("Moneda del precio ambigua: posible USD; no convertido a ARS; importes operativos vacíos");
          if (!cost) expectedOldPending.push("Costo pendiente de confirmar");
          if (cost && sale && cost.greaterThan(sale)) expectedOldPending.push("Costo superior al precio: confirmar moneda e importes");
          if (product.enConsignacion) expectedOldPending.push("Comisión de consignación pendiente: margen contable no usado como comisión");
          if (stockUnknown) expectedOldPending.push("Stock real no contado: cero preventivo, no representa un conteo");
          if (!text(2)) expectedOldPending.push("Categoría pendiente");
          if (!text(3)) expectedOldPending.push("Proveedor pendiente");
          if (/precio/i.test(text(26))) expectedOldPending.push("Nota del recorrido requiere revisar precio/IVA");
          assert.deepEqual(priorPending, expectedOldPending, `${product.sku}: pendientes editados`);
          const expectedOldMetadata = { archivo: "inventario-final-01-HC.xlsx", hoja: "Inventario final", fila: excelRow, fuenteSha256: SOURCE_SHA, operadorDelegadoId: metadata.operadorDelegadoId, ejecucion: "Carga autorizada por Mateo y ejecutada por operador delegado; no representa inicio de sesión del administrador", monedaDeclaradaEncabezado: "ARS", pendientes: expectedOldPending, original };
          assert.deepEqual(metadata, expectedOldMetadata, `${product.sku}: metadatos editados`);
          const descripcion = prefix + JSON.stringify({ ...metadata, pendientes: pending, correccionMoneda: { fuenteSha256: SOURCE_SHA, actorId: opts.actor || null, fecha: new Date().toISOString(), motivo: REASON, monedaVenta: usd ? "USD" : "ARS", monedaCosto: costUsd ? "USD" : costArs ? "ARS" : null, conversionAplicada: false } });
          if (opts.apply) await tx.producto.update({ where: { id: product.id }, data: { ...data, descripcion } });
        }
        changes.push({ sku: product.sku, ventaUSD: data.precioVentaUsd?.toString() ?? null, ventaARS: data.precioVenta.toString(), costoUSD: costUsd?.toString() ?? null, costoARS: costArs?.toString() ?? null, pendientes: pending });
      }
      assert.equal(changes.length, 37);
      assert.equal(changes.filter(p => p.ventaUSD).length, 36);
      assert.equal(changes.filter(p => p.ventaUSD && p.costoARS).length, 7);
      assert.equal(sha(await readFile(file)), SOURCE_SHA, "Fuente cambió durante operación");
      assert.equal(sha(JSON.stringify(await tx.user.findMany({ orderBy: { id: "asc" } }))), usersBefore);
      console.log(JSON.stringify({ cambios: changes, usd: 36, arsRecuperado: "HC-DEC-005: 3070000.00", verificado: opts.verify }, null, 2));
      report = `# Corrección monetaria inventario HC\n\nFuente SHA-256: ${SOURCE_SHA}.\n\n36 precios USD conservados sin conversión. HC-DEC-005 recupera ARS 3.070.000, ya convertido en la fuente. Los productos USD continúan inactivos hasta ingresar una cotización explícita.\n\n| SKU | Venta USD | Venta ARS | Costo USD | Costo ARS | Pendientes |\n| --- | --- | --- | --- | --- | --- |\n` + changes.map(p => `| ${p.sku} | ${p.ventaUSD ?? "—"} | ${p.ventaARS} | ${p.costoUSD ?? "—"} | ${p.costoARS ?? "—"} | ${p.pendientes.join("; ")} |`).join("\n") + "\n";
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120000, maxWait: 10000 });
    if (opts.apply) {
      console.log("CORRECCIÓN CONFIRMADA: 37 productos, sin conversión ni modificación de stock/usuarios");
      await writeFile(resolve("docs/inventario-hc-correccion-moneda-2026-10-19.md"), report, "utf8");
    }
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Error de corrección"); process.exitCode = 1; });
