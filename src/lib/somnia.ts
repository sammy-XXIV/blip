import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import {
  SOMNIA_TESTNET_ADDRESSES,
  SOMNIA_TESTNET_PRICE_FEED,
} from "@somnia-chain/markets-sdk";

export const CHAIN = somniaShannon;

export const RPC_HTTP =
  import.meta.env.VITE_RPC_URL || "https://dream-rpc.somnia.network";
export const WS_RPC =
  import.meta.env.VITE_WS_RPC_URL || "wss://api.infra.testnet.somnia.network/ws";
export const INDEXER_URL =
  import.meta.env.VITE_INDEXER_URL || "https://dev.smk.somnia.host/v1/graphql";

export const PRICE_FEED = SOMNIA_TESTNET_PRICE_FEED;
export const ADDRESSES = SOMNIA_TESTNET_ADDRESSES;

/** testnet collateral (tUSDC) — 6 decimals */
export const COLLATERAL = SOMNIA_TESTNET_ADDRESSES.testUsdc as `0x${string}`;
export const COLLATERAL_DECIMALS = 6;
export const ONE = 1_000_000n;

/** minimum STT (gas) the burner needs before it can trade, in wei */
export const MIN_GAS_WEI = 2_000_000_000_000_000n; // 0.002 STT
