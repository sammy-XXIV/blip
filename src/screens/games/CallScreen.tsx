import { useMemo } from "react";
import { useGame } from "../../game/store";
import { useNow } from "../../hooks/useNow";
import { multiplierForStreak } from "../../game/config";
import { fmtClock, fmtPrice, fmtSigned } from "../../game/format";
import { ResultFlash } from "../../components/ResultFlash";
import { CH, CW, GameHeader, PayLine, buildChart, useOpenRounds } from "./shared";

export function CallScreen() {
  const now = useNow(200);
  const price = useGame((s) => s.prices[s.asset]);
  const trail = useGame((s) => s.trail[s.asset]);
  const asset = useGame((s) => s.asset);
  const stake = useGame((s) => s.stake);
  const streak = useGame((s) => s.streak);
  const error = useGame((s) => s.error);

  const open = useOpenRounds("call");
  const lead = open[0];
  const { path, y } = useMemo(() => buildChart(trail, [lead?.entryPrice]), [trail, lead?.entryPrice]);
  const entryY = lead ? y(lead.entryPrice) : null;
  const movePct = lead ? ((price - lead.entryPrice) / lead.entryPrice) * 100 : null;

  return (
    <div className="scr scr-game g-call">
      <GameHeader title="CALL" />
      <div className="scr-price mono">{fmtPrice(price)}</div>

      <svg className="scr-chart" viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none" aria-hidden>
        {entryY !== null && <line x1="0" y1={entryY} x2={CW} y2={entryY} className="scr-entry" />}
        {path && <path d={path} className="scr-line" />}
      </svg>

      <PayLine stake={stake} mult={multiplierForStreak(streak)} />

      <div className={`scr-status mono ${lead ? "live" : ""}`}>
        {error ? (
          <span className="scr-err">{error}</span>
        ) : lead ? (
          <>
            {lead.direction === "UP" ? "▲" : "▼"} {asset} ${lead.stake} ·{" "}
            {fmtClock(lead.expiresAt - now)} left
            {movePct !== null && (
              <span className={movePct >= 0 ? "up" : "down"}> · {fmtSigned(movePct, 2)}%</span>
            )}
            {open.length > 1 && <span className="scr-more"> +{open.length - 1}</span>}
          </>
        ) : (
          "Set ▲ or ▼, then FIRE."
        )}
      </div>

      <ResultFlash />
    </div>
  );
}
