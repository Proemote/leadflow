#!/usr/bin/env python3
"""
📧 Script de envío de campaña - Ayudas Digitalización
Reads campana_ayudas_digitalizacion_actualizada.csv and sends via Resend API
"""

import csv
import time
import json
import os
from datetime import datetime
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load .env.local
load_dotenv(".env.local")

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "carlosmolina@proemote.es")
DELAY_SECONDS = int(os.getenv("DELAY_SECONDS", "150"))

CSV_FILE = "campana_ayudas_digitalizacion_actualizada.csv"
RESEND_API_URL = "https://api.resend.com/emails"

# ============================================================================
# VALIDATIONS
# ============================================================================

if not RESEND_API_KEY:
    print("❌ ERROR: RESEND_API_KEY no está configurada en .env.local")
    print("   Edita .env.local y añade tu API key de Resend")
    exit(1)

if not Path(CSV_FILE).exists():
    print(f"❌ ERROR: No encontré {CSV_FILE}")
    exit(1)

print("=" * 80)
print("📧 CAMPAÑA AYUDAS DIGITALIZACIÓN - ENVÍO CON RESEND")
print("=" * 80)
print(f"📧 Remitente: {FROM_EMAIL}")
print(f"⏱️  Delay entre emails: {DELAY_SECONDS} segundos ({DELAY_SECONDS/60:.1f} minutos)")
print()

# ============================================================================
# READ CSV
# ============================================================================

emails_to_send = []

try:
    with open(CSV_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Skip WhatsApp entries (canal != Email)
            if row.get("canal", "").strip().lower() != "email":
                continue

            email = row.get("contacto", "").strip()
            negocio = row.get("negocio", "").strip()
            asunto = row.get("asunto", "").strip()
            cuerpo = row.get("cuerpo", "").strip()

            if email and asunto and cuerpo:
                emails_to_send.append({
                    "email": email,
                    "negocio": negocio,
                    "asunto": asunto,
                    "cuerpo": cuerpo,
                })
except Exception as e:
    print(f"❌ ERROR leyendo CSV: {e}")
    exit(1)

if not emails_to_send:
    print("❌ No encontré emails para enviar en el CSV")
    exit(1)

print(f"✅ Encontré {len(emails_to_send)} emails para enviar")
print(f"   Envío escalonado cada {DELAY_SECONDS/60:.1f} minutos")
print(f"   Tiempo total estimado: {len(emails_to_send) * DELAY_SECONDS / 60:.1f} minutos\n")

# Confirm
response = input("¿Continuar? (s/n): ").strip().lower()
if response != "s":
    print("Cancelado.")
    exit(0)

print()

# ============================================================================
# SEND EMAILS
# ============================================================================

logs = []
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
log_file = f"logs_campana_{timestamp}.json"

successful = 0
failed = 0

for idx, email_data in enumerate(emails_to_send, 1):
    print(f"[{idx}/{len(emails_to_send)}] Enviando a {email_data['email']}...", end=" ", flush=True)

    payload = {
        "from": FROM_EMAIL,
        "to": email_data["email"],
        "subject": email_data["asunto"],
        "html": f"<pre>{email_data['cuerpo']}</pre>",
        "reply_to": FROM_EMAIL,
    }

    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(RESEND_API_URL, json=payload, headers=headers, timeout=10)
        response.raise_for_status()

        result = response.json()
        email_id = result.get("id", "unknown")

        logs.append({
            "timestamp": datetime.now().isoformat(),
            "to": email_data["email"],
            "negocio": email_data["negocio"],
            "subject": email_data["asunto"],
            "resend_id": email_id,
            "status": "sent",
            "http_status": response.status_code,
        })

        print(f"✅ ({email_id[:8]}...)")
        successful += 1

    except requests.exceptions.RequestException as e:
        error_msg = str(e)

        logs.append({
            "timestamp": datetime.now().isoformat(),
            "to": email_data["email"],
            "negocio": email_data["negocio"],
            "subject": email_data["asunto"],
            "status": "failed",
            "error": error_msg,
        })

        print(f"❌ ({error_msg[:30]}...)")
        failed += 1

    # Delay before next email (except last one)
    if idx < len(emails_to_send):
        time.sleep(DELAY_SECONDS)

# ============================================================================
# SUMMARY & LOGS
# ============================================================================

print()
print("=" * 80)
print("📊 RESUMEN")
print("=" * 80)
print(f"✅ Enviados: {successful}/{len(emails_to_send)}")
print(f"❌ Fallidos: {failed}/{len(emails_to_send)}")
print()

# Save logs
try:
    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(logs, f, indent=2, ensure_ascii=False)
    print(f"📝 Logs guardados en: {log_file}")
except Exception as e:
    print(f"⚠️  No pude guardar logs: {e}")

print()
print("📍 PRÓXIMOS PASOS:")
print(f"   1. Ve a https://resend.com → Dashboard → Emails")
print(f"   2. Verifica estado: Delivered, Opened, Clicked")
print(f"   3. Haz follow-up en 48-72 horas con los no abiertos")
print()
