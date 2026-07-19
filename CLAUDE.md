# LeadFlow CRM — Documentación del Proyecto

## Visión general

**LeadFlow** es un CRM con integración de WhatsApp para micro-PYMES y autónomos. Desarrollado en Next.js 16 + Supabase + Vercel, permite gestionar contactos, oportunidades, operaciones (CLV), citas y servicios contratados.

Diferenciador central de Proemote: automatización y gestión de clientes con IA.

---

## Stack técnico

- **Frontend:** Next.js 16 (React), TypeScript, Tailwind CSS 4
- **Componentes UI:** estructura shadcn (`components.json`, `src/lib/utils.ts` con `cn`), Radix (`react-slot`, `react-label`), `class-variance-authority`, `lucide-react`. Tokens semánticos de shadcn (`background`, `primary`, `accent`, etc.) mapeados en `globals.css` a la paleta violeta/dark propia de LeadFlow — no es el tema shadcn por defecto.
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
- **Propuestas:** Oportunidades en fase "Propuesta" con documentos adjuntos (PDF/Markdown/TXT) vía Supabase Storage
- **Citas/Reservas:** Agenda de citas con confirmación
- **Servicios contratados:** Listado de servicios con estado (contratado, completado, cancelado)
- **Comentarios/Notas:** Sistema de comentarios persistentes en BD, con autor, fusionados con operaciones en un feed "Actividad"

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

## Registro de cambios (16-19 julio 2026)

Changelog por sprint, del más reciente al más antiguo. Cada versión agrupa un lote de cambios desplegados junto en un commit (o commit + migración de BD asociada).

### v1.8 — "Panel con jerarquía + /jornada" (19 julio)
- **Panel reestructurado en 3 zonas:** (1) card de briefing de Leo con texto narrativo dinámico (saludo + oportunidades calientes + citas hoy + resumen de eficiencia con sugerencia si la cualificación es baja) y alerta de cliente en riesgo; (2) widget **"Tu día"** que fusiona "Agenda de hoy" + "Próximamente" (bloques Hoy / Próximos 7 días, compacto cuando está vacío); (3) Salud de la cartera + Estado del embudo + Origen de leads sin cambios. Las acciones rápidas se mantienen entre "Tu día" y "Salud de la cartera".
- **Nueva página `/jornada`** (plan del día de Leo): checklist agrupado — 🔥 leads calientes con último mensaje sin responder (`lead.score==="hot"` + `lastMessage.role==="user"`), 📅 citas de hoy, 💼 oportunidades en Propuesta/Negociación con `expected_close` ≤ hoy+7 días, 💡 sugerencias de Leo desglosadas (un ítem por lead templado). Cada ítem con enlace directo (conversación / `#booking-{id}` / `#opp-{id}`). **No está en el sidebar a propósito** — solo se llega desde el botón "Empezar mi jornada" del briefing.
- **Persistencia del checklist:** tabla nueva `jornada_completados` (migración `supabase/migrations_jornada.sql`, aplicada en producción) con `user_id` añadido al esquema base por el multi-tenancy + unique(user_id, fecha, item_key) + RLS sin políticas (patrón proposal_files). Endpoint `/api/jornada` (POST upsert / DELETE) con `withAuth`. Fallback a localStorage en modo demo. Lib nueva `src/lib/jornada.ts`, componente `JornadaChecklist.tsx`.
- **Topbar:** icono de calendario (enlace a `/reservas`) a la izquierda de notificaciones, mismo estilo de botón circular.
- **Sección Leo con pestañas:** sidebar renombrado "Leo · Instrucciones" → "Leo" (también en MobileSidebar). `/settings` ahora tiene tabs (`LeoTabs.tsx`): **Instrucciones** (SettingsForm intacto) y **Rendimiento** (las cards "Calidad de los leads", "Leads por contactar" y "Eficiencia de Leo" movidas tal cual desde el Panel — mismos cálculos, solo cambia dónde se renderizan).
- **Anclas para deep-links:** `id="opp-{id}"` en tarjetas del Kanban y `id="booking-{id}"` en filas de agenda (AgendaEvent + lista de próximas), con `scroll-mt-24`. Sin cambios de lógica en ninguno de los dos módulos.
- Verificado: `tsc --noEmit` limpio + `next build` OK + smoke test en modo demo (páginas 200, contenido y enlaces correctos). Nota: el build local no puede ejecutarse desde el sandbox de Claude (macOS bloquea listar `~/Desktop` a Turbopack); se verificó compilando una copia en /tmp.

