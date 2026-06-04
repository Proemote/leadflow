export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="relative grid place-items-center rounded-2xl"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(150deg, #2a1147, #0b0710)",
        border: "1px solid rgba(168,85,247,0.4)",
        boxShadow: "0 0 24px -4px rgba(168,85,247,0.6)",
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 32 32" fill="none">
        <defs>
          <linearGradient id="lf" x1="0" y1="0" x2="32" y2="32">
            <stop offset="0" stopColor="#e9d5ff" />
            <stop offset="0.5" stopColor="#a855f7" />
            <stop offset="1" stopColor="#6d28d9" />
          </linearGradient>
        </defs>
        <path
          d="M8 4v18a2 2 0 0 0 2 2h10"
          stroke="url(#lf)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 6h9M16 13h7"
          stroke="url(#lf)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
