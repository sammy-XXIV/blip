export const fmtUsd = (n: number, dp = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const fmtPrice = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: n >= 1000 ? 0 : 2,
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  });

export const fmtSigned = (n: number, dp = 2) =>
  (n >= 0 ? "+" : "") + n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${r.toString().padStart(2, "0")}` : `0:${r.toString().padStart(2, "0")}`;
}
