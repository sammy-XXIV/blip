import { useEffect, useRef, useState } from "react";

const easeOut = (t: number) => 1 - (1 - t) ** 3;

interface Props {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

/** A number that rolls from its old value to the new one. */
export function Rolling({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 450,
  className,
}: Props) {
  const fromRef = useRef(value);
  const rafRef = useRef(0);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      setShown(from + (to - from) * easeOut(p));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  const text =
    prefix +
    shown.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) +
    suffix;

  return <span className={`tnum ${className ?? ""}`}>{text}</span>;
}
