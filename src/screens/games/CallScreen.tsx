import { useMemo } from "react";
import { useGame } from "../../game/store";
import { useControls } from "../../game/controls";
import { useNow } from "../../hooks/useNow";
import { STAKE_MAX, STAKE_MIN, multiplierForStreak } from "../../game/config";
import { fmtClock, fmtPrice, fmtSigned } from "../../game/format";
import { ResultFlash } from "../../components/ResultFlash";
import { CH, CW, GameHeader, PayLine, buildChart, useMainButton, useOpenRounds } from "./shared";
import { CountdownRing } from "./parts";

export function CallScreen() {
  const now = useNow(200);
  const price = useGame((s) => s.prices[s.asset]);
  const trail = useGame((s) => s.trail[s.asset]);
  const asset = useGame((s) => s.asset);
  const stake = useGame((s) => s.stake);
  const streak = useGame((s) => s.streak);
  const pendingDir = useGame((s) => s.pendingDir);
  const setPending = useGame((s) => s.setPending);
  const setStake = useGame((s) => s.setStake);
  const error = useGame((s) => s.error);

  const { spec: main } = useMainButton("call", "FIRE", "OPENING");

  useControls(
    {
      knob: {
        label: "STAKE",
        value: stake,
        min: STAKE_MIN,
        max: STAKE_MAX,
        step: 1,
        onChange: setStake,
        format: (v) => `$${v}`,
      },
      action1: {
        label: "▲ UP",
        color: "blue",
        active: pendingDir === "UP",
        onPress: () => setPending("UP"),
      },
      action2: {
        label: "▼ DOWN",
        color: "blue",
        active: pendingDir === "DOWN",
        onPress: () => setPending("DOWN"),
      },
      main,
    },
    [stake, pendingDir, main.label, main.loading, main.disabled],
  );

  const open = useOpenRounds("call");
  const lead = open[0];
  const { path, y } = useMemo(() => buildChart(trail, [lead?.entryPrice]), [trail, lead?.entryPrice]);
  const entryY = lead ? y(lead.entryPrice) : null;
  const movePct = lead ? ((price - lead.entryPrice) / lead.entryPrice) * 100 : null;
  const frac = lead ? Math.max(0, (lead.expiresAt - now) / (lead.expiresAt - lead.openedAt)) : 0;
  const secs = lead ? Math.max(0, Math.ceil((lead.expiresAt - now) / 1000)) : 0;

  return (
    <div className="scr scr-game g-call">
      <GameHeader title="CALL" />
      <div className="scr-price mono">{fmtPrice(price)}</div>

      <div className="chart-wrap">
        <svg className="scr-chart" viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none" aria-hidden>
          {entryY !== null && <line x1="0" y1={entryY} x2={CW} y2={entryY} className="scr-entry" />}
          {path && <path d={path} className="scr-line" />}
        </svg>
        {lead && (
          <div className="chart-ring">
            <CountdownRing frac={frac} label={`${secs}s`} size={48} />
          </div>
        )}
      </div>

      <PayLine stake={stake} mult={multiplierForStreak(streak)} />

      <div className={`scr-status mono ${lead ? "live" : ""}`}>
        {error ? (
          <span className="scr-err">{error}</span>
        ) : lead ? (
          <>
            {lead.direction === "UP" ? "▲" : "▼"} {asset} ${lead.stake} · {fmtClock(lead.expiresAt - now)}
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
