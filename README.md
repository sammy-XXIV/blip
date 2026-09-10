# BLIP

**A gamified trading console for DreamDEX Event Contracts on Somnia.**

Blip turns prediction-market trading into a one-handed arcade game. You get a
handheld console — two big call pads, a knurled stake wheel you flick, a pixel
screen — and you call which way BTC or ETH moves before the window lands. Win the
call, keep the streak, streak bumps your multiplier.

Built for the **Somnia × DreamDEX Event Contracts Hackathon**.

---

## Two modes

Every round is a **60-second call** — one cadence, no menus.

| | **Demo** | **Live** |
|---|---|---|
| Wallet | none | browser-local "play wallet" (burner) |
| Money | play money | testnet tUSDC on Somnia Shannon |
| Rounds | 60s, simulated price | 60s, real DreamDEX Event Contract markets |
| Settlement | instant, local | on-chain; winners **auto-redeemed** |

Demo is the arcade experience and the UX showcase. Live proves it's real:
every call in live mode is a genuine `mintSet` → `placeOrder` → on-chain
settlement → `redeem`, using `@somnia-chain/markets-sdk`.

Switch modes in-game: **MENU → DEMO / LIVE**.

---

## How live mode uses Event Contracts

1. **Play wallet.** On first load Blip generates a throwaway keypair in the
   browser (`localStorage`). You fund it once from the Somnia faucet + the SDK's
   `trader.faucet()` (test tUSDC). After that every trade signs itself — **no
   wallet popups** — so the game stays tap-and-go.
2. **Call.** Blip discovers the live 60-second binary market for the asset
   (`client.listLiveBinaryMarkets`), gates on its on-chain status
   (`getMarketOnchain`), then `mintSet`s your stake into Up + Down tokens and
   crosses the book toward your called side (`placeOrder`, IOC).
3. **Settle.** Blip polls `getMarketOnchain` for each open round. On resolution
   it marks the round Won/Lost from `winningOutcome` and **auto-redeems the
   winning side** — you never have to claim.
4. Open positions survive a refresh (persisted locally by `marketId`).

### One cadence: 60 seconds

DreamDEX's minimum series cadence is 60 seconds (`MIN_SERIES_INTERVAL_SEC = 60`),
and Shannon runs live 60s BTC/ETH series. That's Blip's whole game — a single
one-minute cadence in both modes, so there's nothing to configure. Sub-60s isn't
possible on the protocol.

---

## Stack

- **React 19 + TypeScript + Vite**
- **zustand** for game state
- **`@somnia-chain/markets-sdk` + viem** for the on-chain layer
- No backend. The burner-wallet model keeps it fully client-side.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173  (demo mode by default)
```

Live mode locally: set `VITE_DEMO_MODE=false` in `.env.local`, or just toggle in
the MENU. Live mode needs a funded play wallet — the boot screen walks you
through the faucet steps.

```bash
npm run build      # typecheck + production bundle → dist/
```

## Env

`.env` (Somnia Shannon defaults are pre-filled):

```
VITE_RPC_URL=https://dream-rpc.somnia.network
VITE_WS_RPC_URL=wss://api.infra.testnet.somnia.network/ws
VITE_INDEXER_URL=https://dev.smk.somnia.host/v1/graphql
VITE_DEMO_MODE=true
```

## Layout

```
src/
  game/        store (zustand), round config, formatting
  lib/
    markets/   adapter interface + demo + live (DreamDEX) implementations
    wallet.ts  browser-local burner "play wallet"
    somnia.ts  chain / RPC / address constants
  components/  Deck (pads, wheel, hw buttons), StakeWheel, MenuOverlay, ...
  screens/     BootScreen (title + live fund gate), ConsoleScreen (the game)
```
