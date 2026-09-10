import { IS_DEMO } from "../lib/markets";
import { useGame } from "../game/store";
import { sfx } from "../lib/sound";

export function BootScreen() {
  const enterSelect = useGame((s) => s.enterSelect);
  const enterAuth = useGame((s) => s.enterAuth);
  const ready = useGame((s) => s.prices.BTC > 0);

  const start = () => {
    sfx("start");
    IS_DEMO ? enterSelect() : enterAuth();
  };

  return (
    <div className="scr scr-boot">
      <span className="boot-press">{ready ? "PRESS START" : "TUNING IN…"}</span>
      <h1 className="boot-head">Built for fun and money.</h1>
      <p className="boot-sub">
        Call BTC or ETH up or down. Sixty seconds to land it.
        <br />
        Win the call, ride the streak.
      </p>

      <button className="boot-start" onClick={start} disabled={!ready}>
        START
      </button>

      <div className="boot-foot">
        <span className="label">
          {IS_DEMO ? "Demo · play money · no wallet" : "Live · Somnia Shannon · play money"}
        </span>
        <span className="label">Powered by DreamDEX Event Contracts</span>
        <span className="boot-warn mono">BLIP has no token.</span>
      </div>
    </div>
  );
}
