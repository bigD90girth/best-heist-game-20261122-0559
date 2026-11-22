// The Velvet Vault — guards: patrol waypoints, sweep their vision cones,
// grow suspicious when the thief is in sight, investigate tossed coins,
// and chase when the alarm is up.

import { TUNE, angleDiff, clamp, dist, segmentHitsRect } from './config.js';

export function makeGuard(def) {
  const [sx, sy] = def.path[0];
  return {
    path: def.path,
    pause: def.pause ?? 1.2,
    x: sx,
    y: sy,
    angle: 0,
    wp: 1,
    wait: 0,
    scan: 0,
    suspicion: 0,
    alerted: false,
    investigating: null, // {x, y, t}
    chase: false,
    seen: false, // sees the thief this frame
  };
}

// True when (gx,gy) looking along `angle` can see (tx,ty): range, cone, sight line.
export function canSee(gx, gy, angle, range, fov, tx, ty, blockers) {
  const d = dist(gx, gy, tx, ty);
  if (d > range) return false;
  if (d < 14) return true;
  const toThief = Math.atan2(ty - gy, tx - gx);
  if (Math.abs(angleDiff(toThief, angle)) > fov / 2) return false;
  for (const b of blockers) {
    if (segmentHitsRect(gx, gy, tx, ty, b)) return false;
  }
  return true;
}

export function updateGuard(g, dt, game) {
  const { thief, blockers } = game;
  const range = thief.sneaking ? TUNE.guardRange * 0.62 : TUNE.guardRange;
  const seen = !thief.hidden && !game.smokeActive && canSee(g.x, g.y, g.angle, range, TUNE.guardFov, thief.x, thief.y, blockers);
  g.seen = seen;

  // Suspicion grows faster up close and when the thief runs.
  if (seen) {
    const closeness = 1 - dist(g.x, g.y, thief.x, thief.y) / range;
    const rate = TUNE.suspicionRate * (0.7 + closeness * 1.1) * (thief.sneaking ? 0.7 : 1);
    g.suspicion = clamp(g.suspicion + rate * dt, 0, 1);
    game.lastSeen = { x: thief.x, y: thief.y, t: game.time };
  } else {
    g.suspicion = clamp(g.suspicion - TUNE.suspicionDecay * dt, 0, 1);
  }
  g.alerted = g.suspicion > 0.55;
  g.chase = game.lockdown || (g.alerted && seen);

  // Coin investigation: walk to the coin, look around, resume patrol.
  if (g.investigating) {
    const inv = g.investigating;
    inv.t -= dt;
    moveToward(g, inv.x, inv.y, TUNE.guardSpeed * 0.9, dt);
    if (dist(g.x, g.y, inv.x, inv.y) < 18 || inv.t <= 0) {
      if (inv.t <= 0) g.investigating = null;
      else inv.t = 2.2; // arrived: look around, then leave
      g.angle += dt * 1.8;
    }
    return;
  }

  if (g.chase) {
    const target = game.lastSeen ?? { x: thief.x, y: thief.y };
    moveToward(g, target.x, target.y, TUNE.guardChase, dt);
    if (dist(g.x, g.y, thief.x, thief.y) < 40) moveToward(g, thief.x, thief.y, TUNE.guardChase, dt);
    return;
  }

  if (g.alerted && game.lastSeen) {
    moveToward(g, game.lastSeen.x, game.lastSeen.y, TUNE.guardSpeed * 1.25, dt);
    if (dist(g.x, g.y, game.lastSeen.x, game.lastSeen.y) < 24) {
      g.alerted = false;
      g.suspicion = 0.3;
    }
    return;
  }

  // Patrol: walk the waypoints, pause and scan at each one.
  const [tx, ty] = g.path[g.wp];
  if (g.wait > 0) {
    g.wait -= dt;
    g.scan += dt;
    g.angle += Math.sin(g.scan * 1.6) * dt * 0.9;
    return;
  }
  const d = dist(g.x, g.y, tx, ty);
  if (d < 8) {
    g.wp = (g.wp + 1) % g.path.length;
    g.wait = g.pause;
    g.scan = 0;
    return;
  }
  moveToward(g, tx, ty, TUNE.guardSpeed, dt);
}

function moveToward(g, tx, ty, speed, dt) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.01) return;
  const step = Math.min(d, speed * dt);
  g.x += (dx / d) * step;
  g.y += (dy / d) * step;
  const want = Math.atan2(dy, dx);
  g.angle += angleDiff(want, g.angle) * Math.min(1, dt * 8);
}

export function guardCatchesThief(g, thief) {
  return !thief.hidden && dist(g.x, g.y, thief.x, thief.y) < TUNE.catchRadius;
}

// Send every guard in earshot to look at a tossed coin.
export function distractGuards(guards, x, y) {
  let n = 0;
  for (const g of guards) {
    if (dist(g.x, g.y, x, y) < 300 && !g.chase) {
      g.investigating = { x, y, t: 6 };
      g.suspicion = Math.max(0, g.suspicion - 0.4);
      n += 1;
    }
  }
  return n;
}
