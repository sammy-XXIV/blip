import { useGame } from "../../game/store";
import { useControls } from "../../game/controls";
import { useNow } from "../../hooks/useNow";
import { fmtPrice, fmtSigned } from "../../game/format";
import { ResultFlash } from "../../components/ResultFlash";
import { GameHeader, PayLine, useMainButton, useOpenRounds } from "./shared";
import { CountdownRing } from "./parts";

export function MoonshotScreen() {
  const now = useNow(200);
  const price = useGame((s) => s.prices[s.asset]);
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
  const offset = 0.0008 * (lead?.multiplier ?? aim);
  const strike = lead?.strikePrice ?? price * (dir === "UP" ? 1 + offset : 1 - offset);
  const entry = lead?.entryPrice ?? price;

  const toTargetPct = ((strike - price) / price) * 100;
  const cleared = dir === "UP" ? price >= strike : price <= strike;
  const prog = Math.max(0, Math.min(1, (price - entry) / (strike - entry || 1)));
  const frac = lead ? Math.max(0, (lead.expiresAt - now) / (lead.expiresAt - lead.openedAt)) : 0;
  const secs = lead ? Math.max(0, Math.ceil((lead.expiresAt - now) / 1000)) : 0;

  return (
    <div className="scr scr-game g-shot">
      <GameHeader title="MOONSHOT" />
      <div className="scr-price mono">{fmtPrice(price)}</div>

      <div className="shot-stage">
        <div className="shot-gauge" aria-hidden>
          <span className="shot-strike-tick" />
          <span className="shot-strike-cap mono">{fmtPrice(strike)}</span>
          <span
            className={`shot-rocket ${cleared ? "hit" : ""} ${lead ? "live" : ""} ${dir === "DOWN" ? "flip" : ""}`}
            style={{ bottom: `${prog * 100}%` }}
          >
            ▲
          </span>
        </div>
        <div className="shot-side">
          <span className={`shot-reach mono ${cleared ? "hit" : ""}`}>
            {cleared ? "CLEARED" : `${dir === "UP" ? "▲" : "▼"} ${fmtSigned(toTargetPct, 2)}%`}
          </span>
          <span className="shot-cap mono">to the line</span>
          {lead && <CountdownRing frac={frac} label={`${secs}s`} size={54} />}
        </div>
      </div>

      <PayLine stake={stake} mult={aim} />

      <div className={`scr-status mono ${lead ? "live" : ""}`}>
        {error ? (
          <span className="scr-err">{error}</span>
        ) : lead ? (
          <>
            {dir === "UP" ? "▲ LONG" : "▼ SHORT"} ${lead.stake} · {cleared ? "clear ✓" : "climbing"}
          </>
        ) : (
          `Dial AIM, set ▲ LONG / ▼ SHORT. Clear ${fmtPrice(strike)}.`
        )}
      </div>

      <ResultFlash />
    </div>
  );
}
