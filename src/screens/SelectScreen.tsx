import { useGame } from "../game/store";
import { GAMES } from "../game/config";
import { fmtUsd } from "../game/format";

export function SelectScreen() {
  const idx = useGame((s) => s.selectIdx);
  const balance = useGame((s) => s.balance);
  const streak = useGame((s) => s.streak);
  const pickGame = useGame((s) => s.pickGame);

  return (
    <div className="scr scr-select">
      <div className="scr-top">
        <span className="scr-asset">SELECT GAME</span>
        <span className="scr-meta mono">
          AVAIL <b>${fmtUsd(balance, 0)}</b> · STK {streak}
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
            {i === idx && <span className="sel-cur" aria-hidden>▶</span>}
          </li>
        ))}
      </ul>

      <p className="scr-status mono">◀ ▶ to move · ▶ button to play</p>
    </div>
  );
}
