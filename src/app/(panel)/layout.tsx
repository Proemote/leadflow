import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { isSupabaseConfigured } from "@/lib/db";

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const demo = !isSupabaseConfigured();
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Topbar />
        {demo && (
          <div className="px-6 md:px-10 pt-4">
            <div className="panel-tight px-4 py-2.5 text-xs text-amber-200/90 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-amber-400" />
              Modo demostración — Supabase no configurado. Estás viendo datos de ejemplo.
              Completa las variables de entorno para conectar tu base de datos real.
            </div>
          </div>
        )}
        <main className="px-6 md:px-10 py-8">{children}</main>
      </div>
    </div>
  );
}
