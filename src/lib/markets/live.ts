import { SomniaMarkets, probabilityToPrice } from "@somnia-chain/markets-sdk";
import { burner, burnerReady } from "../wallet";
import { ADDRESSES, CHAIN, INDEXER_URL, ONE, PRICE_FEED, WS_RPC } from "../somnia";
import type {
  Asset,
  MarketKind,
  MarketsAdapter,
  PlaceRoundInput,
  Quote,
  Round,
} from "./types";

const STRIKE_SCALE = 100; // market `strike` is the price in cents

const ASSETS: Asset[] = ["BTC", "ETH"];
const PRICE_MS = 1500;
const BALANCE_MS = 4000;
const RESOLVE_MS = 3000;
const ROUNDS_KEY = "blip.live.rounds.v1";

type Hex = `0x${string}`;

interface TrackedRound extends Round {
  marketId: Hex;
  pool: Hex;
  outcomeIdx: 0 | 1; // 0 = YES/UP, 1 = NO/DOWN
  /** outcome tokens held on the called side, raw units (bigint as string) */
  heldRaw: string;
  redeemed?: boolean;
}

function loadRounds(): TrackedRound[] {
  try {
    const raw = localStorage.getItem(ROUNDS_KEY);
    if (raw) return JSON.parse(raw) as TrackedRound[];
  } catch {
    /* ignore */
  }
  return [];
}

export class LiveMarkets implements MarketsAdapter {
  readonly mode = "live" as const;
  readonly assets = ASSETS;

  private ex: SomniaMarkets;
  private prices: Partial<Record<Asset, number>> = {};
  private balance = 0;
  private rounds: TrackedRound[] = loadRounds();

  private priceSubs = new Set<(q: Quote) => void>();
  private balanceSubs = new Set<(b: number) => void>();
  private roundSubs = new Set<(r: Round[]) => void>();

  private timers: ReturnType<typeof setInterval>[] = [];
  private signerReady = false;

  constructor() {
    // reads work without a signer; the play key is attached once available
    this.ex = new SomniaMarkets({
      chain: CHAIN,
      addresses: ADDRESSES,
      wsRpcUrl: WS_RPC,
      indexerUrl: INDEXER_URL,
      priceFeed: PRICE_FEED,
    });
    if (burnerReady()) {
      try {
        this.useKey(burner().privateKey);
      } catch {
        /* Privy mode, not authorized yet */
      }
    }
  }

  /** attach the play wallet's key (from cache or a Privy login signature) */
  useKey(pk: Hex) {
    this.ex.setSigner({ privateKey: pk });
    this.signerReady = true;
    void this.pollBalance();
  }

  private requireSigner() {
    if (!this.signerReady) throw new Error("Sign in to your play wallet first");
  }

  // --- lifecycle ---------------------------------------------------------

  start() {
    if (this.timers.length) return;
    void this.pollPrices();
    void this.pollBalance();
    this.timers.push(
      setInterval(() => void this.pollPrices(), PRICE_MS),
      setInterval(() => void this.pollBalance(), BALANCE_MS),
      setInterval(() => void this.pollResolutions(), RESOLVE_MS),
    );
  }

  stop() {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }

  // --- reads -----------------------------------------------------------

  lastQuote(asset: Asset): Quote | undefined {
    const p = this.prices[asset];
    return p ? { asset, price: p, ts: Date.now() } : undefined;
  }

  subscribePrice(cb: (q: Quote) => void) {
    this.priceSubs.add(cb);
    for (const a of ASSETS) {
      const q = this.lastQuote(a);
      if (q) cb(q);
    }
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
    await this.pollBalance();
    return this.balance;
  }

  async faucet() {
    this.requireSigner();
    await this.ex.trader.faucet();
    await this.pollBalance();
  }

  // --- write: place a round -------------------------------------------

