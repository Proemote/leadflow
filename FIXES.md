# Fixes — Contactos en Oportunidades y Clientes

**Fecha**: 2026-07-08  
**Problema**: Los contactos creados desde oportunidades o clientes no se reflejaban en la UI sin recargar la página.

## Raíz del problema

1. **En Oportunidades**: Al crear un contacto nuevo desde una oportunidad, se guardaba en BD pero la lista de `contacts` del componente no se actualizaba. El contacto creado no aparecía hasta recargar.

2. **En Clientes**: Al crear un contacto nuevo, se llamaba a `router.refresh()` que recargaba toda la página desde el servidor. El usuario tenía que esperar a que recargara todo.

3. **API incompleta**: La ruta POST `/api/opportunities` no devolvía información del contacto creado en la respuesta.

4. **CAUSA RAÍZ REAL — Router Cache de Next.js 16**: Verificado con datos directos de Supabase (tabla `contacts` y `opportunities`) que los contactos SÍ se guardaban correctamente en base de datos y el `contact_id` de la oportunidad SÍ quedaba enlazado. El problema era 100% de caché en el cliente: Next.js App Router cachea las páginas ya visitadas durante la navegación (Router Cache / `staleTimes`), y las servía desde caché al volver a "Clientes" u "Oportunidades" en vez de pedir datos frescos. `export const dynamic = "force-dynamic"` en las páginas **no afecta este caché** — solo controla el renderizado en servidor, no la navegación del lado del cliente.

   **Fix**: en `next.config.ts` se añadió:
   ```ts
   experimental: {
     staleTimes: { dynamic: 0 },
   }
   ```
   Esto desactiva el caché de navegación para páginas dinámicas. Requiere reiniciar el servidor de desarrollo (no basta con hot-reload) y limpiar `.next/`.

   **Verificado en vivo con Chrome DevTools**: crear oportunidad con contacto nuevo → nombre visible al instante → navegar a Clientes → contacto visible → volver a Oportunidades → nombre se mantiene. Los 3 pasos funcionan sin recargar manualmente.

---

## Verificación en vivo (Chrome DevTools)

✅ **Probado y confirmado en localhost:3000**

1. **Crear oportunidad con contacto nuevo**
   - Título: "TEST Debug Contacto Nuevo"
   - Contacto: "+ Nuevo contacto..." → "Contacto Debug XYZ"
   - **Resultado**: Oportunidad creada, nombre visible en tarjeta instantáneamente

2. **Navegar a Clientes**
   - URL: `localhost:3000/clientes`
   - **Resultado**: "Contacto Debug XYZ" aparece en tabla de clientes SIN recargar

3. **Volver a Oportunidades**
   - URL: `localhost:3000/oportunidades`
   - **Resultado**: Oportunidad sigue mostrando nombre "Contacto Debug XYZ" correctamente

**Estado final**: ✅ FUNCIONA — los contactos creados desde oportunidades aparecen inmediatamente en todas las vistas sin recargar manualmente.

---

## Cambios realizados

### 1. `/api/opportunities/route.ts`

**Problema**: No devolvía `newContact` en la respuesta cuando se creaba un contacto nuevo.

**Solución**: Agregué el campo `newContact` en la respuesta JSON, consistente con el modo demo.

```typescript
// Antes:
return NextResponse.json({ opportunity });

// Después:
return NextResponse.json({
  opportunity,
  newContact: b.new_contact_name ? { id: contactId, name: String(b.new_contact_name).trim() } : null,
});
```

---

### 2. `src/components/KanbanBoard.tsx`

**Problema**: La lista de `contacts` venía como props del servidor y nunca se actualizaba cuando se creaba un nuevo contacto.

**Soluciones implementadas**:

#### a) Agregué estado local para contactos
```typescript
const [contactsList, setContactsList] = useState<ContactOpt[]>(contacts);
```

#### b) Pasé callback al OpportunityForm
```typescript
<OpportunityForm
  contacts={contactsList}
  onContactAdded={(newContact) => {
    if (!contactsList.find((c) => c.id === newContact.id)) {
      setContactsList((prev) => [...prev, newContact].sort((a, b) => a.name.localeCompare(b.name)));
    }
  }}
/>
```

#### c) Actualicé OpportunityForm para aceptar y usar el callback

```typescript
// Firma actualizada
function OpportunityForm({
  // ...
  onContactAdded?: (contact: ContactOpt) => void;
})

// En modo demo (línea ~270):
if (isNewContact && f.new_contact_name?.trim()) {
  // ... guardar en localStorage
  onContactAdded?.({ id: contact_id, name: f.new_contact_name.trim() });
}

// En producción (línea ~345):
if ((j.newContact as any)?.id) {
  // ... guardar en localStorage
  onContactAdded?.({ id: (j.newContact as any).id, name: (j.newContact as any).name });
}
```

