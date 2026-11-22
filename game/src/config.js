// The Velvet Vault — config: canvas size, palette, tuning and shared helpers.
// A top-down stealth heist: cross the room, dodge vision cones and cameras,
// grab the loot, reach the exit before the alarm hits 100.

export const VIEW_W = 1280;
export const VIEW_H = 800;
export const HUD_H = 76;
export const ROOM = { x: 36, y: 92, w: 1208, h: 648 };

export const PALETTE = {
  floorDark: '#141a2e',
  floorLight: '#1a2140',
  floorLine: '#232c52',
  wall: '#3a2f5e',
  wallTop: '#5a4a8a',
  cover: '#2c3a5e',
  coverTop: '#42548a',
  shadow: '#0a0e1e',
  gold: '#f5c542',
  goldGlow: '#ffe9a3',
  danger: '#ff4d5e',
  dangerSoft: 'rgba(255,77,94,0.20)',
  cone: 'rgba(255,190,60,0.30)',
  coneEdge: 'rgba(255,190,60,0.55)',
  cameraCone: 'rgba(80,200,255,0.28)',
  cameraConeEdge: 'rgba(80,200,255,0.55)',
  safe: '#39d0a5',
  thief: '#e8b4b8',
  thiefCoat: '#7a1f2b',
  guard: '#2b3245',
  guardHat: '#1c2233',
  exit: '#39d0a5',
  text: '#f2ead8',
  muted: '#9aa5c7',
  panel: 'rgba(10,14,30,0.88)',
};

export const TUNE = {
  thiefSpeed: 205,
  thiefSneak: 115,
  guardSpeed: 92,
  guardChase: 168,
  guardFov: (Math.PI * 72) / 180,
  guardRange: 225,
  cameraFov: (Math.PI * 62) / 180,
  cameraRange: 250,
  alarmPerSecondSeen: 11,
  cameraAlarmPerSecond: 15,
  alarmDecay: 2.5,
  suspicionRate: 1.5,
  suspicionDecay: 0.55,
  catchRadius: 26,
  lootRadius: 30,
  exitRadius: 34,
  levelTime: 180,
  lockdownSeconds: 12,
  hideBreakSeconds: 5,
};

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Segment (x1,y1)-(x2,y2) vs axis-aligned rect: true when it hits the rect.
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let ta = (r.x - x1) / dx;
    let tb = (r.x + r.w - x1) / dx;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let ta = (r.y - y1) / dy;
    let tb = (r.y + r.h - y1) / dy;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}

// Circle vs rect collision resolve: push circle out, return corrected x/y.
export function circleVsRect(cx, cy, radius, r) {
  const nx = clamp(cx, r.x, r.x + r.w);
  const ny = clamp(cy, r.y, r.y + r.h);
  const dx = cx - nx;
  const dy = cy - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= radius * radius) return null;
  if (d2 === 0) return { x: cx, y: r.y - radius };
  const d = Math.sqrt(d2);
  return { x: cx + (dx / d) * (radius - d), y: cy + (dy / d) * (radius - d) };
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function money(n) {
  return `$${n.toLocaleString('en-US')}`;
}
