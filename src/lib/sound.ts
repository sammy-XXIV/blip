// Tiny procedural arcade SFX — Web Audio, no assets.

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let muted = load();

function load(): boolean {
  try {
    return localStorage.getItem("blip.muted") === "1";
  } catch {
    return false;
  }
}
function save() {
  try {
    localStorage.setItem("blip.muted", muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function ac(): Ctx | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  to?: number; // frequency to glide toward
}

function tone(t0: number, freq: number, dur: number, o: ToneOpts = {}) {
  const c = ac();
  if (!c) return;
  const { type = "square", vol = 0.12, to } = o;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

export type Sfx = "tick" | "move" | "fire" | "start" | "win" | "lose" | "void";

export function sfx(name: Sfx) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  switch (name) {
    case "tick":
      tone(t, 880, 0.045, { vol: 0.05 });
      break;
    case "move":
      tone(t, 520, 0.06, { vol: 0.07, to: 720 });
      break;
    case "fire":
      tone(t, 300, 0.15, { type: "sawtooth", vol: 0.11, to: 760 });
      break;
    case "start":
      tone(t, 440, 0.09, { vol: 0.09 });
      tone(t + 0.09, 660, 0.13, { vol: 0.09 });
      break;
    case "win":
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(t + i * 0.07, f, 0.12, { vol: 0.1 }),
      );
      break;
    case "lose":
      tone(t, 300, 0.3, { type: "sawtooth", vol: 0.11, to: 80 });
      break;
    case "void":
      tone(t, 420, 0.12, { type: "sine", vol: 0.07 });
      break;
  }
}

export const isMuted = () => muted;
export function toggleMute(): boolean {
  muted = !muted;
  save();
  if (!muted) sfx("tick");
  return muted;
}