#### d) Mejoré la asignación del nombre del contacto
```typescript
// Antes:
o.contact_name = contacts.find((c) => c.id === o.contact_id)?.name ?? (f.new_contact_name || null);

// Después (usa newContact si está disponible):
o.contact_name = (j.newContact as any)?.name ?? contacts.find((c) => c.id === o.contact_id)?.name ?? (f.new_contact_name || null);
```

---

### 3. `src/components/ClientesList.tsx`

**Problema**: El formulario de nuevo contacto llamaba a `router.refresh()` que recargaba toda la página.

**Soluciones implementadas**:

#### a) Actualicé el callback para pasar el contacto creado
```typescript
// Antes:
onDone={() => { setShowForm(false); router.refresh(); }}

// Después:
onDone={(newContact) => {
  setShowForm(false);
  if (newContact) {
    setCustomers((prev) => [
      { contact: newContact, metrics: computeCustomerMetrics(newContact, []) },
      ...prev,
    ]);
  } else {
    router.refresh();
  }
}}
```

#### b) Actualicé NewContactForm para devolver el contacto
```typescript
// Firma actualizada
function NewContactForm({ 
  demo, 
  onDone 
}: { 
  demo: boolean; 
  onDone: (contact?: Contact) => void;  // Ahora devuelve el contacto
})

// En modo demo:
const newContact: Contact = {
  id: `tmp-${Date.now()}`,
  name: f.name.trim(),
  company: f.company || null,
  phone: f.phone || null,
  email: f.email || null,
  tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
  notes: f.notes || null,
  ad_source: "Manual",
  ctwa_clid: null,
  blocked: false,
  bot_enabled: true,
  created_at: new Date().toISOString(),
};
onDone(newContact);

// En producción:
onDone((j.contact as Contact) ?? undefined);
```

#### c) Corregí error de sintaxis
```typescript
// Había un paréntesis extra que causaba error de build
// Cambié de:   )}}
// A:          )}
```

---

## Resultado

✅ **Oportunidades**: Crear contacto nuevo desde una oportunidad → aparece inmediatamente en la lista sin recargar

✅ **Clientes**: Crear contacto nuevo → aparece inmediatamente en la tabla sin recargar

✅ **Sincronización**: El nombre del contacto se muestra correctamente en la oportunidad

✅ **Build**: Sin errores de compilación

---

## Testing

Para verificar que funciona:

1. Ve a **Oportunidades** → "Nueva oportunidad" → selecciona "+ Nuevo contacto..."
2. Ingresa nombre y crea
3. El contacto debe aparecer **inmediatamente** en la lista de oportunidades y el nombre debe ser visible

4. Ve a **Clientes** → "Nuevo contacto"
5. Rellena datos y crea
6. El contacto debe aparecer **inmediatamente** en la tabla sin recargar

---

## Archivos modificados

- `/api/opportunities/route.ts` — Agregó `newContact` en respuesta
- `src/components/KanbanBoard.tsx` — Sincronización de contactos al crear desde oportunidades
- `src/components/ClientesList.tsx` — Actualización inmediata de lista al crear contacto
- `next.config.ts` — Desactivó Router Cache para páginas dinámicas con `staleTimes: { dynamic: 0 }`

---

## Despliegue a producción

El `next.config.ts` con `staleTimes` usa un flag `experimental`, verificar con Vercel:
- En Vercel, Next.js 16.x soporta `experimental.staleTimes` de forma nativa
- La compilación en producción reflejará estos cambios automáticamente
- No requiere variables de entorno adicionales

**Pasos antes de hacer merge a main**:
1. ✅ Código revisado (4 archivos)
2. ✅ Build sin errores (`npm run build`)
3. ✅ Funcional en dev (`npm run dev`)
4. ✅ Verificado en vivo (Chrome automation)
5. ⏳ Testing en staging/preview si está disponible
6. ⏳ Merge a main y deploy a producción

---

## Notas técnicas

**Por qué pasó desapercibido el problema real**:
- Todos los cambios de componente React estaban bien (state updates correctos)
- Los datos se guardaban correctamente en Supabase (verificado con `execute_sql`)
- El problema fue el client-side Router Cache de Next.js App Router
- `export const dynamic = "force-dynamic"` no afecta el caché de navegación del cliente
- Solo `staleTimes` controla ese comportamiento

**Diferencia entre conceptos**:
- `dynamic = "force-dynamic"` → el servidor SIEMPRE genera la página (sin ISR cache)
- `staleTimes` → controla cuánto tiempo el CLIENTE guarda en caché la página al navegar con `<Link>` o `useRouter`

Para páginas que deben estar siempre actualizadas, ambos son necesarios en Next.js 16.
