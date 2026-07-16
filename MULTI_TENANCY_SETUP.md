# LeadFlow Multi-Tenancy Setup Guide

## Estado Actual (16 julio 2026)

Se ha implementado un **sistema de autenticación y multi-tenancy** para aislar datos por usuario. Todos los usuarios verán solo sus propios datos.

### ✅ Implementado

1. **Migración SQL** (`supabase/migrations_auth.sql`)
   - Tabla `profiles` (vincula auth.users con datos de negocio)
   - Columna `user_id` en: contacts, messages, leads, services, bookings, operations, contact_notes, opportunities, contact_services
   - Trigger automático: crea profile al registrarse usuario nuevo

2. **Autenticación Frontend**
   - `/app/login/page.tsx` — Login + Signup unificados con email/password
   - Tabs: "Iniciar sesión" | "Crear cuenta"
   - `lib/auth-helpers.ts` — signUp, signIn, signOut, getCurrentUser

3. **Protección de Rutas**
   - `src/middleware.ts` — Protege todas las rutas (redirige a /login si no autenticado)
   - `/api/auth/logout` — Logout centralizado
   - `/api/auth/profile` — Obtener perfil del usuario autenticado

4. **API Auth Middleware**
   - `lib/api-auth.ts` — `withAuth()` wrapper para endpoints protegidos
   - Extrae userId automáticamente desde sesión
   - Integración con Supabase SSR

