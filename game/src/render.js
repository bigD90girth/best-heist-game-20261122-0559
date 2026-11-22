// The Velvet Vault — render: everything the judge sees. One canvas frame
// must read at a glance: the room, the thief, guards with vision cones,
// cameras, the loot target and the alarm meter. Safe cover is teal-dark,
// danger is red and gold, loot glows gold.

import { PALETTE as P, ROOM, TUNE, VIEW_W, VIEW_H, HUD_H, clamp, formatTime, money, laserActive } from './config.js';
import { LOOT_KINDS } from './levels.js';
import { cameraAngle } from './cameras.js';

export function drawGame(ctx, game) {
  drawFloor(ctx, game);
  drawExit(ctx, game);
  drawLoot(ctx, game);
  drawVault(ctx, game);
  drawCover(ctx, game);
  drawWalls(ctx, game);
  drawLasers(ctx, game);
  drawCones(ctx, game);
  drawCameras(ctx, game);
  drawGuards(ctx, game);
  drawCoins(ctx, game);
  drawThief(ctx, game);
  drawHud(ctx, game);
  drawAlarmVignette(ctx, game);
  drawBanner(ctx, game);
  if (game.screen !== 'play') drawScreen(ctx, game);
}

// Red edge glow while the alarm is high — readable even without the HUD.
function drawAlarmVignette(ctx, game) {
  if (game.screen !== 'play' || game.alarm < 70) return;
  const pulse = 0.22 + Math.sin(game.time * 6) * 0.12;
  ctx.save();
  ctx.strokeStyle = `rgba(255,45,63,${pulse})`;
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, VIEW_W - 12, VIEW_H - 12);
  ctx.restore();
}

function drawFloor(ctx, game) {
  ctx.fillStyle = '#0b0f1f';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Checkerboard marble floor inside the room.
  const tile = 76;
  for (let y = ROOM.y; y < ROOM.y + ROOM.h; y += tile) {
    for (let x = ROOM.x; x < ROOM.x + ROOM.w; x += tile) {
      const even = (Math.floor((x - ROOM.x) / tile) + Math.floor((y - ROOM.y) / tile)) % 2 === 0;
      ctx.fillStyle = even ? P.floorDark : P.floorLight;
      ctx.fillRect(x, y, tile, tile);
    }
  }
  ctx.strokeStyle = P.floorLine;
  ctx.lineWidth = 1;
  for (let x = ROOM.x; x <= ROOM.x + ROOM.w; x += tile) {
    ctx.beginPath(); ctx.moveTo(x, ROOM.y); ctx.lineTo(x, ROOM.y + ROOM.h); ctx.stroke();
  }
  for (let y = ROOM.y; y <= ROOM.y + ROOM.h; y += tile) {
    ctx.beginPath(); ctx.moveTo(ROOM.x, y); ctx.lineTo(ROOM.x + ROOM.w, y); ctx.stroke();
  }
  // Room border.
  ctx.strokeStyle = P.wallTop;
  ctx.lineWidth = 6;
  ctx.strokeRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);
  // Soft spotlight pools so the room reads as a place, not a grid.
  for (const s of game.level.lights ?? []) {
    const g = ctx.createRadialGradient(s.x, s.y, 10, s.x, s.y, 190);
    g.addColorStop(0, 'rgba(255,220,140,0.10)');
    g.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(s.x - 190, s.y - 190, 380, 380);
  }
}

function drawExit(ctx, game) {
  const e = game.level.exit;
  const open = game.lootLeft === 0;
  const pulse = open ? 0.6 + Math.sin(game.time * 4) * 0.4 : 0.25;
  ctx.save();
  ctx.fillStyle = open ? `rgba(57,208,165,${0.25 + pulse * 0.25})` : 'rgba(57,208,165,0.12)';
  ctx.fillRect(e.x - 46, e.y - 14, 92, 28);
  ctx.strokeStyle = P.exit;
  ctx.lineWidth = 3;
  ctx.strokeRect(e.x - 46, e.y - 14, 92, 28);
  ctx.fillStyle = open ? '#b8ffe9' : P.exit;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT — GO!' : 'EXIT (locked)', e.x, e.y + 5);
  ctx.restore();
}

