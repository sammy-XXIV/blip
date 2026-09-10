import { useGame } from "../../game/store";
import { Rolling } from "../../components/Rolling";
import type { BtnSpec } from "../../game/controls";
import type { Round } from "../../lib/markets";

export const CW = 300;
export const CH = 76;

export function GameHeader({ title }: { title: string }) {
  const asset = useGame((s) => s.asset);
  const balance = useGame((s) => s.balance);
  const streak = useGame((s) => s.streak);

  return (
    <div className="scr-top">
      <span className="scr-asset">
        {title} · {asset}
      </span>
      <span className="scr-meta mono">
        AVAIL <Rolling value={balance} prefix="$" decimals={0} className="scr-bal-roll" /> · STK{" "}
        {streak}
      </span>
    </div>
  );
}

export function PayLine({ stake, mult }: { stake: number; mult: number }) {
  return (
    <div className="scr-pays mono">
      PAYS ${stake} <span aria-hidden>→</span>{" "}
      <b>
        <Rolling value={stake * mult} prefix="$" decimals={0} />
      </b>
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

/** the orange button spec: FIRE when idle, CASH OUT while a round is open */
export function useMainButton(
  gameId: string,
  fireLabel: string,
  openLabel: string,
): { spec: BtnSpec; hasOpen: boolean } {
  const placing = useGame((s) => s.placing);
  const cashing = useGame((s) => s.cashing);
  const stake = useGame((s) => s.stake);
  const balance = useGame((s) => s.balance);
  const fire = useGame((s) => s.fire);
  const cashOut = useGame((s) => s.cashOut);
  const hasOpen = useOpenRounds(gameId).length > 0;

  const spec: BtnSpec = hasOpen
    ? {
        label: cashing ? "CASHING" : "CASH OUT",
        color: "amber",
        loading: cashing,
        pulse: !cashing,
        onPress: () => void cashOut(),
      }
    : {
        label: placing ? openLabel : fireLabel,
        color: "amber",
        loading: placing,
        disabled: stake > balance,
        onPress: () => void fire(),
      };
  return { spec, hasOpen };
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
