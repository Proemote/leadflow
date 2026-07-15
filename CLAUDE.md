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

## Estado actual (15 julio 2026)

### ✅ Completado (12 julio)

#### Fix: Error al guardar cambios en contactos
- Problema resuelto: Campo `journey_stage` no existía en Supabase
- Cambios aplicados en 4 archivos
- Edición de contactos funcional sin errores ✅

#### Migración a GitHub y CI/CD
- Repositorio: https://github.com/Proemote/leadflow
- 25 commits mirados a GitHub
- Vercel conectado con auto-deploy en cada push ✅
- **Flujo:** `git push` → GitHub → Vercel (deploy automático en 3-5 min)

### 📋 Prioridades Pendientes

#### 🔴 ALTA PRIORIDAD
1. **Webhook de Brevo entrante**
   - Recibir eventos de email marketing (abiertos, clics, bounces)
   - Actualizar estado de contactos automáticamente
   - Cierre de bucle: Brevo ↔ LeadFlow
   - Impacto: Cierre de ciclo completo para clientes con email marketing

2. **Dashboard de KPIs históricos**
   - Gráficos de evolución: CLV, ingresos, clientes por mes
   - Seguimiento de tendencias
   - Reportería mejorada para propuestas
   - Impacto: Mejor venta de servicios (mostrar ROI a clientes)

#### 🟡 MEDIA PRIORIDAD
3. **Sistema de tareas/follow-ups**
   - Recordatorios automáticos ("hace 3 días que no contactas a X")
   - Tareas con vencimiento
   - Integración calendar
   - Impacto: Mejora operacional para usuarios

4. **Mejorar importador masivo**
   - Detectar duplicados por email/teléfono
   - Mapeo automático mejorado
   - Preview antes de importar
   - Impacto: UX mejorada para importaciones

#### 🟢 BAJA PRIORIDAD
5. **Tests automatizados** — Unit + E2E
6. **Documentación/onboarding** — Guías de uso para clientes
7. **Búsqueda avanzada por ciudad/provincia** — Nice-to-have
8. **Automatización de flujos trigger-based** — Futuro (Zapier/Make)

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

**Última actualización:** 15 julio 2026 (GitHub + CI/CD operativo, prioridades pendientes categorizadas)
