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
    const admin = await db.user.create({ data: { email: "verificacion@shop.local", name: "Verificación", role: "ADMIN", password: await bcrypt.hash(process.env.TEST_VERIFY_PWD || "ShopTest_2026_Mock", 10) } });
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
    const clientesAntes = await db.cliente.count();
    const nuevaClientaEntrada = {
      nuevoCliente: { nombre: "Clienta de venta rápida", telefono: "1155551234", email: "nueva-clienta@shop.local" },
      items: [{ productoId: producto.id, cantidad: 1, modalidad: "INMEDIATA" as const }],
      descuento: "0", totalEsperado: "333.25", metodoPago: "TRANSFERENCIA" as const,
      cobroInicial: { montoArs: "333.25", metodoPago: "TRANSFERENCIA" as const },
      claveIdempotencia: "verificacion-venta-rapida-cliente", usuarioId: admin.id,
    };
    const conNuevaClienta = await procesarVenta(nuevaClientaEntrada);
    assert.equal(conNuevaClienta.estadoPago, "PAGADO");
    assert.equal(conNuevaClienta.total.toFixed(2), "333.25");
    assert.equal(conNuevaClienta.pagos.length, 1);
    assert.equal(conNuevaClienta.pagos[0].montoArs.toFixed(2), "333.25");
    assert.equal(conNuevaClienta.pagos[0].metodoPago, "TRANSFERENCIA");
    assert.equal(conNuevaClienta.cliente?.nombre, nuevaClientaEntrada.nuevoCliente.nombre);
    assert.equal(conNuevaClienta.cliente?.telefono, nuevaClientaEntrada.nuevoCliente.telefono);
    assert.equal(conNuevaClienta.cliente?.email, nuevaClientaEntrada.nuevoCliente.email);
    assert.equal(conNuevaClienta.cliente?.recibeNotificaciones, false);
    assert.equal(conNuevaClienta.cliente?.cantidadCompras, 1);
    assert.equal(conNuevaClienta.cliente?.totalCompras.toFixed(2), "333.25");
    assert.equal(await db.cliente.count(), clientesAntes + 1);
    assert.equal(await db.venta.count(), 3);
    const repetida = await procesarVenta(nuevaClientaEntrada);
    assert.equal(repetida.id, conNuevaClienta.id);
    assert.equal(repetida.clienteId, conNuevaClienta.clienteId);
    assert.equal(await db.cliente.count(), clientesAntes + 1);
    assert.equal(await db.venta.count(), 3);
    assert.equal(await db.pagoVenta.count({ where: { ventaId: conNuevaClienta.id } }), 1);
    assert.equal((await db.producto.findUniqueOrThrow({ where: { id: producto.id } })).stockActual, 3);
    // La ficha se crea antes del cálculo de precios: un fallo debe revertirla también.
    await assert.rejects(procesarVenta({
      ...nuevaClientaEntrada,
      nuevoCliente: { nombre: "No debe persistir", telefono: "1155559999", email: "revertida@shop.local" },
      totalEsperado: "333.24", claveIdempotencia: "verificacion-cliente-rollback",
    }), /Los precios cambiaron/);
    assert.equal(await db.cliente.count(), clientesAntes + 1);
    assert.equal(await db.cliente.count({ where: { email: "revertida@shop.local" } }), 0);
    assert.equal(await db.venta.count(), 3);
    assert.equal((await db.producto.findUniqueOrThrow({ where: { id: producto.id } })).stockActual, 3);
    console.log("PASS: migraciones, alta idempotente, autorización, señas, concurrencia sin sobrecobro, saldo, recepción/entrega parcial, stock inmediato y ficha de clienta atómica con reintento y rollback real.");
    await db.$disconnect();
    if (process.argv.includes("--serve")) {
      await mkdir(resolve("output/playwright"), { recursive: true });
      await writeFile(resolve("output/playwright/verification-schema.json"), JSON.stringify({ schema }));
      console.log("Servidor verificación: http://localhost:3100 · usuario verificacion@shop.local (datos aislados)");
      const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", "3100"], { stdio: "inherit", env: { ...process.env, NODE_ENV: "development", SHOP_VERIFICACION: "1" } });
      await new Promise<void>((r, reject) => {
        const stop = () => { child.kill(); };
        child.once("exit", () => { process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop); r(); });
        child.once("error", reject);
        process.once("SIGINT", stop);
        process.once("SIGTERM", stop);
      });
    }
  } finally {
    await pg.query('SET search_path TO public');
    await pg.query(`DROP SCHEMA "${schema}" CASCADE`);
    await pg.end();
    console.log("Schema de verificación eliminado; datos comerciales preservados.");
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
