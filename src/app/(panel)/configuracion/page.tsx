import { getProfile } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/db";
import { ConfigForm } from "@/components/ConfigForm";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const profile = await getProfile();
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Configuración</h1>
        <p className="text-violet-300/70 mt-1">Apariencia y datos de tu perfil.</p>
      </div>
      <ConfigForm profile={profile} demo={!isSupabaseConfigured()} />
    </div>
  );
}
