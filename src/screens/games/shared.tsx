import { useGame } from "../../game/store";
import { fmtUsd } from "../../game/format";
import type { Round } from "../../lib/markets";

export const CW = 300;
export const CH = 76;

export function GameHeader({ title }: { title: string }) {
  const asset = useGame((s) => s.asset);
  const balance = useGame((s) => s.balance);
  const streak = useGame((s) => s.streak);
  const cycleAsset = useGame((s) => s.cycleAsset);

  return (
    <div className="scr-top">
      <button className="scr-asset" onClick={() => cycleAsset(1)}>
        {title} · {asset} <span aria-hidden>▾</span>
      </button>
      <span className="scr-meta mono">
        AVAIL <b>${fmtUsd(balance, 0)}</b> · STK {streak}
      </span>
    </div>
  );
}

export function PayLine({ stake, mult }: { stake: number; mult: number }) {
  return (
    <div className="scr-pays mono">
      PAYS ${fmtUsd(stake, 0)} <span aria-hidden>→</span>{" "}
      <b>${fmtUsd(stake * mult, 0)}</b>
      <span className="scr-mult">{mult.toFixed(2)}×</span>
    </div>
  );
}

/** open rounds for the current asset + game, soonest first */
export function useOpenRounds(gameId: string) {
  const asset = useGame((s) => s.asset);
  const rounds = useGame((s) => s.rounds);
  return rounds
    .filter((r) => r.status === "OPEN" && r.asset === asset && r.game === gameId)
    .sort((a, b) => a.expiresAt - b.expiresAt);
}

export function buildChart(trail: number[], marks: (number | undefined)[] = []) {
  const none = { path: "", y: (_: number) => null as number | null };
  if (trail.length < 2) return none;
  const pts = [...trail, ...marks.filter((v): v is number => v !== undefined)];
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const span = hi - lo || 1;
  const min = lo - span * 0.15;
  const max = hi + span * 0.15;
  const y = (v: number) => CH - ((v - min) / (max - min)) * CH;
  const n = trail.length;
  const path = trail
    .map((v, i) => `${i ? "L" : "M"}${((i / (n - 1)) * CW).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");
  return { path, y };
}

export type { Round };
