// Small sound effects with the Web Audio API (no audio files needed).

let ctx = null;
let enabled = true;
let buzz = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function setSoundEnabled(on) {
  enabled = on;
  if (!on) setBuzzer(0);
}

/** Continuous buzzer tone. level: 0 = silent, 1 = dim, 2 = normal, 3 = loud. */
export function setBuzzer(level) {
  if (!enabled || !level) {
    if (buzz) {
      buzz.gain.gain.setTargetAtTime(0, buzz.ctx.currentTime, 0.02);
      const b = buzz;
      setTimeout(() => b.osc.stop(), 120);
      buzz = null;
    }
    return;
  }
  const a = audio();
  if (!a) return;
  if (!buzz) {
    const osc = a.createOscillator();
    const lfo = a.createOscillator();
    const lfoGain = a.createGain();
    const gain = a.createGain();
    osc.type = 'square';
    osc.frequency.value = 380;
    lfo.frequency.value = 28;
    lfoGain.gain.value = 40;
    lfo.connect(lfoGain).connect(osc.frequency);
    gain.gain.value = 0;
    osc.connect(gain).connect(a.destination);
    osc.start();
    lfo.start();
    buzz = { osc, gain, ctx: a, lfo };
    const stop = osc.stop.bind(osc);
    osc.stop = () => { stop(); lfo.stop(); };
  }
  buzz.gain.gain.setTargetAtTime([0, 0.025, 0.05, 0.08][level] || 0.05, a.currentTime, 0.03);
}

function tone(freq, start, dur, type = 'sine', vol = 0.12) {
  const a = audio();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, a.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.05);
}

export function playClick() {
  if (enabled) tone(900, 0, 0.05, 'triangle', 0.06);
}

export function playSuccess() {
  if (!enabled) return;
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.12));
}

export function playOops() {
  if (enabled) { tone(330, 0, 0.18, 'sine', 0.1); tone(262, 0.16, 0.25, 'sine', 0.1); }
}

/** A lamp burns out: a short "pop". */
export function playPop() {
  if (!enabled) return;
  tone(1400, 0, 0.04, 'square', 0.08);
  tone(180, 0.03, 0.12, 'sawtooth', 0.06);
}
