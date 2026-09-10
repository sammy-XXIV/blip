import { useGame } from "../game/store";
import { useControls } from "../game/controls";
import { GAMES } from "../game/config";
import { Rolling } from "../components/Rolling";
import { sfx } from "../lib/sound";

export function SelectScreen() {
  const idx = useGame((s) => s.selectIdx);
  const balance = useGame((s) => s.balance);
  const streak = useGame((s) => s.streak);
  const pickGame = useGame((s) => s.pickGame);
  const moveSelect = useGame((s) => s.moveSelect);

  useControls(
    {
      knob: {
        label: "SELECT",
        value: idx,
        min: 0,
        max: GAMES.length - 1,
        step: 1,
        onChange: (v) => useGame.setState({ selectIdx: v }),
        format: (v) => `${String(v + 1).padStart(2, "0")}/${String(GAMES.length).padStart(2, "0")}`,
      },
      action1: { label: "◀ PREV", color: "neutral", onPress: () => moveSelect(-1) },
      action2: { label: "NEXT ▶", color: "neutral", onPress: () => moveSelect(1) },
      main: {
        label: "▶ PLAY",
        color: "amber",
        onPress: () => {
          sfx("start");
          pickGame();
        },
      },
    },
    [idx],
  );

  return (
    <div className="scr scr-select">
      <div className="scr-top">
        <span className="scr-asset">SELECT GAME</span>
        <span className="scr-meta mono">
          AVAIL <Rolling value={balance} prefix="$" decimals={0} className="scr-bal-roll" /> · STK{" "}
          {streak}
        </span>
      </div>

      <ul className="sel-list">
        {GAMES.map((g, i) => (
          <li
            key={g.id}
            className={`sel-row ${i === idx ? "on" : ""}`}
            onClick={() => (i === idx ? pickGame() : useGame.setState({ selectIdx: i }))}
          >
            <span className="sel-no mono">{g.no}</span>
            <span className="sel-name">{g.name}</span>
            <span className="sel-blurb">{g.blurb}</span>
            {i === idx && (
              <span className="sel-cur" aria-hidden>
                ▶
              </span>
            )}
          </li>
        ))}
      </ul>

      <p className="scr-status mono">◀ ▶ or turn the knob · ▶ button to play</p>
    </div>
  );
}
