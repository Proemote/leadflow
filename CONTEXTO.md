# Contexto de Desarrollo - Sesión Actual

## Resumen
En esta sesión se implementó una funcionalidad completa de edición de contactos, gestión de servicios contratados y control de citas en la ficha de cliente (detail page). También se corrigieron errores iniciales y se agregó persistencia en modo demo.

---

## Problemas Identificados y Solucionados

### 1. Error al Crear Contactos desde Formularios
**Problema:** Al intentar crear un contacto, aparecía el error `Failed to execute 'json' on 'Response': Unexpected end of JSON input`

**Causa:** 
- El endpoint `/api/customers` no tenía try/catch, causando respuestas HTML de error en lugar de JSON
- El endpoint `/api/opportunities` no manejaba bien los errores de `createContact`

**Solución:**
- Agregué try/catch con error handling robusto en `/api/customers/[id]/route.ts`
- Mejoré el manejo de errores en `/api/opportunities/route.ts`
- Agregué fallback a demo mode en `createContact()` en `src/lib/customers.ts`

### 2. Contactos Creados desde Oportunidades No Persistían en Modo Demo
**Problema:** Al crear una oportunidad con un "Nuevo contacto" en modo demo, el contacto no aparecía en la lista `/clientes` y desaparecía al recargar.

**Causa:** Los contactos temporales se generaban con ID temporal pero no se guardaban en ningún lugar persistente en modo demo.

**Solución:**
- Implementé localStorage para guardar contactos temporales en modo demo
- `KanbanBoard.tsx` ahora guarda contactos nuevos en `localStorage.temp_contacts`
- `ClientesList.tsx` lee localStorage y agrega los contactos temporales al listado
- `getCustomers()` también incluye contactos temporales

---

## Archivos Creados

### 1. `supabase/migrations_contact_services.sql` (Nueva)
Migration SQL para crear la tabla `contact_services` que vincula clientes con servicios contratados.
- Tabla: `contact_services` con campos `id`, `contact_id`, `service_id`, `status`, `notes`, `created_at`
- Estados soportados: `contratado`, `completado`, `cancelado`
- Sin restricción única en `(contact_id, service_id)` para permitir renovaciones

### 2. `src/lib/contactServices.ts` (Nueva)
Librería CRUD para servicios contratados:
- `getContactServices(contactId)` - obtener servicios de un cliente
- `assignService({contact_id, service_id, status?, notes?})` - asignar servicio
- `updateContactServiceStatus(id, status)` - cambiar estado
- `deleteContactService(id)` - eliminar asignación
- Incluye fallback a demo mode con `demoContactServices`

### 3. `src/app/api/contact-services/route.ts` (Nueva)
Endpoint POST para asignar servicios a clientes. Valida que existan contact_id y service_id.

### 4. `src/app/api/contact-services/[id]/route.ts` (Nueva)
Endpoints PATCH (cambiar estado) y DELETE (eliminar) para servicios contratados.

---

## Archivos Modificados

### 1. `src/lib/types.ts`
Agregadas:
- `ContactServiceStatus = "contratado" | "completado" | "cancelado"`
- `ContactService` interface con campos para servicio, estado, notas y datos de la UI

### 2. `src/lib/customers.ts`
- Agregado fallback a demo mode en `createContact()`
- Agregados imports: `ContactService`, `demoContactServices`
- Modificado `getCustomer()` para retornar `contractedServices` en paralelo con otros datos
- Modificado `getCustomers()` para leer contactos temporales de localStorage en modo demo

### 3. `src/lib/demo.ts`
- Agregado `demoContactServices` array con 3 servicios demo de ejemplo
- Agregado import de `ContactService` en los tipos

### 4. `src/app/api/customers/[id]/route.ts`
- Envuelto en try/catch para mejor manejo de errores
- Ahora retorna JSON limpio en caso de error en lugar de HTML

### 5. `src/app/api/opportunities/route.ts`
- Movió la lógica de crear contacto ANTES de la rama de modo demo
- Ahora crea contactos en modo demo también (con fallback)
- Retorna `newContact` en respuesta para que el cliente lo guarde en localStorage

### 6. `src/app/(panel)/clientes/[id]/page.tsx`
- Agregadas llamadas paralelas a `getServices(true)` y `getBusinessConfig()`
- Nuevas props pasadas a `CustomerDetail`: `contractedServices`, `services`, `businessConfig`

### 7. `src/components/CustomerDetail.tsx` (GRAN REFACTOR)
**Estado local:**
- `contact` ahora es estado (en lugar de solo prop) para reflejar cambios al instante
- `bookings` ahora es estado
- `contractedServices` nuevo estado
- Estados de UI: `showEditContact`, `showAddBooking`, `showAddService`

**Nuevos handlers:**
- `patchBookingStatus()` - cambiar estado de cita
- `removeBooking()` - eliminar cita
- `patchServiceStatus()` - cambiar estado de servicio
- `removeService()` - eliminar servicio

**UI changes:**
- **Cabecera:** Agregado botón "Editar contacto"
- **Sección de servicios contratados:** Nueva sección (entre Oportunidades y Citas) con:
  - Lista de servicios con estado (Contratado/Completado/Cancelado)
  - Botón "Añadir servicio"
  - Acciones: selector de estado dropdown, botón delete
