import { useEffect, useMemo } from "react";
import { useGame } from "../game/store";
import { useNow } from "../hooks/useNow";
import { MOONSHOT_MULTIPLIER, gameById, multiplierForStreak } from "../game/config";
import { fmtClock, fmtPrice, fmtSigned, fmtUsd } from "../game/format";
import { ResultFlash } from "../components/ResultFlash";

const CW = 300;
const CH = 76;

export function GameScreen() {
  const now = useNow(200);

  const gameId = useGame((s) => s.game);
  const asset = useGame((s) => s.asset);
  const price = useGame((s) => s.prices[s.asset]);
  const trail = useGame((s) => s.trail[s.asset]);
  const rounds = useGame((s) => s.rounds);
  const stake = useGame((s) => s.stake);
  const streak = useGame((s) => s.streak);
  const balance = useGame((s) => s.balance);
  const pendingDir = useGame((s) => s.pendingDir);
  const cycleAsset = useGame((s) => s.cycleAsset);
  const error = useGame((s) => s.error);
  const clearError = useGame((s) => s.clearError);

  const game = gameById(gameId);
  const isShot = game.market === "strike";

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(clearError, 2600);
    return () => clearTimeout(id);
  }, [error, clearError]);

  const open = rounds
    .filter((r) => r.status === "OPEN" && r.asset === asset && r.game === gameId)
    .sort((a, b) => a.expiresAt - b.expiresAt);
  const lead = open[0];

  const mult = isShot ? MOONSHOT_MULTIPLIER : multiplierForStreak(streak);
  const payout = stake * mult;

  // MOONSHOT strike line: from the open round, else projected from the pending side
  const strike =
    lead?.strikePrice ??
    (isShot ? price * (pendingDir === "UP" ? 1.0015 : 0.9985) : undefined);

  const { path, entryY, strikeY } = useMemo(
    () => buildChart(trail, lead?.entryPrice, strike),
    [trail, lead?.entryPrice, strike],
  );

  const movePct = lead ? ((price - lead.entryPrice) / lead.entryPrice) * 100 : null;

  return (
    <div className="scr scr-game">
      <div className="scr-top">
        <button className="scr-asset" onClick={() => cycleAsset(1)}>
          {game.name} · {asset} <span aria-hidden>▾</span>
        </button>
        <span className="scr-meta mono">
          AVAIL <b>${fmtUsd(balance, 0)}</b> · STK {streak}
        </span>
      </div>

      <div className="scr-price mono">{fmtPrice(price)}</div>

      <svg className="scr-chart" viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none" aria-hidden>
        {entryY !== null && <line x1="0" y1={entryY} x2={CW} y2={entryY} className="scr-entry" />}
        {strikeY !== null && (
          <line x1="0" y1={strikeY} x2={CW} y2={strikeY} className="scr-strike" />
        )}
        {path && <path d={path} className="scr-line" />}
      </svg>

      <div className="scr-pays mono">
        PAYS ${fmtUsd(stake, 0)} <span aria-hidden>→</span> <b>${fmtUsd(payout, 0)}</b>
        <span className="scr-mult">{mult.toFixed(2)}×</span>
      </div>

      <div className={`scr-status mono ${lead ? "live" : ""}`}>
        {error ? (
          <span className="scr-err">{error}</span>
        ) : lead ? (
          <>
            {lead.direction === "UP" ? "▲" : "▼"} {asset} ${fmtUsd(lead.stake, 0)} ·{" "}
            {fmtClock(lead.expiresAt - now)} left
            {movePct !== null && (
              <span className={movePct >= 0 ? "up" : "down"}> · {fmtSigned(movePct, 2)}%</span>
            )}
            {open.length > 1 && <span className="scr-more"> +{open.length - 1}</span>}
          </>
        ) : gameId === "lucky" ? (
          "One tap. We flip the coin."
        ) : isShot ? (
          `Clear the line — ${strike ? fmtPrice(strike) : "…"}`
        ) : (
          "Set ▲ or ▼, then hit the button."
        )}
      </div>

      <ResultFlash />
    </div>
  );
}

function buildChart(trail: number[], entry?: number, strike?: number) {
  const none = { path: "", entryY: null as number | null, strikeY: null as number | null };
  if (trail.length < 2) return none;
  const marks = [entry, strike].filter((v): v is number => v !== undefined);
  const lo = Math.min(...trail, ...marks);
  const hi = Math.max(...trail, ...marks);
  const span = hi - lo || 1;
  const pad = span * 0.15;
  const min = lo - pad;
  const max = hi + pad;
  const y = (v: number) => CH - ((v - min) / (max - min)) * CH;

  const n = trail.length;
  const path = trail
    .map((v, i) => `${i ? "L" : "M"}${((i / (n - 1)) * CW).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");
  return {
    path,
    entryY: entry !== undefined ? y(entry) : null,
    strikeY: strike !== undefined ? y(strike) : null,
  };
}
