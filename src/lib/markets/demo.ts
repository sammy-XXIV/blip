import type {
  Asset,
  MarketsAdapter,
  PlaceRoundInput,
  Quote,
  Round,
} from "./types";

const ASSETS: Asset[] = ["BTC", "ETH"];
const START_PRICE: Record<Asset, number> = { BTC: 64000, ETH: 3200 };
/** annualised-ish vol knobs, tuned for a lively 60s scope, not realism */
const DRIFT_PER_TICK = 0.00002;
const VOL_PER_TICK: Record<Asset, number> = { BTC: 0.00085, ETH: 0.0011 };
const TICK_MS = 250;
const STARTING_BALANCE = 2500;

const STORAGE_KEY = "blip.demo.v1";

type Persisted = { balance: number; prices: Record<Asset, number> };

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Persisted;
      if (typeof p.balance === "number" && p.prices) return p;
    }
  } catch {
    /* ignore */
  }
  return { balance: STARTING_BALANCE, prices: { ...START_PRICE } };
}

/** Box–Muller standard normal */
function randn(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export class DemoMarkets implements MarketsAdapter {
  readonly mode = "demo" as const;
  readonly assets = ASSETS;

  private prices: Record<Asset, number>;
  private balance: number;
  private rounds: Round[] = [];

  private priceSubs = new Set<(q: Quote) => void>();
  private balanceSubs = new Set<(b: number) => void>();
  private roundSubs = new Set<(r: Round[]) => void>();

  private timer: ReturnType<typeof setInterval> | null = null;
  private seq = 0;

  constructor() {
    const p = loadPersisted();
    this.prices = p.prices;
    this.balance = p.balance;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
    // emit an immediate frame so the UI isn't blank
    for (const a of ASSETS) this.emitQuote(a);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  lastQuote(asset: Asset): Quote {
    return { asset, price: this.prices[asset], ts: Date.now() };
  }

  subscribePrice(cb: (q: Quote) => void) {
    this.priceSubs.add(cb);
    for (const a of ASSETS) cb(this.lastQuote(a));
    return () => this.priceSubs.delete(cb);
  }

  subscribeBalance(cb: (b: number) => void) {
    this.balanceSubs.add(cb);
    cb(this.balance);
    return () => this.balanceSubs.delete(cb);
  }

  subscribeRounds(cb: (r: Round[]) => void) {
    this.roundSubs.add(cb);
    cb(this.rounds);
    return () => this.roundSubs.delete(cb);
  }

  async getBalance() {
    return this.balance;
  }

  async placeRound(input: PlaceRoundInput): Promise<Round> {
    const { game, market, asset, direction, stake, windowSec, multiplier, aim } = input;
    if (stake <= 0) throw new Error("Stake must be positive");
    if (stake > this.balance) throw new Error("Insufficient demo balance");

    const now = Date.now();
    const entryPrice = this.prices[asset];
    // MOONSHOT: strike sits further out the higher you AIM (0.08% per x).
    const offset = 0.0008 * (aim ?? 3);
    const strikePrice =
      market === "strike"
        ? round0(entryPrice * (direction === "UP" ? 1 + offset : 1 - offset))
        : undefined;

    const round: Round = {
      id: `d${now.toString(36)}${(this.seq++).toString(36)}`,
      game,
      asset,
      direction,
      stake,
      entryPrice,
      strikePrice,
      payout: round0(stake * multiplier),
      multiplier,
      openedAt: now,
      expiresAt: now + windowSec * 1000,
      status: "OPEN",
      txHash: `0xdemo${Math.random().toString(16).slice(2, 10)}`,
    };

    this.setBalance(this.balance - stake);
    this.rounds = [round, ...this.rounds].slice(0, 40);
    this.emitRounds();
    return round;
  }

  // --- internals -----------------------------------------------------------

  private tick() {
    const now = Date.now();
    for (const a of ASSETS) {
      const shock = DRIFT_PER_TICK + VOL_PER_TICK[a] * randn();
      this.prices[a] = Math.max(1, this.prices[a] * (1 + shock));
      this.emitQuote(a);
    }
    this.resolveDue(now);
    this.persist();
  }

  private resolveDue(now: number) {
    let changed = false;
    for (const r of this.rounds) {
      if (r.status !== "OPEN" || now < r.expiresAt) continue;
      const settle = this.prices[r.asset];
      r.settlePrice = settle;

      let won: boolean | null;
      if (r.strikePrice != null) {
        // MOONSHOT — must clear the strike, not just be on the right side
        won = r.direction === "UP" ? settle >= r.strikePrice : settle <= r.strikePrice;
      } else {
        const moved = settle - r.entryPrice;
        won = moved === 0 ? null : (r.direction === "UP") === moved > 0;
      }

      if (won === null) {
        r.status = "VOID";
        this.setBalance(this.balance + r.stake);
      } else {
        r.status = won ? "WON" : "LOST";
        if (won) this.setBalance(this.balance + r.payout);
      }
      changed = true;
    }
    if (changed) this.emitRounds();
  }

  private emitQuote(asset: Asset) {
    const q = this.lastQuote(asset);
    for (const cb of this.priceSubs) cb(q);
  }

  private emitRounds() {
    const snapshot = [...this.rounds];
    for (const cb of this.roundSubs) cb(snapshot);
  }

  private setBalance(v: number) {
    this.balance = round2(v);
    for (const cb of this.balanceSubs) cb(this.balance);
  }

  private persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ balance: this.balance, prices: this.prices } satisfies Persisted),
      );
    } catch {
      /* ignore */
    }
  }
}

const round0 = (n: number) => Math.round(n * 100) / 100;
const round2 = (n: number) => Math.round(n * 100) / 100;
