import { prisma } from "@/lib/prisma";
import { NuevoProductoCliente } from "@/components/productos/NuevoProductoCliente";
import type { Categoria, Proveedor } from "@prisma/client";

export default async function NuevoProductoPage() {
  const [categoriasRaw, proveedoresRaw] = await Promise.all([
    prisma.categoria.findMany({ orderBy: { nombre: "asc" } }),
    prisma.proveedor.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  const categorias = JSON.parse(JSON.stringify(categoriasRaw)) as Categoria[];
  const proveedores = JSON.parse(JSON.stringify(proveedoresRaw)) as Proveedor[];

  return (
    <NuevoProductoCliente categorias={categorias} proveedores={proveedores} />
  );
}
