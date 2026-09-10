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
