# LeadFlow CRM — Documentación del Proyecto

## Visión general

**LeadFlow** es un CRM con integración de WhatsApp para micro-PYMES y autónomos. Desarrollado en Next.js 16 + Supabase + Vercel, permite gestionar contactos, oportunidades, operaciones (CLV), citas y servicios contratados.

Diferenciador central de Proemote: automatización y gestión de clientes con IA.

---

## Stack técnico

- **Frontend:** Next.js 16 (React), TypeScript, Tailwind CSS
- **Backend:** API Routes (Node.js runtime)
- **BD:** Supabase PostgreSQL
- **Deploy:** Vercel
- **Integraciones:** Brevo (email marketing), WhatsApp (bot IA)

---

## Funcionalidades principales

### CRM Core
- **Contactos/Clientes:** Crear, editar, eliminar contactos con tags, notas, etapa del journey
- **Operaciones:** Historial de transacciones (ingresos) para calcular CLV
- **Oportunidades:** Pipeline de ventas con probabilidad y valor esperado
- **Citas/Reservas:** Agenda de citas con confirmación
- **Servicios contratados:** Listado de servicios con estado (contratado, completado, cancelado)
- **Comentarios/Notas:** Sistema de comentarios persistentes en BD (reciente: migración de localStorage)

### Análisis
- **Métricas de cartera:**
  - Clientes totales
  - Ingresos totales
  - CLV medio
  - % clientes recurrentes
  - Estado de cada cliente (activo, riesgo, inactivo, potencial)
- **Recencia, frecuencia, antigüedad:** Análisis RFM
- **Informes:** Exportación y reporting básico

### Importación masiva
- **Importador de contactos:** CSV, Excel, Google Sheets
- Deduplicación inteligente
- Validación de emails y teléfonos españoles
- Creación de contactos + sincronización con Brevo en una operación

### Búsqueda y filtrado
- Búsqueda por nombre, empresa, email, teléfono, etiquetas
- Filtro por estado (activo, riesgo, inactivo, potencial)
- Filtro por etiquetas
- **Filtros avanzados:** Rango de CLV (mínimo-máximo en €)
- Ordenamiento: CLV, recencia, antigüedad, nombre

---

## Estado actual (12 julio 2026)

### ✅ Implementado recientemente (11-12 julio)

#### 1. Persistencia de comentarios en BD
- **Antes:** Comentarios almacenados en localStorage (no persisten entre sesiones)
- **Ahora:** Comentarios guardados en tabla `contact_notes` de Supabase
- **API Endpoints:**
  - `POST /api/contact-notes` — Crear comentario
  - `DELETE /api/contact-notes?id=...` — Eliminar comentario
  - `GET /api/contacts/[id]/notes` — Cargar comentarios de un contacto
- **Frontend (CustomerDetail.tsx):**
  - useEffect: Carga comentarios desde BD al montar
  - addComment(): POST a `/api/contact-notes` + actualiza estado
  - deleteComment(): DELETE + confirmación + actualiza estado
  - Soporte para modo demo (localStorage fallback)
  - Feedback visual: loading, errores
- **Verificado:** Comentarios persisten después de recargar página ✅

#### 2. Búsqueda avanzada de contactos
- **Mejoras en ClientesList.tsx:**
  - Búsqueda expandida: ahora incluye **teléfono** en adición a nombre, empresa, email, etiquetas
  - **Filtros avanzados (panel visual):**
    - CLV mínimo (€)
    - CLV máximo (€)
    - Botón "Limpiar filtros"
  - **Nueva opción de ordenamiento:** Por nombre (A-Z)
  - Lógica de filtrado: Valida rango CLV + busca en todos los campos
- **UI:**
  - Botón "⚙️ Filtros" toggle para abrir/cerrar panel
  - Panel estilizado con inputs numéricos
  - Indicador visual cuando filtros CLV están activos
- **Verificado en navegador:**
  - Panel abre/cierra correctamente ✅
  - Filtros por rango CLV funcionales ✅
  - Búsqueda incluye teléfono ✅
  - Ordenamiento por nombre visible ✅

### ⏳ Próximas mejoras pendientes
- Webhook de Brevo entrante (recibir eventos de email marketing)
- Búsqueda avanzada por ciudad/provincia
- Reportes/exportación de datos avanzada
- Dashboard de KPIs históricos
- Automatización de flujos (trigger-based)

---

## Reglas innegociables (válidas para este proyecto)

1. **No prometer capacidad inexistente:** Carlos es el único operador; los packs se diseñaron protegiendo capacidad
2. **Persistencia en BD = mejor UX:** Migración de localStorage a Supabase en comentarios es paso hacia arquitectura más robusta
3. **TypeScript strict:** Build debe compilar sin errores
4. **Modo demo funcional:** Siempre soportar fallback a localStorage para pruebas sin BD

---

## Rutas principales (App Router)

- `/dashboard` — Panel de control
- `/clientes` — Listado y gestión de contactos
- `/clientes/[id]` — Detalle de contacto + comentarios + operaciones
- `/oportunidades` — Pipeline de ventas
- `/reservas` — Agenda de citas
- `/servicios` — Catálogo de servicios contratables
- `/conversations` — Chat de WhatsApp integrado
- `/configuracion` — Ajustes de negocio

---

## API Routes usadas

**Contactos:**
- `GET/POST /api/customers` — Listar/crear contactos
- `PATCH/DELETE /api/customers/[id]` — Editar/eliminar contacto
- `POST /api/customers/import` — Importación masiva

**Comentarios:**
- `POST /api/contact-notes` — Crear nota
- `DELETE /api/contact-notes?id=...` — Eliminar nota
- `GET /api/contacts/[id]/notes` — Obtener notas de contacto

**Operaciones:**
- `GET/POST /api/operations` — Operaciones (ingresos)
- `PATCH/DELETE /api/operations/[id]` — Editar/eliminar operación

**Oportunidades:**
- `GET/POST /api/opportunities` — Pipeline
- `PATCH /api/opportunities/[id]` — Actualizar etapa/probabilidad

**Citas:**
- `GET/POST /api/bookings` — Reservas
- `PATCH/DELETE /api/bookings/[id]` — Cambiar estado/eliminar

**Integraciones:**
- `POST /api/brevo/lists` — Sincronización con Brevo
- `POST /api/webhooks/brevo` — Webhook entrante (pendiente)

---

## Variables de entorno (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
BREVO_API_KEY=...
WHATSAPP_BOT_TOKEN=...
```

---

## Notas de desarrollo

- **Staleness:** `next.config.ts` configura `staleTimes` para revalidación incremental
- **Router cache:** Fixed en prior fix de contactos (next/router cache invalidation)
- **Paginación:** Operaciones limitadas a últimas 10 (optimización de render)
- **Lazy loading:** useCallback y useMemo en componentes grandes
- **Error handling:** Fallbacks a demo mode cuando Supabase no está configurado

---

## Cómo contribuir

1. **Local dev:** `npm run dev` → http://localhost:3000
2. **Build:** `npm run build` (verifica TypeScript)
3. **Deploy:** Git push a rama main → Vercel auto-deploy
4. **DB changes:** Usar Supabase CLI para migrations locales

---

**Última actualización:** 12 julio 2026 (comentarios + búsqueda avanzada)