5. **Funciones Multi-Usuario en lib/**
   - `db.ts`: getConversationsForUser, insertMessageForUser, etc.
   - `customers.ts`: getCustomersForUser, createContactForUser, etc.
   - `opportunities.ts`: getOpportunitiesForUser, createOpportunityForUser, etc.
   - `bookings.ts`: getBookingsForUser, createBookingForUser, etc.

6. **Endpoints API Actualizados**
   - `/api/customers` (GET/POST)
   - `/api/customers/[id]` (PATCH/DELETE)
   - `/api/opportunities` (GET/POST)
   - `/api/opportunities/[id]` (PATCH/DELETE)
   - Todos usando `withAuth()` wrapper

7. **UI Components**
   - `ProfileDropdown.tsx` — Botón logout con endpoint centralizado
   - Muestra nombre de usuario

---

## Cómo Activar en Producción

### Paso 1: Ejecutar Migración SQL en Supabase

1. Ve a **Supabase Dashboard** → tu proyecto
2. **SQL Editor** → crear nueva query
3. Copiar contenido completo de `supabase/migrations_auth.sql`
4. Ejecutar (⚡ botón)
5. ✓ Debe completar sin errores

**Nota:** La migración es idempotente (`create table if not exists`, `alter table if not exists`). Si ya existe algo, simplemente se ignora.

### Paso 2: Redeploy en Vercel

```bash
git add -A
git commit -m "feat: multi-tenancy system - user_id isolation with auth"
git push origin main
```

Vercel auto-deploya en ~3-5 min. Verificar en Vercel dashboard.

### Paso 3: Testear el Flujo

**Modo Demostración (sin Supabase configurado):**
```bash
npm run dev
# http://localhost:3000 → redirige a /login (botón "Demo Dashboard")
```

**Modo Producción (Supabase configurado):**

1. Ve a `/login`
2. Tab "Crear cuenta" → Registrar con email/password
3. Tab "Iniciar sesión" → Login con credenciales
4. Dashboard → Ver solo datos del usuario
5. Crear contacto, oportunidad → Se asigna automáticamente user_id
6. ProfileDropdown (arriba derecha) → "Cerrar sesión" → Redirige a /login

---

## Endpoints API Pendientes por Actualizar

### Prioritarios (Alto uso)

- [ ] `/api/operations` — GET/POST (crear operaciones)
- [ ] `/api/operations/[id]` — PATCH/DELETE
- [ ] `/api/contact-notes` — POST/DELETE (comentarios)
- [ ] `/api/contacts/[id]/notes` — GET (cargar comentarios)
- [ ] `/api/bookings` — GET/POST
- [ ] `/api/bookings/[id]` — PATCH/DELETE
- [ ] `/api/conversations` — GET (chats)

### Secundarios (Bajo uso)

- [ ] `/api/services` — GET/POST/PATCH/DELETE (nota: servicios podrían ser globales)
- [ ] `/api/contact-services` — GET/POST/PATCH/DELETE
- [ ] `/api/business` — GET/POST (config de negocio)
- [ ] `/api/settings` — GET/POST (settings globales)
- [ ] `/api/customers/import` — POST (importación masiva)

---

## Funciones Multi-Usuario Disponibles

### En `lib/db.ts`

```typescript
// Obtener conversaciones del usuario
export async function getConversationsForUser(userId: string): Promise<ConversationSummary[]>

// Obtener una conversación específica (con validación de user_id)
export async function getConversationForUser(userId: string, contactId: string): Promise<{...} | null>

// Insertar mensaje asociado al usuario
export async function insertMessageForUser(userId: string, msg: {...}): Promise<Message>

// Obtener o crear contacto (con validación de user_id)
export async function getOrCreateContactForUser(userId: string, phone: string, extra?: {...}): Promise<Contact>

// Upsert lead con validación de user_id
export async function upsertLeadForUser(userId: string, contactId: string, score: LeadScore, reason: string): Promise<Lead>
```

### En `lib/customers.ts`

```typescript
// Obtener clientes del usuario con métricas agregadas
export async function getCustomersForUser(userId: string): Promise<CustomerListResult>

// Obtener detalle de cliente (validando user_id)
export async function getCustomerForUser(userId: string, id: string): Promise<{...} | null>

// Crear contacto
export async function createContactForUser(userId: string, input: {...}): Promise<Contact>

// Actualizar contacto
export async function updateContactForUser(userId: string, id: string, patch: {...}): Promise<Contact>

// Agregar operación (transacción)
export async function addOperationForUser(userId: string, input: {...}): Promise<Operation>
```

### En `lib/opportunities.ts`

```typescript
// Obtener oportunidades del usuario
export async function getOpportunitiesForUser(userId: string): Promise<{opportunities, metrics}>

// Crear oportunidad
export async function createOpportunityForUser(userId: string, input: {...}): Promise<Opportunity>

// Actualizar oportunidad (incluye creación automática de operación si pasa a "Ganado")
export async function updateOpportunityForUser(userId: string, id: string, input: {...}): Promise<{opportunity, operationCreated}>

// Eliminar oportunidad
export async function deleteOpportunityForUser(userId: string, id: string): Promise<void>
```

### En `lib/bookings.ts`

```typescript
// Obtener reservas del usuario
export async function getBookingsForUser(userId: string): Promise<Booking[]>

// Crear reserva
export async function createBookingForUser(userId: string, input: {...}): Promise<Booking>

// Actualizar estado de reserva
export async function updateBookingStatusForUser(userId: string, id: string, status: BookingStatus): Promise<void>

// Eliminar reserva
export async function deleteBookingForUser(userId: string, id: string): Promise<void>
```

---

## Patrón de Actualización de Endpoints

**ANTES (sin multi-tenancy):**
```typescript
export const POST = async (req: NextRequest) => {
  const body = await req.json();
  const contact = await db.createContact(body); // ❌ Sin aislamiento
  return NextResponse.json(contact);
};
```

**DESPUÉS (con multi-tenancy):**
```typescript
import { withAuth } from "@/lib/api-auth";
import * as db from "@/lib/customers";

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  const body = await req.json();
  const contact = await db.createContactForUser(userId, body); // ✅ Aislado por usuario
  return NextResponse.json(contact);
});
```

**Cambios:**
1. Importar `withAuth` de `lib/api-auth`
2. Envolver handler con `withAuth()`
3. Handler recibe `userId` como segundo parámetro
4. Usar función con `ForUser` suffix en lib/

---

## Fallback a Demo Mode

Si Supabase NO está configurado (env vars vacías):
- Las nuevas funciones `getXxxForUser()` devuelven datos de demo (como antes)
- El middleware NO protege rutas (allows todo)
- El login muestra botón "Demo Dashboard" para entrar sin autenticación

Esto permite desarrollo local sin BD.

---

## Migración de Datos Existentes

Si hay **datos existentes en Supabase SIN user_id**:

### Opción 1: Limpiar BD
```sql
DELETE FROM contacts;
DELETE FROM messages;
DELETE FROM leads;
DELETE FROM operations;
-- etc.
```
Luego crear datos nuevos (se asignarán user_id automáticamente).

### Opción 2: Asignar user_id a datos existentes (si necesario)
```sql
-- Obtener el primer usuario (asumiendo hay registros en auth.users)
UPDATE contacts SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
-- Repetir para otras tablas
```

---

## Notas Importantes

1. **RLS (Row Level Security)** no está activado. Las protecciones actuales están en:
   - Middleware (redirige a login)
   - API `withAuth()` wrapper (valida usuario autenticado)
   - Queries filtran por user_id en BD

2. **Admin client (`supabaseAdmin()`)** sigue bypassando RLS. Los endpoints usan admin para queries filtradas manualmente por user_id. Si en el futuro se activa RLS, eliminar admin y usar server client.

3. **Settings y Business Config** actualmente son **globales** (no tienen user_id). Diseño: ¿deben ser por usuario o compartidos? Decidir antes de actualizar endpoints.

4. **Servicios** pueden ser **globales** (todos los usuarios ven el mismo catálogo) o **per-usuario**. Decisión pendiente según modelo de negocio.

---

## Checklist de Finalización

- [ ] Ejecutar migración SQL en Supabase
- [ ] Redeploy a Vercel
- [ ] Testear signup/login flow
- [ ] Testear creación de contacto (debe tener user_id)
- [ ] Testear logout (debe redirigir a /login)
- [ ] Testear que no se ven datos de otro usuario
- [ ] Actualizar endpoints faltantes
- [ ] Actualizar Topbar/Sidebar con info de usuario
- [ ] Documentar RLS (si se decide activarlo)
- [ ] Documentar settings/business config (global vs per-user)

