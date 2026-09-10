import { useGame } from "../../game/store";
import { useControls } from "../../game/controls";
import { useNow } from "../../hooks/useNow";
import { STAKE_MAX, STAKE_MIN, multiplierForStreak } from "../../game/config";
import { fmtClock } from "../../game/format";
import { ResultFlash } from "../../components/ResultFlash";
import { GameHeader, PayLine, useMainButton, useOpenRounds } from "./shared";
import { CountdownRing } from "./parts";

const WEDGES = 8; // even index = UP, odd index = DOWN

function wedgePath(k: number) {
  const p = (ang: number) => {
    const rad = ((ang - 90) * Math.PI) / 180;
    return `${(50 + 46 * Math.cos(rad)).toFixed(2)} ${(50 + 46 * Math.sin(rad)).toFixed(2)}`;
  };
  const a0 = k * (360 / WEDGES);
  return `M50 50 L${p(a0)} A46 46 0 0 1 ${p(a0 + 360 / WEDGES)} Z`;
}

function labelPos(k: number) {
  const ang = k * (360 / WEDGES) + 360 / WEDGES / 2;
  const rad = ((ang - 90) * Math.PI) / 180;
  return { x: 50 + 29 * Math.cos(rad), y: 50 + 29 * Math.sin(rad) };
}

export function LuckyScreen() {
  const now = useNow(200);
  const stake = useGame((s) => s.stake);
  const streak = useGame((s) => s.streak);
  const placing = useGame((s) => s.placing);
  const asset = useGame((s) => s.asset);
  const rounds = useGame((s) => s.rounds);
  const setStake = useGame((s) => s.setStake);
  const cycleAsset = useGame((s) => s.cycleAsset);
  const error = useGame((s) => s.error);

  const { spec: main } = useMainButton("lucky", "SPIN", "SPINNING");

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
      action1: null,
      action2: { label: asset, color: "neutral", onPress: () => cycleAsset(1) },
      main,
    },
    [stake, asset, main.label, main.loading, main.disabled],
  );

  const open = useOpenRounds("lucky");
  const lead = open[0];
  const mult = multiplierForStreak(streak);

  const history = rounds.filter((r) => r.game === "lucky" && r.status !== "OPEN").slice(0, 12);

  const frac = lead ? Math.max(0, (lead.expiresAt - now) / (lead.expiresAt - lead.openedAt)) : 0;
  const secs = lead ? Math.max(0, Math.ceil((lead.expiresAt - now) / 1000)) : 0;

  // land a wedge of the drawn side under the top pointer; UP -> k=0, DOWN -> k=1
  const landK = lead ? (lead.direction === "UP" ? 0 : 1) : 0;
  const landedDeg = 2160 + (360 - (landK * (360 / WEDGES) + 360 / WEDGES / 2));

  // fast continuous spin while a round is placing; snap-decelerate onto the
  // drawn side once it's known; slow idle drift otherwise
  const rotorClass = lead ? "" : placing ? "spinning" : "idle";
  const wheelStyle = lead
    ? { transform: `rotate(${landedDeg}deg)`, transition: "transform 1.7s cubic-bezier(.12,.8,.15,1)" }
    : undefined;

  return (
    <div className="scr scr-game g-lucky">
      <GameHeader title="LUCKY" />

      <div className="sw-stage">
        <div className="sw-box">
          <svg className="sw-pointer" viewBox="0 0 20 14" aria-hidden>
            <path d="M10 13 L2 1 L18 1 Z" />
          </svg>
          <svg className="spinwheel" viewBox="0 0 100 100" aria-hidden>
            <g className={`sw-rotor ${rotorClass}`} style={wheelStyle}>
              {Array.from({ length: WEDGES }, (_, k) => (
                <path key={k} d={wedgePath(k)} className={`wedge ${k % 2 ? "down" : "up"}`} />
              ))}
              {Array.from({ length: WEDGES }, (_, k) => {
                const { x, y } = labelPos(k);
                return (
                  <text key={k} x={x} y={y} className="wedge-lbl" textAnchor="middle" dominantBaseline="central">
                    {k % 2 ? "▼" : "▲"}
                  </text>
                );
              })}
              <circle cx="50" cy="50" r="9" className="sw-hub" />
            </g>
          </svg>
          {lead && (
            <div className="sw-ring">
              <CountdownRing frac={frac} label={`${secs}s`} size={116} />
            </div>
          )}
        </div>
        <span className="lucky-tag mono">
          {placing ? "SPINNING…" : lead ? "IN PLAY" : "SPIN · WIN · CASH OUT"}
        </span>
      </div>

      <div className="lucky-hist">
        {history.length === 0 && <span className="label">no spins yet</span>}
        {history.map((r) => (
          <span
            key={r.id}
            className={`hd ${r.status === "WON" ? "w" : "l"} ${r.direction === "UP" ? "up" : "down"}`}
          >
            {r.direction === "UP" ? "▲" : "▼"}
          </span>
        ))}
      </div>

      <PayLine stake={stake} mult={mult} />

      <div className={`scr-status mono ${lead ? "live" : ""}`}>
        {error ? (
          <span className="scr-err">{error}</span>
        ) : lead ? (
          <>
            {lead.direction === "UP" ? "▲" : "▼"} ${lead.stake} · {fmtClock(lead.expiresAt - now)} left
          </>
        ) : (
          "Hit SPIN — the console picks your side."
        )}
      </div>

      <ResultFlash />
    </div>
  );
}
