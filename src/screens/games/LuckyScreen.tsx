import { useGame } from "../../game/store";
import { useNow } from "../../hooks/useNow";
import { multiplierForStreak } from "../../game/config";
import { fmtClock } from "../../game/format";
import { ResultFlash } from "../../components/ResultFlash";
import { GameHeader, PayLine, useOpenRounds } from "./shared";

export function LuckyScreen() {
  const now = useNow(200);
  const stake = useGame((s) => s.stake);
  const streak = useGame((s) => s.streak);
  const placing = useGame((s) => s.placing);
  const rounds = useGame((s) => s.rounds);
  const error = useGame((s) => s.error);

  const open = useOpenRounds("lucky");
  const lead = open[0];

  const history = rounds
    .filter((r) => r.game === "lucky" && r.status !== "OPEN")
    .slice(0, 12);

  const face = placing ? "?" : lead ? (lead.direction === "UP" ? "▲" : "▼") : "?";

  return (
    <div className="scr scr-game g-lucky">
      <GameHeader title="LUCKY" />

      <div className="lucky-stage">
        <div className={`coin ${placing ? "spin" : ""} ${lead ? (lead.direction === "UP" ? "up" : "down") : ""}`}>
          <span>{face}</span>
        </div>
        <span className="lucky-tag mono">
          {placing ? "FLIPPING…" : lead ? "IN PLAY" : "ONE TAP · WE FLIP"}
        </span>
      </div>

      <div className="lucky-hist">
        {history.length === 0 && <span className="label">no flips yet</span>}
        {history.map((r) => (
          <span
            key={r.id}
            className={`hd ${r.status === "WON" ? "w" : "l"} ${r.direction === "UP" ? "up" : "down"}`}
          >
            {r.direction === "UP" ? "▲" : "▼"}
          </span>
        ))}
      </div>

      <PayLine stake={stake} mult={multiplierForStreak(streak)} />

      <div className={`scr-status mono ${lead ? "live" : ""}`}>
        {error ? (
          <span className="scr-err">{error}</span>
        ) : lead ? (
          <>
            {lead.direction === "UP" ? "▲" : "▼"} ${lead.stake} · {fmtClock(lead.expiresAt - now)} left
          </>
        ) : (
          "Hit LUCKY — the console picks your side."
        )}
      </div>

      <ResultFlash />
    </div>
  );
}
