import { useGame } from "../game/store";
import { useControlBus, type BtnSpec } from "../game/controls";
import { sfx } from "../lib/sound";
import { Knob } from "./Knob";

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

/** the orange button — plain tap; label morphs FIRE / CASH OUT / OPENING */
function ActionButton({ spec }: { spec: BtnSpec }) {
  const off = spec.disabled || spec.loading;
  return (
    <button
      className={`act ${spec.pulse ? "pulse" : ""} ${spec.loading ? "loading" : ""}`}
      disabled={off}
      onClick={() => {
        if (off) return;
        buzz(spec.pulse ? 8 : [10, 30, 10]);
        sfx("fire");
        spec.onPress();
      }}
    >
      <span className="act-lbl">{spec.loading ? "···" : spec.label}</span>
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