### v1.7 — "Kanban responsive al tema" (19 julio, commit `e4dfcd5`)
- **UI/UX mejorada:** Kanban board ahora funciona correctamente en light mode. Sustituida paleta de colores hardcodeada por variables CSS del sistema de temas.
- Cambios en `src/components/KanbanBoard.tsx`:
  - `text-violet-50` → `text-foreground` (adapta a theme automáticamente)
  - `text-violet-300/X` → `text-muted-foreground/X`
  - Estilos inline `rgba()` hardcodeados → `var(--panel-tight-bg)`, `var(--glow-1)`, `var(--color-edge)`
  - Inputs y botones usan `bg-input` y `hover:bg-primary/20` en lugar de colores hardcodeados
- **Resultado:** Tarjetas, textos y controles del kanban ahora legibles en ambos temas (light/dark) sin cambios funcionales. Reutiliza las variables CSS del `globals.css` (`:root` y `.light`) que ya estaban definidas.

### v1.6 — "Notas, etapa y propuestas" (17 julio, commit `ae1ba68`)
- Notas internas y etapa del customer journey dejan de estar escondidas en "Editar contacto": panel de notas siempre visible con edición inline + selector de etapa junto al nombre, ambos guardan al instante (`quickPatchContact` en `CustomerDetail.tsx`).
- Leo (bot de WhatsApp) recibe la etapa y las notas del contacto en su system prompt (`buildLeoSystem`/`generateLeoReply` en `lib/leo.ts`, wireado desde `api/webhook/route.ts`) para adaptar el tono y no repetir preguntas. Solo cubre el webhook en vivo — el cron de follow-up sigue con el prompt genérico (no personalizado por contacto).
- Autor restaurado en comentarios: `contact_notes.created_by` ya existía en el esquema pero nunca se rellenaba; ahora se guarda y se muestra en el feed de Actividad. Sin hilos de respuesta (decisión: LeadFlow es de un solo operador por cuenta, se deja para cuando haya cuentas de equipo).
- Nueva propuesta desde la ficha del contacto (`AddProposalForm`): crea una `Opportunity` vinculada (aparece en el pipeline de Oportunidades, fase "Propuesta") con título/valor/cierre estimado, con opción de adjuntar un documento.
- Nuevo apartado **Propuestas** en el menú lateral (`/propuestas`): lista las oportunidades en fase "Propuesta" con sus documentos adjuntos (subir/descargar vía URL firmada/eliminar).
- Infra nueva en Supabase: bucket privado `proposals` + tabla `proposal_files` (`opportunity_id`, `contact_id`, `user_id`, `file_name`, `storage_path`, `mime_type`, `size_bytes`). RLS activado sin políticas — solo accesible vía `service_role`, mismo patrón que el resto del backend. PDF/Markdown/TXT, máx. 4MB (margen bajo el límite de body de Vercel).
- Nuevos archivos: `lib/proposalFiles.ts`, `api/opportunities/[id]/files/route.ts` (+ `[fileId]/route.ts`), `components/PropuestasList.tsx`, `app/(panel)/propuestas/page.tsx`.

### v1.5 — "Ficha de contacto compacta" (17 julio, commit `b87ded3`)
- Rediseño completo de `/clientes/[id]`: las 8 métricas pasan de cards apiladas (~370px) a una sola tira horizontal (~80px).
- Layout de una columna a dos: izquierda (~35%, Oportunidades + Servicios contratados + Citas y reservas en lista compacta) / derecha (~65%, "Actividad").
- Historial de operaciones y Comentarios se fusionan en un feed cronológico único "Actividad" (💰 operación, 💬 comentario, 📅 cita de solo lectura), con scroll interno propio en vez de alargar toda la página.
- Estados vacíos de Servicios/Citas pasan de card centrada (~150px) a una línea compacta con icono + botón "+ Añadir".

