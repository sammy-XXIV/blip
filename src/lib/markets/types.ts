export type Asset = "BTC" | "ETH";
export type Direction = "UP" | "DOWN";
export type RoundStatus = "OPEN" | "WON" | "LOST" | "VOID" | "CASHED";
export type GameId = "call" | "lucky" | "moonshot";
/** which DreamDEX binary market the round trades */
export type MarketKind = "updown" | "strike";

export interface Quote {
  asset: Asset;
  price: number;
  /** epoch ms */
  ts: number;
}

export interface Round {
  id: string;
  game: GameId;
  asset: Asset;
  direction: Direction;
  /** stake in collateral units (tUSDC = USD) */
  stake: number;
  entryPrice: number;
  /** MOONSHOT only — the strike the market resolves against */
  strikePrice?: number;
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
  game: GameId;
  market: MarketKind;
  asset: Asset;
  direction: Direction;
  stake: number;
  windowSec: number;
  multiplier: number;
  /** MOONSHOT: target multiplier — picks which fixed-strike market to take */
  aim?: number;
}

/**
 * The only surface the game talks to. Backed entirely by
 * @somnia-chain/markets-sdk — real prices (client.fetchPrice), real orders
 * (placeOrder -> redeem), real settlement on DreamDEX Event Contracts.
 */
export interface MarketsAdapter {
  readonly mode: "live";
  readonly assets: Asset[];

  /** latest known price, if any */
  lastQuote(asset: Asset): Quote | undefined;
  /** push price ticks; returns an unsubscribe */
  subscribePrice(cb: (q: Quote) => void): () => void;

  getBalance(): Promise<number>;
  /** push balance changes; returns an unsubscribe */
  subscribeBalance(cb: (balance: number) => void): () => void;

  placeRound(input: PlaceRoundInput): Promise<Round>;
  /** exit an open round early for its live mark value */
  cashOut(roundId: string): Promise<void>;
  /** full current round list, newest first; fires on every change */
  subscribeRounds(cb: (rounds: Round[]) => void): () => void;

  start(): void;
  stop(): void;

  /** live only — mint test collateral (tUSDC) to the play wallet */
  faucet?(): Promise<void>;
}
