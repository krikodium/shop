import { Prisma } from "@prisma/client";

export const CATALOGO_HEADERS = ["SKU", "Nombre", "Descripción", "Categoría", "Precio compra", "Precio venta", "Stock", "Stock mínimo", "Proveedor", "Consignación", "Porcentaje consignación (propio)", "Imagen URL"];
export type FilaCatalogo = { fila: number; sku: string; nombre: string; descripcion: string | null; categoria: string; proveedor: string; precioCompra: string | null; precioVenta: string; stockActual: number; stockMinimo: number; enConsignacion: boolean; comisionConsignacion: string | null; imagenUrl: string | null };
const normalize = (value: unknown) => String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/_/g, " ");
// Importes ARS con dos decimales: punto decimal o formato argentino 1.250,50.
export function decimalCatalogo(value: string, max: string, optional = false): string | null {
  if (!value && optional) return null;
  let text = value.trim();
  if (text.includes(",")) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(text)) throw new Error("Número inválido; usar 1250.50 o 1.250,50");
    text = text.replace(/\./g, "").replace(",", ".");
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error("Número inválido; máximo dos decimales");
  const decimal = new Prisma.Decimal(text);
  if (decimal.greaterThan(max)) throw new Error("Importe fuera de rango");
  return decimal.toFixed(2);
}
export function validarCatalogo(rows: unknown[][], existentes: Set<string>) {
  const errores: string[] = [];
  const productos: FilaCatalogo[] = [];
  const headers = (rows[0] ?? []).map(normalize);
  const col = (...names: string[]) => headers.findIndex((h) => names.includes(h));
  const columns = [col("sku", "codigo"), col("nombre", "producto"), col("descripcion"), col("categoria"), col("precio compra", "preciocompra", "costo"), col("precio venta", "precioventa", "precio"), col("stock", "stock actual", "cantidad"), col("stock minimo"), col("proveedor"), col("consignacion", "en consignacion"), col("porcentaje consignacion (propio)", "porcentaje consignacion", "% consignacion", "comision consignacion", "comision shop"), col("imagen url", "imagen", "foto", "url imagen")];
  if ([columns[0], columns[1], columns[5]].some((c) => c < 0)) return { productos, errores: ["Faltan columnas obligatorias: SKU, Nombre y Precio venta"] };
  const skus = new Set(existentes);
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (row.every((v) => String(v ?? "").trim() === "")) continue;
    const get = (n: number) => columns[n] < 0 ? "" : String(row[columns[n]] ?? "").trim();
    try {
      const sku = get(0), nombre = get(1);
      if (!sku || !nombre || sku.length > 100 || nombre.length > 200) throw new Error("SKU y Nombre son obligatorios (máximo 100 y 200 caracteres)");
      if (skus.has(sku)) throw new Error(`SKU ${sku} duplicado o existente`);
      skus.add(sku);
      const precioVenta = decimalCatalogo(get(5), "99999999.99")!;
      if (new Prisma.Decimal(precioVenta).lessThanOrEqualTo(0)) throw new Error("Precio venta debe ser mayor a cero (ARS)");
      const integer = (value: string, fallback: number) => {
        if (!value) return fallback;
        if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) throw new Error("Stock debe ser un entero no negativo");
        return Number(value);
      };
      const flag = normalize(get(9));
      if (!["", "s", "si", "yes", "1", "true", "n", "no", "0", "false"].includes(flag)) throw new Error("Consignación debe ser S o N");
      const enConsignacion = ["s", "si", "yes", "1", "true"].includes(flag);
      if (enConsignacion && !get(8)) throw new Error("Consignación requiere Proveedor");
      const porcentaje = get(10).replace(/%$/, "").trim();
      if (!enConsignacion && porcentaje) throw new Error("Porcentaje solo corresponde a consignación");
      const comisionConsignacion = enConsignacion ? decimalCatalogo(porcentaje, "100", true) : null;
      const imagenUrl = get(11) || null;
      if (imagenUrl && !/^https?:\/\//i.test(imagenUrl)) throw new Error("Imagen debe ser una URL http/https");
      if (imagenUrl) new URL(imagenUrl);
      productos.push({ fila: i + 1, sku, nombre, descripcion: get(2) || null, categoria: get(3), proveedor: get(8), precioCompra: decimalCatalogo(get(4), "99999999.99", true), precioVenta, stockActual: integer(get(6), 0), stockMinimo: integer(get(7), 5), enConsignacion, comisionConsignacion, imagenUrl });
    } catch (error) { errores.push(`Fila ${i + 1}: ${error instanceof Error ? error.message : "Datos inválidos"}`); }
  }
  if (!productos.length && !errores.length) errores.push("El archivo no contiene productos");
  return { productos, errores };
}
