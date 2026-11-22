// The Velvet Vault — audio: everything synthesized with WebAudio, no files.
// Soft footsteps, a pickup chime, a guard "!" sting, a rising alarm drone,
// a vault crackle and a getaway fanfare.

let ctx = null;
let muted = false;
let alarmNodes = null;

export function ensureAudio() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (muted) stopAlarmDrone();
  return muted;
}

function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = null) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function sfxPickup() {
  tone(880, 0.12, 'sine', 0.1);
  tone(1318, 0.18, 'sine', 0.1, 0.07);
}

export function sfxCoin() {
  tone(1568, 0.1, 'triangle', 0.09);
  tone(2093, 0.14, 'triangle', 0.07, 0.05);
}

export function sfxAlert() {
  tone(220, 0.16, 'square', 0.08, 0, 440);
  tone(440, 0.14, 'square', 0.06, 0.12, 660);
}

export function sfxCaught() {
  tone(392, 0.25, 'sawtooth', 0.1, 0, 196);
  tone(196, 0.5, 'sawtooth', 0.1, 0.2, 98);
}

export function sfxSmoke() {
  tone(300, 0.35, 'sine', 0.08, 0, 90);
}

export function sfxEmp() {
  tone(1200, 0.3, 'square', 0.05, 0, 120);
}

export function sfxVaultTick() {
  tone(1046, 0.05, 'square', 0.05);
}

export function sfxWin() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.28, 'triangle', 0.11, i * 0.11));
}

export function sfxClick() {
  tone(700, 0.06, 'sine', 0.07);
}

// A low two-tone drone while the alarm is high; call every frame with the level.
export function alarmDrone(level) {
  if (!ctx || muted) {
    stopAlarmDrone();
    return;
  }
  if (level < 0.45) {
    stopAlarmDrone();
    return;
  }
  if (!alarmNodes) {
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 110;
    lfo.type = 'sine';
    lfo.frequency.value = 2.2;
    lfoGain.gain.value = 40;
    gain.gain.value = 0;
    lfo.connect(lfoGain).connect(osc.frequency);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    lfo.start();
    alarmNodes = { osc, lfo, gain };
  }
  alarmNodes.gain.gain.setTargetAtTime(0.015 + level * 0.03, ctx.currentTime, 0.2);
}

export function stopAlarmDrone() {
  if (!alarmNodes) return;
  try {
    alarmNodes.osc.stop();
    alarmNodes.lfo.stop();
  } catch {
    /* already stopped */
  }
  alarmNodes = null;
}
