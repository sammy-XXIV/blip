import { useEffect, useRef, useState } from "react";
import { useGame } from "../game/store";
import { fmtUsd } from "../game/format";
import { STAKE_MAX, STAKE_MIN } from "../game/config";

const PX_PER_DOLLAR = 12; // drag travel for one $1 step
const ROW_H = 24; // px between drum numbers
const FRICTION = 0.94;
const MIN_V = 0.15;
const TAP_SLOP = 5;

/** A knurled number drum you drag / flick, like a real thumbwheel. $1 per notch. */
export function StakeWheel({ active }: { active: boolean }) {
  const stake = useGame((s) => s.stake);
  const nudgeStake = useGame((s) => s.nudgeStake);

  const activeRef = useRef(active);
  activeRef.current = active;

  const elRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0); // sub-dollar px carry, for the sliding look

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
    const step = (n: number) => {
      if (n) {
        nudgeStake(n);
        buzz();
      }
    };

    // up = pixels of upward intent (finger moves up => raise stake)
    const feed = (up: number) => {
      carry += up;
      const n = Math.trunc(carry / PX_PER_DOLLAR);
      if (n) {
        step(n);
        carry -= n * PX_PER_DOLLAR;
      }
      setOffset(carry);
    };

    const glide = () => {
      vY *= FRICTION;
      if (!activeRef.current || Math.abs(vY) < MIN_V) {
        setOffset(0);
        return;
      }
      feed(-vY); // vY>0 (was flicking down) => lower
      raf = requestAnimationFrame(glide);
    };

    const onDown = (e: PointerEvent) => {
      if (!activeRef.current) return;
      cancelAnimationFrame(raf);
      pointerId = e.pointerId;
      el.setPointerCapture(pointerId);
      lastY = downY = e.clientY;
      carry = 0;
      moved = 0;
      vY = 0;
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
        step(downY < r.top + r.height / 2 ? 1 : -1);
        setOffset(0);
        return;
      }
      if (Math.abs(vY) > MIN_V) raf = requestAnimationFrame(glide);
      else setOffset(0);
    };
    const onWheel = (e: WheelEvent) => {
      if (!activeRef.current) return;
      e.preventDefault();
      step(e.deltaY < 0 ? 1 : -1);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!activeRef.current) return;
      const map: Record<string, number> = {
        ArrowUp: 1,
        ArrowDown: -1,
        PageUp: 10,
        PageDown: -10,
      };
      if (e.key in map) {
        e.preventDefault();
        step(map[e.key]);
      }
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
  }, [nudgeStake]);

  const rows = [-2, -1, 0, 1, 2].map((k) => {
    const v = stake + k;
    return { k, v, show: v >= STAKE_MIN && v <= STAKE_MAX };
  });

  return (
    <div
      className="wheel"
      ref={elRef}
      role="slider"
      tabIndex={active ? 0 : -1}
      aria-label="stake"
      aria-valuemin={STAKE_MIN}
      aria-valuemax={STAKE_MAX}
      aria-valuenow={stake}
      aria-valuetext={`$${stake}`}
    >
      <div className="wheel-drum" style={{ transform: `translateY(${-offset}px)` }}>
        {rows.map(({ k, v, show }) => (
          <span
            key={k}
            className={`wheel-num${k === 0 ? " cur" : ""}`}
            style={{ transform: `translateY(calc(-50% + ${k * ROW_H}px))` }}
          >
            {show ? (k === 0 ? `$${fmtUsd(v, 0)}` : fmtUsd(v, 0)) : ""}
          </span>
        ))}
      </div>
      <span className="wheel-ridges" aria-hidden style={{ backgroundPositionY: `${-offset}px` }} />
      <span className="wheel-notch" aria-hidden />
    </div>
  );
}
