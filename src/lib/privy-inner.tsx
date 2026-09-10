import { useState } from "react";
import type { ReactNode } from "react";
import { PrivyProvider, usePrivy, useSignMessage, useWallets } from "@privy-io/react-auth";
import {
  PLAY_WALLET_MESSAGE,
  burnerReady,
  clearBurner,
  deriveKeyFromSignature,
  setBurnerKey,
} from "./wallet";
import { markets } from "./markets";

const APP_ID = import.meta.env.VITE_PRIVY_APP_ID as string;

export function Provider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={APP_ID}
      config={{
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        appearance: { theme: "dark", accentColor: "#5aa8f0", walletList: [] },
        loginMethods: ["email", "google"],
      }}
    >
      {children}
    </PrivyProvider>
  );
}

export type PlayStatus = "loading" | "logged-out" | "needs-auth" | "ready";

function usePlayWallet() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const [keyReady, setKeyReady] = useState(() => burnerReady());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const embedded = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
  const status: PlayStatus = !ready
    ? "loading"
    : !authenticated
      ? "logged-out"
      : keyReady
        ? "ready"
        : "needs-auth";

  const authorize = async () => {
    if (!embedded || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = (await signMessage(
        { message: PLAY_WALLET_MESSAGE },
        { address: embedded.address },
      )) as string | { signature: string };
      const sig = (typeof res === "string" ? res : res.signature) as `0x${string}`;
      const key = deriveKeyFromSignature(sig);
      setBurnerKey(key);
      (markets() as { useKey?: (k: `0x${string}`) => void }).useKey?.(key);
      setKeyReady(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not authorize");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    try {
      await logout();
    } catch {
      /* ignore */
    }
    clearBurner();
    location.reload();
  };

  return { status, busy, err, hasEmbedded: !!embedded, login, authorize, signOut };
}

/** login → authorize → hand back to the caller's fund gate */
export function LoginFlow({ FundGate }: { FundGate: () => ReactNode }) {
  const { status, busy, err, hasEmbedded, login, authorize } = usePlayWallet();

  if (status === "ready") return <>{FundGate()}</>;

  return (
    <div className="scr scr-boot">
      <span className="boot-press">{status === "loading" ? "CONNECTING…" : "SIGN IN"}</span>
      <h1 className="boot-head">
        {status === "logged-out" ? "One sign-in. No seed phrase." : "Authorize your play wallet."}
      </h1>
      <p className="boot-sub">
        {status === "logged-out"
          ? "Log in with email — Blip derives a play wallet you can use on any device. Then every trade signs itself, no popups."
          : "Sign one message so Blip can trade for you silently. Same wallet every time you log in."}
      </p>

      {status === "logged-out" && (
        <button className="boot-start" onClick={() => void login()}>
          SIGN IN
        </button>
      )}
      {status === "needs-auth" && (
        <button
          className="boot-start"
          onClick={() => void authorize()}
          disabled={busy || !hasEmbedded}
        >
          {busy ? "SIGNING…" : hasEmbedded ? "CREATE PLAY WALLET" : "PREPARING…"}
        </button>
      )}
      {status === "loading" && (
        <button className="boot-start" disabled>
          …
        </button>
      )}

      {err && <span className="boot-warn mono">{err}</span>}
      <div className="boot-foot">
        <span className="label">Live · Somnia Shannon · DreamDEX Event Contracts</span>
        <span className="boot-warn mono">Testnet play money. No real funds.</span>
      </div>
    </div>
  );
}

export function LogoutRow() {
  const { signOut } = usePlayWallet();
  return (
    <div className="menu-row">
      <span className="label">Account</span>
      <button className="menu-btn danger" onClick={() => void signOut()}>
        LOG OUT
      </button>
    </div>
  );
}
