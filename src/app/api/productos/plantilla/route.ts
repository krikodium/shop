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
  "Imagen URL",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modelo = searchParams.get("modelo");

  const rows: string[][] = [HEADERS];

  if (modelo === "prueba") {
    // Ejemplo 1: con URL de imagen de prueba
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
      "N",
      "https://placehold.co/200x200?text=Producto",
    ]);
    // Ejemplo 2: sin URL de imagen
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
    ]);
  } else {
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
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = HEADERS.map((_, i) => ({ wch: i === 1 ? 30 : i === 10 ? 40 : 15 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Productos");

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
