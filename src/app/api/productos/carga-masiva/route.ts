import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

/**
 * Celda vacía → null (usa % default del proveedor en ventas). Texto inválido o fuera de 0–100 → rechazado.
 */
function parsePorcentajePropio(raw: string): { ok: true; value: number | null } | { ok: false } {
  const s = raw.trim();
  if (s === "") return { ok: true, value: null };
  const normalized = s.replace(/%/g, "").replace(",", ".").trim();
  const n = parseFloat(normalized);
  if (Number.isNaN(n) || n < 0 || n > 100) return { ok: false };
  return { ok: true, value: n };
}

/**
 * POST: Carga masiva de productos desde Excel.
 * Formato esperado (encabezados): SKU, Nombre, Descripción, Categoría, Precio compra,
 * Precio venta, Stock, Stock mínimo, Proveedor, Consignación (S/N),
 * Porcentaje consignación (propio) — % que se queda el local; el resto va al proveedor —
 * Imagen URL.
 * La primera fila debe ser encabezados.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "No se envió ningún archivo" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 }) as string[][];

    if (rows.length < 2) {
      return NextResponse.json(
        { error: "El archivo debe tener al menos encabezados y una fila de datos" },
        { status: 400 }
      );
    }

    const headers = rows[0].map((h) => String(h ?? "").trim().toLowerCase());
    const getCol = (names: string[]) => {
      for (const n of names) {
        const idx = headers.indexOf(n.toLowerCase());
        if (idx >= 0) return idx;
      }
      return -1;
    };

    const colSku = getCol(["sku", "codigo", "código", "codigo"]);
    const colNombre = getCol(["nombre", "producto"]);
    const colDesc = getCol(["descripcion", "descripción"]);
    const colCategoria = getCol(["categoria", "categoría"]);
    const colPrecioCompra = getCol(["precio compra", "precio_compra", "costo", "preciocompra"]);
    const colPrecioVenta = getCol(["precio venta", "precio_venta", "precio", "precioventa"]);
    const colStock = getCol(["stock", "stock_actual", "cantidad"]);
    const colStockMin = getCol(["stock mínimo", "stock_minimo", "stock minimo"]);
    const colProveedor = getCol(["proveedor", "proveedor_id"]);
    const colConsignacion = getCol(["consignacion", "consignación", "en consignacion"]);
    const colPorcentajePropio = getCol([
      "porcentaje consignación (propio)",
      "porcentaje consignacion (propio)",
      "porcentaje consignación",
      "porcentaje consignacion",
      "% consignacion",
      "% consignación",
      "comision consignacion",
      "comisión consignacion",
      "comision shop",
      "comisión shop",
    ]);
    const colImagen = getCol(["imagen", "imagen_url", "foto", "url imagen", "imagen url"]);

    if (colSku < 0 || colNombre < 0) {
      return NextResponse.json(
        { error: "El Excel debe tener columnas SKU y Nombre" },
        { status: 400 }
      );
    }

    const categorias = await prisma.categoria.findMany();
    const proveedores = await prisma.proveedor.findMany();

    const categoriasMap = new Map(categorias.map((c) => [c.nombre.toLowerCase(), c.id]));
    const proveedoresMap = new Map(proveedores.map((p) => [p.nombre.toLowerCase(), p.id]));

    const creados: string[] = [];
    const errores: string[] = [];
    const skusExistentes = new Set(
      (await prisma.producto.findMany({ select: { sku: true } })).map((p) => p.sku)
    );

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] ?? [];
      const get = (col: number) => (col >= 0 && row[col] != null ? String(row[col]).trim() : "");

      const sku = get(colSku);
      const nombre = get(colNombre);
      if (!sku || !nombre) continue;

      if (skusExistentes.has(sku)) {
        errores.push(`Fila ${i + 1}: SKU "${sku}" ya existe`);
        continue;
      }

      const precioVenta = parseFloat(get(colPrecioVenta)) || 0;
      if (precioVenta <= 0) {
        errores.push(`Fila ${i + 1}: Precio venta inválido para ${sku}`);
        continue;
      }

      const catNombre = get(colCategoria);
      const provNombre = get(colProveedor);
      const categoriaId = catNombre ? categoriasMap.get(catNombre.toLowerCase()) ?? null : null;
      const proveedorId = provNombre ? proveedoresMap.get(provNombre.toLowerCase()) ?? null : null;

      const consignacionCell = get(colConsignacion).toLowerCase();
      const enConsignacion = ["s", "si", "yes", "1", "true"].includes(consignacionCell);

      let comisionConsignacion: number | null = null;
      if (enConsignacion) {
        const rawPct = colPorcentajePropio >= 0 ? get(colPorcentajePropio) : "";
        const parsed = parsePorcentajePropio(rawPct);
        if (!parsed.ok) {
          errores.push(
            `Fila ${i + 1}: Porcentaje consignación (propio) inválido para ${sku} (usar número entre 0 y 100, o vacío)`
          );
          continue;
        }
        comisionConsignacion = parsed.value;
      }

      try {
        await prisma.producto.create({
          data: {
            sku,
            nombre,
            descripcion: colDesc >= 0 ? get(colDesc) || null : null,
            categoriaId,
            precioCompra: colPrecioCompra >= 0 ? parseFloat(get(colPrecioCompra)) || null : null,
            precioVenta,
            enConsignacion,
            comisionConsignacion,
            stockActual: colStock >= 0 ? Math.max(0, parseInt(get(colStock), 10) || 0) : 0,
            stockMinimo: colStockMin >= 0 ? Math.max(0, parseInt(get(colStockMin), 10) || 5) : 5,
            proveedorId,
            imagenUrl: colImagen >= 0 && get(colImagen) ? get(colImagen) : null,
          },
        });
        creados.push(sku);
        skusExistentes.add(sku);
      } catch (err) {
        errores.push(`Fila ${i + 1}: ${err instanceof Error ? err.message : "Error"}`);
      }
    }

    return NextResponse.json({
      creados: creados.length,
      errores: errores.length,
      skus: creados,
      mensajesError: errores,
    });
  } catch (error) {
    console.error("Error carga masiva:", error);
    return NextResponse.json(
      { error: "Error al procesar el archivo" },
      { status: 500 }
    );
  }
}
