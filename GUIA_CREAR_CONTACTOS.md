# 🔧 Solución: Error al Crear Contactos en LeadFlow

## Problema
Cuando intentas crear un contacto, recibés el error:
```
Failed to execute 'json' on 'Response': Unexpected end of JSON input
```

## Causa Raíz
La tabla `contacts` en Supabase tiene una restricción que requiere que el campo `phone` sea NOT NULL. Sin embargo, cuando creas un contacto desde el formulario de oportunidades (Kanban), no proporcionás un teléfono, lo que causa un error en la base de datos.

## Solución ✅

### Paso 1: Ejecutar la Migración en Supabase

1. Abre el panel de **Supabase** (https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** → **New Query**
4. Copia y pega todo el contenido de este archivo:
   ```
   supabase/migrations_crm.sql
   ```
5. Haz clic en **Run** (o Ctrl/Cmd + Enter)

La migración hace esto:
- ✅ Quita la restricción NOT NULL del campo `phone`
- ✅ Agrega campos nuevos: `email`, `company`, `tags`, `notes`
- ✅ Crea las tablas `operations` y `opportunities` para el Kanban

**Importante:** Si ejecutaste `supabase/schema.sql` en el pasado, ahora ejecutá `supabase/migrations_crm.sql` para actualizar.

### Paso 2: Reiniciar el servidor local

```bash
npm run dev
```

## Verificación

Después de ejecutar la migración, deberías poder:
1. ✅ Crear contactos con solo nombre (sin teléfono)
2. ✅ Crear oportunidades con un "Nuevo contacto" autom instantáneamente
3. ✅ Ver los mensajes de error claros si algo falla

## Errores Posteriores

Si recibís error de base de datos después de esto, probablemente significa:

- **"Unauthorized" o "403"**: Verificá que `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` sea correcto
- **"Connection refused"**: Verificá que la URL en `SUPABASE_URL` es accesible
- **"column does not exist"**: La migración no fue ejecutada correctamente, ejecutala nuevamente

## Variables de Entorno Verificadas

Tu proyecto tiene estas configuradas (✅):
```
SUPABASE_URL = ✅ Configurada
SUPABASE_SERVICE_ROLE_KEY = ✅ Configurada
```

Si necesitás renovarlas:
1. Ve a Supabase Dashboard → Settings → API
2. Copia `Project URL` y `service_role secret`
3. Actualiza `.env.local`

---

**Última actualización:** 2026-07-08 | **LeadFlow v0.1.0**
