# BLIP

**A gamified trading console for DreamDEX Event Contracts on Somnia.**

Blip turns prediction-market trading into a one-handed arcade game. A handheld
console — two big context pads, an orange action button, a knurled stake wheel
you flick, a pixel screen — and three 60-second games over real
[DreamDEX Event Contracts](https://docs.dreamdex.io/developers/event-contracts).
Call it right, keep the streak, streak bumps your multiplier.

Live demo: **https://blip-6wc.pages.dev/** · Built for the **Somnia × DreamDEX
Event Contracts Hackathon**.

---

## The games

Boot → **game select** (PREV / NEXT on the pads, orange button to play) → play.
Every round is **60 seconds**.

| # | Game | What you do | DreamDEX market |
|---|---|---|---|
| 01 | **CALL** | Set ▲ UP / ▼ DOWN, hit FIRE | up/down (reference) binary |
| 02 | **LUCKY** | One tap — the console flips the coin | up/down (reference) binary |
| 03 | **MOONSHOT** | ▲ LONG / ▼ SHORT — clear the *strike*, not just the direction. The line is drawn on the chart. | **fixed-strike** binary |

MOONSHOT pays more because you have to pass a price level, not just be on the
right side.

---

## Two modes

| | **Demo** | **Live** |
|---|---|---|
| Wallet | none | browser-local "play wallet" (burner) |
| Money | play money, simulated price | testnet tUSDC on Somnia Shannon |
| Settlement | instant, local | **on-chain by DreamDEX**; winners auto-redeemed |

Demo is the UX showcase. Live proves it's real — switch with **MENU → DEMO / LIVE**.

### How live mode uses Event Contracts

1. **Play wallet.** First load generates a throwaway keypair in the browser
   (`localStorage`). Fund it once — a little STT for gas, then the SDK's
   `trader.faucet()` mints test tUSDC. After that every trade signs itself:
   **no wallet popups**, so the game stays tap-and-go.
2. **Fire.** Blip discovers the live 60s market for the asset and kind
   (`listLiveBinaryMarkets` — filtered by `strike == 0` for CALL/LUCKY, `strike != 0`
   for MOONSHOT), gates on `getMarketOnchain` status, then places one real
   `placeOrder` (IOC) — `BUY_YES` for UP/LONG, `BUY_NO` for DOWN/SHORT. The
   position is genuine Event Contract outcome tokens; multiplier = 1 / fill price.
3. **Settle.** Blip polls `getMarketOnchain` for every open round. DreamDEX
   settles the contract on-chain at expiry; Blip reads `winningOutcome`, marks
   the round, and **auto-redeems the winning side** — you never claim manually.
4. Open positions survive a refresh (persisted by `marketId`).

Verified end-to-end on Shannon (`scripts/live-check.mjs`): CALL and MOONSHOT
both discover → buy → settle → redeem with real balance movement.

### Notes / limits

- **Cadence.** DreamDEX's floor is `MIN_SERIES_INTERVAL_SEC = 60`; Shannon runs
  live 60s BTC/ETH series, so Blip is one cadence, no config. Sub-60s isn't
  possible on the protocol.
- **DOWN / SHORT liquidity.** `BUY_NO` needs a taker on the YES side; on testnet
  that book can be thin. Blip retries the IOC a few times and surfaces an honest
  error if it still can't cross. UP / LONG fills reliably.

---

## Stack

- **React 19 + TypeScript + Vite**, **zustand** for game state
- **`@somnia-chain/markets-sdk` + viem** for the on-chain layer
- Procedural Web Audio SFX — no assets
- No backend. The burner-wallet model keeps it fully client-side.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173  (demo mode by default)
npm run build      # typecheck + production bundle -> dist/
npm run deploy     # build + wrangler pages deploy
```

Live mode locally: `VITE_DEMO_MODE=false` in `.env.local`, or just toggle in the
MENU. It needs a funded play wallet — the boot screen walks the faucet steps.

`scripts/live-check.mjs` runs the full live flow headless (needs `BLIP_TEST_PK`
in `.env.local` with a Shannon address holding a little STT):

```bash
node scripts/live-check.mjs BTC 3 UP            # CALL
node scripts/live-check.mjs BTC 3 LONG moonshot # MOONSHOT
```

## Env

`.env` — Somnia Shannon defaults pre-filled:

```
VITE_RPC_URL=https://dream-rpc.somnia.network
VITE_WS_RPC_URL=wss://api.infra.testnet.somnia.network/ws
VITE_INDEXER_URL=https://dev.smk.somnia.host/v1/graphql
VITE_DEMO_MODE=true
```

## Layout

```
src/
  game/        store (zustand), game defs + round config, formatting
  lib/
    markets/   adapter interface + demo + live (DreamDEX) implementations
    wallet.ts  browser-local burner "play wallet"
    somnia.ts  chain / RPC / address constants
    sound.ts   procedural Web Audio SFX
  components/  Deck (context pads, action button, wheel), StakeWheel, MenuOverlay
  screens/     BootScreen (title + fund gate), SelectScreen, GameScreen
scripts/
  live-check.mjs   headless end-to-end DreamDEX check
```
