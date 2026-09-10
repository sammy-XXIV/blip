import { useRef, useState } from "react";
import { useGame } from "../game/store";
import { useControlBus, type BtnSpec } from "../game/controls";
import { sfx } from "../lib/sound";
import { Knob } from "./Knob";

const HOLD_MS = 420;

const buzz = (p: number | number[]) => {
  if (navigator.vibrate) navigator.vibrate(p);
};

function Pad({ spec, fallback }: { spec: BtnSpec | null | undefined; fallback: string }) {
  const s = spec ?? { label: fallback, onPress: () => {}, disabled: true };
  return (
    <button
      className={`pad c-${s.color ?? "neutral"} ${s.active ? "sel" : ""} ${s.pulse ? "pulse" : ""}`}
      disabled={s.disabled}
      onClick={() => {
        if (s.disabled) return;
        buzz(6);
        sfx("tick");
        s.onPress();
      }}
    >
      <span className="pad-l">{s.label}</span>
    </button>
  );
}

/** the orange button — FIRE is press-and-hold ("hold to the buzzer"); CASH OUT is a tap */
function ActionButton({ spec }: { spec: BtnSpec }) {
  const off = spec.disabled || spec.loading;
  const hold = !spec.pulse && !spec.loading; // FIRE-style commit needs a hold
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [arming, setArming] = useState(false);

  const commit = () => {
    buzz([10, 30, 10]);
    sfx("fire");
    spec.onPress();
  };
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setArming(false);
  };
  const start = () => {
    if (off) return;
    if (!hold) {
      buzz(8);
      sfx("tick");
      spec.onPress();
      return;
    }
    setArming(true);
    buzz(4);
    timer.current = setTimeout(() => {
      setArming(false);
      commit();
    }, HOLD_MS);
  };

  return (
    <button
      className={`act ${spec.pulse ? "pulse" : ""} ${spec.loading ? "loading" : ""} ${arming ? "arming" : ""}`}
      style={arming ? { ["--hold" as string]: `${HOLD_MS}ms` } : undefined}
      disabled={off}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
    >
      <span className="act-fill" aria-hidden />
      <span className="act-lbl">{spec.loading ? "···" : arming ? "HOLD" : spec.label}</span>
    </button>
  );
}

export function Deck() {
  const screen = useGame((s) => s.screen);
  const goHome = useGame((s) => s.goHome);
  const backToSelect = useGame((s) => s.backToSelect);
  const openMenu = useGame((s) => s.openMenu);

  const knob = useControlBus((s) => s.knob);
  const action1 = useControlBus((s) => s.action1);
  const action2 = useControlBus((s) => s.action2);
  const main = useControlBus((s) => s.main);

  const idle = screen === "boot";
  const inPlay = screen === "play";

  const m: BtnSpec = main ?? { label: "—", onPress: () => {}, disabled: true };

  return (
    <div className={`deck ${idle ? "deck-idle" : ""}`}>
      <div className="deck-pads">
        <Pad spec={action1} fallback="—" />
        <Pad spec={action2} fallback="—" />
      </div>

      <div className="deck-right">
        <ActionButton spec={m} />
        <Knob spec={knob ?? null} />
      </div>

      <div className="deck-hw">
        <button
          className="hwbtn"
          onClick={() => {
            buzz(6);
            sfx("tick");
            openMenu();
          }}
        >
          MENU
        </button>
        <button
          className="hwbtn"
          onClick={() => {
            buzz(6);
            sfx("tick");
            inPlay ? backToSelect() : goHome();
          }}
        >
          {inPlay ? "BACK" : "HOME"}
        </button>
        <span className="hwchip mono">
          {knob ? (knob.format ? knob.format(knob.value) : knob.value) : "—"}
        </span>
      </div>
    </div>
  );
}
