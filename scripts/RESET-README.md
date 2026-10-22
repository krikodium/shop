Reset comercial seguro (conserva usuarios, tokens, jornadas y migraciones):

Respaldo independiente, sin ninguna escritura en la BD:

```powershell
npm run db:backup
```

Si aplicás migraciones, generá un respaldo nuevo después: la restauración exige que el esquema coincida exactamente. Las conexiones con `schema` diferente de `public` se rechazan para que un entorno de prueba nunca limpie las tablas comerciales.

```powershell
npm run db:clean
# Revisar destino y conteos. Solo entonces:
npm run db:clean -- --apply --confirm-target HOST:5432/BASE
```

El respaldo se crea y relee antes de borrar, dentro de una transacción con bloqueo de tablas. Se guarda en `backups/`, excluido de git. Incluye datos personales y hashes: conservarlo localmente con acceso restringido. Los importes se guardan como JSON textual emitido por PostgreSQL, preservando `numeric` exacto. Ante una tabla desconocida, el reset se cancela para revisar el plan.

Restauración del respaldo comercial, exclusivamente sobre tablas comerciales vacías y el mismo esquema/destino; conserva los accesos actuales y exige los usuarios originales:

```powershell
npx tsx scripts/restore-db.ts --backup backups/ARCHIVO.json
npx tsx scripts/restore-db.ts --backup backups/ARCHIVO.json --apply --confirm-target HOST:5432/BASE
```

Los comandos simulan sin escrituras por defecto. No ejecutar `--apply` hasta aprobar el alcance y verificar el destino. La importación posterior se valida primero desde Productos → Carga masiva Excel. No mezclar catálogos ni archivos de prueba con los productos reales.
