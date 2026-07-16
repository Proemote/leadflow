"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { signIn, signUp } from "@/lib/auth-helpers";
import {
  AuthLayout,
  Button,
  Input,
  Label,
  PasswordInput,
} from "@/components/ui/auth-fuse";

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

  function switchTab(next: Tab) {
    setTab(next);
    setStatus("idle");
    setMsg("");
  }

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
      <AuthLayout>
        <div className="mx-auto grid w-[350px] gap-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <Logo size={56} />
            <h1 className="mt-2 text-2xl font-bold text-foreground">Revisa tu correo</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Te hemos enviado un enlace de confirmación a{" "}
            <span className="font-semibold text-foreground">{signupEmail}</span>
          </p>
          <p className="text-xs text-muted-foreground/70">
            Haz clic en el enlace del correo para activar tu cuenta. Después podrás
            iniciar sesión con tu email y contraseña.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setAwaitingConfirmation(false);
              switchTab("login");
            }}
          >
            Volver a iniciar sesión
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="mx-auto grid w-[350px] gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo size={56} />
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            {tab === "login" ? "Accede a LeadFlow" : "Crea tu cuenta"}
          </h1>
          <p className="text-balance text-sm text-muted-foreground">
            {tab === "login"
              ? "CRM + WhatsApp IA para tu negocio"
              : "Empieza a gestionar tus clientes con LeadFlow"}
          </p>
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@correo.com"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <PasswordInput
              name="password"
              label="Contraseña"
              placeholder="Tu contraseña"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" variant="outline" className="mt-2" disabled={status === "loading"}>
              {status === "loading" ? "Entrando…" : "Entrar"}
            </Button>
            {status === "error" && msg && (
              <p className="text-center text-sm text-destructive">{msg}</p>
            )}
            {!configured && (
              <p className="text-center text-xs text-muted-foreground">
                (Modo demostración activado)
              </p>
            )}
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Tu nombre completo"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="companyName">Nombre de tu negocio</Label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="Nombre de tu negocio"
                required
                autoComplete="organization"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="signupEmail">Email</Label>
              <Input
                id="signupEmail"
                name="email"
                type="email"
                placeholder="tu@correo.com"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <PasswordInput
              name="password"
              label="Contraseña"
              placeholder="Mínimo 6 caracteres"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" variant="outline" className="mt-2" disabled={status === "loading"}>
              {status === "loading" ? "Creando…" : "Crear cuenta"}
            </Button>
            {status === "error" && msg && (
              <p className="text-center text-sm text-destructive">{msg}</p>
            )}
          </form>
        )}

        <div className="text-center text-sm text-muted-foreground">
          {tab === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
          <Button
            type="button"
            variant="link"
            className="pl-1 text-foreground"
            onClick={() => switchTab(tab === "login" ? "signup" : "login")}
          >
            {tab === "login" ? "Crear cuenta" : "Iniciar sesión"}
          </Button>
        </div>

        {!configured && (
          <div className="border-t border-border pt-6 text-center">
            <p className="mb-3 text-xs text-muted-foreground">
              O entra en modo demostración:
            </p>
            <Button asChild variant="secondary" className="w-full">
              <a href="/dashboard">Demo Dashboard →</a>
            </Button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
