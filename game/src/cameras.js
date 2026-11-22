// The Velvet Vault — cameras: wall-mounted, sweeping their cones, raising the
// alarm fast when the thief crosses them. An EMP pulse freezes them.

import { TUNE, angleDiff, dist, segmentHitsRect } from './config.js';

export function makeCamera(def) {
  return {
    x: def.x,
    y: def.y,
    base: def.angle,
    sweep: def.sweep ?? 0.9,
    period: def.period ?? 5,
    t: Math.random() * 10,
    disabled: 0, // seconds left of EMP shutdown
    seeing: false,
  };
}

export function cameraAngle(c) {
  return c.base + Math.sin((c.t / c.period) * Math.PI * 2) * c.sweep;
}

export function updateCamera(c, dt, game) {
  c.t += dt;
  if (c.disabled > 0) {
    c.disabled -= dt;
    c.seeing = false;
    return;
  }
  const { thief, blockers } = game;
  const range = thief.sneaking ? TUNE.cameraRange * 0.7 : TUNE.cameraRange;
  const ang = cameraAngle(c);
  const d = dist(c.x, c.y, thief.x, thief.y);
  let seen = false;
  if (!thief.hidden && !game.smokeActive && d < range) {
    const toThief = Math.atan2(thief.y - c.y, thief.x - c.x);
    if (Math.abs(angleDiff(toThief, ang)) < TUNE.cameraFov / 2) {
      seen = !blockers.some((b) => segmentHitsRect(c.x, c.y, thief.x, thief.y, b));
    }
  }
  c.seeing = seen;
  if (seen) game.lastSeen = { x: thief.x, y: thief.y, t: game.time };
}

// EMP: freeze every camera for `seconds`.
export function empBlast(cameras, seconds) {
  for (const c of cameras) c.disabled = Math.max(c.disabled, seconds);
}
