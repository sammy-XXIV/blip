import { useEffect, useMemo } from "react";
import { useGame } from "../game/store";
import { useNow } from "../hooks/useNow";
import { multiplierForStreak } from "../game/config";
import { fmtClock, fmtPrice, fmtSigned, fmtUsd } from "../game/format";
import { ResultFlash } from "../components/ResultFlash";

const CW = 300;
const CH = 76;

export function ConsoleScreen() {
  const now = useNow(200);

  const asset = useGame((s) => s.asset);
  const price = useGame((s) => s.prices[s.asset]);
  const trail = useGame((s) => s.trail[s.asset]);
  const rounds = useGame((s) => s.rounds);
  const stake = useGame((s) => s.stake);
  const streak = useGame((s) => s.streak);
  const balance = useGame((s) => s.balance);
  const cycleAsset = useGame((s) => s.cycleAsset);
  const error = useGame((s) => s.error);
  const clearError = useGame((s) => s.clearError);

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(clearError, 2600);
    return () => clearTimeout(id);
  }, [error, clearError]);

  const open = rounds
    .filter((r) => r.status === "OPEN" && r.asset === asset)
    .sort((a, b) => a.expiresAt - b.expiresAt);
  const lead = open[0];

  const mult = multiplierForStreak(streak);
  const payout = stake * mult;

  const { path, entryY } = useMemo(
    () => buildChart(trail, lead?.entryPrice),
    [trail, lead?.entryPrice],
  );

  const movePct = lead ? ((price - lead.entryPrice) / lead.entryPrice) * 100 : null;

  return (
    <div className="scr scr-game">
      <div className="scr-top">
        <button className="scr-asset" onClick={() => cycleAsset(1)}>
          BLIP · {asset} <span aria-hidden>▾</span>
        </button>
        <span className="scr-meta mono">
          AVAIL ${fmtUsd(balance, 0)} · STK {streak}
        </span>
      </div>

      <div className="scr-price mono">{fmtPrice(price)}</div>

      <svg className="scr-chart" viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none" aria-hidden>
        {entryY !== null && (
          <line x1="0" y1={entryY} x2={CW} y2={entryY} className="scr-entry" />
        )}
        {path && <path d={path} className="scr-line" />}
      </svg>

      <div className="scr-pays mono">
        PAYS ${fmtUsd(stake, 0)} <span aria-hidden>→</span>{" "}
        <b>${fmtUsd(payout, 0)}</b>
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
        ) : (
          "Call ▲ or ▼ before the window closes."
        )}
      </div>

      <ResultFlash />
    </div>
  );
}

function buildChart(trail: number[], entry?: number) {
  if (trail.length < 2) return { path: "", entryY: null as number | null };
  const vals = entry ? [...trail, entry] : trail;
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const pad = span * 0.15;
  const min = lo - pad;
  const max = hi + pad;
  const y = (v: number) => CH - ((v - min) / (max - min)) * CH;

  const n = trail.length;
  const path = trail
    .map((v, i) => `${i ? "L" : "M"}${((i / (n - 1)) * CW).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");
  return { path, entryY: entry !== undefined ? y(entry) : null };
}
