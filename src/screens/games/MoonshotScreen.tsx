import { useMemo } from "react";
import { useGame } from "../../game/store";
import { useControls } from "../../game/controls";
import { useNow } from "../../hooks/useNow";
import { fmtClock, fmtPrice } from "../../game/format";
import { Rolling } from "../../components/Rolling";
import { ResultFlash } from "../../components/ResultFlash";
import { CH, CW, GameHeader, buildChart, useMainButton, useOpenRounds } from "./shared";
import { CountdownRing } from "./parts";

export function MoonshotScreen() {
  const now = useNow(200);
  const price = useGame((s) => s.prices[s.asset]);
  const trail = useGame((s) => s.trail[s.asset]);
  const aim = useGame((s) => s.aim);
  const pendingDir = useGame((s) => s.pendingDir);
  const stake = useGame((s) => s.stake);
  const setAim = useGame((s) => s.setAim);
  const setPending = useGame((s) => s.setPending);
  const error = useGame((s) => s.error);

  const { spec: main } = useMainButton("moonshot", "FIRE", "OPENING");

  useControls(
    {
      knob: { label: "AIM", value: aim, min: 2, max: 10, step: 0.5, onChange: setAim, format: (v) => `${v}×` },
      action1: {
        label: "▲ LONG",
        color: "blue",
        active: pendingDir === "UP",
        onPress: () => setPending("UP"),
      },
      action2: {
        label: "▼ SHORT",
        color: "blue",
        active: pendingDir === "DOWN",
        onPress: () => setPending("DOWN"),
      },
      main,
    },
    [aim, pendingDir, main.label, main.loading, main.disabled],
  );

  const open = useOpenRounds("moonshot");
  const lead = open[0];

  const dir = lead?.direction ?? pendingDir; // UP = LONG, DOWN = SHORT
  const shownMult = lead?.multiplier ?? aim;
  const offset = 0.0008 * shownMult;
  const strike = lead?.strikePrice ?? price * (dir === "UP" ? 1 + offset : 1 - offset);
  const entry = lead?.entryPrice ?? price;

  const { path, y } = useMemo(() => buildChart(trail, [entry, strike]), [trail, entry, strike]);
  const entryY = y(entry);
  const strikeY = y(strike);
  const onTarget = dir === "UP" ? price >= strike : price <= strike;
  const frac = lead ? Math.max(0, (lead.expiresAt - now) / (lead.expiresAt - lead.openedAt)) : 0;
  const secs = lead ? Math.max(0, Math.ceil((lead.expiresAt - now) / 1000)) : 0;

  return (
    <div className="scr scr-game g-shot">
      <GameHeader title="MOONSHOT" />

      <div className="shot-aim">
        <span className="shot-aim-x mono">
          <Rolling value={shownMult} suffix="×" decimals={1} />
        </span>
        <span className={`shot-aim-dir ${dir === "UP" ? "up" : "down"}`}>
          {dir === "UP" ? "LONG" : "SHORT"}
        </span>
        <span className={`shot-target mono ${onTarget ? "hit" : ""}`}>
          {onTarget ? "ON TARGET" : "OFF"}
        </span>
      </div>

      <div className="scr-price mono">{fmtPrice(price)}</div>

      <div className="chart-wrap">
        <svg className="scr-chart" viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none" aria-hidden>
          {entryY !== null && <line x1="0" y1={entryY} x2={CW} y2={entryY} className="scr-entry" />}
          {strikeY !== null && (
            <line x1="0" y1={strikeY} x2={CW} y2={strikeY} className="scr-strike" />
          )}
          {path && <path d={path} className="scr-line" />}
        </svg>
        {lead && (
          <div className="chart-ring">
            <CountdownRing frac={frac} label={`${secs}s`} size={48} />
          </div>
        )}
        <span className="chart-tag mono">LINE {fmtPrice(strike)}</span>
      </div>

      <div className="shot-nums mono">
        <span>
          AMOUNT <b>${stake}</b>
        </span>
        <span>
          WIN UP TO <b>${Math.round(stake * shownMult)}</b>
        </span>
      </div>

      <div className={`scr-status mono ${lead ? "live" : ""}`}>
        {error ? (
          <span className="scr-err">{error}</span>
        ) : lead ? (
          <>
            {dir === "UP" ? "▲ LONG" : "▼ SHORT"} · {fmtClock(lead.expiresAt - now)} ·{" "}
            {onTarget ? "clear ✓" : "not yet"}
          </>
        ) : (
          "Reach further, win bigger. Clear the line."
        )}
      </div>

      <ResultFlash />
    </div>
  );
}
