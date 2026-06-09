import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadFlow AI · WhatsApp CRM",
  description: "CRM de WhatsApp con agente de IA (Leo) — cualificación y seguimiento automático.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Tema desde cookie → renderiza con la clase correcta (sin parpadeo en SSR)
  const theme = (await cookies()).get("theme")?.value === "light" ? "light" : "";
  return (
    <html lang="es" className={theme}>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
