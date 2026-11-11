/**
 * Soft school-like music-box melody (procedural, no external file).
 * Gentle pentatonic phrases — calm classroom morning mood.
 */

export type AmbienceHandle = {
  start: () => Promise<void>;
  stop: () => void;
  setVolume: (value: number) => void;
};

type Note = { freq: number; dur: number; gap?: number };

// Soft "morning classroom" motif in C major (music-box feel)
const PHRASE: Note[] = [
  { freq: 523.25, dur: 0.42 }, // C5
  { freq: 587.33, dur: 0.42 }, // D5
  { freq: 659.25, dur: 0.55 }, // E5
  { freq: 523.25, dur: 0.42 }, // C5
  { freq: 698.46, dur: 0.42 }, // F5
  { freq: 783.99, dur: 0.7 }, // G5
  { freq: 0, dur: 0.35 },
  { freq: 783.99, dur: 0.35 }, // G5
  { freq: 698.46, dur: 0.35 }, // F5
  { freq: 659.25, dur: 0.45 }, // E5
  { freq: 587.33, dur: 0.45 }, // D5
  { freq: 523.25, dur: 0.9 }, // C5
  { freq: 0, dur: 1.8 }, // breath
];

export function createSchoolAmbience(): AmbienceHandle {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let running = false;
  let cancelScheduled: (() => void) | null = null;

  function playNote(freq: number, startAt: number, dur: number) {
    if (!ctx || !master || freq <= 0) return;

    // Layer: soft sine + quiet triangle = music-box warmth
    const sine = ctx.createOscillator();
    const tri = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    sine.type = "sine";
    tri.type = "triangle";
    sine.frequency.value = freq;
    tri.frequency.value = freq;

    filter.type = "lowpass";
    filter.frequency.value = 2400;
    filter.Q.value = 0.7;

    const peak = 0.045;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.03);
    gain.gain.exponentialRampToValueAtTime(peak * 0.55, startAt + dur * 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);

    const triGain = ctx.createGain();
    triGain.gain.value = 0.22;

    sine.connect(filter);
    tri.connect(triGain);
    triGain.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    sine.start(startAt);
    tri.start(startAt);
    sine.stop(startAt + dur + 0.05);
    tri.stop(startAt + dur + 0.05);
  }

  function scheduleLoop() {
    if (!ctx || !master || !running) return;

    let t = ctx.currentTime + 0.05;
    for (const note of PHRASE) {
      if (note.freq > 0) playNote(note.freq, t, note.dur);
      t += note.dur + (note.gap ?? 0.04);
    }

    const waitMs = Math.max(50, (t - ctx.currentTime) * 1000);
    const timeout = window.setTimeout(() => {
      if (running) scheduleLoop();
    }, waitMs);

    cancelScheduled = () => window.clearTimeout(timeout);
  }

  async function start() {
    if (running) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);

    // Very soft air / room tone under the melody
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.015;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 1200;
    noiseFilter.Q.value = 0.6;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.02;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();

    running = true;
    if (ctx.state === "suspended") await ctx.resume();
    scheduleLoop();
  }

  function stop() {
    running = false;
    cancelScheduled?.();
    cancelScheduled = null;
    void ctx?.close();
    ctx = null;
    master = null;
  }

  function setVolume(value: number) {
    if (master) master.gain.value = Math.max(0, Math.min(1, value));
  }

  return { start, stop, setVolume };
}