### v1.4 — "Semáforo correcto" (17 julio, commit `9e59cd9`)
- El orden elegido en Contactos (nombre/CLV/recencia/antigüedad) se persiste en `localStorage` y sobrevive a navegar a un contacto y volver (antes reseteaba a "Nombre" cada vez).
- Chip "Activo" pasa de rojo a verde (`.chip-green` nuevo en `globals.css`); el rojo liberado pasa a "Inactivo" (antes sin color).
- Las etiquetas de etapa del customer journey dejan de ser todas amarillas: cada etapa tiene su color propio (`getJourneyStageMeta` en `lib/metrics.ts`) — propuesta enviada=azul, cliente=verde, propuesta rechazada=rojo, etc.

### v1.3 — "Conversaciones y pipeline al día" (17 julio, commit `3210c75` + backfill de datos)
- `/conversations` solo lista contactos con mensajes reales (antes salían todos los contactos, tuvieran o no historial). Nuevo botón "+ Nueva conversación" con buscador de contactos.
- Fix: `/api/send` no tenía autenticación ni asignaba `user_id` al mensaje insertado — el primer mensaje de una conversación nueva desaparecía en el siguiente poll. Ahora usa `withAuth` + `insertMessageForUser`.
- Contactos: orden por defecto pasa de CLV a nombre.
- Fix: el desplegable "Etapa" de "Editar contacto" capturaba el valor pero nunca se incluía en el PATCH — los cambios de `journey_stage` se perdían en silencio.
- Nuevo: mover una oportunidad a Ganado/Perdido actualiza automáticamente el `journey_stage` del contacto vinculado (cliente / propuesta_rechazada), en `lib/opportunities.ts::updateOpportunityForUser`.
- **Backfill de datos (SQL, sin commit asociado):** las 2 oportunidades ya ganadas antes de que existiera la conexión automática oportunidad→ingreso (Noemi, Ana Gorostegui, cerradas el 10 julio) no tenían operación asociada — creadas retroactivamente con la fecha real de cierre. `journey_stage` backfilled a "cliente" para esas 2 y a "propuesta_rechazada" para Manuela (oportunidad ya perdida, pero el campo nunca se había sincronizado).

### v1.2 — "Guardado sin sustos" (17 julio, commit `8853c51` + migración `add_surname_to_contacts`)
- **Causa raíz encontrada:** a la tabla `contacts` en producción le faltaba la columna `surname` (el código la esperaba desde el 12 julio, la migración nunca se aplicó). Cualquier guardado de contacto devolvía 400 de PostgREST. Migración `alter table contacts add column surname text` aplicada.
- Bug relacionado: `PATCH /api/customers/[id]` y `POST /api/opportunities` devolvían el recurso suelto en vez de envuelto (`{contact}`/`{opportunity}`), rompiendo el contrato que ya seguían bookings/services/operations — crasheaba la ficha de contacto y la creación de oportunidades nada más guardar con éxito.

### v1.1 — "Panel con Leo" (16 julio, commit `8af6a77`)
- Rediseño del dashboard: saludo de Leo con prioridades del día (oportunidades calientes, conversaciones pendientes, citas próximas, alerta de cliente en riesgo), acciones rápidas de un clic (nuevo contacto/oportunidad/cita/servicio, importar), y bloque de "Salud de la cartera" (ingresos, CLV medio, % recurrentes).
- 5 componentes ganan soporte para `?new=1`/`?import=1` en la URL, para que las acciones rápidas abran el formulario correspondiente directamente.

---

## Estado actual (19 julio 2026)

### ✅ Completado — Sistema de temas (light/dark mode responsive)

**19 julio:** Kanban board y todos los componentes ahora responden correctamente a cambios de tema.
- Sistema de temas unificado via CSS variables (`globals.css`: `:root` para dark, `.light` para light mode)
- Componentes UI (`panel`, `input`, `btn-*`, `chip-*`, texto) usan variables semánticas
- Kanban (`KanbanBoard.tsx`) migrado a usar `text-foreground`, `text-muted-foreground`, `var(--panel-tight-bg)`, etc. en lugar de colores hardcodeados
- **Prueba verificada:** Tarjetas, métricas, formulario y selectores funcionan correctamente en ambos temas

### ✅ Completado — Sistema de autenticación multi-usuario

**Carpeta renombrada:** `CHATBOT CRM` → `LeadFlow`

