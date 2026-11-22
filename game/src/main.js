// The Velvet Vault — main: game state, the loop, loot, vaults, hiding,
// gadgets, alarm and lockdown, scoring, screens and the ?shot= presets.

import { VIEW_W, VIEW_H, ROOM, TUNE, clamp, dist, circleVsRect, money } from './config.js';
import { LEVELS } from './levels.js';
import { makeGuard, updateGuard, guardCatchesThief, distractGuards } from './guards.js';
import { makeCamera, updateCamera, empBlast } from './cameras.js';
import { makeInput, moveVector } from './input.js';
import { drawGame, setLevelsList } from './render.js';
import * as audio from './audio.js';
import { applyShot } from './shots.js';

setLevelsList(LEVELS);

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const game = {
  screen: 'title', // title | howto | play | paused | busted | clear | win
  levelIndex: 0,
  level: LEVELS[0],
  guards: [],
  cameras: [],
  loot: [],
  vault: null,
  coins: [], // tossed coins on the floor
  thief: { x: 96, y: 150, r: 13, sneaking: false, hidden: false },
  blockers: [],
  alarm: 0,
  peakAlarm: 0,
  bestPeak: 100,
  lockdown: false,
  lockdownT: 0,
  hideBreakT: 0,
  time: 0,
  timeLeft: TUNE.levelTime,
  score: 0,
  levelScore: 0,
  totalLoot: 0,
  lives: 3,
  timesCaught: 0,
  coinsLeft: 5,
  smokeLeft: 2,
  empLeft: 1,
  smokeActive: 0,
  lastSeen: null,
  banner: null,
  bannerT: 0,
  hintText: 'Pick a job below — or press 1-6 to jump straight in.',
  cleared: new Set(),
  muted: false,
  clearBonus: 0,
  clearTotal: 0,
  levelButtons: [],
};

const input = makeInput(canvas);

export function startLevel(index) {
  const level = LEVELS[index];
  game.levelIndex = index;
  game.level = level;
  game.guards = level.guards.map(makeGuard);
  game.cameras = level.cameras.map(makeCamera);
  game.loot = level.loot.map((l) => ({ ...l, taken: false }));
  game.vault = level.vault ? { ...level.vault, cracked: false, cracking: 0 } : null;
  game.coins = [];
  game.thief.x = level.spawn[0];
  game.thief.y = level.spawn[1];
  game.thief.hidden = false;
  game.blockers = [
    ...level.walls,
    ...level.cover,
    { x: ROOM.x - 20, y: ROOM.y - 20, w: 20, h: ROOM.h + 40 },
    { x: ROOM.x + ROOM.w, y: ROOM.y - 20, w: 20, h: ROOM.h + 40 },
    { x: ROOM.x - 20, y: ROOM.y - 20, w: ROOM.w + 40, h: 20 },
    { x: ROOM.x - 20, y: ROOM.y + ROOM.h, w: ROOM.w + 40, h: 20 },
  ];
  game.alarm = 0;
  game.peakAlarm = 0;
  game.lockdown = false;
  game.lockdownT = 0;
  game.hideBreakT = 0;
  game.time = 0;
  game.timeLeft = level.time;
  game.levelScore = 0;
  game.coinsLeft = level.coins;
  game.smokeLeft = level.smoke;
  game.empLeft = level.emp;
  game.smokeActive = 0;
  game.lastSeen = null;
  game.hintText = level.hint;
  game.screen = 'play';
  showBanner(level.name);
  audio.ensureAudio();
}

function showBanner(text) {
  game.banner = text;
  game.bannerT = 1;
}

function lootLeft() {
  const left = game.loot.filter((l) => !l.taken).length;
  return left + (game.vault && !game.vault.cracked ? 1 : 0);
}

function nearCoverHide() {
  return game.level.cover.find(
    (c) => c.hide && dist(game.thief.x, game.thief.y, c.x + c.w / 2, c.y + c.h / 2) < 70,
  );
}

