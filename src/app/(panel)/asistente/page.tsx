import { AssistantChat } from "@/components/AssistantChat";

export default function AsistentePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">
          Hablar con Leo
        </h1>
        <p className="text-violet-300/70 mt-1">
          Tu asistente interno: consulta leads, oportunidades y agenda, y pídele borradores
          de seguimiento. Solo lectura — nunca envía mensajes ni modifica datos.
        </p>
      </div>
      <AssistantChat />
    </div>
  );
}
