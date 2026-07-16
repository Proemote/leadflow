"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { signIn, signUp, signInWithGoogle, resetPasswordForEmail } from "@/lib/auth-helpers";
import {
  AuthLayout,
  Button,
  GoogleIcon,
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

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

  async function handleGoogleSignIn() {
    if (!configured) {
      router.push("/dashboard");
      return;
    }

    setGoogleLoading(true);
    setStatus("idle");
    setMsg("");

    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
      // Éxito: Supabase redirige el navegador a Google, no hace falta más aquí
    } catch (err) {
      setGoogleLoading(false);
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Error al conectar con Google");
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;

    setStatus("loading");
    setMsg("");

    try {
      const { error } = await resetPasswordForEmail(resetEmail);
      if (error) throw error;
      setResetEmailSent(true);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Error al enviar el correo");
    }
  }

  if (forgotPassword) {
    if (resetEmailSent) {
      return (
        <AuthLayout>
          <div className="mx-auto grid w-[350px] gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Logo size={56} />
              <h1 className="mt-2 text-2xl font-bold text-foreground">Revisa tu correo</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Si existe una cuenta con{" "}
              <span className="font-semibold text-foreground">{resetEmail}</span>, te hemos
              enviado un enlace para restablecer tu contraseña.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForgotPassword(false);
                setResetEmailSent(false);
                setResetEmail("");
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
            <h1 className="mt-2 text-2xl font-bold text-foreground">Recupera tu contraseña</h1>
            <p className="text-balance text-sm text-muted-foreground">
              Te enviaremos un enlace a tu email para crear una contraseña nueva.
            </p>
          </div>
          <form onSubmit={handleForgotPassword} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="resetEmail">Email</Label>
              <Input
                id="resetEmail"
                name="resetEmail"
                type="email"
                placeholder="tu@correo.com"
                required
                autoComplete="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" className="mt-2" disabled={status === "loading"}>
              {status === "loading" ? "Enviando…" : "Enviar enlace"}
            </Button>
            {status === "error" && msg && (
              <p className="text-center text-sm text-destructive">{msg}</p>
            )}
          </form>
          <div className="text-center text-sm text-muted-foreground">
            <Button
              type="button"
              variant="link"
              className="text-foreground"
              onClick={() => {
                setForgotPassword(false);
                setStatus("idle");
                setMsg("");
              }}
            >
              Volver a iniciar sesión
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
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
            <div className="grid gap-2">
              <PasswordInput
                name="password"
                label="Contraseña"
                placeholder="Tu contraseña"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  setForgotPassword(true);
                  setResetEmail(email);
                  setStatus("idle");
                  setMsg("");
                }}
                className="justify-self-end text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
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
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                required
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                className="mt-0.5 size-3.5 shrink-0 rounded border-input accent-primary"
              />
              <span>
                He leído y acepto la{" "}
                <a
                  href="https://proemote.es/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2 hover:no-underline"
                >
                  Política de Privacidad
                </a>
                .
              </span>
            </label>
            <Button type="submit" variant="outline" className="mt-2" disabled={status === "loading" || !acceptedPrivacy}>
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

        {configured && (
          <div className="grid gap-4">
            <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
              <span className="relative z-10 bg-background px-2 text-muted-foreground">
                O continúa con
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              <GoogleIcon className="mr-2 h-4 w-4" />
              {googleLoading ? "Conectando…" : "Continuar con Google"}
            </Button>
          </div>
        )}

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
