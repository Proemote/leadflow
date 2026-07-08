# Brevo Webhook Integration — LeadFlow Setup

**Fecha**: 2026-07-08  
**Flujo**: proemote.es/diagnostico → Google Sheets → Brevo → **LeadFlow (nuevo)**

---

## 📋 Qué se implementó

### Endpoint creado
```
POST /api/webhooks/brevo
```

**Ubicación**: `src/app/api/webhooks/brevo/route.ts`

**Responsabilidades**:
1. Valida webhook secret (`x-webhook-secret` header)
2. Parsea contacto de Brevo (email + atributos)
3. Busca/crea/actualiza contacto en Supabase
4. Marca origen como `diagnostico_digital`
5. Guarda plan_recomendado y puntuacion_global

---

## 🔧 Configuración en Vercel

### Variable de entorno necesaria

Añade en **Settings → Environment Variables**:

```
BREVO_WEBHOOK_SECRET = 707d096574226f41f1324fefea32004a4573198aa072d52f
```

(Este es el secret que definiste en Brevo)

---

## 🌐 Configuración en Brevo

### Paso 1: Crear Webhook en Brevo
1. Brevo Dashboard → **Automations**
2. Tu automatización de "Diagnóstico Digital"
3. En la acción "Webhook", añade:

   **URL**: `https://tu-app-vercel.com/api/webhooks/brevo`
   
   **Método**: POST
   
   **Headers**:
   ```
   x-webhook-secret: 707d096574226f41f1324fefea32004a4573198aa072d52f
   Content-Type: application/json
   ```
   
   **Body** (Brevo lo llena automáticamente):
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

### Paso 2: Trigger de la automatización
Esta llamada ocurre automáticamente cuando:
- Un contacto se añade a la lista "Diagnóstico Digital" en Brevo

---

## ✅ Flujo Completo

```
1. Cliente completa proemote.es/diagnostico
   ↓
2. Datos → Google Sheets (registro)
   ↓
3. Datos → Brevo (contacto creado en lista "Diagnóstico Digital")
   ↓
4. Brevo dispara webhook automáticamente
   ↓
5. POST /api/webhooks/brevo recibe datos
   ↓
6. Busca/crea/actualiza contacto en LeadFlow (tabla contacts)
   ↓
7. Contacto guardado con:
   - ad_source = "diagnostico_digital"
   - plan_recomendado = valor de Brevo
   - puntuacion_global = valor de Brevo
   - email, nombre, sector, ciudad
```

---

## 🔍 Validación y Testing

### Test local (dev)
```bash
curl -X POST http://localhost:3000/api/webhooks/brevo \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: 707d096574226f41f1324fefea32004a4573198aa072d52f" \
  -d '{
    "email": "test@example.com",
    "attributes": {
      "PLAN_RECOMENDADO": "Sistema Escala",
      "PUNTUACION_GLOBAL": 85,
      "FIRSTNAME": "Juan",
      "SECTOR": "Hostelería",
      "CIUDAD": "Mérida"
    }
  }'
```

**Respuesta esperada** (200 OK):
```json
{
  "success": true,
  "contact_id": "uuid-aqui",
  "action": "created",
  "email": "tes****le.com"
}
```

### Test en staging/prod
1. Completa el formulario en proemote.es/diagnostico
2. Verifica que el contacto aparece en LeadFlow → Clientes
3. Confirma que `ad_source = "diagnostico_digital"` y campos de diagnóstico están guardados

---

## 📊 Estructura de datos guardados

### En tabla `contacts` de LeadFlow:

```
id: uuid (auto)
email: "cliente@example.com"
name: "Juan García"
ad_source: "diagnostico_digital" ← MARCA DE ORIGEN
plan_recomendado: "Sistema Escala" ← DEL FORMULARIO
puntuacion_global: 85 ← DEL FORMULARIO
notes: "Sector: Hostelería | Ciudad: Mérida" ← CONTEXTO
created_at: 2026-07-08T...
bot_enabled: true
blocked: false
```

---

## 🚨 Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| 401 Unauthorized | Secret incorrecto | Verifica BREVO_WEBHOOK_SECRET en Vercel |
| 400 Bad Request | Email falta en payload | Asegúrate que Brevo envía `{{ contact.email }}` |
| 500 Internal Error | Supabase down o error BD | Revisa logs en Vercel → Edge Functions |
| Contact no aparece | Webhook no se dispara en Brevo | Verifica trigger en automatización Brevo |

---

## 📝 Logging

Todos los webhook calls se registran en stdout con prefijo `[BREVO WEBHOOK]`:
```
[BREVO WEBHOOK] Processing contact: tes****le.com (plan: Sistema Escala)
[BREVO WEBHOOK] Contact created: 12345678-...
```

(Los emails se enmascarran para privacidad)

---

## 🔐 Seguridad

- ✅ Header `x-webhook-secret` valida que la llamada viene de Brevo
- ✅ Queries SQL parametrizadas (sin inyección)
- ✅ Emails normalizados (lowercase + trim)
- ✅ Validación de tipos en TypeScript
- ✅ Logs sanitizados (sin exponer datos sensibles)

---

## 🚀 Deploy Checklist

- [ ] BREVO_WEBHOOK_SECRET añadido a Vercel Environment Variables
- [ ] Deploy a producción (o staging)
- [ ] Test con curl o formulario real
- [ ] Contacto aparece en LeadFlow Clientes
- [ ] Badge "Diagnóstico Digital" visible (si implementaste UI)
- [ ] Brevo webhook se ve en logs sin errores

---

## 📁 Files

- `src/app/api/webhooks/brevo/route.ts` — Endpoint (NUEVO)
- `src/lib/supabase/admin.ts` — Admin client (EXISTENTE)
- Schema: `plan_recomendado` y `puntuacion_global` agregadas a tabla `contacts`

---

**Próximos pasos opcionales:**
- [ ] UI: Badge "Origen: Diagnóstico Digital" en ficha de cliente
- [ ] UI: Mostrar plan_recomendado y puntuacion_global en sidebar
- [ ] Analytics: Contar cuántos contactos vienen de diagnóstico
