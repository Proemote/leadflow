import { IconBell, IconSearch } from "./icons";

export function Topbar({ subtitle }: { subtitle?: string }) {
  return (
    <header className="flex items-center gap-4 px-6 md:px-10 py-5 border-b border-[var(--color-edge-soft)] sticky top-0 z-20 backdrop-blur-xl bg-[rgba(7,5,11,0.55)]">
      <div className="relative flex-1 max-w-md">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-300/50" />
        <input
          className="input pl-10 py-2.5 text-sm"
          placeholder={subtitle ?? "Buscar leads, conversaciones..."}
        />
      </div>
      <div className="flex items-center gap-4 ml-auto">
        <button className="relative grid place-items-center size-10 rounded-xl border border-[var(--color-edge)] text-violet-200 hover:bg-violet-500/10 transition">
          <IconBell />
          <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-fuchsia-400 shadow-[0_0_8px_2px_rgba(192,132,252,0.7)]" />
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight hidden sm:block">
            <div className="text-sm font-semibold text-violet-50">Alex Carter</div>
            <div className="text-[11px] text-violet-300/60">VP of Sales</div>
          </div>
          <div
            className="size-10 rounded-full grid place-items-center font-bold text-sm text-white"
            style={{ background: "linear-gradient(140deg,#8b5cf6,#6d28d9)" }}
          >
            AC
          </div>
        </div>
      </div>
    </header>
  );
}