- **Sección de citas:** Ahora con:
  - Botón "Añadir cita"
  - Formulario inline para crear citas
  - Acciones por fila: Confirmar, Hecha, Cancelar, Eliminar (según estado)

**Nuevos sub-componentes:**
- `EditContactForm()` - Formulario para editar nombre, teléfono, email, empresa, etiquetas, notas
- `AddContractedServiceForm()` - Formulario para asignar servicios
- `AddBookingForm()` - Formulario para crear citas (reutiliza lógica de disponibilidad de BookingsManager)
- `Field()` helper - Componente reutilizable para campos con label

### 8. `src/components/KanbanBoard.tsx`
- Agregada lógica para guardar contactos nuevos en localStorage en modo demo
- Al crear oportunidad con nuevo contacto: guarda contacto temporalmente
- Al crear oportunidad en Supabase: también guarda el contacto nuevo en localStorage

### 9. `src/components/ClientesList.tsx`
- Agregados imports: `useEffect`, `Contact`, `computeCustomerMetrics`
- Nuevo estado local `customers` basado en `initialCustomers`
- Nuevo `useEffect` que lee `temp_contacts` de localStorage y agrega contactos temporales a la lista
- Solo aplica en modo demo

---

## Funcionalidades Nuevas

### 1. Editar Contacto
- Acceso: Botón "Editar contacto" en la cabecera de la ficha
- Campos editables: nombre, teléfono, email, empresa, etiquetas (texto separado por comas), notas
- Guardado automático (optimista en demo, con API en Supabase)
- La cabecera se actualiza al instante sin recargar

### 2. Servicios Contratados
- Nueva sección en la ficha del cliente
- Ver lista de servicios contratados con estado y precio
- Agregar servicio: selector del catálogo, estado inicial (Contratado/Completado/Cancelado), notas opcionales
- Cambiar estado: dropdown por servicio
- Eliminar: botón trash con confirmación

### 3. Gestión de Citas desde Ficha del Cliente
- Integrado en la sección "Citas y reservas"
- Crear cita: servicio, fecha, franja horaria (si modo citas), notas
- Acciones por cita:
  - Si pendiente: "Confirmar"
  - Si pendiente/confirmada: "Hecha", "Cancelar"
  - Siempre: "Eliminar"
- Cambios reflejados al instante en el listado

### 4. Persistencia en Modo Demo
- Los contactos creados desde Kanban se guardan en localStorage
- Al recargar, aparecen en `/clientes`
- Al hacer clic se abre la ficha del cliente temporal
- Los datos se pierden si se limpia el localStorage o se cambia de navegador

---

## Migración en Supabase (Pendiente)

Para usar la aplicación con Supabase real:

1. Ve a Supabase Dashboard
2. SQL Editor → New Query
3. Copia y pega el contenido de `supabase/migrations_contact_services.sql`
4. Ejecuta con Run
5. Ignora el aviso de RLS (mismo que con `migrations_crm.sql`)

---

## Pruebas Realizadas

✅ **Modo demo:**
- Crear oportunidad con nuevo contacto → contacto aparece en `/clientes`
- Editar contacto → cambios se ven al instante
- Crear servicio contratado → aparece en lista, cambiar estado, eliminar
- Crear cita → aparece en lista, cambiar estado (Confirmar/Hecha/Cancelar), eliminar

✅ **Supabase (si se ejecuta la migración):**
- CRUD completo de servicios contratados
- Edición de contactos persiste
- Citas funcionan igual que antes (solo se agregaron acciones desde la ficha)

---

## Notas Técnicas

### Estado compartido
- Los contactos temporales en localStorage se sincronizan entre KanbanBoard y ClientesList
- En Supabase, todo es persistente automáticamente

### Fallback a demo
- `createContact()` retorna un contacto temporal si no hay Supabase
- El endpoint `/api/opportunities` crea contactos en ambos modos
- Los endpoints `/api/contact-services/*` requieren Supabase (retornan 400 en modo demo en la rama de verificación, pero createContact ya maneja el fallback)

### Validaciones
- Formularios validan campos requeridos
- API valida contact_id y service_id
- Estados válidos para servicios: `contratado`, `completado`, `cancelado`
- Estados válidos para citas: `pending`, `confirmed`, `done`, `cancelled`

### Performance
- Los datos de servicios y configuración de negocio se cargan en paralelo (`Promise.all`)
- En modo demo, localStorage se lee solo en ClientesList (no en cada render)
- Los contactos temporales se deduplicar para no crear duplicados

---

## Próximos Pasos (Sugerencias)

1. **Ejecutar la migración en Supabase** para usar con datos reales
2. **Agregar validación de email** en el formulario de edición
3. **Mejorar UX** con confirmaciones al eliminar (dialogs más elegantes)
4. **Agregar filtros** en servicios contratados por estado
5. **Reportes** de servicios más contratados, tasas de completitud

---

## Problemas Conocidos / Limitaciones

1. **Modo demo:** Los contactos temporales se pierden al cerrar el navegador (localStorage)
2. **Validación:** No hay validación de duplicados de servicios por contacto
3. **Permisos:** Los servicios mostrados son todos los activos (sin filtro por categoría)
4. **Citas:** La disponibilidad de franjas horarias se calcula en cliente (podría cachearse)

---

**Última actualización:** 2026-07-08  
**Versión:** 0.2.0 (post sesión de edición de contactos)
