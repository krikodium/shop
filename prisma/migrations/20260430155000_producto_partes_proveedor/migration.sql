-- CreateTable
CREATE TABLE "ProductoParteProveedor" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "parteNombre" TEXT NOT NULL,
    "costo" DECIMAL(10,2),
    "notas" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductoParteProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductoParteProveedor_productoId_idx" ON "ProductoParteProveedor"("productoId");

-- CreateIndex
CREATE INDEX "ProductoParteProveedor_proveedorId_idx" ON "ProductoParteProveedor"("proveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoParteProveedor_productoId_parteNombre_proveedorId_key" ON "ProductoParteProveedor"("productoId", "parteNombre", "proveedorId");

-- AddForeignKey
ALTER TABLE "ProductoParteProveedor" ADD CONSTRAINT "ProductoParteProveedor_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoParteProveedor" ADD CONSTRAINT "ProductoParteProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