function drawLoot(ctx, game) {
  for (const item of game.loot) {
    if (item.taken) continue;
    const kind = LOOT_KINDS[item.kind];
    const bob = Math.sin(game.time * 3 + item.x) * 3;
    const g = ctx.createRadialGradient(item.x, item.y + bob, 4, item.x, item.y + bob, 46);
    g.addColorStop(0, 'rgba(245,197,66,0.5)');
    g.addColorStop(1, 'rgba(245,197,66,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(item.x, item.y + bob, 46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = kind.color;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(kind.glyph, item.x, item.y + 9 + bob);
    ctx.strokeStyle = 'rgba(245,197,66,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(item.x, item.y + bob, 20, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = P.goldGlow;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(money(item.value), item.x, item.y + 36 + bob);
  }
}

function drawVault(ctx, game) {
  const v = game.vault;
  if (!v) return;
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.fillStyle = '#232a45';
  ctx.fillRect(-34, -40, 68, 80);
  ctx.strokeStyle = P.gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(-34, -40, 68, 80);
  ctx.fillStyle = v.cracked ? P.safe : P.gold;
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0b0f1f';
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
  if (v.cracking > 0) {
    ctx.strokeStyle = P.gold;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, 24, -Math.PI / 2, -Math.PI / 2 + (v.cracking / 3) * Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = P.goldGlow;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(v.cracked ? 'CRACKED' : `VAULT ${money(v.value)}`, 0, 58);
  ctx.restore();
}

function drawCover(ctx, game) {
  for (const c of game.level.cover) {
    ctx.fillStyle = P.cover;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = P.coverTop;
    ctx.fillRect(c.x, c.y, c.w, 8);
    ctx.strokeStyle = '#16203a';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = P.muted;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const label = c.kind === 'wardrobe' ? 'HIDE (E)' : c.kind.toUpperCase();
    ctx.fillText(label, c.x + c.w / 2, c.y + c.h / 2 + 4);
  }
}

function drawLasers(ctx, game) {
  for (const lz of game.lasers ?? []) {
    const active = laserActive(lz, game.time);
    const horizontal = lz.w >= lz.h;
    const cx = lz.x + lz.w / 2;
    const cy = lz.y + lz.h / 2;
    // Emitter posts at both ends.
    for (const [px, py] of horizontal ? [[lz.x, cy], [lz.x + lz.w, cy]] : [[cx, lz.y], [cx, lz.y + lz.h]]) {
      ctx.fillStyle = '#3a1520';
      ctx.fillRect(px - 6, py - 6, 12, 12);
      ctx.fillStyle = active ? P.danger : '#7a2b36';
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    if (active) {
      ctx.strokeStyle = 'rgba(255,45,63,0.35)';
      ctx.lineWidth = 9;
      ctx.beginPath();
      if (horizontal) { ctx.moveTo(lz.x, cy); ctx.lineTo(lz.x + lz.w, cy); }
      else { ctx.moveTo(cx, lz.y); ctx.lineTo(cx, lz.y + lz.h); }
      ctx.stroke();
      ctx.strokeStyle = '#ff2d3f';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (horizontal) { ctx.moveTo(lz.x, cy); ctx.lineTo(lz.x + lz.w, cy); }
      else { ctx.moveTo(cx, lz.y); ctx.lineTo(cx, lz.y + lz.h); }
      ctx.stroke();
    } else {
      // Dark beam: faint dashed line so the player can still read the gap.
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = 'rgba(255,77,94,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (horizontal) { ctx.moveTo(lz.x, cy); ctx.lineTo(lz.x + lz.w, cy); }
      else { ctx.moveTo(cx, lz.y); ctx.lineTo(cx, lz.y + lz.h); }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = active ? P.danger : 'rgba(255,120,130,0.7)';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(active ? 'LASER — LIVE' : 'LASER — DARK', cx, lz.y - 8 < ROOM.y + 12 ? lz.y + lz.h + 16 : lz.y - 8);
    ctx.restore();
  }
}

function drawWalls(ctx, game) {
  for (const w of game.level.walls) {
    ctx.fillStyle = P.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = P.wallTop;
    if (w.w >= w.h) ctx.fillRect(w.x, w.y, w.w, 6);
    else ctx.fillRect(w.x, w.y, 6, w.h);
    ctx.strokeStyle = '#241d3f';
    ctx.lineWidth = 2;
    ctx.strokeRect(w.x, w.y, w.w, w.h);
  }
}

function wedge(ctx, x, y, angle, range, fov, fill, edge) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - fov / 2, angle + fov / 2);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawCones(ctx, game) {
  for (const g of game.guards) {
    const hot = g.alerted || g.chase;
    const lookout = g.type === 'lookout';
    wedge(ctx, g.x, g.y, g.angle,
      lookout ? TUNE.lookoutRange : TUNE.guardRange,
      lookout ? TUNE.lookoutFov : TUNE.guardFov,
      hot ? 'rgba(255,77,94,0.32)' : P.cone,
      hot ? 'rgba(255,77,94,0.7)' : P.coneEdge);
  }
  for (const c of game.cameras) {
    if (c.disabled > 0) continue;
    wedge(ctx, c.x, c.y, cameraAngle(c), TUNE.cameraRange, TUNE.cameraFov,
      c.seeing ? 'rgba(255,77,94,0.34)' : P.cameraCone,
      c.seeing ? 'rgba(255,77,94,0.7)' : P.cameraConeEdge);
  }
}

function drawCameras(ctx, game) {
  for (const c of game.cameras) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.fillStyle = c.disabled > 0 ? '#3a4358' : '#20263c';
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0b0f1f';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = c.disabled > 0 ? '#69738f' : c.seeing ? P.danger : '#50c8ff';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = c.disabled > 0 ? '#69738f' : '#9aa5c7';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.disabled > 0 ? `CAM OFF ${Math.ceil(c.disabled)}s` : 'CAMERA', c.x, c.y + 26);
  }
}

function drawGuards(ctx, game) {
  for (const g of game.guards) {
    const lookout = g.type === 'lookout';
    // Lookouts stand on a marked post; patrollers walk the floor.
    if (lookout) {
      ctx.strokeStyle = 'rgba(245,197,66,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(g.x, g.y, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(245,197,66,0.12)';
      ctx.beginPath(); ctx.arc(g.x, g.y, 22, 0, Math.PI * 2); ctx.fill();
    }
    // Body: brighter uniform with a pale outline so guards read at a glance.
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(2, 4, 15, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lookout ? '#8a2438' : '#46538a';
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#dfe6ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = lookout ? '#ffd94d' : P.guardHat;
    ctx.beginPath(); ctx.arc(0, -2, 10, Math.PI, 0); ctx.fill();
    ctx.fillRect(-11, -4, 22, 3);
    const fx = Math.cos(g.angle) * 16;
    const fy = Math.sin(g.angle) * 16;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.restore();
    if (lookout) {
      ctx.fillStyle = '#ffd94d';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LOOKOUT', g.x, g.y + 34);
    }
    // Suspicion / alert mark.
    if (g.suspicion > 0.12 || g.alerted) {
      const hot = g.alerted || g.chase;
      ctx.fillStyle = hot ? P.danger : P.gold;
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(hot ? '!' : '?', g.x, g.y - 24);
    }
    if (g.suspicion > 0.05 && !g.alerted) {
      ctx.strokeStyle = 'rgba(245,197,66,0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(g.x, g.y, 21, -Math.PI / 2, -Math.PI / 2 + g.suspicion * Math.PI * 2); ctx.stroke();
    }
    // Searching: a guard who lost you scans the spot — show it.
    if (g.searchT > 0) {
      ctx.fillStyle = P.gold;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SEARCHING…', g.x, g.y - 40);
    }
  }
}

function drawCoins(ctx, game) {
  for (const coin of game.coins) {
    ctx.fillStyle = P.gold;
    ctx.beginPath(); ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6d1f';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawThief(ctx, game) {
  const t = game.thief;
  if (t.hidden) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = P.coverTop;
    ctx.beginPath(); ctx.arc(t.x, t.y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = P.muted;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN — press E to slip out', t.x, t.y - 24);
    return;
  }
  if (game.smokeActive) {
    ctx.fillStyle = 'rgba(200,210,235,0.35)';
    ctx.beginPath(); ctx.arc(t.x, t.y, 46, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save();
  ctx.translate(t.x, t.y);
  // Gold ring so the thief always pops against the dark floor.
  ctx.strokeStyle = 'rgba(255,233,163,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(2, 4, 14, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = P.thiefCoat;
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2a0a10';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Mask + eyes.
  ctx.fillStyle = P.thief;
  ctx.beginPath(); ctx.arc(0, -1, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1c0a0e';
  ctx.fillRect(-7, -4, 14, 4);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-4, -3, 2, 2);
  ctx.fillRect(3, -3, 2, 2);
  ctx.restore();
  ctx.fillStyle = P.text;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t.sneaking ? 'SNEAKING' : 'YOU', t.x, t.y - 22);
}

function drawHud(ctx, game) {
  // Top bar.
  ctx.fillStyle = P.panel;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.strokeStyle = '#2a3358';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, HUD_H); ctx.lineTo(VIEW_W, HUD_H); ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = P.gold;
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.fillText('THE VELVET VAULT', 20, 30);
  ctx.fillStyle = P.text;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText(game.level.name, 20, 54);

  // Loot counter.
  const got = game.loot.filter((l) => l.taken).length;
  ctx.fillStyle = P.goldGlow;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(`◆ LOOT ${got}/${game.loot.length}   ${money(game.levelScore)}`, 300, 32);
  ctx.fillStyle = P.muted;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`SCORE ${money(game.score)}   LEVEL ${game.levelIndex + 1}/${LEVELS_LIST.length}`, 300, 54);

  // Alarm meter — the big one, centre-right.
  const ax = 640;
  const aw = 300;
  const alarm = game.alarm;
  const col = alarm < 35 ? P.safe : alarm < 70 ? P.gold : P.danger;
  ctx.fillStyle = '#1a2140';
  ctx.fillRect(ax, 18, aw, 22);
  ctx.fillStyle = col;
  ctx.fillRect(ax, 18, aw * clamp(alarm / 100, 0, 1), 22);
  ctx.strokeStyle = '#f2ead8';
  ctx.lineWidth = 2;
  ctx.strokeRect(ax, 18, aw, 22);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`ALARM ${Math.floor(alarm)}%`, ax + aw / 2, 34);
  ctx.fillStyle = alarm >= 70 ? P.danger : P.muted;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(game.lockdown ? '🔒 LOCKDOWN — REACH THE EXIT!' : alarm >= 70 ? 'THEY KNOW YOU ARE HERE' : 'stay out of the cones', ax + aw / 2, 56);

  // Timer + lives, right side.
  ctx.textAlign = 'right';
  ctx.fillStyle = game.timeLeft < 30 ? P.danger : P.text;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`⏱ ${formatTime(game.timeLeft)}`, VIEW_W - 24, 30);
  ctx.fillStyle = P.muted;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`${'♥'.repeat(Math.max(0, game.lives))}   ● coins ${game.coinsLeft}   ☁ smoke ${game.smokeLeft}   ⚡ EMP ${game.empLeft}   ${game.muted ? 'MUTED (M)' : 'M mute'}`, VIEW_W - 24, 54);

  // Bottom hint strip.
  ctx.fillStyle = 'rgba(10,14,30,0.85)';
  ctx.fillRect(0, VIEW_H - 34, VIEW_W, 34);
  ctx.fillStyle = P.muted;
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(game.hintText, 20, VIEW_H - 12);
  ctx.textAlign = 'right';
  ctx.fillText('WASD move · SHIFT sneak · CLICK toss coin · E grab/hide · SPACE smoke · Q EMP · H hint · P pause', VIEW_W - 20, VIEW_H - 12);
}

