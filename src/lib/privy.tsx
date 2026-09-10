import { lazy, Suspense } from "react";
import type { ReactNode } from "react";

export const PRIVY_ENABLED = !!import.meta.env.VITE_PRIVY_APP_ID;

// everything Privy-flavoured lives in a lazy chunk — with no app id it never loads
const Provider = PRIVY_ENABLED
  ? lazy(() => import("./privy-inner").then((m) => ({ default: m.Provider })))
  : null;

export const LoginFlow = PRIVY_ENABLED
  ? lazy(() => import("./privy-inner").then((m) => ({ default: m.LoginFlow })))
  : null;

export const LogoutRow = PRIVY_ENABLED
  ? lazy(() => import("./privy-inner").then((m) => ({ default: m.LogoutRow })))
  : null;

export function PrivyRoot({ children }: { children: ReactNode }) {
  if (!Provider) return <>{children}</>;
  return (
    <Suspense fallback={null}>
      <Provider>{children}</Provider>
    </Suspense>
  );
}
