"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { createSupabaseBrowser } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  const configured =
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      setStatus("error");
      setMsg("Autenticación no configurada (modo demo). Entra directamente al panel.");
      return;
    }
    setStatus("sending");
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
        },
      });
      if (error) throw error;
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="panel p-8 w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <Logo size={56} />
          <h1 className="text-2xl font-bold gradient-text mt-4">LeadFlow AI</h1>
          <p className="text-sm text-violet-300/60 mt-1">
            Accede con tu correo corporativo
          </p>
        </div>

        {status === "sent" ? (
          <div className="text-center text-sm text-emerald-300 panel-tight p-4">
            ✓ Te hemos enviado un enlace mágico a <strong>{email}</strong>. Revisa tu correo.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              required
              className="input"
              placeholder="vos@tudominio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="btn-primary w-full" disabled={status === "sending"}>
              {status === "sending" ? "Enviando…" : "Enviar enlace mágico"}
            </button>
            {status === "error" && (
              <p className="text-sm text-amber-300 text-center">{msg}</p>
            )}
          </form>
        )}

        <a
          href="/dashboard"
          className="block text-center text-xs text-violet-300/50 hover:text-violet-200 mt-5"
        >
          Entrar en modo demostración →
        </a>
      </div>
    </div>
  );
}