function updatePlay(dt) {
  game.time += dt;
  game.timeLeft -= dt;
  if (game.bannerT > 0) game.bannerT -= dt * 0.5;
  if (game.smokeActive > 0) game.smokeActive -= dt;

  // Movement.
  const mv = moveVector(input);
  const speed = input.keys.has('sneak') ? TUNE.thiefSneak : TUNE.thiefSpeed;
  game.thief.sneaking = input.keys.has('sneak') && (mv.x !== 0 || mv.y !== 0);
  if (!game.thief.hidden) {
    game.thief.x = clamp(game.thief.x + mv.x * speed * dt, ROOM.x + 14, ROOM.x + ROOM.w - 14);
    game.thief.y = clamp(game.thief.y + mv.y * speed * dt, ROOM.y + 14, ROOM.y + ROOM.h - 14);
    for (const b of game.blockers) {
      const fix = circleVsRect(game.thief.x, game.thief.y, game.thief.r, b);
      if (fix) {
        game.thief.x = fix.x;
        game.thief.y = fix.y;
      }
    }
  }

  // Guards and cameras.
  for (const g of game.guards) updateGuard(g, dt, game);
  for (const c of game.cameras) updateCamera(c, dt, game);

  // Alarm: rises while seen, falls when quiet.
  const seenByGuard = game.guards.some((g) => g.seen);
  const seenByCamera = game.cameras.some((c) => c.seeing);
  if (seenByGuard || seenByCamera) {
    game.alarm += (seenByCamera ? TUNE.cameraAlarmPerSecond : TUNE.alarmPerSecondSeen) * dt;
    if (seenByCamera && !game.cameraWarned) {
      game.cameraWarned = true;
      audio.sfxAlert();
    }
  } else {
    game.cameraWarned = false;
    game.alarm -= TUNE.alarmDecay * dt;
  }
  game.alarm = clamp(game.alarm, 0, 100);
  game.peakAlarm = Math.max(game.peakAlarm, game.alarm);
  audio.alarmDrone(game.alarm / 100);

  // Lockdown at 100%: guards hunt; hide 5s to break it.
  if (game.alarm >= 100 && !game.lockdown) {
    game.lockdown = true;
    game.lockdownT = TUNE.lockdownSeconds;
    showBanner('LOCKDOWN! Reach the exit!');
    audio.sfxAlert();
  }
  if (game.lockdown) {
    game.lockdownT -= dt;
    const anySees = seenByGuard || seenByCamera;
    if (!anySees) game.hideBreakT += dt;
    else game.hideBreakT = 0;
    if (game.hideBreakT > TUNE.hideBreakSeconds || game.lockdownT <= 0) {
      game.lockdown = false;
      game.alarm = 60;
      game.hideBreakT = 0;
      showBanner('They lost you… for now.');
    }
  }

  // Caught?
  for (const g of game.guards) {
    if (guardCatchesThief(g, game.thief)) {
      busted();
      return;
    }
  }
  if (game.timeLeft <= 0) {
    game.timeLeft = 0;
    busted('Time ran out — the morning crew walked in.');
    return;
  }

  // Loot pickup.
  for (const item of game.loot) {
    if (!item.taken && dist(game.thief.x, game.thief.y, item.x, item.y) < TUNE.lootRadius) {
      item.taken = true;
      game.levelScore += item.value;
      game.totalLoot += item.value;
      audio.sfxPickup();
      showBanner(`+${money(item.value)} — ${item.kind}`);
    }
  }

  // Vault cracking: hold E beside it.
  const v = game.vault;
  if (v && !v.cracked) {
    const near = dist(game.thief.x, game.thief.y, v.x, v.y) < 64;
    if (near && input.keys.has('use')) {
      v.cracking += dt;
      if (Math.floor(v.cracking * 4) !== Math.floor((v.cracking - dt) * 4)) audio.sfxVaultTick();
      if (v.cracking >= 3) {
        v.cracked = true;
        game.levelScore += v.value;
        game.totalLoot += v.value;
        audio.sfxWin();
        showBanner(`VAULT CRACKED +${money(v.value)}`);
      }
    } else {
      v.cracking = Math.max(0, v.cracking - dt * 2);
    }
  }

  // Hiding: press E beside a wardrobe.
  if (input.pressed.has('use')) {
    const spot = nearCoverHide();
    if (spot) {
      game.thief.hidden = !game.thief.hidden;
      if (game.thief.hidden) {
        game.thief.x = spot.x + spot.w / 2;
        game.thief.y = spot.y + spot.h / 2;
        game.alarm = Math.max(0, game.alarm - 15);
        audio.sfxClick();
      }
    }
  }

  // Coin toss: click in the room.
  if (input.click) {
    const { x, y } = input.click;
    input.click = null;
    if (game.coinsLeft > 0 && x > ROOM.x && x < ROOM.x + ROOM.w && y > ROOM.y && y < ROOM.y + ROOM.h) {
      game.coinsLeft -= 1;
      game.coins.push({ x, y, t: 12 });
      const n = distractGuards(game.guards, x, y);
      if (n > 0) {
        audio.sfxCoin();
        showBanner(n === 1 ? 'A guard went to look…' : `${n} guards went to look…`);
      }
    }
  }
  for (const coin of game.coins) coin.t -= dt;
  game.coins = game.coins.filter((c) => c.t > 0);

  // Smoke bomb.
  if (input.pressed.has('smoke') && game.smokeLeft > 0 && game.smokeActive <= 0) {
    game.smokeLeft -= 1;
    game.smokeActive = 3;
    game.alarm = Math.max(0, game.alarm - 20);
    for (const g of game.guards) g.suspicion = Math.max(0, g.suspicion - 0.6);
    audio.sfxSmoke();
    showBanner('Smoke! They cannot see you.');
  }
  // EMP.
  if (input.pressed.has('emp') && game.empLeft > 0) {
    game.empLeft -= 1;
    empBlast(game.cameras, 8);
    audio.sfxEmp();
    showBanner('EMP — cameras down for 8 seconds.');
  }
  // Hint / pause / restart.
  if (input.pressed.has('hint')) {
    game.hintText = game.level.hint;
    showBanner(game.level.hint);
  }
  if (input.pressed.has('pause')) {
    game.screen = 'paused';
    audio.stopAlarmDrone();
  }
  if (input.pressed.has('restart')) startLevel(game.levelIndex);

  // Exit: all loot (and vault) done, step into the green door.
  game.lootLeft = lootLeft();
  if (game.lootLeft === 0) {
    const e = game.level.exit;
    if (dist(game.thief.x, game.thief.y, e.x, e.y) < TUNE.exitRadius) levelClear();
  }
}

