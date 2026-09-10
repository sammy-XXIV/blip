/** Blip is a one-cadence game: every round is a 60-second call. */
export const WINDOW_SEC = 60;
export const WINDOW_LABEL = "60S";

export type GameId = "call" | "lucky" | "moonshot";

export interface GameDef {
  id: GameId;
  no: string;
  name: string;
  blurb: string;
  /** which DreamDEX market this game trades */
  market: "updown" | "strike";
  howto: string[];
}

export const GAMES: GameDef[] = [
  {
    id: "call",
    no: "01",
    name: "CALL",
    blurb: "Up or down. Sixty seconds.",
    market: "updown",
    howto: [
      "Set ▲ UP or ▼ DOWN with the pads.",
      "Turn the knob for your stake.",
      "Hold the orange button to fire.",
      "Win if the 60s market closes your way.",
      "Cash out any time before the buzzer.",
    ],
  },
  {
    id: "lucky",
    no: "02",
    name: "LUCKY",
    blurb: "One tap. We pick the side.",
    market: "updown",
    howto: [
      "No calling — the console flips the coin.",
      "Set your stake, hold to SPIN.",
      "Same 60s up/down market as CALL.",
      "Streak still counts. Cash out still works.",
    ],
  },
  {
    id: "moonshot",
    no: "03",
    name: "MOONSHOT",
    blurb: "Clear the line, not just the direction.",
    market: "strike",
    howto: [
      "▲ LONG / ▼ SHORT with the pads.",
      "Knob is AIM — higher x sets the line further out.",
      "You must clear the line, not just be on the right side.",
      "Trades a real fixed-strike market on DreamDEX.",
      "Bigger reach, bigger payout.",
    ],
  },
];

export const gameById = (id: GameId) => GAMES.find((g) => g.id === id)!;

/** MOONSHOT has to pass a strike, not just be on the right side — pays more. */
export const MOONSHOT_MULTIPLIER = 2.4;

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
