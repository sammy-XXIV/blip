import { createPublicClient, formatEther, formatUnits, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { erc20Abi } from "viem";
import { CHAIN, COLLATERAL, COLLATERAL_DECIMALS, RPC_HTTP } from "./somnia";

const KEY_STORAGE = "blip.burner.pk.v1";

type Hex = `0x${string}`;

function loadOrCreateKey(): Hex {
  try {
    const existing = localStorage.getItem(KEY_STORAGE);
    if (existing && /^0x[0-9a-fA-F]{64}$/.test(existing)) return existing as Hex;
  } catch {
    /* ignore */
  }
  const pk = generatePrivateKey();
  try {
    localStorage.setItem(KEY_STORAGE, pk);
  } catch {
    /* ignore — session-only burner */
  }
  return pk;
}

/**
 * A throwaway "play wallet" kept in the browser. Funded once from a faucet, then
 * signs every trade silently — no wallet popups. Testnet only.
 */
export class Burner {
  readonly privateKey: Hex;
  readonly address: Hex;
  private pub = createPublicClient({ chain: CHAIN, transport: http(RPC_HTTP) });

  constructor() {
    this.privateKey = loadOrCreateKey();
    this.address = privateKeyToAccount(this.privateKey).address;
  }

  /** wipe the key and mint a fresh burner (used by MENU → reset) */
  static rotate(): Burner {
    try {
      localStorage.removeItem(KEY_STORAGE);
    } catch {
      /* ignore */
    }
    return new Burner();
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
export function burner(): Burner {
  if (!instance) instance = new Burner();
  return instance;
}
export function rotateBurner(): Burner {
  instance = Burner.rotate();
  return instance;
}
