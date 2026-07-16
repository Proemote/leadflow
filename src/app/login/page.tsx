"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { signIn, signUp } from "@/lib/auth-helpers";

type Tab = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");

  const configured =
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      router.push("/dashboard");
      return;
    }

    setStatus("loading");
    setMsg("");

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      router.push("/dashboard");
    } catch (err) {
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Error al iniciar sesión");
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      router.push("/dashboard");
      return;
    }

    setStatus("loading");
    setMsg("");

    try {
      const { data, error } = await signUp(email, password, fullName, companyName);
      if (error) throw error;

      // Sin sesión activa tras signUp = requiere confirmar el email antes de poder entrar
      if (!data.session) {
        setSignupEmail(email);
        setAwaitingConfirmation(true);
        setStatus("idle");
        setMsg("");
        setEmail("");
        setPassword("");
        setFullName("");
        setCompanyName("");
        return;
      }

      // Confirmación de email desactivada en Supabase → sesión ya activa
      router.push("/dashboard");
    } catch (err) {
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Error al crear cuenta");
    }
  }

  if (awaitingConfirmation) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="panel p-8 w-full max-w-sm text-center">
          <div className="flex flex-col items-center mb-4">
            <Logo size={56} />
            <h1 className="text-2xl font-bold gradient-text mt-4">Revisa tu correo</h1>
          </div>
          <p className="text-sm text-violet-200 mb-2">
            Te hemos enviado un enlace de confirmación a
          </p>
          <p className="text-sm font-semibold text-violet-50 mb-4">{signupEmail}</p>
          <p className="text-xs text-violet-300/60 mb-6">
            Haz clic en el enlace del correo para activar tu cuenta. Después podrás iniciar sesión con tu email y contraseña.
          </p>
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => {
              setAwaitingConfirmation(false);
              setTab("login");
            }}
          >
            Volver a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="panel p-8 w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <Logo size={56} />
          <h1 className="text-2xl font-bold gradient-text mt-4">LeadFlow</h1>
          <p className="text-sm text-violet-300/60 mt-1">
            CRM + WhatsApp IA para tu negocio
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setStatus("idle");
              setMsg("");
            }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              tab === "login"
                ? "bg-violet-500/20 text-violet-200 border border-violet-500/30"
                : "bg-transparent text-violet-300/50 hover:text-violet-300"
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setStatus("idle");
              setMsg("");
            }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              tab === "signup"
                ? "bg-violet-500/20 text-violet-200 border border-violet-500/30"
                : "bg-transparent text-violet-300/50 hover:text-violet-300"
            }`}
          >
            Crear cuenta
          </button>
        </div>

        {/* Login Tab */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              required
              className="input"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              required
              className="input"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Entrando…" : "Entrar"}
            </button>
            {status === "error" && msg && (
              <p className="text-sm text-amber-300 text-center">{msg}</p>
            )}
            {!configured && (
              <p className="text-xs text-violet-300/50 text-center">
                (Modo demostración activado)
              </p>
            )}
          </form>
        )}

        {/* Signup Tab */}
        {tab === "signup" && (
          <form onSubmit={handleSignUp} className="space-y-3">
            <input
              type="text"
              required
              className="input"
              placeholder="Tu nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <input
              type="text"
              required
              className="input"
              placeholder="Nombre de tu negocio"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <input
              type="email"
              required
              className="input"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              required
              className="input"
              placeholder="Contraseña (mínimo 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Creando…" : "Crear cuenta"}
            </button>
            {status === "error" && msg && (
              <p className="text-sm text-amber-300 text-center">{msg}</p>
            )}
          </form>
        )}

        {!configured && (
          <div className="mt-6 pt-6 border-t border-violet-500/10 text-center">
            <p className="text-xs text-violet-300/50 mb-3">
              O entra en modo demostración:
            </p>
            <a href="/dashboard" className="btn-secondary w-full text-center">
              Demo Dashboard →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
