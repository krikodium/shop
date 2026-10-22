import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

const HEADERS = [
  "SKU",
  "Nombre",
  "Descripción",
  "Categoría",
  "Precio compra",
  "Precio venta",
  "Stock",
  "Stock mínimo",
  "Proveedor",
  "Consignación",
  "Porcentaje consignación (propio)",
  "Imagen URL",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modelo = searchParams.get("modelo");

  const rows: string[][] = [HEADERS];

  if (modelo === "prueba") {
    // Ejemplo 1: consignación con % propio e imagen
    rows.push([
      "PROD-001",
      "Producto con imagen",
      "Ejemplo con URL de imagen",
      "",
      "500",
      "1200",
      "10",
      "5",
      "",
      "S",
      "30",
      "https://placehold.co/200x200?text=Producto",
    ]);
    // Ejemplo 2: sin consignación ni URL
    rows.push([
      "PROD-002",
      "Producto sin imagen",
      "Ejemplo sin imagen (dejar vacío)",
      "",
      "300",
      "800",
      "5",
      "3",
      "",
      "N",
      "",
      "",
    ]);
  } else if (modelo === "ejemplo") {
    // Plantilla vacía con una fila de ejemplo
    rows.push([
      "PROD-001",
      "Producto ejemplo",
      "Descripción",
      "",
      "1000",
      "2500",
      "10",
      "5",
      "",
      "N",
      "",
      "",
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = HEADERS.map((_, i) => ({ wch: i === 1 ? 30 : i === 11 ? 40 : 15 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Productos");
  const instrucciones = XLSX.utils.aoa_to_sheet([
    ["Cómo cargar el catálogo"],
    ["Completá la hoja Productos; la plantilla vacía no incluye productos de prueba."],
    ["Obligatorios: SKU único, Nombre y Precio venta mayor a cero."],
    ["Precios en ARS. Hasta dos decimales. Usar 1250.50 o 1.250,50."],
    ["Stock y Stock mínimo: enteros no negativos. Vacíos: 0 y 5."],
    ["Categoría y Proveedor: nombres. Se crean automáticamente si no existen."],
    ["Consignación S o N. S requiere proveedor y porcentaje propio o comisión por defecto existente."],
    ["Imagen URL opcional: http o https. Máximo 5000 productos y 5 MB por archivo."],
    ["Validá primero. Ante errores no se importa ninguna fila."],
  ]);
  instrucciones["!cols"] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(wb, instrucciones, "Instrucciones");

  const filename =
    modelo === "prueba" ? "modelo-prueba-productos.xlsx" : "plantilla-productos.xlsx";

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
