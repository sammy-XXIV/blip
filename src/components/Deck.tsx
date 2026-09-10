import { useGame } from "../game/store";
import { ALL_WINDOWS, multiplierForStreak } from "../game/config";
import { fmtUsd } from "../game/format";
import { StakeWheel } from "./StakeWheel";

const buzz = (p: number | number[]) => {
  if (navigator.vibrate) navigator.vibrate(p);
};

export function Deck({ active }: { active: boolean }) {
  const stake = useGame((s) => s.stake);
  const streak = useGame((s) => s.streak);
  const windowSec = useGame((s) => s.windowSec);
  const placing = useGame((s) => s.placing);
  const balance = useGame((s) => s.balance);
  const call = useGame((s) => s.call);
  const cycleWindow = useGame((s) => s.cycleWindow);
  const goHome = useGame((s) => s.goHome);
  const openMenu = useGame((s) => s.openMenu);

  const wl = ALL_WINDOWS.find((w) => w.sec === windowSec)?.label ?? `${windowSec}S`;
  const mult = multiplierForStreak(streak);
  const blocked = !active || placing || stake > balance;

  return (
    <div className={`deck ${active ? "" : "deck-idle"}`}>
      <div className="deck-pads">
        <button
          className="pad pad-up"
          disabled={blocked}
          onClick={() => {
            buzz(12);
            void call("UP");
          }}
        >
          <span className="pad-k">▲</span>
          <span className="pad-l">UP</span>
          <span className="pad-s mono">{mult.toFixed(2)}×</span>
        </button>
        <button
          className="pad pad-down"
          disabled={blocked}
          onClick={() => {
            buzz([8, 28, 8]);
            void call("DOWN");
          }}
        >
          <span className="pad-k">▼</span>
          <span className="pad-l">DOWN</span>
          <span className="pad-s mono">{mult.toFixed(2)}×</span>
        </button>
      </div>

      <div className="deck-right">
        <button
          className="sqr"
          disabled={!active}
          onClick={() => {
            buzz(6);
            cycleWindow(1);
          }}
          aria-label="change window"
        >
          <span className="label">WIN</span>
          <span className="sqr-v mono">{wl}</span>
        </button>

        <StakeWheel active={active} />
      </div>

      <div className="deck-hw">
        <button
          className="hwbtn"
          onClick={() => {
            buzz(6);
            openMenu();
          }}
        >
          MENU
        </button>
        <button
          className="hwbtn"
          onClick={() => {
            buzz(6);
            goHome();
          }}
        >
          HOME
        </button>
        <span className="hwchip mono">${fmtUsd(stake, 0)}</span>
      </div>
    </div>
  );
}
