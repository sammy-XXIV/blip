import { useGame } from "../game/store";
import { CallScreen } from "./games/CallScreen";
import { LuckyScreen } from "./games/LuckyScreen";
import { MoonshotScreen } from "./games/MoonshotScreen";

export function GameScreen() {
  const game = useGame((s) => s.game);
  if (game === "lucky") return <LuckyScreen />;
  if (game === "moonshot") return <MoonshotScreen />;
  return <CallScreen />;
}
