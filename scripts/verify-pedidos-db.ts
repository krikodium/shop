/** Verificación en schema aislado: jamás borra ni modifica tablas comerciales de public. */
import "dotenv/config";
import { Client } from "pg";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { spawn } from "node:child_process";
import bcrypt from "bcryptjs";
import assert from "node:assert/strict";

async function main() {
  const original = process.env.DATABASE_URL;
  if (!original) throw new Error("Falta DATABASE_URL");
  const schema = `shop_verificacion_${Date.now()}`;
  assert.match(schema, /^shop_verificacion_\d+$/);
  const pg = new Client({ connectionString: original });
  await pg.connect();
  await pg.query(`CREATE SCHEMA "${schema}"`);
  try {
    await pg.query(`SET search_path TO "${schema}"`);
    for (const nombre of (await readdir(resolve("prisma/migrations"))).filter(n => /^\d/.test(n)).sort()) {
      await pg.query(await readFile(resolve("prisma/migrations", nombre, "migration.sql"), "utf8"));
    }
    const url = new URL(original); url.searchParams.set("schema", schema);
    process.env.DATABASE_URL = url.toString();
    process.env.NODE_ENV = "test";
    const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }, { schema }) });
    const admin = await db.user.create({ data: { email: "verificacion@shop.local", name: "Verificación", role: "ADMIN", password: await bcrypt.hash("Verificar-shop-2026!", 10) } });
    const viewer = await db.user.create({ data: { email: "lectura@shop.local", name: "Lectura", role: "VIEWER" } });
    const clienta = await db.cliente.create({ data: { nombre: "Clienta de prueba", telefono: "1100000000" } });
    const producto = await db.producto.create({ data: { sku: "PRUEBA-1", nombre: "Producto prueba", precioVenta: "333.25", precioCompra: "100.10", stockActual: 5 } });
    const { procesarVenta } = await import("../src/lib/procesarVenta");
    const { registrarPagoVenta } = await import("../src/lib/registrarPagoVenta");
    const { registrarEventoPedido } = await import("../src/lib/pedidos");
    const entrada = { clienteId: clienta.id, items: [{ productoId: producto.id, cantidad: 2, modalidad: "ENCARGO" as const }], descuento: "0", metodoPago: "TRANSFERENCIA" as const,
      claveIdempotencia: "verificacion-alta-0001", totalEsperado: "666.50", usuarioId: admin.id, pedido: {}, cobroInicial: { montoArs: "333.25", metodoPago: "TRANSFERENCIA" as const } };
    const venta = await procesarVenta(entrada);
    assert.equal(venta.total.toFixed(2), "666.50");
    assert.equal(venta.estadoPago, "PARCIAL");
    assert.equal((await procesarVenta(entrada)).id, venta.id);
    assert.equal(await db.venta.count(), 1);
    assert.equal((await db.producto.findUniqueOrThrow({ where: { id: producto.id } })).stockActual, 5);
    await assert.rejects(procesarVenta({ ...entrada, usuarioId: viewer.id, claveIdempotencia: "verificacion-viewer-1" }));
    const [a, b] = await Promise.allSettled(["a", "b"].map(clave => registrarPagoVenta({ ventaId: venta.id, montoArs: "200.00", metodoPago: "EFECTIVO", usuarioId: admin.id, claveIdempotencia: `verificacion-cobro-${clave}` })));
    assert.equal([a, b].filter(r => r.status === "fulfilled").length, 1);
    const final = await registrarPagoVenta({ ventaId: venta.id, montoArs: "133.25", metodoPago: "TRANSFERENCIA", usuarioId: admin.id, claveIdempotencia: "verificacion-cobro-final" });
    assert.equal(final.saldoPendiente, "0.00");
    assert.equal((await registrarPagoVenta({ ventaId: venta.id, montoArs: "133.25", metodoPago: "TRANSFERENCIA", usuarioId: admin.id, claveIdempotencia: "verificacion-cobro-final" })).pagoId, final.pagoId);
    const item = venta.items[0], pedido = venta.pedido!;
    for (const [tipo, cantidad] of [["ENCARGADO", undefined], ["RECEPCION", 1], ["ENTREGA", 1], ["RECEPCION", 1], ["ENTREGA", 1]] as const) {
      await registrarEventoPedido(pedido.id, { tipo, cantidad, itemId: item.id, claveIdempotencia: `verificacion-evento-${tipo}-${cantidad}-${crypto.randomUUID()}` }, admin.id);
    }
    assert.equal((await db.itemVenta.findUniqueOrThrow({ where: { id: item.id } })).cantidadEntregada, 2);
    assert.equal((await db.producto.findUniqueOrThrow({ where: { id: producto.id } })).stockActual, 5);
    const inmediata = await procesarVenta({ ...entrada, totalEsperado: "333.25", claveIdempotencia: "verificacion-inmediata-1", pedido: undefined, cobroInicial: undefined,
      items: [{ productoId: producto.id, cantidad: 1, modalidad: "INMEDIATA" }] });
    assert.equal(inmediata.estadoPago, "PAGADO");
    assert.equal((await db.producto.findUniqueOrThrow({ where: { id: producto.id } })).stockActual, 4);
    await db.producto.update({ where: { id: producto.id }, data: { precioVenta: "500.00" } });
    await assert.rejects(procesarVenta({ ...entrada, totalEsperado: "333.25", pedido: undefined, cobroInicial: undefined,
      claveIdempotencia: "verificacion-precio-cambiado", items: [{ productoId: producto.id, cantidad: 1, modalidad: "INMEDIATA" }] }));
    assert.equal(await db.venta.count(), 2);
    await db.producto.update({ where: { id: producto.id }, data: { precioVenta: "333.25" } });
    console.log("PASS: migraciones, alta idempotente, autorización, señas, concurrencia sin sobrecobro, saldo, recepción/entrega parcial y stock inmediato.");
    await db.$disconnect();
    if (process.argv.includes("--serve")) {
      await mkdir(resolve("output/playwright"), { recursive: true });
      await writeFile(resolve("output/playwright/verification-schema.json"), JSON.stringify({ schema }));
      console.log("Servidor verificación: http://localhost:3100 · usuario verificacion@shop.local (datos aislados)");
      const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", "3100"], { stdio: "inherit", env: { ...process.env, NODE_ENV: "development" } });
      await new Promise<void>(r => { child.once("exit", () => r()); process.once("SIGINT", () => { child.kill(); r(); }); });
    }
  } finally {
    await pg.query('SET search_path TO public');
    await pg.query(`DROP SCHEMA "${schema}" CASCADE`);
    await pg.end();
    console.log("Schema de verificación eliminado; datos comerciales preservados.");
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