**Multi-tenancy implementado (aislamiento de datos por usuario):**
- Migración SQL `supabase/migrations_auth.sql`: tabla `profiles` vinculada a `auth.users` + columna `user_id` en contacts, messages, leads, services, bookings, operations, contact_notes, opportunities, contact_services. Trigger automático crea el profile al registrarse.
- Migración aplicada directamente en Supabase (proyecto `ldoghruvsloedstlebpb`) vía MCP — confirmada con `list_tables`.
- Login + Signup unificados en una sola pantalla (`/login`, tabs), email + password (sin magic link).
- `lib/auth-helpers.ts` — signUp, signIn, signOut, getCurrentUser.
- `lib/api-auth.ts` — wrapper `withAuth()` para proteger endpoints; extrae `userId` de la sesión automáticamente.
- `middleware.ts` reescrito: protege todas las rutas si no hay usuario autenticado. (Antes dependía de una variable `ALLOWED_EMAIL_DOMAIN` que nunca se configuró, así que el panel quedaba abierto sin login — esa era la causa del bug original reportado.)
- Endpoints nuevos: `/api/auth/logout`, `/api/auth/profile`.
- Funciones multi-usuario en `lib/`: `db.ts`, `customers.ts`, `opportunities.ts`, `bookings.ts`, `services.ts`, `contactServices.ts` (`getXForUser`, `createXForUser`, etc.), con fallback a modo demo si Supabase no está configurado.
- `ProfileDropdown.tsx` — logout ahora usa el endpoint centralizado en vez de crear un cliente Supabase dentro del componente.
- Guía de referencia completa: `MULTI_TENANCY_SETUP.md` (checklist de endpoints ya desfasado tras el fix del 16 julio tarde, ver más abajo).

### ✅ Completado (16 julio 2026, tarde) — Fix crítico: fuga de datos entre usuarios

**Bug reportado:** Carlos creó una segunda cuenta de prueba y vio exactamente los mismos datos (contactos, dashboard, reservas...) que en su cuenta principal.

**Causa raíz:** el sistema de auth del 16 julio (mañana) solo había migrado 4 endpoints (`/api/customers`, `/api/customers/[id]`, `/api/opportunities`, `/api/opportunities/[id]`) a `withAuth()` + funciones `ForUser`. El resto de la app —incluidas las páginas del panel (Server Components), que leen datos directamente sin pasar por la API— seguía usando las funciones globales antiguas (`getCustomers()`, `getConversations()`, `getBookings()`, etc.), sin filtrar por `user_id`. Es decir: cualquier usuario autenticado veía los datos de **todos** los usuarios.

**Corregido:**
- Nuevo helper `getServerUserId()` en `lib/api-auth.ts` para obtener el usuario de la sesión desde Server Components (las páginas no pueden usar `withAuth()`, que es solo para Route Handlers).
- Añadidas las funciones `ForUser` que faltaban: `getDashboardMetricsForUser`, `getWeeklyActivityForUser`, `getRecentMessagesForUser`, `setContactFlagForUser` (`db.ts`); `getServicesForUser` + create/update/delete (`services.ts`); `assignServiceForUser` + update/delete (`contactServices.ts`); `updateOperationForUser`/`deleteOperationForUser` (`customers.ts`).
- Migradas a `ForUser` + `getServerUserId()` todas las páginas del panel: `dashboard`, `clientes`, `clientes/[id]`, `oportunidades`, `reservas`, `servicios`, `conversations`, `conversations/[id]`.
- Migrados a `withAuth()` todos los endpoints de API que faltaban: `/api/operations` (+ `[id]`), `/api/contact-notes`, `/api/contacts/[id]` (flags bloqueado/bot), `/api/contacts/[id]/notes`, `/api/contacts/[id]/messages`, `/api/bookings` (+ `[id]`), `/api/conversations`, `/api/services` (+ `[id]`), `/api/contact-services` (+ `[id]`), `/api/customers/import` (incluida la deduplicación, que antes comparaba contra contactos de *todos* los usuarios).
- **Datos huérfanos:** los 65 contactos, 49 mensajes, 2 reservas, 6 servicios, 15 oportunidades, leads y notas ya existentes en Supabase no tenían `user_id` (eran de antes del sistema de auth). Reasignados por SQL a `carlosmolina@proemote.es` (cuenta original) para que no desaparecieran al activar el filtro. Cero huérfanos verificado tras la migración.
- Commit `22f32e7`, desplegado a producción.

