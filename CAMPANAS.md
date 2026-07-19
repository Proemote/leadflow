# 📧 Sistema de Campañas — Envío via Resend

**Última actualización:** 17 julio 2026

---

## Visión general

Sistema de envío de campañas de email escalonado (1 email cada 2-3 minutos) para evitar que los ISPs marquen los envíos como spam. Integración directa con **Resend API** para tracking automático (abiertos, clics, bounces).

**Diferencia vs. Brevo:**
- Brevo: UI web para crear/enviar campañas + tracking en dashboard de Brevo
- Este sistema: scripts Python para campañas pre-diseñadas, control total del timing, logs locales

---

## Archivos del sistema

```
LeadFlow/
├── enviar_campana.py                              # Script de envío
├── campana_ayudas_digitalizacion_actualizada.csv  # Datos de la campaña
├── .env.local                                     # API key de Resend (gitignored)
├── .env.example                                   # Plantilla para .env.local
└── CAMPANAS.md                                    # Este archivo
```

---

## Configuración inicial

### 1. Obtén API key de Resend
- Ve a **https://resend.com** → Settings → API Keys
- Copia la key completa

### 2. Edita `.env.local`

```bash
nano .env.local
```

Contenido:
```
RESEND_API_KEY=re_xxx...xxx
FROM_EMAIL=carlosmolina@proemote.es
DELAY_SECONDS=150
```

### 3. Instala dependencias

```bash
python3 -m pip install requests python-dotenv
```

---

## Cómo ejecutar

```bash
cd "/Users/carlosmolinamarquez/Desktop/CLAUDE BRAIN/03-Proemote-Tech/LeadFlow"
python3 enviar_campana.py
```

Confirma con `s` y el script enviará 1 email cada 2.5 minutos (~50 minutos total).

---

## Tracking

**Resend Dashboard:** https://resend.com → Dashboard → Emails

Verás:
- Status: Delivered ✅ / Bounced ❌
- Opened: ¿Se abrió?
- Clicked: ¿Se clicó un link?

**En Zoho:** Los emails NO aparecerán en "Enviados" (se envían via API), pero los destinatarios los recibirán.

---

## Logs

Cada ejecución genera: `logs_campana_YYYYMMDD_HHMMSS.json`

Contiene: timestamp, destinatario, resend_id, status, errores.

---

## Seguridad

**Después de cada campaña:**
1. Ve a Resend → Settings → API Keys
2. Borra la key antigua
3. Crea una key nueva
4. Actualiza `.env.local`

---

## Próximas mejoras

- [ ] UI en LeadFlow para enviar campañas (vs. CLI)
- [ ] A/B testing de asuntos
- [ ] Webhook de Resend → actualizar estado contacto
- [ ] Templates HTML profesionales
- [ ] Rate limiting adaptativo
