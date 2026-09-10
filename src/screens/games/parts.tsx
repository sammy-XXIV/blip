interface RingProps {
  /** 0..1 remaining */
  frac: number;
  label?: string;
  size?: number;
}

/** a draining countdown ring */
export function CountdownRing({ frac, label, size = 60 }: RingProps) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, frac)));
  const hot = frac < 0.25;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className={`ring-bar ${hot ? "hot" : ""}`}
          strokeDasharray={c}
          strokeDashoffset={off}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {label && <span className="ring-lbl mono">{label}</span>}
    </div>
  );
}

interface SwingProps {
  /** signed, roughly -1..1 — how far toward a win (up = positive) */
  lean: number;
  live: boolean;
}

/** a tug-of-war bar: fill leans UP (blue, top) or DOWN (bottom) */
export function SwingMeter({ lean, live }: SwingProps) {
  const clamped = Math.max(-1, Math.min(1, lean));
  const pct = 50 - clamped * 50; // 0 = all up, 100 = all down
  const dir = clamped >= 0 ? "up" : "down";
  return (
    <div className={`swing ${live ? "live" : ""}`}>
      <span className="swing-end up">▲</span>
      <div className="swing-track">
        <span className="swing-fill up" style={{ height: `${100 - pct}%` }} />
        <span className="swing-fill down" style={{ height: `${pct}%` }} />
        <span className={`swing-knob ${dir}`} style={{ top: `${pct}%` }} />
      </div>
      <span className="swing-end down">▼</span>
    </div>
  );
}
