// The Velvet Vault — shots: deterministic staged frames for screenshots.
// ?shot=start shows the title over a live room; ?shot=play a mid-heist
// Crown Jewels with a lookout cone, a dog cone, the keycard door and the
// gold keycard, lasers, cameras, loot and the alarm meter all in one frame;
// ?shot=alarm a lockdown chase in the Diamond Exchange; ?shot=win the
// getaway screen. Every shot is a real render of the game's own code.
// Banners are cleared in the play shot so nothing covers the room.

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
    game.hintText = 'Pick a job below — or press 1-9 to jump straight in.';
    return true;
  }

  if (shot === 'play') {
    // Mid-heist in the Crown Jewels (job 8): thief sneaking across the
    // open floor under the lookout's wide cone, a guard dog about to catch
    // the scent, both lasers live, cameras sweeping, the gold keycard
    // still on its stand east, the red keycard door shut over the crown,
    // alarm at 35%.
    // game.time = 0.6 puts every laser in its live window.
    startLevel(7);
    game.screen = 'play';
    game.time = 0.6;
    game.banner = null;
    game.bannerT = 0;
    game.thief.x = 500; game.thief.y = 470;
    game.thief.sneaking = true;
    game.loot[1].taken = true;
    game.loot[4].taken = true;
    game.levelScore = 1400;
    game.score = 1400;
    game.totalLoot = 1400;
    game.alarm = 35;
    game.peakAlarm = 35;
    game.timeLeft = 168;
    // Lookout sweeps down onto the thief (scan sets its angle); "?" up.
    game.guards[0].scan = 0.95; game.guards[0].angle = 2.36; game.guards[0].suspicion = 0.45;
    // Dog 1 has the scent: close in, cone on the thief, "?" up.
    game.guards[1].x = 380; game.guards[1].y = 400; game.guards[1].angle = 0.53; game.guards[1].suspicion = 0.5;
    // Dog 2 watches the east corridor by the keycard.
    game.guards[2].x = 1100; game.guards[2].y = 560; game.guards[2].angle = Math.PI;
    game.guards[3].x = 700; game.guards[3].y = 520; game.guards[3].angle = -2.89;
    game.guards[4].x = 1000; game.guards[4].y = 300; game.guards[4].angle = 0;
    game.cameras[0].t = 1.2;
    game.cameras[1].t = 2.6;
    game.cameras[2].t = 0.4;
    game.coins.push({ x: 820, y: 470, t: 9 });
    game.hintText = 'The crown is behind the keycard door — grab the gold card, mind the dogs.';
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
    game.hintText = 'LOCKDOWN — vault cracked. Run for the green door!';
    return true;
  }

  if (shot === 'win') {
    // Getaway screen after the final job: the crew escapes, all 9 jobs done.
    startLevel(8);
    game.screen = 'win';
    game.levelScore = 5200;
    game.clearBonus = 1800;
    game.clearTotal = 7000;
    game.score = 24800;
    game.totalLoot = 20400;
    game.timesCaught = 1;
    game.bestPeak = 22;
    game.peakAlarm = 22;
    game.loot.forEach((l) => { l.taken = true; });
    game.vault.cracked = true;
    game.lootLeft = 0;
    game.alarm = 10;
    game.timeLeft = 104;
    return true;
  }

  return false;
}

// Keep the money import used (screenshot captions price loot in the HUD).
void money;
