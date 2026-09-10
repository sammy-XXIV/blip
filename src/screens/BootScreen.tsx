import { useState } from "react";
import { IS_DEMO, markets } from "../lib/markets";
import { useGame } from "../game/store";
import { useBurnerFunds } from "../hooks/useBurnerFunds";

export function BootScreen() {
  const enter = useGame((s) => s.enterSelect);
  const ready = useGame((s) => s.prices.BTC > 0);

  if (!IS_DEMO) return <LiveBoot onStart={enter} priceReady={ready} />;

  return (
    <div className="scr scr-boot">
      <span className="boot-press">{ready ? "PRESS START" : "TUNING IN…"}</span>
      <h1 className="boot-head">Built for fun and money.</h1>
      <p className="boot-sub">
        Call BTC or ETH up or down. Sixty seconds to land it.
        <br />
        Win the call, ride the streak.
      </p>

      <button className="boot-start" onClick={enter} disabled={!ready}>
        START
      </button>

      <div className="boot-foot">
        <span className="label">Demo · play money · no wallet</span>
        <span className="label">Powered by DreamDEX Event Contracts</span>
        <span className="boot-warn mono">BLIP has no token.</span>
      </div>
    </div>
  );
}

function LiveBoot({ onStart, priceReady }: { onStart: () => void; priceReady: boolean }) {
  const funds = useBurnerFunds();
  const [minting, setMinting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const short = `${funds.address.slice(0, 6)}…${funds.address.slice(-4)}`;
  const copy = () => {
    navigator.clipboard?.writeText(funds.address).catch(() => {});
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
        <button className="boot-start" onClick={onStart} disabled={!priceReady}>
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
      <p className="boot-sub">
        One-time top-up. After this, every trade signs itself — no wallet popups.
      </p>

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
    </div>
  );
}