function levelClear() {
  game.clearBonus = Math.round(game.timeLeft) * 10 + Math.max(0, Math.round(100 - game.peakAlarm)) * 5;
  game.clearTotal = game.levelScore + game.clearBonus;
  game.score += game.clearTotal;
  game.bestPeak = Math.min(game.bestPeak, game.peakAlarm);
  game.cleared.add(game.levelIndex);
  audio.sfxWin();
  audio.stopAlarmDrone();
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.screen = 'win';
  } else {
    game.screen = 'clear';
  }
}

function busted(reason) {
  game.timesCaught += 1;
  game.lives -= 1;
  audio.sfxCaught();
  audio.stopAlarmDrone();
  if (reason) game.hintText = reason;
  if (game.lives <= 0) {
    game.lives = 3;
    game.score = Math.max(0, game.score - 500);
    game.screen = 'busted';
    game.hintText = 'The crew posts bail. Three fresh lives — try the job again.';
  } else {
    game.screen = 'busted';
  }
}

function updateScreens(dt) {
  if (game.bannerT > 0) game.bannerT -= dt * 0.5;
  // Animate the title scene behind the panel: slow guard patrol.
  if (game.screen === 'title' || game.screen === 'howto') {
    game.time += dt;
    for (const g of game.guards) updateGuard(g, dt, { ...game, thief: { x: -999, y: -999, sneaking: false, hidden: true }, smokeActive: 0 });
  }
  if (input.pressed.has('confirm') || input.click) {
    const click = input.click;
    input.click = null;
    if (game.screen === 'title') {
      if (click) {
        for (const b of game.levelButtons) {
          if (click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h) {
            audio.sfxClick();
            startLevel(b.level);
            return;
          }
        }
      }
      // ENTER on title opens the first uncleared job.
      if (input.pressed.has('confirm')) {
        let next = 0;
        while (game.cleared.has(next) && next < LEVELS.length - 1) next += 1;
        startLevel(next);
      }
    } else if (game.screen === 'howto') {
      game.screen = 'title';
    } else if (game.screen === 'paused') {
      game.screen = 'play';
    } else if (game.screen === 'busted') {
      if (input.pressed.has('confirm')) startLevel(game.levelIndex);
    } else if (game.screen === 'clear') {
      if (input.pressed.has('confirm')) startLevel(game.levelIndex + 1);
    } else if (game.screen === 'win') {
      if (input.pressed.has('confirm')) {
        game.score = 0;
        game.totalLoot = 0;
        game.timesCaught = 0;
        game.cleared.clear();
        game.lives = 3;
        startLevel(0);
      }
    }
  }
  // Number keys jump to a job from the title.
  if (game.screen === 'title') {
    for (let i = 0; i < LEVELS.length; i += 1) {
      if (input.pressed.has(`digit${i + 1}`)) startLevel(i);
    }
  }
  if (input.pressed.has('escape') && game.screen === 'howto') game.screen = 'title';
  if (game.screen === 'title' && input.pressed.has('hint')) game.screen = 'howto';
}

// Number keys are not in the input map; watch them directly.
window.addEventListener('keydown', (e) => {
  if (/^Digit[1-6]$/.test(e.code)) input.pressed.add(`digit${e.code.slice(5)}`);
  if (e.code === 'KeyT' && game.screen === 'busted') game.screen = 'title';
  if (e.code === 'KeyM') game.muted = audio.toggleMute();
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game.screen === 'play') updatePlay(dt);
  else updateScreens(dt);
  drawGame(ctx, game);
  input.pressed.clear();
  requestAnimationFrame(frame);
}

// Boot: title screen shows level 1's room alive behind the panel.
startLevel(0);
game.screen = 'title';
game.hintText = 'Pick a job below — or press 1-6 to jump straight in.';

// Deterministic staged frames for screenshots (?shot=start|play|alarm|win).
if (applyShot(game, startLevel, { LEVELS })) {
  drawGame(ctx, game);
} else {
  requestAnimationFrame(frame);
}
