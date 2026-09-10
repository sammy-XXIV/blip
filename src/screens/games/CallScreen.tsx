import { useGame } from "../../game/store";
import { useControls } from "../../game/controls";
import { useNow } from "../../hooks/useNow";
import { STAKE_MAX, STAKE_MIN, multiplierForStreak } from "../../game/config";
import { fmtPrice, fmtSigned } from "../../game/format";
import { ResultFlash } from "../../components/ResultFlash";
import { GameHeader, PayLine, useMainButton, useOpenRounds } from "./shared";
import { CountdownRing, SwingMeter } from "./parts";

/** 0.35% move = pinned to a side */
const FULL_SWING = 0.0035;

export function CallScreen() {
  const now = useNow(200);
  const price = useGame((s) => s.prices[s.asset]);
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

  const movePct = lead ? ((price - lead.entryPrice) / lead.entryPrice) * 100 : 0;
  // lean toward the player's win: +ve = winning
  const raw = lead ? (price - lead.entryPrice) / lead.entryPrice / FULL_SWING : 0;
  const lean = lead ? (lead.direction === "UP" ? raw : -raw) : 0;
  const frac = lead ? Math.max(0, (lead.expiresAt - now) / (lead.expiresAt - lead.openedAt)) : 0;
  const secs = lead ? Math.max(0, Math.ceil((lead.expiresAt - now) / 1000)) : 0;

  return (
    <div className="scr scr-game g-call">
      <GameHeader title="CALL" />
      <div className="scr-price mono">{fmtPrice(price)}</div>

      <div className="call-stage">
        <SwingMeter lean={lean} live={!!lead} />
        {lead && <CountdownRing frac={frac} label={`${secs}s`} />}
      </div>

      <PayLine stake={stake} mult={multiplierForStreak(streak)} />

      <div className={`scr-status mono ${lead ? "live" : ""}`}>
        {error ? (
          <span className="scr-err">{error}</span>
        ) : lead ? (
          <>
            {lead.direction === "UP" ? "▲" : "▼"} {asset} ${lead.stake}
            <span className={lean >= 0 ? "up" : "down"}> · {fmtSigned(movePct, 2)}%</span>
            {open.length > 1 && <span className="scr-more"> +{open.length - 1}</span>}
            {lean >= 0 ? " · winning" : " · behind"}
          </>
        ) : (
          "Set ▲ or ▼, then FIRE."
        )}
      </div>

      <ResultFlash />
    </div>
  );
}
