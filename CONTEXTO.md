# CONTEXTO — Sesión de Desarrollo (2026-07-08)

**Desarrollador**: Claude Code  
**Proyecto**: LeadFlow CRM (Next.js 16, Supabase, Vercel)  
**Objetivo**: Integración de webhook Brevo + Fix de sincronización de contactos

---

## 🎯 Qué se logró en esta sesión

### 1. Fix de Sincronización de Contactos (Contact Sync)

**Problema**: Los contactos creados desde oportunidades no aparecían en la UI sin recargar manualmente.

**Causa raíz**: Next.js 16 App Router **client-side Router Cache** (`staleTimes`).  
Los datos SÍ se guardaban en BD, pero el cliente cacheaba páginas visitadas.

**Solución implementada**:
- ✅ Agregado `experimental: { staleTimes: { dynamic: 0 } }` en `next.config.ts`
- ✅ Estado mutable en `KanbanBoard`: `const [contactsList, setContactsList] = useState<ContactOpt[]>(contacts)`
- ✅ Callback `onContactAdded` en `OpportunityForm` para sincronizar UI
- ✅ `ClientesList` actualiza estado local en vez de hacer `router.refresh()`
- ✅ API `/api/opportunities` devuelve `newContact` en respuesta

**Resultado**: 
- Crear contacto desde oportunidad → visible instantáneamente en tabla
- Navegar a Clientes → contacto aparece sin recargar
- Volver a Oportunidades → nombre persiste correctamente

**Archivos modificados**:
- `next.config.ts`
- `src/components/KanbanBoard.tsx`
- `src/components/ClientesList.tsx`
- `src/app/api/opportunities/route.ts`

---

### 2. Integración de Webhook Brevo

**Flujo implementado**:
```
proemote.es/diagnostico 
  → Google Sheets (registro)
  → Brevo (contacto en lista "Diagnóstico Digital")
  → [WEBHOOK] LeadFlow
  → Contacto creado/actualizado automáticamente
```

#### 2.1 Auditoría de BD (Supabase)

**Tabla**: `public.contacts`

Estructura confirmada y mejorada:
```
- id (uuid, PK)
- email (text, nullable, nuevo índice para búsquedas rápidas)
- name (text, nullable)
- phone (text, nullable, unique)
- ad_source (text, nullable) ← Marca de origen ("diagnostico_digital")
- created_at (timestamptz)
- company, tags, notes, bot_enabled, blocked, ctwa_clid
+ NUEVO: plan_recomendado (text, nullable)
+ NUEVO: puntuacion_global (integer, nullable)
```

**Migración SQL ejecutada**:
```sql
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS plan_recomendado TEXT NULL,
ADD COLUMN IF NOT EXISTS puntuacion_global INTEGER NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
```

#### 2.2 Endpoint de Webhook

**Ubicación**: `src/app/api/webhooks/brevo/route.ts` (NUEVO)

**Responsabilidades**:
1. Valida header `x-webhook-secret`
2. Parsea payload de Brevo (email, PLAN_RECOMENDADO, PUNTUACION_GLOBAL, FIRSTNAME, SECTOR, CIUDAD)
3. Busca contacto por email (con índice)
4. Si existe → UPDATE (plan, puntuación, origen)
5. Si NO existe → INSERT (crea contacto nuevo con origen="diagnostico_digital")
6. Logging seguro (sin exponer datos completos)
7. Respuestas HTTP claras (200, 400, 401, 500)

**Características**:
- ✅ TypeScript + validación de tipos
- ✅ Queries SQL parametrizadas (sin inyección)
- ✅ Error handling robusto
- ✅ Campos de contexto: sector y ciudad en `notes`
- ✅ `ad_source = "diagnostico_digital"` siempre

#### 2.3 Deploy a Vercel

**Estado**: ✅ LIVE en producción

```
URL: https://leadflow-crm-woad.vercel.app/api/webhooks/brevo
```

---

## 🔧 Cambios específicos de código

### Archivos modificados (8 total)

| Archivo | Cambio | Razón |
|---------|--------|-------|
| `next.config.ts` | Agregado `experimental.staleTimes` | Desactivar Router Cache |
| `src/components/KanbanBoard.tsx` | Estado mutable + callback `onContactAdded` | Sincronizar UI en tiempo real |
| `src/components/ClientesList.tsx` | `NewContactForm` retorna contacto + state update | Evitar `router.refresh()` |
| `src/app/api/opportunities/route.ts` | Devuelve `newContact` en response | API completa para cliente |
| `src/app/api/webhooks/brevo/route.ts` | **NUEVO endpoint** | Receptor de webhook |
| `src/app/api/customers/route.ts` | Fix TypeScript | Build error |
| `src/components/CustomerDetail.tsx` | Fix TypeScript | Build error |
| (varias) | Fixes TypeScript menores | Build success |

---

## 🔐 Variables de entorno

### Configurada en Vercel (production)

```
BREVO_WEBHOOK_SECRET = 707d096574226f41f1324fefea32004a4573198aa072d52f
```

---

## ✅ Estado actual

- [x] Contact Sync fix implementado y verificado en vivo
- [x] BD migrada con nuevas columnas
- [x] Endpoint Brevo webhook creado
- [x] Deploy a Vercel exitoso
- [x] Build sin errores
- [x] Variables de entorno configuradas
- [ ] Webhook configurado en Brevo (pendiente — usuario lo hace)
- [ ] Testing end-to-end (pendiente)

---

## 🔄 Próximos pasos

### PENDIENTE: Configurar webhook en Brevo

En tu automatización de "Diagnóstico Digital" en Brevo:

**URL**: `https://leadflow-crm-woad.vercel.app/api/webhooks/brevo`

**Header**: 
```
x-webhook-secret: 707d096574226f41f1324fefea32004a4573198aa072d52f
```

**Body**:
```json
{
  "email": "{{ contact.email }}",
  "attributes": {
    "PLAN_RECOMENDADO": "{{ contact.PLAN_RECOMENDADO }}",
    "PUNTUACION_GLOBAL": "{{ contact.PUNTUACION_GLOBAL }}",
    "FIRSTNAME": "{{ contact.FIRSTNAME }}",
    "SECTOR": "{{ contact.SECTOR }}",
    "CIUDAD": "{{ contact.CIUDAD }}"
  }
}
```

### Opcional: UI badge de origen

Mostrar en ficha de cliente si `ad_source = "diagnostico_digital"`:
- Badge "Origen: Diagnóstico Digital"
- Mostrar `plan_recomendado` y `puntuacion_global`

---

## 📚 Documentación

Ver en raíz del proyecto:
- **FIXES.md** — Explicación técnica detallada
- **QUICK_SUMMARY.md** — Referencia rápida (1 página)
- **BREVO_WEBHOOK_SETUP.md** — Guía de Brevo
- **CONTEXTO.md** — Este archivo

---

**Última actualización**: 2026-07-08 12:00 UTC  
**Estado**: ✅ READY FOR BREVO CONFIGURATION
