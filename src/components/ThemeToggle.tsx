"use client";

import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "./icons";

type Theme = "dark" | "light";

function current(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  try {
    localStorage.setItem("theme", theme);
    document.cookie = `theme=${theme}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* ignore */
  }
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => setTheme(current()), []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        title={theme === "light" ? "Modo oscuro" : "Modo claro"}
        aria-label="Cambiar tema"
        className="relative grid place-items-center size-10 rounded-xl border border-[var(--color-edge)] text-violet-200 hover:bg-violet-500/10 transition"
      >
        {theme === "light" ? <IconMoon width={18} height={18} /> : <IconSun width={18} height={18} />}
      </button>
    );
  }

  return (
    <div className="flex rounded-xl border border-[var(--color-edge-soft)] overflow-hidden w-fit">
      {(["light", "dark"] as const).map((t) => (
        <button
          key={t}
          onClick={() => { setTheme(t); applyTheme(t); }}
          className="flex items-center gap-2 px-4 py-2 text-sm transition"
          style={
            theme === t
              ? { background: "linear-gradient(180deg,rgba(124,58,237,0.5),rgba(109,40,217,0.3))", color: "#fff" }
              : { color: "var(--text-muted)" }
          }
        >
          {t === "light" ? <IconSun width={16} height={16} /> : <IconMoon width={16} height={16} />}
          {t === "light" ? "Claro" : "Oscuro"}
        </button>
      ))}
    </div>
  );
}
