import { useGame } from "../game/store";
import { gameById } from "../game/config";
import { fmtUsd } from "../game/format";
import { sfx } from "../lib/sound";
import { StakeWheel } from "./StakeWheel";

const buzz = (p: number | number[]) => {
  if (navigator.vibrate) navigator.vibrate(p);
};

export function Deck() {
  const screen = useGame((s) => s.screen);
  const gameId = useGame((s) => s.game);
  const pendingDir = useGame((s) => s.pendingDir);
  const stake = useGame((s) => s.stake);
  const placing = useGame((s) => s.placing);
  const balance = useGame((s) => s.balance);

  const moveSelect = useGame((s) => s.moveSelect);
  const pickGame = useGame((s) => s.pickGame);
  const setPending = useGame((s) => s.setPending);
  const fire = useGame((s) => s.fire);
  const goHome = useGame((s) => s.goHome);
  const backToSelect = useGame((s) => s.backToSelect);
  const openMenu = useGame((s) => s.openMenu);

  const inSelect = screen === "select";
  const inPlay = screen === "play";
  const idle = screen === "boot";
  const game = gameById(gameId);
  const lucky = gameId === "lucky";

  // pad labels + behaviour depend on the screen
  const pad = inSelect
    ? { up: "◀ PREV", down: "NEXT ▶", onUp: () => moveSelect(-1), onDown: () => moveSelect(1) }
    : lucky
      ? { up: "—", down: "—", onUp: () => {}, onDown: () => {} }
      : game.market === "strike"
        ? {
            up: "▲ LONG",
            down: "▼ SHORT",
            onUp: () => setPending("UP"),
            onDown: () => setPending("DOWN"),
          }
        : {
            up: "▲ UP",
            down: "▼ DOWN",
            onUp: () => setPending("UP"),
            onDown: () => setPending("DOWN"),
          };

  const padsDisabled = idle || (inPlay && lucky);
  const selUp = inPlay && !lucky && pendingDir === "UP";
  const selDown = inPlay && !lucky && pendingDir === "DOWN";

  const action = inSelect
    ? { label: "▶ PLAY", run: pickGame, off: false }
    : lucky
      ? { label: "LUCKY", run: fire, off: idle || placing || stake > balance }
      : { label: placing ? "…" : "FIRE", run: fire, off: idle || placing || stake > balance };

  const padSfx = inSelect ? "move" : "tick";
  const isPlay = action.label === "▶ PLAY";

  return (
    <div className={`deck ${idle ? "deck-idle" : ""}`}>
      <div className="deck-pads">
        <button
          className={`pad ${selUp ? "sel" : ""}`}
          disabled={padsDisabled}
          onClick={() => {
            buzz(6);
            sfx(padSfx);
            pad.onUp();
          }}
        >
          <span className="pad-l">{pad.up}</span>
        </button>
        <button
          className={`pad ${selDown ? "sel" : ""}`}
          disabled={padsDisabled}
          onClick={() => {
            buzz(6);
            sfx(padSfx);
            pad.onDown();
          }}
        >
          <span className="pad-l">{pad.down}</span>
        </button>
      </div>

      <div className="deck-right">
        <button
          className="act"
          disabled={action.off}
          onClick={() => {
            buzz(isPlay ? 6 : [8, 24, 8]);
            sfx(isPlay ? "start" : "fire");
            void action.run();
          }}
        >
          {action.label}
        </button>
        <StakeWheel active={inPlay} />
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
        <span className="hwchip mono">${fmtUsd(stake, 0)}</span>
      </div>
    </div>
  );
}
