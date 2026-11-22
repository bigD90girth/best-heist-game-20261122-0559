// The Velvet Vault — shots: deterministic staged frames for screenshots.
// ?shot=start shows the title over a live room; ?shot=play a mid-heist
// casino with cones, cameras, loot and the alarm meter all in one frame;
// ?shot=alarm a lockdown chase in the Diamond Exchange; ?shot=win the
// getaway screen. Every shot is a real render of the game's own code.

import { money } from './config.js';

export function applyShot(game, startLevel, { LEVELS }) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return false;
  const seed = Number(params.get('seed') ?? 1);
  game.time = seed * 1.7;

  if (shot === 'start') {
    // Title over level 1's gallery, guards mid-patrol.
    startLevel(0);
    game.screen = 'title';
    game.guards[0].x = 880; game.guards[0].y = 240; game.guards[0].angle = Math.PI / 2;
    game.guards[1].x = 460; game.guards[1].y = 520; game.guards[1].angle = 0;
    game.hintText = 'Pick a job below — or press 1-6 to jump straight in.';
    return true;
  }

  if (shot === 'play') {
    // Mid-heist in the casino: thief beside a chip stack, two guards
    // sweeping, a camera cone crossing the floor, alarm at 35%.
    startLevel(2);
    game.screen = 'play';
    game.thief.x = 660; game.thief.y = 430;
    game.thief.sneaking = true;
    game.loot[0].taken = true;
    game.loot[1].taken = true;
    game.levelScore = 800;
    game.score = 800;
    game.totalLoot = 800;
    game.alarm = 35;
    game.peakAlarm = 35;
    game.timeLeft = 132;
    game.guards[0].x = 700; game.guards[0].y = 250; game.guards[0].angle = Math.PI * 0.5; game.guards[0].suspicion = 0.45;
    game.guards[1].x = 560; game.guards[1].y = 520; game.guards[1].angle = -Math.PI * 0.5;
    game.guards[2].x = 1130; game.guards[2].y = 400; game.guards[2].angle = Math.PI;
    game.cameras[0].t = 1.2;
    game.cameras[1].t = 2.6;
    game.cameras[2].t = 0.4;
    game.hintText = 'Two chips down — the vault of chips is across the tables. Watch the cones.';
    return true;
  }

  if (shot === 'alarm') {
    // Lockdown in the Diamond Exchange: alarm 82%, a guard closing in,
    // thief in smoke by the vault, EMP spent, one camera down.
    startLevel(5);
    game.screen = 'play';
    game.thief.x = 640; game.thief.y = 300;
    game.smokeActive = 2.2;
    game.loot[0].taken = true;
    game.loot[1].taken = true;
    game.loot[4].taken = true;
    game.vault.cracked = true;
    game.levelScore = 4600;
    game.score = 4600;
    game.totalLoot = 4600;
    game.alarm = 82;
    game.peakAlarm = 82;
    game.lockdown = true;
    game.lockdownT = 8;
    game.timeLeft = 74;
    game.coinsLeft = 1;
    game.smokeLeft = 0;
    game.empLeft = 0;
    game.guards[0].x = 640; game.guards[0].y = 380; game.guards[0].angle = -Math.PI / 2; game.guards[0].chase = true; game.guards[0].alerted = true;
    game.guards[1].x = 300; game.guards[1].y = 320; game.guards[1].angle = 0;
    game.guards[3].x = 480; game.guards[3].y = 600; game.guards[3].angle = Math.PI / 2;
    game.cameras[0].disabled = 5;
    game.cameras[1].t = 1.8;
    game.coins.push({ x: 760, y: 420, t: 9 });
    game.banner = 'LOCKDOWN! Reach the exit!';
    game.bannerT = 1;
    game.hintText = 'LOCKDOWN — the vault is cracked, but the room is hunting you. Run for the green door!';
    return true;
  }

  if (shot === 'win') {
    // Getaway screen after the bank job: score breakdown on show.
    startLevel(1);
    game.screen = 'clear';
    game.levelScore = 3400;
    game.clearBonus = 1450;
    game.clearTotal = 4850;
    game.score = 4850;
    game.peakAlarm = 28;
    game.loot.forEach((l) => { l.taken = true; });
    game.vault.cracked = true;
    game.lootLeft = 0;
    game.alarm = 12;
    game.timeLeft = 96;
    return true;
  }

  return false;
}

// Keep the money import used (screenshot captions price loot in the HUD).
void money;
