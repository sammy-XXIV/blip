import { useState } from "react";
import { CURRENT_MODE, setMode } from "../lib/markets";
import { rotateBurner } from "../lib/wallet";
import { isMuted, toggleMute } from "../lib/sound";
import { useBurnerFunds } from "../hooks/useBurnerFunds";
import { useGame } from "../game/store";

export function MenuOverlay() {
  const close = useGame((s) => s.closeMenu);
  const live = CURRENT_MODE === "live";
  const [muted, setMuted] = useState(isMuted());

  const resetDemo = () => {
    try {
      localStorage.removeItem("blip.demo.v1");
    } catch {
      /* ignore */
    }
    location.reload();
  };

  return (
    <div className="menu" role="dialog" aria-label="menu">
      <div className="menu-head">
        <span className="menu-title">MENU</span>
        <button className="menu-x" onClick={close} aria-label="close">
          ✕
        </button>
      </div>

      <div className="menu-row">
        <span className="label">Mode</span>
        <div className="menu-seg">
          <button className={`menu-opt ${!live ? "on" : ""}`} onClick={() => setMode("demo")}>
            DEMO
          </button>
          <button className={`menu-opt ${live ? "on" : ""}`} onClick={() => setMode("live")}>
            LIVE
          </button>
        </div>
      </div>

      <div className="menu-row">
        <span className="label">Sound</span>
        <div className="menu-seg">
          <button
            className={`menu-opt ${!muted ? "on" : ""}`}
            onClick={() => setMuted(toggleMute())}
          >
            ON
          </button>
          <button
            className={`menu-opt ${muted ? "on" : ""}`}
            onClick={() => setMuted(toggleMute())}
          >
            OFF
          </button>
        </div>
      </div>

      {live ? <LiveMenu /> : (
        <div className="menu-row">
          <span className="label">Play money</span>
          <button className="menu-btn" onClick={resetDemo}>
            RESET BALANCE
          </button>
        </div>
      )}

      <p className="menu-note mono">
        {live
          ? "Live · Somnia Shannon · every call is a real DreamDEX Event Contract."
          : "Demo · play money · no wallet. Flip to LIVE for real on-chain rounds."}
      </p>
    </div>
  );
}

function LiveMenu() {
  const f = useBurnerFunds(6000);
  const short = `${f.address.slice(0, 6)}…${f.address.slice(-4)}`;
  const copy = () => {
    navigator.clipboard?.writeText(f.address).catch(() => {});
  };
  const newWallet = () => {
    if (confirm("New play wallet? The current one and its testnet funds are abandoned.")) {
      rotateBurner();
      location.reload();
    }
  };

  return (
    <>
      <div className="menu-row">
        <span className="label">Play wallet</span>
        <button className="menu-addr mono" onClick={copy} title="copy">
          {short} ⧉
        </button>
      </div>
      <div className="menu-row">
        <span className="label">Balance</span>
        <span className="mono menu-bal">
          {f.usdc.toFixed(2)} tUSDC · {f.gas.toFixed(3)} STT
        </span>
      </div>
      <div className="menu-row">
        <span className="label">Reset</span>
        <button className="menu-btn danger" onClick={newWallet}>
          NEW WALLET
        </button>
      </div>
    </>
  );
}
