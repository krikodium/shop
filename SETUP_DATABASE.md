# Guía de configuración de base de datos

## Opción 1: PostgreSQL local (recomendado)

### Paso 1: Instalar PostgreSQL

**Windows:**
- Descargá [PostgreSQL para Windows](https://www.postgresql.org/download/windows/)
- O usá [Postgres.app](https://postgresapp.com/) (más simple)
- O instalá con Chocolatey: `choco install postgresql`

**Mac:**
- `brew install postgresql@16`
- O descargá [Postgres.app](https://postgresapp.com/)

**Linux:**
- `sudo apt-get install postgresql postgresql-contrib` (Ubuntu/Debian)
- `sudo dnf install postgresql postgresql-server` (Fedora)

### Paso 2: Crear la base de datos

Abrí una terminal y ejecutá:

```bash
# Conectarte a PostgreSQL
psql -U postgres

# Crear la base de datos
CREATE DATABASE shop;

# Salir
\q
```

### Paso 3: Configurar .env

En el archivo `.env`, poné:

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/shop"
```

Reemplazá `TU_PASSWORD` con la contraseña que configuraste al instalar PostgreSQL.

**Si no pusiste password** (usuario por defecto sin password):

```env
DATABASE_URL="postgresql://postgres@localhost:5432/shop"
```

### Paso 4: Aplicar migraciones

```bash
npx prisma migrate dev --name init
```

Esto crea todas las tablas según el schema.

---

## Opción 2: Prisma Postgres (servicio de Prisma)

### Paso 1: Crear cuenta en Prisma

1. Andá a [prisma.io](https://www.prisma.io/)
2. Creá una cuenta
3. Creá un proyecto de Prisma Postgres

### Paso 2: Copiar la URL

Te van a dar una URL tipo:

```
prisma+postgres://...
```

Copiala en `.env`:

```env
DATABASE_URL="prisma+postgres://..."
```

### Paso 3: Aplicar migraciones

```bash
npx prisma migrate dev --name init
```

---

## Opción 3: Servicios en la nube (gratis)

### Supabase (recomendado, gratis)

1. Creá cuenta en [supabase.com](https://supabase.com)
2. Creá un proyecto nuevo
3. Andá a **Settings** → **Database**
4. Copiá la **Connection string** (URI)
5. Pegala en `.env`:

```env
DATABASE_URL="postgresql://postgres:[TU_PASSWORD]@db.[TU_PROYECTO].supabase.co:5432/postgres"
```

### Neon (gratis)

1. Creá cuenta en [neon.tech](https://neon.tech)
2. Creá un proyecto
3. Copiá la connection string
4. Pegala en `.env`:

```env
DATABASE_URL="postgresql://[USUARIO]:[PASSWORD]@[HOST]/[BD]?sslmode=require"
```

### Railway (gratis con créditos)

1. Creá cuenta en [railway.app](https://railway.app)
2. Creá un proyecto PostgreSQL
3. Copiá la DATABASE_URL que te dan
4. Pegala en `.env`

---

## Verificar que funciona

Después de configurar `DATABASE_URL`, probá la conexión:

```bash
# Generar el cliente Prisma
npx prisma generate

# Ver el estado de la base de datos
npx prisma db pull

# O abrir Prisma Studio (interfaz visual)
npx prisma studio
```

Si todo está bien, deberías poder ver las tablas en Prisma Studio.

---

## Formato de la URL (referencia)

```
postgresql://[USUARIO]:[PASSWORD]@[HOST]:[PUERTO]/[NOMBRE_BD]
```

Ejemplos:

- Local sin password: `postgresql://postgres@localhost:5432/shop`
- Local con password: `postgresql://postgres:mipassword@localhost:5432/shop`
- Con SSL (nube): `postgresql://user:pass@host:5432/db?sslmode=require`

---

## Troubleshooting

### Error: "Can't reach database server"

- Verificá que PostgreSQL esté corriendo
- Verificá que el puerto sea correcto (5432 por defecto)
- Verificá que el usuario y password sean correctos

### Error: "database does not exist"

- Creá la base de datos primero: `CREATE DATABASE shop;`

### Error: "password authentication failed"

- Verificá la contraseña en `.env`
- Si usás Supabase/Neon, asegurate de copiar bien la password del panel

### Error: "relation already exists"

- La migración ya se aplicó. Si querés resetear: `npx prisma migrate reset` (⚠️ borra todos los datos)