function drawBanner(ctx, game) {
  if (!game.banner) return;
  ctx.save();
  ctx.globalAlpha = clamp(game.bannerT, 0, 1);
  ctx.fillStyle = 'rgba(10,14,30,0.8)';
  const w = 460;
  ctx.fillRect(VIEW_W / 2 - w / 2, 96, w, 44);
  ctx.strokeStyle = P.gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(VIEW_W / 2 - w / 2, 96, w, 44);
  ctx.fillStyle = P.goldGlow;
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.banner, VIEW_W / 2, 125);
  ctx.restore();
}

function panel(ctx, title, lines, accent, dim = 0.82) {
  ctx.fillStyle = `rgba(8,11,24,${dim})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 640;
  const h = 130 + lines.length * 30;
  const x = VIEW_W / 2 - w / 2;
  const y = VIEW_H / 2 - h / 2;
  ctx.fillStyle = P.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent ?? P.gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent ?? P.gold;
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText(title, VIEW_W / 2, y + 58);
  ctx.fillStyle = P.text;
  ctx.font = '17px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, y + 104 + i * 30));
}

function drawScreen(ctx, game) {
  if (game.screen === 'title') {
    panel(ctx, 'THE VELVET VAULT', [
      'Seven jobs. Seven rooms. One crew, one getaway driver, no plan B.',
      'Cross each room, dodge the guards and their vision cones,',
      'beat the cameras and the lasers, grab every piece of loot, reach the green door.',
      'Click anywhere or press ENTER to pick a job — H shows how to play.',
    ], P.gold, 0.55);
    drawLevelList(ctx, game);
  } else if (game.screen === 'howto') {
    panel(ctx, 'HOW TO PLAY', [
      'WASD / arrows — move      SHIFT — sneak (slower, harder to see)',
      'CLICK — toss a coin, guards come to look      E — grab loot, hide, crack the vault',
      'SPACE — smoke bomb (invisible 3s)      Q — EMP, cameras off for 8s',
      'Guards and cameras raise the ALARM when they see you.',
      'Lasers blink on and off — cross while dark; a trip sounds the alarm.',
      'Lookouts never move and watch a wide arc — give them room.',
      'A guard who loses you searches the spot, then goes back to patrol.',
      'At 100% the room locks down — reach the exit or get caught.',
      '',
      'Click or press ENTER to go back.',
    ], P.safe);
  } else if (game.screen === 'paused') {
    panel(ctx, 'PAUSED', ['Take a breath. The guards are still walking their rounds.', 'P or click to keep going — R restarts the job.'], P.muted);
  } else if (game.screen === 'busted') {
    panel(ctx, 'BUSTED!', [
      `The guards caught you in ${game.level.name}.`,
      `Loot kept so far: ${money(game.levelScore)} — the crew still believes in you.`,
      '',
      'ENTER — try the job again      T — back to the job list',
    ], P.danger);
  } else if (game.screen === 'clear') {
    panel(ctx, 'CLEAN GETAWAY!', [
      `${game.level.name} — all loot out the door.`,
      `Loot ${money(game.levelScore)}  +  time bonus ${money(game.clearBonus)}  =  ${money(game.clearTotal)}`,
      `Alarm peaked at ${Math.floor(game.peakAlarm)}% — ${game.peakAlarm < 35 ? 'a ghost, nobody saw a thing' : game.peakAlarm < 70 ? 'a few close calls' : 'loud, but the crew got out'}.`,
      '',
      'ENTER — next job',
    ], P.safe);
  } else if (game.screen === 'win') {
    panel(ctx, 'THE CREW ESCAPES', [
      `All ${LEVELS_LIST.length} jobs done. The Velvet Vault retires undefeated.`,
      `Final score ${money(game.score)} — loot ${money(game.totalLoot)} across ${LEVELS_LIST.length} rooms.`,
      `Times caught: ${game.timesCaught}   ·   Best alarm peak: ${Math.floor(game.bestPeak)}%`,
      '',
      'ENTER — play it all again',
    ], P.gold);
  }
}

function drawLevelList(ctx, game) {
  const y0 = VIEW_H / 2 + 138;
  ctx.textAlign = 'left';
  ctx.font = '16px system-ui, sans-serif';
  game.levelButtons = [];
  LEVELS_LIST.forEach((lv, i) => {
    const y = y0 + i * 34;
    const done = game.cleared.has(i);
    ctx.fillStyle = done ? P.safe : P.text;
    ctx.fillText(`${done ? '✓' : `${i + 1}.`}  ${lv.name} — ${lv.sub}`, VIEW_W / 2 - 300, y);
    game.levelButtons.push({ x: VIEW_W / 2 - 300, y: y - 18, w: 600, h: 28, level: i });
  });
}

// Levels list is filled in by main.js (avoids a circular import).
export let LEVELS_LIST = [];
export function setLevelsList(list) {
  LEVELS_LIST = list;
}
