import { useEffect } from "react";
import { create } from "zustand";

export type BtnColor = "neutral" | "blue" | "amber" | "danger";

export interface BtnSpec {
  label: string;
  color?: BtnColor;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  pulse?: boolean;
  /** highlight it as the selected choice */
  active?: boolean;
}

export interface KnobSpec {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

export interface ControlSpec {
  knob?: KnobSpec | null;
  action1?: BtnSpec | null;
  action2?: BtnSpec | null;
  main?: BtnSpec | null;
}

interface ControlBus extends ControlSpec {
  set: (s: ControlSpec) => void;
  clear: () => void;
}

const EMPTY: ControlSpec = { knob: null, action1: null, action2: null, main: null };

export const useControlBus = create<ControlBus>((set) => ({
  ...EMPTY,
  set: (s) => set({ ...EMPTY, ...s }),
  clear: () => set(EMPTY),
}));

/** a screen calls this to bind the hardware while it's mounted */
export function useControls(spec: ControlSpec, deps: unknown[]) {
  const set = useControlBus((s) => s.set);
  const clear = useControlBus((s) => s.clear);
  // push the latest spec when it changes ...
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => set(spec), deps);
  // ... and hand the hardware back only when the screen unmounts
  useEffect(() => () => clear(), [clear]);
}
