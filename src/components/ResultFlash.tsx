import { useEffect } from "react";
import { fmtUsd } from "../game/format";
import { useGame } from "../game/store";

export function ResultFlash() {
  const result = useGame((s) => s.result);
  const clear = useGame((s) => s.clearResult);

  useEffect(() => {
    if (!result) return;
    const id = setTimeout(clear, 1800);
    return () => clearTimeout(id);
  }, [result, clear]);

  if (!result) return null;

  const { status, delta, streak, asset } = result;
  const word =
    status === "WON"
      ? "HIT"
      : status === "VOID"
        ? "VOID"
        : status === "CASHED"
          ? "CASHED"
          : "MISS";

  return (
    <button className={`flash ${status.toLowerCase()}`} onClick={clear} aria-label="dismiss result">
      <span className="flash-word">{word}</span>
      <span className="flash-delta mono">
        {delta >= 0 ? "+" : "–"}${fmtUsd(Math.abs(delta))}
      </span>
      <span className="label">
        {asset}
        {status === "WON" && streak > 1 ? ` · streak ${streak}` : ""}
      </span>
    </button>
  );
}
