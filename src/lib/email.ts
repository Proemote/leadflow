import { Resend } from "resend";
import { scoreLabel } from "./format";

function recipients(): string[] {
  return (process.env.NOTIFY_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function send(subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = recipients();
  if (!key || to.length === 0) {
    console.warn("[email] Falta RESEND_API_KEY o NOTIFY_EMAIL — no se envía");
    return false;
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? "Leo <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
  if (error) {
    console.error("[email] Resend error:", error);
    return false;
  }
  return true;
}

export async function sendHotLeadAlert(opts: {
  name: string | null;
  phone: string;
  reason: string;
  lastMessage: string;
}): Promise<boolean> {
  const who = opts.name || opts.phone;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px">
      <h2 style="color:#7c3aed">🔥 Nuevo lead caliente</h2>
      <p><strong>${who}</strong> (${opts.phone})</p>
      <p style="background:#f5f3ff;padding:12px;border-radius:8px;border-left:3px solid #7c3aed">
        ${opts.reason}
      </p>
      <p style="color:#555"><em>Último mensaje:</em> "${opts.lastMessage}"</p>
      <p style="color:#888;font-size:12px">LeadFlow AI · Leo</p>
    </div>`;
  return send(`🔥 Lead caliente: ${who}`, html);
}

export async function sendDailyDigest(
  leads: { name: string | null; phone: string; score: string; reason: string }[]
): Promise<boolean> {
  if (leads.length === 0) {
    return send(
      "📊 Resumen del día · 0 leads",
      `<p style="font-family:system-ui">Hoy no se ha cualificado ningún lead nuevo.</p>`
    );
  }
  const order: Record<string, number> = { hot: 0, warm: 1, cold: 2 };
  const emoji: Record<string, string> = { hot: "🔥", warm: "🌤️", cold: "❄️" };
  const rows = [...leads]
    .sort((a, b) => order[a.score] - order[b.score])
    .map(
      (l) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${emoji[l.score] ?? ""} ${scoreLabel(l.score).toUpperCase()}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${l.name || l.phone}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:#555">${l.reason}</td>
      </tr>`
    )
    .join("");
  const hot = leads.filter((l) => l.score === "hot").length;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:640px">
      <h2 style="color:#7c3aed">📊 Resumen del día</h2>
      <p>${leads.length} leads · <strong>${hot} calientes</strong></p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
      <p style="color:#888;font-size:12px">LeadFlow AI · Leo</p>
    </div>`;
  return send(`📊 Resumen del día · ${leads.length} leads (${hot} calientes)`, html);
}
