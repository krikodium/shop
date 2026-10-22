import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validarCatalogo } from "@/lib/importarCatalogo";
import * as XLSX from "xlsx";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Iniciá sesión" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Solo administradores pueden importar el catálogo" }, { status: 403 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !/\.(xlsx|xls|csv)$/i.test(file.name) || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Seleccioná un Excel o CSV de hasta 5 MB" }, { status: 400 });
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", sheetRows: 5002 });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return NextResponse.json({ error: "El archivo no tiene hojas" }, { status: 400 });
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true });
    if (rows.length > 5001) return NextResponse.json({ error: "Máximo 5000 productos por archivo" }, { status: 400 });
    const existentes = await prisma.producto.findMany({ select: { sku: true } });
    const { productos, errores } = validarCatalogo(rows, new Set(existentes.map((p) => p.sku)));
    const proveedores = await prisma.proveedor.findMany({ select: { nombre: true, comisionPorDefecto: true, tipoProveedor: true } });
    const categorias = await prisma.categoria.findMany({ select: { nombre: true } });
    const normalize = (name: string) => name.trim().toLocaleLowerCase("es");
    const provMap = new Map(proveedores.map((p) => [normalize(p.nombre), p]));
    for (const p of productos) if (p.enConsignacion && provMap.get(normalize(p.proveedor))?.tipoProveedor === "REGULAR") errores.push(`Fila ${p.fila}: el proveedor existente es regular; corregí su tipo antes de importar un producto consignado`);
    for (const p of productos) if (p.enConsignacion && p.comisionConsignacion === null && !provMap.get(normalize(p.proveedor))?.comisionPorDefecto) errores.push(`Fila ${p.fila}: indicá el porcentaje propio; el proveedor no tiene comisión por defecto`);
    const nuevasCategorias = [...new Set(productos.map((p) => p.categoria).filter((name) => name && !categorias.some((c) => normalize(c.nombre) === normalize(name))))];
    const nuevosProveedores = [...new Set(productos.map((p) => p.proveedor).filter((name) => name && !provMap.has(normalize(name))))];
    const resumen = { creados: 0, errores: errores.length, mensajesError: errores, validos: productos.length, nuevasCategorias, nuevosProveedores, vistaPrevia: productos.slice(0, 10) };
    // Revisar es el modo predeterminado: ninguna escritura hasta importar explícitamente.
    if (form.get("modo") !== "importar") return NextResponse.json({ ...resumen, modo: "preview" });
    if (errores.length) return NextResponse.json({ ...resumen, error: "Corregí todas las filas antes de importar" }, { status: 400 });
    await prisma.$transaction(async (tx) => {
      const categoriaIds = new Map((await tx.categoria.findMany()).map((c) => [normalize(c.nombre), c.id]));
      const proveedoresActuales = await tx.proveedor.findMany();
      for (const p of productos) if (p.enConsignacion && proveedoresActuales.some(prov => normalize(prov.nombre) === normalize(p.proveedor) && prov.tipoProveedor === "REGULAR")) throw new Error("El proveedor cambió: volvé a validar");
      const proveedorIds = new Map(proveedoresActuales.map((p) => [normalize(p.nombre), p.id]));
      for (const p of productos) {
        if (p.categoria && !categoriaIds.has(normalize(p.categoria))) {
          const created = await tx.categoria.create({ data: { nombre: p.categoria } });
          categoriaIds.set(normalize(p.categoria), created.id);
        }
        if (p.proveedor && !proveedorIds.has(normalize(p.proveedor))) {
          const created = await tx.proveedor.create({ data: { nombre: p.proveedor, tipoProveedor: productos.some((item) => normalize(item.proveedor) === normalize(p.proveedor) && item.enConsignacion) ? "CONSIGNACION" : "REGULAR" } });
          proveedorIds.set(normalize(p.proveedor), created.id);
        }
        const producto = await tx.producto.create({ data: { sku: p.sku, nombre: p.nombre, descripcion: p.descripcion, categoriaId: categoriaIds.get(normalize(p.categoria)) ?? null, proveedorId: proveedorIds.get(normalize(p.proveedor)) ?? null, precioCompra: p.precioCompra, precioVenta: p.precioVenta, stockActual: p.stockActual, stockMinimo: p.stockMinimo, enConsignacion: p.enConsignacion, comisionConsignacion: p.comisionConsignacion, imagenUrl: p.imagenUrl } });
        if (p.stockActual > 0) await tx.movimientoStock.create({ data: { productoId: producto.id, tipo: "ENTRADA_AJUSTE", cantidad: p.stockActual, stockAnterior: 0, stockNuevo: p.stockActual, motivo: "Carga inicial de catálogo", usuario: session.user.id, referencia: "IMPORTACION_CATALOGO" } });
      }
    }, { timeout: 120000 });
    return NextResponse.json({ ...resumen, modo: "importado", creados: productos.length });
  } catch {
    return NextResponse.json({ error: "No se importó ningún producto. Revisá el archivo y volvé a validarlo; un SKU pudo cargarse simultáneamente." }, { status: 400 });
  }
}
