import { LiveMarkets } from "./live";
import type { MarketsAdapter } from "./types";

export * from "./types";

export type Mode = "live";

let instance: MarketsAdapter | null = null;

/** the one and only adapter — every price, round and settlement is real DreamDEX */
export function markets(): MarketsAdapter {
  if (!instance) instance = new LiveMarkets();
  return instance;
}

export const IS_DEMO = false;
export const CURRENT_MODE: Mode = "live";