**Sigue global, a propósito (limitación de esquema, no arreglado hoy):**
- Configuración de negocio (`business_type`, `open_hours`, `slot_min`) y el system prompt de Leo, ambos guardados en la tabla `settings`, que **no tiene columna `user_id`** (no estaba en la migración `migrations_auth.sql`). Arreglarlo requiere: (a) migración de esquema (`alter table settings add column user_id...` + índice único compuesto `user_id+key`), y (b) decidir cómo el bot de WhatsApp (que no tiene sesión de usuario, solo un número de teléfono) sabría a qué cuenta de LeadFlow pertenece cada conversación — eso es un rediseño de arquitectura más grande (mapeo número-de-WhatsApp → usuario), no un fix puntual.
- El propio bot de WhatsApp (`lib/leo-tools.ts`, `/api/webhook`) sigue usando las funciones globales antiguas (`createBooking`, `getServices` sin `ForUser`) para crear contactos/reservas — de facto sigue siendo mono-tenant (una sola línea de WhatsApp = un solo negocio). Los contactos/reservas que cree el bot no llevan `user_id` y no aparecerán en el panel de ningún usuario hasta que se resuelva el mapeo anterior.

### 🐛 Bugs encontrados y resueltos durante el despliegue
1. **Archivo de migración perdido:** un bug de escape de rutas (backslash delante de espacios) hizo que `migrations_auth.sql` nunca se guardara realmente en disco pese a reportar éxito la herramienta. Recreado y confirmado en git.
2. **Commits nunca subidos a GitHub:** el sistema de auth existía solo en local; Vercel seguía desplegando el código viejo (de ahí que el panel se abriera sin pedir login). `git push` disparó el deploy real.
3. **Error de build TypeScript:** faltaba `import { Operation }` en `opportunities.ts`. Corregido y verificado con `npm run build` local antes de repushear.
4. **UI de signup rota:** el mensaje de "cuenta creada" se guardaba pero se renderizaba en el tab de signup mientras el código cambiaba automáticamente al tab de login — nunca llegaba a verse. Además decía "ahora inicia sesión" cuando el email todavía no estaba confirmado (imposible). Sustituido por una pantalla dedicada "Revisa tu correo".
5. **Redirect de confirmación apuntando a localhost:** `signUp()` no pasaba `emailRedirectTo`, así que Supabase usaba el Site URL por defecto de su dashboard (`localhost:3000`) → `ERR_CONNECTION_REFUSED` al hacer clic en el enlace de confirmación. Corregido en código (`emailRedirectTo` ahora apunta a `/api/auth/callback` en producción); pendiente que se actualice también Site URL / Redirect URLs en el dashboard de Supabase (Authentication → URL Configuration → `https://leadflow-crm-woad.vercel.app`).

### ⚠️ Aviso de seguridad pendiente de decisión
- 3 tablas sin RLS activado: `contact_services`, `contact_notes`, `profiles`. No rompe nada hoy (el backend usa `service_role`, que bypassa RLS), pero la anon key pública podría leer/escribir esas tablas directamente si alguien la usa fuera de la app. SQL de remediación identificado, no aplicado — activar RLS sin políticas bloquearía todo acceso, hay que diseñarlas antes.

### ⏳ Pendiente — Multi-tenancy
- Aislar `settings`/`business config`/prompt de Leo por usuario (requiere migración de esquema + resolver el mapeo WhatsApp↔usuario — ver detalle arriba).
- 3 tablas sin RLS siguen sin políticas (ver aviso de seguridad arriba).

### ⏳ Pendiente — Emails de confirmación (Resend + dominio propio)
- Decisión tomada con Carlos: usar SMTP personalizado con Resend en vez del mailer por defecto de Supabase, con remitente verificado en `proemote.es` (no el sandbox `onboarding@resend.dev`).
- Falta: API key de Resend (vacía en `.env.local`, ausente en Vercel) y confirmar proveedor DNS de `proemote.es` para añadir registros SPF/DKIM.
- **Sigue pendiente a las 16:07** (aún no aplicado): actualizar Site URL + Redirect URLs en Supabase Dashboard → Authentication → URL Configuration → `https://leadflow-crm-woad.vercel.app` (+ `/api/auth/callback`). Confirmado en pruebas reales: el segundo usuario de prueba siguió recibiendo el email de confirmación apuntando a `localhost`. El código ya envía `emailRedirectTo` correcto; Supabase lo ignora si la URL no está en la lista blanca del dashboard.

