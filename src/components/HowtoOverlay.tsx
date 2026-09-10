import { useGame } from "../game/store";
import { gameById } from "../game/config";

export function HowtoOverlay() {
  const gameId = useGame((s) => s.game);
  const toggle = useGame((s) => s.toggleHowto);
  const g = gameById(gameId);

  return (
    <button className="howto" onClick={toggle} aria-label="close how to">
      <div className="howto-head">
        <span className="howto-title">HOW TO · {g.name}</span>
        <span className="label">tap to close</span>
      </div>
      <ul className="howto-list">
        {g.howto.map((line, i) => (
          <li key={i}>
            <span className="howto-no mono">{String(i + 1).padStart(2, "0")}</span>
            {line}
          </li>
        ))}
      </ul>
    </button>
  );
}
