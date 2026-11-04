CREATE TABLE "FotoProducto" (
  "id" TEXT PRIMARY KEY CHECK ("id" ~ '^[a-f0-9]{64}$'),
  "contenido" BYTEA NOT NULL CHECK (octet_length("contenido") BETWEEN 1 AND 1048576),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
