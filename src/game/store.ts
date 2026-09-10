import { create } from "zustand";
import { markets, type Asset, type Direction, type Round } from "../lib/markets";
import { sfx } from "../lib/sound";
import {
  GAMES,
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
  status: "WON" | "LOST" | "VOID" | "CASHED";
  asset: Asset;
  delta: number; // net change to balance from this round
  streak: number;
}

const fxOn = (() => {
  try {
    return localStorage.getItem("blip.fx") !== "0";
  } catch {
    return true;
  }
})();

interface GameState {
  screen: Screen;
  booted: boolean;

  game: GameId;
  selectIdx: number;
  pendingDir: Direction;
  /** MOONSHOT: target multiplier you're aiming for (further = harder) */
  aim: number;

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
  cashing: boolean;
  error: string | null;
  menuOpen: boolean;
  howtoOpen: boolean;
  screenFx: boolean;

  boot: () => void;
  enterSelect: () => void;
  moveSelect: (dir: 1 | -1) => void;
  pickGame: () => void;
  backToSelect: () => void;
  goHome: () => void;
  openMenu: () => void;
  closeMenu: () => void;
  toggleHowto: () => void;
  toggleScreenFx: () => void;
  setAsset: (a: Asset) => void;
  cycleAsset: (dir: 1 | -1) => void;
  setPending: (d: Direction) => void;
  setAim: (v: number) => void;
  setStake: (v: number) => void;
  /** nudge the stake by whole dollars (one scroll unit = 1) */
  nudgeStake: (dollars: number) => void;
  /** fire the current game with the pending choice */
  fire: () => Promise<void>;
  /** exit the open round for the current game early */
  cashOut: () => Promise<void>;
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
  aim: 3,

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
  cashing: false,
  error: null,
  menuOpen: false,
  howtoOpen: false,
  screenFx: fxOn,

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
              r.status === "WON" || r.status === "CASHED"
                ? r.payout - r.stake
                : r.status === "VOID"
                  ? 0
                  : -r.stake;
            toast = {
              roundId: r.id,
              status: r.status as ResultToast["status"],
              asset: r.asset,
              delta,
              streak,
            };
          }
          if (toast) sfx(toast.status === "WON" ? "win" : toast.status === "LOST" ? "lose" : "void");
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
  toggleHowto: () => set((s) => ({ howtoOpen: !s.howtoOpen })),
  toggleScreenFx: () =>
    set((s) => {
      const next = !s.screenFx;
      try {
        localStorage.setItem("blip.fx", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return { screenFx: next };
    }),

  setAsset: (asset) => set({ asset }),

  cycleAsset: (dir) =>
    set((s) => {
      const list = markets().assets;
      const i = list.indexOf(s.asset);
      const next = (i + dir + list.length) % list.length;
      return { asset: list[next] };
    }),

  setPending: (d) => set({ pendingDir: d }),
  setAim: (v) => set({ aim: clamp(Math.round(v * 2) / 2, 2, 10) }),
  setStake: (v) => set({ stake: clamp(Math.round(v), STAKE_MIN, STAKE_MAX) }),

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
      s.game === "moonshot" ? s.aim : multiplierForStreak(s.streak);

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
        aim: s.aim,
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Could not place round" });
    } finally {
      set({ placing: false });
    }
  },

  cashOut: async () => {
    const s = get();
    if (s.cashing) return;
    const lead = s.rounds.find(
      (r) => r.status === "OPEN" && r.game === s.game && r.asset === s.asset,
    );
    if (!lead) return;
    set({ cashing: true, error: null });
    try {
      await markets().cashOut(lead.id);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Could not cash out" });
    } finally {
      set({ cashing: false });
    }
  },

  clearResult: () => set({ result: null }),
  clearError: () => set({ error: null }),
}));
