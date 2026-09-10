import { useEffect, useRef, useState } from "react";
import type { KnobSpec } from "../game/controls";

const PX_PER_STEP = 16; // drag travel for one detent
const ROW_H = 24;
const FRICTION = 0.93;
const MIN_V = 0.15;
const TAP_SLOP = 5;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Knurled drum you drag / flick / scroll. Whatever the mounted screen bound. */
export function Knob({ spec }: { spec: KnobSpec | null }) {
  const specRef = useRef(spec);
  specRef.current = spec;

  const elRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    let pointerId = -1;
    let lastY = 0;
    let downY = 0;
    let carry = 0;
    let moved = 0;
    let vY = 0;
    let lastT = 0;
    let raf = 0;

    const buzz = () => navigator.vibrate?.(3);
    const bump = (dir: number) => {
      const s = specRef.current;
      if (!s || !dir) return;
      const next = clamp(
        Math.round((s.value + dir * s.step) / s.step) * s.step,
        s.min,
        s.max,
      );
      if (next !== s.value) {
        s.onChange(next);
        buzz();
      }
    };
    const feed = (up: number) => {
      carry += up;
      const n = Math.trunc(carry / PX_PER_STEP);
      if (n) {
        bump(n);
        carry -= n * PX_PER_STEP;
      }
      setOffset(carry);
    };
    const glide = () => {
      vY *= FRICTION;
      if (!specRef.current || Math.abs(vY) < MIN_V) {
        setOffset(0);
        return;
      }
      feed(-vY);
      raf = requestAnimationFrame(glide);
    };

    const onDown = (e: PointerEvent) => {
      if (!specRef.current) return;
      cancelAnimationFrame(raf);
      pointerId = e.pointerId;
      el.setPointerCapture(pointerId);
      lastY = downY = e.clientY;
      carry = moved = vY = 0;
      lastT = performance.now();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const now = performance.now();
      const dy = e.clientY - lastY;
      lastY = e.clientY;
      moved += Math.abs(dy);
      const dt = Math.max(1, now - lastT);
      lastT = now;
      vY = (dy / dt) * 16;
      feed(-dy);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      pointerId = -1;
      if (moved < TAP_SLOP) {
        const r = el.getBoundingClientRect();
        bump(downY < r.top + r.height / 2 ? 1 : -1);
        setOffset(0);
        return;
      }
      if (Math.abs(vY) > MIN_V) raf = requestAnimationFrame(glide);
      else setOffset(0);
    };
    const onWheel = (e: WheelEvent) => {
      if (!specRef.current) return;
      e.preventDefault();
      bump(e.deltaY < 0 ? 1 : -1);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!specRef.current) return;
      if (e.key === "ArrowUp") (e.preventDefault(), bump(1));
      else if (e.key === "ArrowDown") (e.preventDefault(), bump(-1));
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, []);

  const fmt = spec?.format ?? ((v: number) => String(v));
  const rows = [-2, -1, 0, 1, 2].map((k) => {
    const v = spec ? spec.value + k * spec.step : 0;
    const show = spec ? v >= spec.min && v <= spec.max : false;
    return { k, v, show };
  });

  return (
    <div className={`wheel ${spec ? "" : "wheel-off"}`}>
      {spec && <span className="wheel-label mono">{spec.label}</span>}
      <div
        className="wheel-face-box"
        ref={elRef}
        role="slider"
        tabIndex={spec ? 0 : -1}
        aria-label={spec?.label ?? "knob"}
        aria-valuenow={spec?.value}
        aria-valuetext={spec ? fmt(spec.value) : undefined}
      >
        <div className="wheel-drum" style={{ transform: `translateY(${-offset}px)` }}>
          {rows.map(({ k, v, show }) => (
            <span
              key={k}
              className={`wheel-num${k === 0 ? " cur" : ""}`}
              style={{ transform: `translateY(calc(-50% + ${k * ROW_H}px))` }}
            >
              {show ? fmt(v) : ""}
            </span>
          ))}
        </div>
        <span className="wheel-ridges" aria-hidden style={{ backgroundPositionY: `${-offset}px` }} />
        <span className="wheel-notch" aria-hidden />
      </div>
    </div>
  );
}
