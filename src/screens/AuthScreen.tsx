import { Suspense, useState } from "react";
import { markets } from "../lib/markets";
import { LoginFlow, PRIVY_ENABLED } from "../lib/privy";
import { useGame } from "../game/store";
import { useBurnerFunds } from "../hooks/useBurnerFunds";
import { sfx } from "../lib/sound";

/** live mode: sign in (Privy) → authorize → fund the play wallet → START */
export function AuthScreen() {
  const enter = useGame((s) => s.enterSelect);
  const ready = useGame((s) => s.prices.BTC > 0);

  if (PRIVY_ENABLED && LoginFlow) {
    return (
      <Suspense
        fallback={
          <div className="scr scr-boot">
            <span className="boot-press">CONNECTING…</span>
          </div>
        }
      >
        <LoginFlow FundGate={() => <FundGate onStart={enter} priceReady={ready} />} />
      </Suspense>
    );
  }
  return <FundGate onStart={enter} priceReady={ready} />;
}

function FundGate({ onStart, priceReady }: { onStart: () => void; priceReady: boolean }) {
  const funds = useBurnerFunds();
  const back = useGame((s) => s.goHome);
  const [minting, setMinting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const addr = funds.address ?? "0x…";
  const short = `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  const copy = () => {
    if (funds.address) navigator.clipboard?.writeText(funds.address).catch(() => {});
  };
  const getUsdc = async () => {
    setMinting(true);
    setErr(null);
    try {
      await markets().faucet?.();
      funds.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "faucet failed");
    } finally {
      setMinting(false);
    }
  };

  if (funds.ready) {
    return (
      <div className="scr scr-boot">
        <span className="boot-press">{priceReady ? "PRESS START" : "TUNING IN…"}</span>
        <h1 className="boot-head">Play wallet funded.</h1>
        <p className="boot-sub">Every call signs itself — no wallet popups. Just tap and go.</p>
        <button
          className="boot-start"
          onClick={() => {
            sfx("start");
            onStart();
          }}
          disabled={!priceReady}
        >
          START
        </button>
        <div className="boot-foot">
          <span className="label">
            Wallet {short} · ${funds.usdc.toFixed(2)} tUSDC
          </span>
          <span className="label">Live · Somnia Shannon · DreamDEX Event Contracts</span>
        </div>
      </div>
    );
  }

  return (
    <div className="scr scr-boot">
      <span className="boot-press">FUND PLAY WALLET</span>
      <p className="boot-sub">One-time top-up. After this, every trade signs itself — no popups.</p>

      <button className="fund-addr mono" onClick={copy} title="copy address">
        {short} ⧉
      </button>

      <ol className="fund-steps">
        <li>
          Send test <b>STT</b> to that address —{" "}
          <a href="https://testnet.somnia.network/" target="_blank" rel="noreferrer">
            Somnia faucet ↗
          </a>
          <span className="mono"> · have {funds.gas.toFixed(3)}</span>
        </li>
        <li>
          <button className="fund-btn" onClick={getUsdc} disabled={!funds.hasGas || minting}>
            {minting ? "MINTING…" : "Get 10,000 test USDC"}
          </button>
          <span className="mono"> · have {funds.usdc.toFixed(2)}</span>
        </li>
      </ol>

      {err && <span className="boot-warn mono">{err}</span>}
      <button className="boot-start" disabled>
        {funds.loading ? "CHECKING…" : "WAITING FOR FUNDS"}
      </button>
      <button className="fund-btn" onClick={back} style={{ marginTop: 4 }}>
        ← BACK
      </button>
    </div>
  );
}
