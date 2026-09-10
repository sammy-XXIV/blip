// End-to-end check of Blip's DreamDEX Event Contracts integration on Shannon.
// Mirrors src/lib/markets/live.ts: discover 60s market -> BUY (IOC) -> wait for
// on-chain resolution -> redeem the winner.
//
//   node scripts/live-check.mjs
//
// Needs BLIP_TEST_PK in .env.local with a Shannon address holding a little STT
// (gas). It faucets its own tUSDC.

import { readFileSync } from "node:fs";
import { SomniaMarkets, probabilityToPrice } from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { SOMNIA_TESTNET_ADDRESSES, SOMNIA_TESTNET_PRICE_FEED } from "@somnia-chain/markets-sdk";
import { createPublicClient, http, formatEther, formatUnits, erc20Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const PK = env.BLIP_TEST_PK;
if (!PK) throw new Error("set BLIP_TEST_PK in .env.local");

const ONE = 1_000_000n;
const COLLATERAL = SOMNIA_TESTNET_ADDRESSES.testUsdc;
const ASSET = process.argv[2]?.toUpperCase() || "BTC";
const STAKE = Number(process.argv[3] || 2);
const SIDE = (process.argv[4] || "UP").toUpperCase(); // UP/LONG | DOWN/SHORT
const KIND = (process.argv[5] || "updown").toLowerCase(); // updown | strike
const wantStrike = KIND === "strike" || KIND === "moonshot";

const me = privateKeyToAccount(PK).address;
const pub = createPublicClient({ chain: somniaShannon, transport: http("https://dream-rpc.somnia.network") });

const ex = new SomniaMarkets({
  chain: somniaShannon,
  addresses: SOMNIA_TESTNET_ADDRESSES,
  wsRpcUrl: "wss://api.infra.testnet.somnia.network/ws",
  indexerUrl: "https://dev.smk.somnia.host/v1/graphql",
  priceFeed: SOMNIA_TESTNET_PRICE_FEED,
  privateKey: PK,
});

const log = (...a) => console.log(...a);
const usdc = async () =>
  pub.readContract({ address: COLLATERAL, abi: erc20Abi, functionName: "balanceOf", args: [me] });

async function main() {
  log("wallet   ", me);
  const gas = await pub.getBalance({ address: me });
  log("STT (gas)", formatEther(gas));
  if (gas === 0n) {
    log("\n>> Fund this address with a little test STT, then re-run.");
    log(">> Somnia faucet: https://testnet.somnia.network/");
    process.exit(1);
  }

  let bal = await usdc();
  log("tUSDC    ", formatUnits(bal, 6));
  if (bal < BigInt(Math.ceil(STAKE)) * ONE) {
    log("faucet   minting test tUSDC...");
    const f = await ex.trader.faucet();
    log("faucet   ", f.hash ?? JSON.stringify(f).slice(0, 80));
    bal = await usdc();
    log("tUSDC    ", formatUnits(bal, 6));
  }

  log(`\nprice    ${ASSET} = ${(await ex.client.fetchPrice(ASSET))?.price}`);

  // discover a live 60s market for the asset (strike vs up/down per KIND)
  const now = Math.floor(Date.now() / 1000);
  const live = await ex.client.listLiveBinaryMarkets({ asset: ASSET });
  const cands = live
    .map((m) => ({ ...m, iv: Number(m.intervalSec ?? m.interval ?? 0), exp: Number(m.expiry ?? 0) }))
    .filter((m) => m.exp > now + 15 && (String(m.strike ?? "0") !== "0") === wantStrike)
    .sort((a, b) => Math.abs(a.iv - 60) - Math.abs(b.iv - 60) || a.exp - b.exp);
  const pick = cands.find((m) => m.iv === 60) ?? cands[0];
  if (!pick) throw new Error(`no live ${wantStrike ? "fixed-strike" : "up/down"} ${ASSET} market`);
  const marketId = (pick.marketId ?? pick.id);
  const strikeP = Number(pick.strike ?? 0) / 1e18;
  log(`market   ${marketId}  interval=${pick.iv}s  expires in ${Math.round(pick.exp - now)}s` +
    (wantStrike ? `  strike=${strikeP}` : ""));

  const mo = await ex.client.getMarketOnchain(marketId);
  log(`onchain  status=${mo.status} finalized=${mo.finalized} pool=${mo.pool}`);
  if (mo.finalized || mo.status !== 1) throw new Error("market not trading");

  const side = (SIDE === "UP" || SIDE === "LONG") ? "BUY_YES" : "BUY_NO";
  const outcomeIdx = (SIDE === "UP" || SIDE === "LONG") ? 0 : 1;
  const LOT = 1000n;
  let qty = (BigInt(Math.round((STAKE / 0.99) * Number(ONE))) / LOT) * LOT;
  if (qty < LOT) qty = LOT;
  log(`\norder    ${side} qty=${Number(qty) / 1e6} @<=0.99 (IOC)`);
  const res = await ex.trader.placeOrder({
    pool: mo.pool,
    side,
    price: probabilityToPrice(0.99),
    quantity: qty,
    orderType: 2,
  });
  log(`order    ${res.hash}  fills=${(res.fills ?? []).length}`);
  let held = 0n;
  let cost = 0n;
  for (const f of res.fills ?? []) {
    held += BigInt(f.quantityFilled);
    cost += (BigInt(f.quantityFilled) * BigInt(f.fillPrice)) / ONE;
    log(`  fill   ${Number(f.quantityFilled) / 1e6} @ ${Number(f.fillPrice) / 1e6}`);
  }
  if (held === 0n) {
    log("order    NO FILL — book empty. Try again in a few seconds.");
    process.exit(2);
  }
  log(`held     ${Number(held) / 1e6} tokens  cost ${Number(cost) / 1e6}  => ${(Number(held) / Number(cost)).toFixed(2)}x`);

  // wait for on-chain resolution
  log("\nwaiting for the market to resolve on-chain...");
  let cur = mo;
  for (let i = 0; i < 40 && !cur.finalized && !cur.isResolved && !cur.isVoided; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    cur = await ex.client.getMarketOnchain(marketId);
    process.stdout.write(".");
  }
  log("");
  if (cur.isVoided) {
    log("result   VOIDED");
  } else {
    const winning = Number(cur.winningOutcome) === 1 ? 1 : 0;
    const won = winning === outcomeIdx;
    log(`result   winningOutcome=${winning === 0 ? "UP" : "DOWN"}  you=${SIDE}  => ${won ? "WON" : "LOST"}`);
    if (won) {
      const r = await ex.trader.redeem({ marketId, amount: held, outcomeIdx: winning });
      log(`redeem   ${r.hash}`);
    }
  }
  log(`\ntUSDC    ${formatUnits(await usdc(), 6)} (was funded, net of this round)`);
  process.exit(0);
}

main().catch((e) => {
  console.error("\nFAILED:", e?.shortMessage || e?.message || e);
  process.exit(1);
});
