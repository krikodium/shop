# Configuración de PostgreSQL con pgAdmin 4

## Paso 1: Abrir pgAdmin 4

1. Buscá **pgAdmin 4** en el menú de inicio de Windows
2. Abrí la aplicación
3. Te va a pedir una **master password** (la que configuraste al instalar PostgreSQL)
   - Si no la recordás, podés resetearla o usar la que pusiste durante la instalación

## Paso 2: Conectarte al servidor PostgreSQL

1. En el panel izquierdo, expandí **Servers**
2. Vas a ver algo como **PostgreSQL 16** (o la versión que instalaste)
3. Hacé clic derecho sobre el servidor → **Connect Server**
4. Te va a pedir la contraseña del usuario `postgres` (la misma que usaste para instalar)
5. Una vez conectado, el ícono del servidor debería cambiar (deja de estar tachado)

## Paso 3: Crear la base de datos "shop"

1. Hacé clic derecho sobre el servidor (PostgreSQL 16) → **Create** → **Database...**
2. En la ventana que se abre:
   - **Database name**: `shop`
   - **Owner**: dejá `postgres` (por defecto)
   - **Encoding**: `UTF8` (por defecto)
   - **Template**: `template0` (por defecto)
3. Hacé clic en **Save**
4. Ya deberías ver la base de datos `shop` en el panel izquierdo bajo tu servidor

## Paso 4: Verificar la conexión

1. Expandí la base de datos `shop`
2. Deberías ver carpetas como: **Schemas**, **Tables**, etc.
3. Por ahora no va a haber tablas (las crea Prisma con las migraciones)

## Paso 5: Obtener la información de conexión

Para configurar el `.env`, necesitás estos datos:

1. En pgAdmin, hacé clic derecho sobre el servidor → **Properties**
2. Andá a la pestaña **Connection**
3. Anotá:
   - **Host name/address**: generalmente `localhost` o `127.0.0.1`
   - **Port**: generalmente `5432`
   - **Maintenance database**: `postgres` (por defecto)
   - **Username**: `postgres` (por defecto)
   - **Password**: la que configuraste al instalar PostgreSQL

## Paso 6: Configurar el archivo .env

Con esa información, actualizá tu `.env`:

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/shop"
```

**Ejemplo real:**
```env
DATABASE_URL="postgresql://postgres:mipassword123@localhost:5432/shop"
```

**Si no pusiste password** (poco común pero posible):
```env
DATABASE_URL="postgresql://postgres@localhost:5432/shop"
```

## Paso 7: Aplicar las migraciones de Prisma

Abrí una terminal en la carpeta del proyecto y ejecutá:

```bash
# Generar el cliente Prisma
npx prisma generate

# Crear las tablas en la base de datos
npx prisma migrate dev --name init
```

Esto va a crear todas las tablas según el schema de Prisma.

## Paso 8: Verificar que funcionó

1. En pgAdmin, expandí: **shop** → **Schemas** → **public** → **Tables**
2. Deberías ver todas las tablas creadas:
   - `Proveedor`
   - `Producto`
   - `Categoria`
   - `Venta`
   - `ItemVenta`
   - `Rendicion`
   - `Cliente`
   - `OrdenCompra`
   - `MovimientoStock`
   - `User`

## Paso 9: (Opcional) Ver datos con Prisma Studio

En la terminal, ejecutá:

```bash
npx prisma studio
```

Se va a abrir una interfaz web en `http://localhost:5555` donde podés ver y editar los datos de forma visual.

---

## Troubleshooting

### Error: "password authentication failed"

- Verificá que la password en `.env` sea la misma que usás para conectarte en pgAdmin
- Si no recordás la password, podés cambiarla desde pgAdmin:
  1. Clic derecho en el servidor → **Properties** → **Connection**
  2. Cambiá la password ahí

### Error: "database does not exist"

- Verificá que creaste la base de datos `shop` correctamente
- En pgAdmin, verificá que aparece en el listado de bases de datos

### Error: "Can't reach database server"

- Verificá que el servicio de PostgreSQL esté corriendo:
  - Windows: Buscá "Services" → buscá "postgresql" → verificá que esté "Running"
- Verificá que el puerto sea `5432` (o el que configuraste)

### No puedo conectarme en pgAdmin

- Verificá que PostgreSQL esté instalado correctamente
- Probá reiniciar el servicio de PostgreSQL desde Services
- Verificá que la master password de pgAdmin sea correcta

---

## Siguiente paso

Una vez que tengas todo configurado, podés arrancar el proyecto:

```bash
npm run dev
```

Y abrir [http://localhost:3000](http://localhost:3000) para ver el dashboard.
