import { create } from "zustand";
import { IS_DEMO, markets, type Asset, type Direction, type Round } from "../lib/markets";
import {
  DEMO_WINDOWS,
  LIVE_WINDOWS,
  multiplierForStreak,
  STAKE_DEFAULT,
  STAKE_MAX,
  STAKE_MIN,
} from "./config";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const WINDOWS = IS_DEMO ? DEMO_WINDOWS : LIVE_WINDOWS;
const DEFAULT_WINDOW = WINDOWS[IS_DEMO ? 1 : 0].sec; // demo: 60s · live: 1H

const TRAIL_LEN = 160;

export type Screen = "boot" | "console";

export interface ResultToast {
  roundId: string;
  status: "WON" | "LOST" | "VOID";
  asset: Asset;
  delta: number; // net change to balance from this round
  streak: number;
}

interface GameState {
  screen: Screen;
  booted: boolean;

  asset: Asset;
  windowSec: number;
  stake: number;

  balance: number;
  prices: Record<Asset, number>;
  trail: Record<Asset, number[]>;

  rounds: Round[];
  streak: number;
  bestStreak: number;
  result: ResultToast | null;
  placing: boolean;
  error: string | null;
  menuOpen: boolean;

  boot: () => void;
  enterConsole: () => void;
  goHome: () => void;
  openMenu: () => void;
  closeMenu: () => void;
  setAsset: (a: Asset) => void;
  cycleAsset: (dir: 1 | -1) => void;
  cycleWindow: (dir: 1 | -1) => void;
  /** nudge the stake by whole dollars (one scroll unit = 1) */
  nudgeStake: (dollars: number) => void;
  call: (d: Direction) => Promise<void>;
  clearResult: () => void;
  clearError: () => void;
}

const scored = new Set<string>();

export const useGame = create<GameState>((set, get) => ({
  screen: "boot",
  booted: false,

  asset: "BTC",
  windowSec: DEFAULT_WINDOW,
  stake: STAKE_DEFAULT,

  balance: 0,
  prices: { BTC: 0, ETH: 0 },
  trail: { BTC: [], ETH: [] },

  rounds: [],
  streak: 0,
  bestStreak: 0,
  result: null,
  placing: false,
  error: null,
  menuOpen: false,

  boot: () => {
    if (get().booted) return;
    const m = markets();
    m.start();

    m.subscribePrice((q) => {
      set((s) => {
        const trail = [...s.trail[q.asset], q.price].slice(-TRAIL_LEN);
        return {
          prices: { ...s.prices, [q.asset]: q.price },
          trail: { ...s.trail, [q.asset]: trail },
        };
      });
    });

    m.subscribeBalance((balance) => set({ balance }));

    m.subscribeRounds((rounds) => {
      // score any freshly settled rounds oldest-first
      const settled = [...rounds]
        .filter((r) => r.status !== "OPEN" && !scored.has(r.id))
        .sort((a, b) => a.expiresAt - b.expiresAt);

      if (settled.length) {
        set((s) => {
          let streak = s.streak;
          let best = s.bestStreak;
          let toast: ResultToast | null = s.result;
          for (const r of settled) {
            scored.add(r.id);
            if (r.status === "WON") streak += 1;
            else if (r.status === "LOST") streak = 0;
            best = Math.max(best, streak);
            const delta =
              r.status === "WON" ? r.payout - r.stake : r.status === "VOID" ? 0 : -r.stake;
            toast = {
              roundId: r.id,
              status: r.status as ResultToast["status"],
              asset: r.asset,
              delta,
              streak,
            };
          }
          return { streak, bestStreak: best, result: toast };
        });
      }
      set({ rounds });
    });

    set({ booted: true });
  },

  enterConsole: () => set({ screen: "console" }),

  goHome: () => set({ screen: "boot", menuOpen: false }),

  openMenu: () => set({ menuOpen: true }),
  closeMenu: () => set({ menuOpen: false }),

  setAsset: (asset) => set({ asset }),

  cycleAsset: (dir) =>
    set((s) => {
      const list = markets().assets;
      const i = list.indexOf(s.asset);
      const next = (i + dir + list.length) % list.length;
      return { asset: list[next] };
    }),

  cycleWindow: (dir) =>
    set((s) => {
      const i = WINDOWS.findIndex((w) => w.sec === s.windowSec);
      const next = (i + dir + WINDOWS.length) % WINDOWS.length;
      return { windowSec: WINDOWS[next].sec };
    }),

  nudgeStake: (dollars) =>
    set((s) => ({ stake: clamp(Math.round(s.stake + dollars), STAKE_MIN, STAKE_MAX) })),

  call: async (direction) => {
    const s = get();
    if (s.placing) return;
    if (s.stake > s.balance) {
      set({ error: "Not enough balance for that stake" });
      return;
    }
    set({ placing: true, error: null });
    try {
      await markets().placeRound({
        asset: s.asset,
        direction,
        stake: s.stake,
        windowSec: s.windowSec,
        multiplier: multiplierForStreak(s.streak),
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Could not place round" });
    } finally {
      set({ placing: false });
    }
  },

  clearResult: () => set({ result: null }),
  clearError: () => set({ error: null }),
}));
