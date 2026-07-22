"use client";

// Tiny procedural chiptune engine — no audio files, just oscillators, so it's
// zero-asset and fits the arcade theme literally ("beep-boop"). Everything
// lazily creates a single AudioContext on first use (browsers block audio
// before a user gesture, so this is only ever kicked off from a click).

const STORAGE_KEY = "trivia:sound-muted";
let ctx: AudioContext | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let musicStep = 0;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

function tone(freq: number, duration: number, type: OscillatorType = "square", volume = 0.12, delay = 0) {
  if (isMuted()) return;
  const audioCtx = getCtx();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  const start = audioCtx.currentTime + delay;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playClick() {
  tone(660, 0.06, "square", 0.08);
}

export function playTick() {
  tone(880, 0.05, "square", 0.06);
}

export function playCorrect() {
  tone(523, 0.09, "square", 0.1, 0);
  tone(659, 0.09, "square", 0.1, 0.08);
  tone(784, 0.15, "square", 0.12, 0.16);
}

export function playWrong() {
  tone(220, 0.18, "sawtooth", 0.1, 0);
  tone(160, 0.22, "sawtooth", 0.1, 0.1);
}

export function playFinish() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "square", 0.1, i * 0.12));
}

const MUSIC_NOTES = [392, 523, 466, 392, 349, 523, 466, 349]; // a simple minor-ish 8-bit loop

export function startMusic() {
  if (typeof window === "undefined" || musicTimer) return;
  musicTimer = setInterval(() => {
    if (isMuted()) return;
    const audioCtx = getCtx();
    if (!audioCtx) return;
    tone(MUSIC_NOTES[musicStep % MUSIC_NOTES.length], 0.18, "triangle", 0.05);
    musicStep++;
  }, 260);
}

export function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
    musicStep = 0;
  }
}

export function setMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  if (muted) {
    stopMusic();
  } else {
    getCtx(); // unlock on the gesture that unmuted us
    startMusic();
  }
}
