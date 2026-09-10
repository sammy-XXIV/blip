import { createPublicClient, erc20Abi, formatEther, formatUnits, http, keccak256 } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { CHAIN, COLLATERAL, COLLATERAL_DECIMALS, RPC_HTTP } from "./somnia";

const KEY_STORAGE = "blip.burner.pk.v1";

type Hex = `0x${string}`;

/** true when a Privy app id is configured — then the play key comes from a
 *  login signature rather than being auto-generated. */
export const PRIVY_MODE = !!import.meta.env.VITE_PRIVY_APP_ID;

/** message the Privy wallet signs once to derive a deterministic play key */
export const PLAY_WALLET_MESSAGE = "BLIP play wallet · v1";

const isHexKey = (s: unknown): s is Hex => typeof s === "string" && /^0x[0-9a-fA-F]{64}$/.test(s);

function readKey(): Hex | null {
  try {
    const k = localStorage.getItem(KEY_STORAGE);
    return isHexKey(k) ? k : null;
  } catch {
    return null;
  }
}
function writeKey(pk: Hex) {
  try {
    localStorage.setItem(KEY_STORAGE, pk);
  } catch {
    /* session only */
  }
}
function forgetKey() {
  try {
    localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* ignore */
  }
}

/** deterministic play key from a Privy login signature */
export const deriveKeyFromSignature = (sig: Hex): Hex => keccak256(sig);

/**
 * A "play wallet" — a raw keypair the browser holds so trades sign silently
 * (no popups). In Privy mode it's derived deterministically from a login
 * signature (recoverable, cross-device). Otherwise it's auto-generated.
 * Testnet only.
 */
export class Burner {
  readonly privateKey: Hex;
  readonly address: Hex;
  private pub = createPublicClient({ chain: CHAIN, transport: http(RPC_HTTP) });

  constructor(key: Hex) {
    this.privateKey = key;
    this.address = privateKeyToAccount(key).address;
  }

  async gasBalanceWei(): Promise<bigint> {
    return this.pub.getBalance({ address: this.address });
  }
  async collateralBalanceRaw(): Promise<bigint> {
    return this.pub.readContract({
      address: COLLATERAL,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [this.address],
    });
  }
  async funds(): Promise<{ gas: number; usdc: number; gasWei: bigint; usdcRaw: bigint }> {
    const [gasWei, usdcRaw] = await Promise.all([
      this.gasBalanceWei(),
      this.collateralBalanceRaw().catch(() => 0n),
    ]);
    return {
      gasWei,
      usdcRaw,
      gas: Number(formatEther(gasWei)),
      usdc: Number(formatUnits(usdcRaw, COLLATERAL_DECIMALS)),
    };
  }
}

let instance: Burner | null = null;

/** is a play wallet available right now? (always true outside Privy mode) */
export function burnerReady(): boolean {
  return !!instance || !!readKey() || !PRIVY_MODE;
}

/** the play wallet — throws in Privy mode until a key has been authorized */
export function burner(): Burner {
  if (instance) return instance;
  let key = readKey();
  if (!key) {
    if (PRIVY_MODE) throw new Error("Sign in to create your play wallet");
    key = generatePrivateKey();
    writeKey(key);
  }
  instance = new Burner(key);
  return instance;
}

/** set the play key (from a Privy login signature) and cache it */
export function setBurnerKey(pk: Hex): Burner {
  writeKey(pk);
  instance = new Burner(pk);
  return instance;
}

/** drop the cached play wallet (logout / reset) */
export function clearBurner() {
  forgetKey();
  instance = null;
}

/** non-Privy mode only: wipe and regenerate */
export function rotateBurner(): Burner {
  forgetKey();
  instance = null;
  return burner();
}
