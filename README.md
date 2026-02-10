# Shop - Sistema de gestión con consignación

Sistema de gestión para un shop de productos (decoración / diseño de interiores) con **inventario propio**, **punto de venta** y **consignación** (rendición a proveedores).

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS** + **Shadcn/ui**
- **Prisma 7** + **PostgreSQL**
- **React Hook Form** + **Zod**

## Requisitos

- Node.js 18+
- PostgreSQL (local o remoto)

## Configuración

1. **Clonar / abrir el proyecto** y instalar dependencias (ya hecho si creaste con create-next-app):

   ```bash
   npm install
   ```

2. **Variables de entorno**

   Copiá `.env.example` a `.env` y configurá la base de datos:

   ```env
   DATABASE_URL="postgresql://USUARIO:PASSWORD@HOST:5432/NOMBRE_BD"
   ```

   Ejemplo local:

   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shop"
   ```

3. **Crear la base de datos y aplicar migraciones**

   ```bash
   npx prisma migrate dev --name init
   ```

   (Opcional) Cargar datos de prueba:

   ```bash
   npx prisma db seed
   ```

   Si querés usar seed, agregá en `package.json`:

   ```json
   "prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }
   ```

4. **Arrancar el servidor**

   ```bash
   npm run dev
   ```

   Abrí [http://localhost:3000](http://localhost:3000). La raíz es el **dashboard** con enlaces a cada módulo.

## Estructura del proyecto

- **Dashboard** (`/`): acceso rápido a ventas, productos, consignación, etc.
- **Proveedores** (`/proveedores`): CRUD. Tipo Regular o Consignación; comisión por defecto para consignación.
- **Productos** (`/productos`): CRUD. Soporte “en consignación”, proveedor, comisión, stock, categoría.
- **Ventas** (`/ventas`, `/ventas/nueva`): listado y punto de venta (Fase 2).
- **Consignación** (`/consignacion`): dashboard, deudas y rendiciones (Fase 3).
- **Clientes** y **Compras**: placeholders para fases posteriores.

Las **APIs** están en `/api/proveedores`, `/api/productos`, `/api/categorias`. La lógica de **cálculo de costos y consignación** está en `src/lib/calculadores/`.

## Prisma 7 y PostgreSQL

Este proyecto usa **Prisma 7** con el **adapter `@prisma/adapter-pg`**. La URL se toma de `DATABASE_URL` en `.env`; la configuración del cliente está en `src/lib/prisma.ts`. No hace falta configurar la URL en el schema (va en `prisma.config.ts` si usás la CLI de Prisma).

## Próximos pasos (según tu spec)

- **Fase 2**: Punto de venta (buscador, carrito, cálculo de costos/márgenes, API de ventas, actualización de stock).
- **Fase 3**: Consignación (dashboard de deudas, generación de rendiciones, PDF).
- **Fase 4**: Órdenes de compra y movimientos de stock.
- **Fase 5**: Clientes y reportes.

Si querés, el siguiente paso puede ser implementar el **punto de venta** (Fase 2) o el **módulo de consignación** (Fase 3).
