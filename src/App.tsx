import { useEffect } from "react";
import { useGame } from "./game/store";
import { BootScreen } from "./screens/BootScreen";
import { SelectScreen } from "./screens/SelectScreen";
import { GameScreen } from "./screens/GameScreen";
import { Deck } from "./components/Deck";
import { MenuOverlay } from "./components/MenuOverlay";
import { HowtoOverlay } from "./components/HowtoOverlay";

export function App() {
  const screen = useGame((s) => s.screen);
  const menuOpen = useGame((s) => s.menuOpen);
  const howtoOpen = useGame((s) => s.howtoOpen);
  const screenFx = useGame((s) => s.screenFx);
  const boot = useGame((s) => s.boot);

  useEffect(() => {
    boot();
  }, [boot]);

  return (
    <div className="rig">
      <div className={`unit ${screen}`}>
        <div className="stripe stripe-l" aria-hidden>
          <i /><i /><i /><i /><i />
        </div>
        <div className="stripe stripe-r" aria-hidden>
          <i /><i /><i /><i /><i />
        </div>

        <div className="wordmark" role="img" aria-label="BLIP">
          <span className="wm">
            BL<i className="wm-blip" aria-hidden />P
          </span>
        </div>

        <div className="glass">
          {screen === "boot" && <BootScreen />}
          {screen === "select" && <SelectScreen />}
          {screen === "play" && <GameScreen />}
          {screen === "play" && howtoOpen && <HowtoOverlay />}
          {menuOpen && <MenuOverlay />}
          {screenFx && <div className="viz" aria-hidden />}
        </div>

        <Deck />
      </div>
    </div>
  );
}
