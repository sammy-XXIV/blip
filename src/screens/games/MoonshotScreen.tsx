import { useMemo } from "react";
import { useGame } from "../../game/store";
import { useControls } from "../../game/controls";
import { useNow } from "../../hooks/useNow";
import { fmtClock, fmtPrice, fmtSigned } from "../../game/format";
import { ResultFlash } from "../../components/ResultFlash";
import { CH, CW, GameHeader, PayLine, buildChart, useOpenRounds } from "./shared";

export function MoonshotScreen() {
  const now = useNow(200);
  const price = useGame((s) => s.prices[s.asset]);
  const trail = useGame((s) => s.trail[s.asset]);
  const aim = useGame((s) => s.aim);
  const pendingDir = useGame((s) => s.pendingDir);
  const placing = useGame((s) => s.placing);
  const balance = useGame((s) => s.balance);
  const stake = useGame((s) => s.stake);
  const setAim = useGame((s) => s.setAim);
  const setPending = useGame((s) => s.setPending);
  const fire = useGame((s) => s.fire);
  const error = useGame((s) => s.error);

  useControls(
    {
      knob: {
        label: "AIM",
        value: aim,
        min: 2,
        max: 10,
        step: 0.5,
        onChange: setAim,
        format: (v) => `${v}×`,
      },
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
      main: {
        label: placing ? "OPENING" : "FIRE",
        color: "amber",
        loading: placing,
        disabled: stake > balance,
        onPress: () => void fire(),
      },
    },
    [aim, pendingDir, placing, balance, stake],
  );

  const open = useOpenRounds("moonshot");
  const lead = open[0];

  const dir = lead?.direction ?? pendingDir; // UP = LONG, DOWN = SHORT
  const offset = 0.0008 * (lead?.multiplier ?? aim); // matches the demo adapter
  const strike = lead?.strikePrice ?? price * (dir === "UP" ? 1 + offset : 1 - offset);
  const entry = lead?.entryPrice ?? price;

  const { path, y } = useMemo(() => buildChart(trail, [entry, strike]), [trail, entry, strike]);
  const entryY = y(entry);
  const strikeY = y(strike);

  const toTargetPct = ((strike - price) / price) * 100;
  const cleared = dir === "UP" ? price >= strike : price <= strike;
  // progress 0..1 from entry to strike
  const prog = Math.max(0, Math.min(1, (price - entry) / (strike - entry || 1)));

  return (
    <div className="scr scr-game g-shot">
      <GameHeader title="MOONSHOT" />

      <div className="shot-row">
        <div className="shot-main">
          <div className="scr-price mono">{fmtPrice(price)}</div>
          <span className={`shot-reach mono ${cleared ? "hit" : ""}`}>
            {cleared ? "CLEARED" : `${dir === "UP" ? "▲" : "▼"} ${fmtSigned(toTargetPct, 2)}% to line`}
          </span>
        </div>
        <div className="shot-gauge" aria-hidden>
          <span className="shot-strike-tick" />
          <span
            className={`shot-marker ${cleared ? "hit" : ""}`}
            style={{ bottom: `${prog * 100}%` }}
          />
        </div>
      </div>

      <svg className="scr-chart" viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none" aria-hidden>
        {entryY !== null && <line x1="0" y1={entryY} x2={CW} y2={entryY} className="scr-entry" />}
        {strikeY !== null && (
          <line x1="0" y1={strikeY} x2={CW} y2={strikeY} className="scr-strike" />
        )}
        {path && <path d={path} className="scr-line" />}
      </svg>

      <div className="shot-line mono">
        LINE <b>{fmtPrice(strike)}</b>
      </div>

      <PayLine stake={stake} mult={aim} />

      <div className={`scr-status mono ${lead ? "live" : ""}`}>
        {error ? (
          <span className="scr-err">{error}</span>
        ) : lead ? (
          <>
            {dir === "UP" ? "▲ LONG" : "▼ SHORT"} ${lead.stake} ·{" "}
            {fmtClock(lead.expiresAt - now)} left · {cleared ? "clear ✓" : "not yet"}
          </>
        ) : (
          "Set ▲ LONG / ▼ SHORT — clear the line, not just the side."
        )}
      </div>

      <ResultFlash />
    </div>
  );
}
