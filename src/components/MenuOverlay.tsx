import { Suspense, useState } from "react";
import { rotateBurner } from "../lib/wallet";
import { LogoutRow, PRIVY_ENABLED } from "../lib/privy";
import { isMuted, toggleMute } from "../lib/sound";
import { useBurnerFunds } from "../hooks/useBurnerFunds";
import { useGame } from "../game/store";

export function MenuOverlay() {
  const close = useGame((s) => s.closeMenu);
  const screenFx = useGame((s) => s.screenFx);
  const toggleScreenFx = useGame((s) => s.toggleScreenFx);
  const [muted, setMuted] = useState(isMuted());

  return (
    <div className="menu" role="dialog" aria-label="menu">
      <div className="menu-head">
        <span className="menu-title">MENU</span>
        <button className="menu-x" onClick={close} aria-label="close">
          ✕
        </button>
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

      <div className="menu-row">
        <span className="label">Screen FX</span>
        <div className="menu-seg">
          <button
            className={`menu-opt ${screenFx ? "on" : ""}`}
            onClick={() => !screenFx && toggleScreenFx()}
          >
            ON
          </button>
          <button
            className={`menu-opt ${!screenFx ? "on" : ""}`}
            onClick={() => screenFx && toggleScreenFx()}
          >
            OFF
          </button>
        </div>
      </div>

      <LiveMenu />

      <p className="menu-note mono">
        Live · Somnia Shannon · every call is a real DreamDEX Event Contract.
      </p>
    </div>
  );
}

function LiveMenu() {
  const f = useBurnerFunds(6000);
  const short = f.address ? `${f.address.slice(0, 6)}…${f.address.slice(-4)}` : "…";
  const copy = () => {
    if (f.address) navigator.clipboard?.writeText(f.address).catch(() => {});
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
      {PRIVY_ENABLED && LogoutRow ? (
        <Suspense fallback={null}>
          <LogoutRow />
        </Suspense>
      ) : (
        <BurnerReset />
      )}
    </>
  );
}

function BurnerReset() {
  const go = () => {
    if (confirm("New play wallet? The current one and its testnet funds are abandoned.")) {
      rotateBurner();
      location.reload();
    }
  };
  return (
    <div className="menu-row">
      <span className="label">Reset</span>
      <button className="menu-btn danger" onClick={go}>
        NEW WALLET
      </button>
    </div>
  );
}
