import { TestChat } from "@/components/TestChat";

export default function TestChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">
          Chat de prueba
        </h1>
        <p className="text-violet-300/70 mt-1">
          Prueba las respuestas de Leo sin enviar ningún WhatsApp real. Usa las mismas instrucciones y reglas.
        </p>
      </div>
      <TestChat />
    </div>
  );
}
