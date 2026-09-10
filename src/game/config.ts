export interface Window {
  sec: number;
  label: string;
}

/** demo mode: fast arcade windows */
export const DEMO_WINDOWS: Window[] = [
  { sec: 30, label: "30S" },
  { sec: 60, label: "60S" },
  { sec: 120, label: "2M" },
];

/** live mode: the real DreamDEX Event Contract cadences on Shannon */
export const LIVE_WINDOWS: Window[] = [
  { sec: 3600, label: "1H" },
  { sec: 14400, label: "4H" },
  { sec: 86400, label: "1D" },
];

/** every window across modes — for label lookups that don't care which mode */
export const ALL_WINDOWS: Window[] = [...DEMO_WINDOWS, ...LIVE_WINDOWS];

/** stake is a free $ amount, scrolled one dollar at a time */
export const STAKE_MIN = 1;
export const STAKE_MAX = 999;
export const STAKE_DEFAULT = 25;

/** fixed-odds base: a win returns 1.9x the stake */
export const BASE_MULTIPLIER = 1.9;

/** each consecutive win adds this to your next round's multiplier ... */
export const STREAK_STEP = 0.05;
/** ... up to this cap */
export const STREAK_BONUS_CAP = 0.5;

export function multiplierForStreak(streak: number): number {
  const bonus = Math.min(streak * STREAK_STEP, STREAK_BONUS_CAP);
  return Math.round((BASE_MULTIPLIER + bonus) * 100) / 100;
}
