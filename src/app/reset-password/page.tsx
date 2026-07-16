"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { updatePassword } from "@/lib/auth-helpers";
import { AuthLayout, Button, Label, PasswordInput } from "@/components/ui/auth-fuse";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 6) {
      setStatus("error");
      setMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setMsg("Las contraseñas no coinciden.");
      return;
    }

    setStatus("loading");
    setMsg("");

    try {
      const { error } = await updatePassword(password);
      if (error) throw error;
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Error al actualizar la contraseña");
    }
  }

  if (status === "done") {
    return (
      <AuthLayout>
        <div className="mx-auto grid w-[350px] gap-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <Logo size={56} />
            <h1 className="mt-2 text-2xl font-bold text-foreground">Contraseña actualizada</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Ya puedes acceder a LeadFlow con tu nueva contraseña.
          </p>
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
            Ir al panel
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
          <h1 className="mt-2 text-2xl font-bold text-foreground">Crea una nueva contraseña</h1>
          <p className="text-balance text-sm text-muted-foreground">
            Elige una contraseña nueva para tu cuenta de LeadFlow.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="password">Nueva contraseña</Label>
            <PasswordInput
              name="password"
              placeholder="Mínimo 6 caracteres"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Repite la contraseña</Label>
            <PasswordInput
              name="confirmPassword"
              placeholder="Repite la contraseña"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" className="mt-2" disabled={status === "loading"}>
            {status === "loading" ? "Guardando…" : "Guardar contraseña"}
          </Button>
          {status === "error" && msg && (
            <p className="text-center text-sm text-destructive">{msg}</p>
          )}
        </form>
      </div>
    </AuthLayout>
  );
}
