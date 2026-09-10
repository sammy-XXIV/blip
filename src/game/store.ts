import { create } from "zustand";
import { markets, type Asset, type Direction, type Round } from "../lib/markets";
import {
  GAMES,
  MOONSHOT_MULTIPLIER,
  gameById,
  multiplierForStreak,
  STAKE_DEFAULT,
  STAKE_MAX,
  STAKE_MIN,
  WINDOW_SEC,
  type GameId,
} from "./config";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const TRAIL_LEN = 160;

export type Screen = "boot" | "select" | "play";

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

  game: GameId;
  selectIdx: number;
  pendingDir: Direction;

  asset: Asset;
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
  enterSelect: () => void;
  moveSelect: (dir: 1 | -1) => void;
  pickGame: () => void;
  backToSelect: () => void;
  goHome: () => void;
  openMenu: () => void;
  closeMenu: () => void;
  setAsset: (a: Asset) => void;
  cycleAsset: (dir: 1 | -1) => void;
  setPending: (d: Direction) => void;
  /** nudge the stake by whole dollars (one scroll unit = 1) */
  nudgeStake: (dollars: number) => void;
  /** fire the current game with the pending choice */
  fire: () => Promise<void>;
  clearResult: () => void;
  clearError: () => void;
}

const scored = new Set<string>();

export const useGame = create<GameState>((set, get) => ({
  screen: "boot",
  booted: false,

  game: "call",
  selectIdx: 0,
  pendingDir: "UP",

  asset: "BTC",
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

  enterSelect: () => set({ screen: "select", menuOpen: false }),

  moveSelect: (dir) =>
    set((s) => ({ selectIdx: (s.selectIdx + dir + GAMES.length) % GAMES.length })),

  pickGame: () =>
    set((s) => ({ screen: "play", game: GAMES[s.selectIdx].id, pendingDir: "UP", error: null })),

  backToSelect: () => set({ screen: "select", menuOpen: false }),

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

  setPending: (d) => set({ pendingDir: d }),

  nudgeStake: (dollars) =>
    set((s) => ({ stake: clamp(Math.round(s.stake + dollars), STAKE_MIN, STAKE_MAX) })),

  fire: async () => {
    const s = get();
    if (s.placing) return;
    if (s.stake > s.balance) {
      set({ error: "Not enough balance for that stake" });
      return;
    }
    const g = gameById(s.game);
    const direction: Direction =
      s.game === "lucky" ? (Math.random() < 0.5 ? "UP" : "DOWN") : s.pendingDir;
    const multiplier =
      s.game === "moonshot" ? MOONSHOT_MULTIPLIER : multiplierForStreak(s.streak);

    set({ placing: true, error: null });
    try {
      await markets().placeRound({
        game: s.game,
        market: g.market,
        asset: s.asset,
        direction,
        stake: s.stake,
        windowSec: WINDOW_SEC,
        multiplier,
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
