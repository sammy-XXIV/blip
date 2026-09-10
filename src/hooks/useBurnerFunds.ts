import { useCallback, useEffect, useState } from "react";
import { burner, burnerReady } from "../lib/wallet";
import { MIN_GAS_WEI } from "../lib/somnia";

export interface BurnerFunds {
  address: `0x${string}` | null;
  gas: number;
  usdc: number;
  hasGas: boolean;
  ready: boolean;
  loading: boolean;
  refresh: () => void;
}

export function useBurnerFunds(pollMs = 4000): BurnerFunds {
  const b = burnerReady() ? (() => { try { return burner(); } catch { return null; } })() : null;
  const [state, setState] = useState({
    gas: 0,
    usdc: 0,
    gasWei: 0n,
    usdcRaw: 0n,
    loading: true,
  });

  const tick = useCallback(async () => {
    if (!b) {
      setState((p) => ({ ...p, loading: false }));
      return;
    }
    try {
      const r = await b.funds();
      setState({ ...r, loading: false });
    } catch {
      setState((p) => ({ ...p, loading: false }));
    }
  }, [b]);

  useEffect(() => {
    let alive = true;
    const run = () => {
      if (alive) void tick();
    };
    run();
    const id = setInterval(run, pollMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [tick, pollMs]);

  return {
    address: b?.address ?? null,
    gas: state.gas,
    usdc: state.usdc,
    hasGas: state.gasWei >= MIN_GAS_WEI,
    ready: !!b && state.gasWei >= MIN_GAS_WEI && state.usdcRaw > 0n,
    loading: state.loading,
    refresh: () => void tick(),
  };
}