  async placeRound(input: PlaceRoundInput): Promise<Round> {
    this.requireSigner();
    const { game, market, asset, direction, stake, windowSec } = input;
    const entryPrice = this.prices[asset];
    if (!entryPrice) throw new Error("No price yet — hold on");
    if (stake > this.balance) throw new Error("Fund the wallet first");

    const picked = await this.pickMarket(asset, windowSec, market);
    if (!picked) {
      throw new Error(
        market === "strike"
          ? `No MOONSHOT ${asset} market open — try CALL`
          : `No live ${asset} market open right now`,
      );
    }
    const { id: marketId, strike } = picked;

    const mo = await this.ex.client.getMarketOnchain(marketId);
    if (mo.finalized || mo.status !== 1) {
      throw new Error("Market just locked — try again");
    }
    const pool = mo.pool;
    // MOONSHOT: strike the market resolves against (YES = settle >= strike)
    const strikePrice = market === "strike" && strike ? strike : undefined;

    // UP / LONG buys YES ("above"); DOWN / SHORT buys NO ("below")
    const outcomeIdx: 0 | 1 = direction === "UP" ? 0 : 1;
    const side = direction === "UP" ? "BUY_YES" : "BUY_NO";

    // One real Event Contract position: buy the called outcome straight off the
    // book (IOC). At cap 0.99 the max spend is ~stake; each token pays 1
    // collateral if it wins. Two opposite-side buyers cross via a pool mint, so
    // this fills whenever the other side has any interest — retry a few times
    // since the 60s book refreshes constantly. Quantity lands on the lot grid.
    const LOT = 1000n;
    let qtyRaw = (BigInt(Math.round((stake / 0.99) * Number(ONE))) / LOT) * LOT;
    if (qtyRaw < LOT) qtyRaw = LOT;

    let heldRaw = 0n;
    let costRaw = 0n;
    for (let attempt = 0; attempt < 4 && heldRaw === 0n; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 1300));
      try {
        const res = await this.ex.trader.placeOrder({
          pool,
          side,
          price: probabilityToPrice(0.99),
          quantity: qtyRaw,
          orderType: 2, // IOC
        });
        for (const f of res.fills ?? []) {
          heldRaw += BigInt(f.quantityFilled);
          costRaw += (BigInt(f.quantityFilled) * BigInt(f.fillPrice)) / ONE;
        }
      } catch (e) {
        // an IOC that crosses nothing reverts — retry; anything else is real
        if (!/no ?fill|ImmediateOrCancel/i.test(String((e as Error)?.message ?? e))) throw e;
      }
    }
    if (heldRaw === 0n) {
      throw new Error(
        direction === "UP"
          ? "No taker right now — try again in a moment"
          : "The DOWN side is quiet — try again, or call UP",
      );
    }

    const held = Number(heldRaw) / Number(ONE);
    const cost = Number(costRaw) / Number(ONE);
    const multiplier = Math.round((held / cost) * 100) / 100;

    const now = Date.now();
    const round: TrackedRound = {
      id: `l${now.toString(36)}`,
      game,
      asset,
      direction,
      stake: Math.round(cost * 100) / 100, // what actually got risked
      entryPrice,
      strikePrice,
      payout: Math.round(held * 100) / 100,
      multiplier,
      openedAt: now,
      expiresAt: Number(mo.expiry) * 1000,
      status: "OPEN",
      marketId,
      pool,
      outcomeIdx,
      heldRaw: heldRaw.toString(),
    };

    this.setBalance(this.balance - cost); // optimistic; the poll corrects it
    this.rounds = [round, ...this.rounds].slice(0, 40);
    this.persist();
    this.emitRounds();
    return round;
  }

  /** Real on-chain exit: sell the held outcome tokens back to the book (IOC). */
  async cashOut(roundId: string): Promise<void> {
    this.requireSigner();
    const r = this.rounds.find((x) => x.id === roundId);
    if (!r || r.status !== "OPEN") throw new Error("Nothing to cash out");

    const mo = await this.ex.client.getMarketOnchain(r.marketId);
    if (mo.finalized || mo.status !== 1) throw new Error("Too late — the round is settling");

    const sellSide = r.outcomeIdx === 0 ? "SELL_YES" : "SELL_NO";
    const heldRaw = BigInt(r.heldRaw);
    let proceedsRaw = 0n;
    let soldRaw = 0n;
    for (let attempt = 0; attempt < 3 && soldRaw === 0n; attempt++) {
      if (attempt) await new Promise((res) => setTimeout(res, 1200));
      try {
        const res = await this.ex.trader.placeOrder({
          pool: r.pool,
          side: sellSide,
          price: probabilityToPrice(0.01), // floor — take whatever bid exists
          quantity: heldRaw,
          orderType: 2, // IOC
        });
        for (const f of res.fills ?? []) {
          soldRaw += BigInt(f.quantityFilled);
          proceedsRaw += (BigInt(f.quantityFilled) * BigInt(f.fillPrice)) / ONE;
        }
      } catch (e) {
        if (!/no ?fill|ImmediateOrCancel/i.test(String((e as Error)?.message ?? e))) throw e;
      }
    }
    if (soldRaw === 0n) throw new Error("No bid to cash out into — ride it to the buzzer");

    r.status = "CASHED";
    r.settlePrice = this.prices[r.asset];
    r.payout = Math.round((Number(proceedsRaw) / Number(ONE)) * 100) / 100;
    r.redeemed = true; // nothing left to redeem
    this.persist();
    this.emitRounds();
    void this.pollBalance();
  }

  // --- internals -----------------------------------------------------

  /** best live market for this asset / window / kind, plus its strike (0 = up/down) */
  private async pickMarket(
    asset: Asset,
    windowSec: number,
    kind: MarketKind,
  ): Promise<{ id: Hex; strike: number } | undefined> {
    const live: Array<Record<string, unknown>> = await this.ex.client
      .listLiveBinaryMarkets({ asset })
      .then((r) => r as unknown as Array<Record<string, unknown>>)
      .catch(() => []);
    const now = Math.floor(Date.now() / 1000);

    const num = (v: unknown) => Number(v ?? 0);
    const idOf = (m: Record<string, unknown>) =>
      (m.marketId ?? m.id ?? m.market ?? "") as string;
    const intervalOf = (m: Record<string, unknown>) =>
      num(m.intervalSec ?? m.interval ?? m.windowSec);
    const isStrike = (m: Record<string, unknown>) => String(m.strike ?? "0") !== "0";

    const usable = live
      .filter(
        (m) =>
          String(m.asset ?? "").toUpperCase() === asset &&
          num(m.expiry) > now + 15 &&
          !!idOf(m) &&
          isStrike(m) === (kind === "strike"),
      )
      .sort(
        (a, b) =>
          Math.abs(intervalOf(a) - windowSec) - Math.abs(intervalOf(b) - windowSec) ||
          num(a.expiry) - num(b.expiry),
      );

    // prefer an exact-cadence market; fall back to the nearest
    const pick = usable.find((m) => intervalOf(m) === windowSec) ?? usable[0];
    if (!pick) return undefined;
    const id = idOf(pick);
    return id ? { id: id as Hex, strike: num(pick.strike) / STRIKE_SCALE } : undefined;
  }

  private async pollPrices() {
    await Promise.all(
      ASSETS.map(async (a) => {
        try {
          const lp = await this.ex.client.fetchPrice(a);
          if (lp && lp.price > 0) {
            this.prices[a] = lp.price;
            const q: Quote = { asset: a, price: lp.price, ts: Date.now() };
            for (const cb of this.priceSubs) cb(q);
          }
        } catch {
          /* transient */
        }
      }),
    );
  }

  private async pollBalance() {
    try {
      const f = await burner().funds();
      this.setBalance(Math.round(f.usdc * 100) / 100);
    } catch {
      /* transient */
    }
  }

  private async pollResolutions() {
    const open = this.rounds.filter((r) => r.status === "OPEN");
    if (!open.length) return;
    let changed = false;

    for (const r of open) {
      try {
        const mo = await this.ex.client.getMarketOnchain(r.marketId);
        if (!mo.finalized && !mo.isResolved && !mo.isVoided) continue;

        if (mo.isVoided) {
          r.status = "VOID";
          r.settlePrice = this.prices[r.asset];
        } else {
          const winning = (Number(mo.winningOutcome) === 1 ? 1 : 0) as 0 | 1; // 0 = UP, 1 = DOWN
          r.status = winning === r.outcomeIdx ? "WON" : "LOST";
          r.settlePrice = this.prices[r.asset];
          if (r.status === "WON" && !r.redeemed) {
            r.redeemed = true;
            this.ex.trader
              .redeem({ marketId: r.marketId, amount: BigInt(r.heldRaw), outcomeIdx: winning })
              .catch(() => {
                r.redeemed = false; // retry next tick
              });
          }
        }
        changed = true;
      } catch {
        /* transient */
      }
    }

    if (changed) {
      this.persist();
      this.emitRounds();
      void this.pollBalance();
    }
  }

  private setBalance(v: number) {
    if (v === this.balance) return;
    this.balance = v;
    for (const cb of this.balanceSubs) cb(v);
  }

  private emitRounds() {
    const snap = this.rounds.map((r) => ({ ...r }));
    for (const cb of this.roundSubs) cb(snap);
  }

  private persist() {
    try {
      localStorage.setItem(ROUNDS_KEY, JSON.stringify(this.rounds));
    } catch {
      /* ignore */
    }
  }
}