---

## Rediseño del login (16 julio 2026, tarde)

Commit `f8fcc99` (estilo) + `22f32e7` (Google, recuperar contraseña, checkbox).

- **Estilo:** layout split-screen (formulario a la izquierda, panel de marca con logo + cita animada a la derecha), siguiendo estructura shadcn. Componentes reutilizables en `src/components/ui/auth-fuse.tsx`: `Typewriter`, `Label`, `Button`/`buttonVariants`, `Input`, `PasswordInput` (toggle mostrar/ocultar), `GoogleIcon` (SVG inline, sin hotlink externo), `AuthLayout`. Todo en español, sin tocar la lógica real de auth.
- **Login con Google:** `signInWithGoogle()` en `lib/auth-helpers.ts` (`supabase.auth.signInWithOAuth`), botón en `/login`. Código verificado end-to-end (redirige correctamente a Supabase) pero **el proveedor de Google no está activado en el dashboard de Supabase** — falta crear credencial OAuth en Google Cloud Console (redirect URI: `https://ldoghruvsloedstlebpb.supabase.co/auth/v1/callback`) y pegar Client ID/Secret en Supabase → Authentication → Providers → Google.
- **Recuperar contraseña:** `resetPasswordForEmail()` + `updatePassword()` en `auth-helpers.ts`. Flujo: enlace "¿Olvidaste tu contraseña?" en `/login` → pantalla de email → Supabase envía enlace → `/api/auth/callback?next=/reset-password` → nueva página `src/app/reset-password/page.tsx` para fijar la contraseña nueva.
- **Checkbox de privacidad obligatorio:** en el formulario de signup, enlaza a `https://proemote.es/privacidad` (nueva pestaña), bloquea el botón "Crear cuenta" hasta marcarlo.
- Verificado en navegador (Chrome vía MCP): tabs login/signup, toggle de contraseña, tema claro/oscuro, checkbox, pantalla de recuperación.

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

- `/dashboard` — Panel de control (saludo de Leo, prioridades del día, acciones rápidas, salud de cartera)
- `/clientes` — Listado y gestión de contactos (orden persistente, chips de estado/etapa)
- `/clientes/[id]` — Ficha de contacto: tira de métricas, notas/etapa editables inline, Oportunidades + Servicios + Citas, feed "Actividad" unificado
- `/oportunidades` — Pipeline de ventas
- `/propuestas` — Oportunidades en fase "Propuesta" con documentos adjuntos (PDF/Markdown/TXT)
- `/reservas` — Agenda de citas
- `/servicios` — Catálogo de servicios contratables
- `/conversations` — Chat de WhatsApp integrado; solo conversaciones activas + "Nueva conversación"
- `/configuracion` — Ajustes de negocio
- `/login` — Login + signup (tabs), split-screen, Google OAuth, recuperar contraseña
- `/reset-password` — Fijar nueva contraseña (tras enlace de recuperación)

---

## API Routes usadas

> Desde el 16 julio (tarde), prácticamente todos los endpoints de datos del CRM están protegidos con `withAuth()` y aislados por `user_id` (ver sección de multi-tenancy arriba). Excepciones conscientes: `/api/business`, `/api/settings`, `/api/profile` (tabla `settings` sin `user_id`, siguen globales) y los webhooks/cron (`/api/webhook`, `/api/chat`, `/api/cron/*`, `/api/webhooks/brevo`), que no tienen sesión de usuario.

**Autenticación:**
- `POST /api/auth/logout` — Logout centralizado (invalida sesión + cookies)
- `GET /api/auth/profile` — Perfil del usuario autenticado (tabla `profiles`)
- `GET /api/auth/callback` — Intercambia `code` por sesión (confirmación de email, login con Google, recuperar contraseña)

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

**Última actualización:** 19 julio 2026 (v1.7 "Kanban responsive al tema" — ver Registro de cambios arriba para el historial completo de v1.1 a v1.7). Pendiente: activar proveedor Google en Supabase, corregir Site URL/Redirect URLs para el email de confirmación, SMTP Resend, RLS en 3 tablas (`contact_services`, `contact_notes`, `profiles`), aislar `settings`/business config por usuario, personalizar por contacto el prompt del cron de follow-up, webhook de Brevo entrante, y dashboard de KPIs históricos.
