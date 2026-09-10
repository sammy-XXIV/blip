export type Asset = "BTC" | "ETH";
export type Direction = "UP" | "DOWN";
export type RoundStatus = "OPEN" | "WON" | "LOST" | "VOID";

export interface Quote {
  asset: Asset;
  price: number;
  /** epoch ms */
  ts: number;
}

export interface Round {
  id: string;
  asset: Asset;
  direction: Direction;
  /** stake in collateral units (tUSDC = USD) */
  stake: number;
  entryPrice: number;
  settlePrice?: number;
  /** total returned to the player on a win, stake included */
  payout: number;
  multiplier: number;
  openedAt: number;
  expiresAt: number;
  status: RoundStatus;
  txHash?: string;
}

export interface PlaceRoundInput {
  asset: Asset;
  direction: Direction;
  stake: number;
  windowSec: number;
  multiplier: number;
}

/**
 * The only surface the game talks to. `demo` fakes everything locally;
 * `live` will wrap @somnia-chain/markets-sdk (mintSet -> placeOrder -> redeem,
 * see _ref/typescript/src). Swapped by VITE_DEMO_MODE.
 */
export interface MarketsAdapter {
  readonly mode: "demo" | "live";
  readonly assets: Asset[];

  /** latest known price, if any */
  lastQuote(asset: Asset): Quote | undefined;
  /** push price ticks; returns an unsubscribe */
  subscribePrice(cb: (q: Quote) => void): () => void;

  getBalance(): Promise<number>;
  /** push balance changes; returns an unsubscribe */
  subscribeBalance(cb: (balance: number) => void): () => void;

  placeRound(input: PlaceRoundInput): Promise<Round>;
  /** full current round list, newest first; fires on every change */
  subscribeRounds(cb: (rounds: Round[]) => void): () => void;

  start(): void;
  stop(): void;

  /** live only — mint test collateral (tUSDC) to the play wallet */
  faucet?(): Promise<void>;
}
