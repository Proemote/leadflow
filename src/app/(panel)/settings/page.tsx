import { getSetting, isSupabaseConfigured } from "@/lib/db";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/leo";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const prompt = await getSetting("system_prompt", DEFAULT_SYSTEM_PROMPT);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">
          Configuración de Leo
        </h1>
        <p className="text-violet-300/70 mt-1">
          Define cómo responde tu agente de IA en WhatsApp.
        </p>
      </div>
      <SettingsForm initialPrompt={prompt || DEFAULT_SYSTEM_PROMPT} demo={!isSupabaseConfigured()} />
    </div>
  );
}
