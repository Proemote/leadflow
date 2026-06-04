/* Gráficos livianos en SVG — sin librerías externas. */

export function Donut({
  value,
  label,
  sublabel,
  size = 170,
}: {
  value: number; // 0–100
  label: string;
  sublabel?: string;
  size?: number;
}) {
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="donutg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c084fc" />
            <stop offset="1" stopColor="#6d28d9" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(124,58,237,0.14)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#donutg)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ filter: "drop-shadow(0 0 6px rgba(168,85,247,0.5))" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold text-white">{label}</div>
        {sublabel && <div className="text-xs text-violet-300/70 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}

export function Ring({ value, max, label }: { value: number; max: number; label: string }) {
  const size = 46;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / (max || 1));
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(124,58,237,0.18)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#a855f7"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${pct * c} ${c}`}
          />
        </svg>
        <span className="absolute text-[11px] font-semibold text-violet-100">{value}</span>
      </div>
      <span className="text-sm text-violet-100/90">{label}</span>
    </div>
  );
}

export function BarSeries({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end justify-between gap-3 h-full pt-4">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <div
            className="w-full max-w-[46px] rounded-t-lg"
            style={{
              height: `${(d.value / max) * 100}%`,
              minHeight: 6,
              background: "linear-gradient(180deg,#a855f7,#6d28d9)",
              boxShadow: "0 0 18px -4px rgba(168,85,247,0.7)",
            }}
          />
          <span className="text-[11px] text-violet-300/60 font-medium">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-violet-100/85">{label}</span>
        <span className="text-violet-200 font-semibold">{value}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-violet-500/10 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            background: "linear-gradient(90deg,#c084fc,#7c3aed)",
            boxShadow: "0 0 12px -2px rgba(168,85,247,0.8)",
          }}
        />
      </div>
    </div>
  );
}
