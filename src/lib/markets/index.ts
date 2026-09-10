import { DemoMarkets } from "./demo";
import { LiveMarkets } from "./live";
import type { MarketsAdapter } from "./types";

export * from "./types";

export type Mode = "demo" | "live";

const MODE_KEY = "blip.mode.v1";

function initialMode(): Mode {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved === "demo" || saved === "live") return saved;
  } catch {
    /* ignore */
  }
  return import.meta.env.VITE_DEMO_MODE === "false" ? "live" : "demo";
}

const MODE: Mode = initialMode();

let instance: MarketsAdapter | null = null;

export function markets(): MarketsAdapter {
  if (!instance) instance = MODE === "demo" ? new DemoMarkets() : new LiveMarkets();
  return instance;
}

export const IS_DEMO = MODE === "demo";
export const CURRENT_MODE: Mode = MODE;

/** switch mode — persists and reloads (simplest reliable swap) */
export function setMode(next: Mode) {
  if (next === MODE) return;
  try {
    localStorage.setItem(MODE_KEY, next);
  } catch {
    /* ignore */
  }
  location.reload();
}
