export function HealthGauge({
  score,
  tone,
  size = 208,
}: {
  score: number;
  tone: "mint" | "blue" | "amber" | "coral";
  size?: number;
}) {
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const arc = 0.75;
  const track = circumference * arc;
  const progress = (Math.max(0, Math.min(100, score)) / 100) * track;
  const tones = {
    mint: { from: "#5EEAD4", to: "#34D399", glow: "rgba(94,234,212,0.35)" },
    blue: { from: "#A78BFA", to: "#38BDF8", glow: "rgba(99,216,255,0.3)" },
    amber: { from: "#FBBF24", to: "#FB923C", glow: "rgba(251,191,36,0.3)" },
    coral: { from: "#FB7185", to: "#F43F5E", glow: "rgba(251,113,133,0.3)" },
  }[tone];
  const gradientId = `gauge-${tone}`;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={tones.from} />
            <stop offset="100%" stopColor={tones.to} />
          </linearGradient>
          <filter id={`${gradientId}-blur`}>
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${track} ${circumference}`}
          transform="rotate(135 100 100)"
        />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={tones.from}
          strokeWidth="13"
          opacity="0.18"
          filter={`url(#${gradientId}-blur)`}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          transform="rotate(135 100 100)"
        />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          transform="rotate(135 100 100)"
          style={{ transition: "stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[46px] font-bold leading-none tracking-tight text-white">
          {score}
        </span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">
          out of 100
        </span>
      </div>
    </div>
  );
}
