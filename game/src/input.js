// The Velvet Vault — input: WASD / arrows to move, SHIFT to sneak,
// mouse click to toss a coin, E to grab / hide / crack, SPACE smoke,
// Q EMP, H hint, M mute, P pause, R restart.

export function makeInput(canvas) {
  const input = {
    keys: new Set(),
    click: null, // {x, y} in canvas coords, consumed by the game
    pressed: new Set(), // keys pressed since last frame, consumed by the game
    mouse: { x: 0, y: 0 },
  };

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'sneak', ShiftRight: 'sneak',
    KeyE: 'use', Space: 'smoke',
    KeyQ: 'emp', KeyH: 'hint',
    KeyM: 'mute', KeyP: 'pause', KeyR: 'restart',
    Enter: 'confirm', Escape: 'escape',
  };

  window.addEventListener('keydown', (e) => {
    const action = KEYMAP[e.code];
    if (!action) return;
    if (['up', 'down', 'left', 'right', 'smoke'].includes(action)) e.preventDefault();
    if (!e.repeat) input.pressed.add(action);
    input.keys.add(action);
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) input.keys.delete(action);
  });
  window.addEventListener('blur', () => input.keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
    input.mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
  });
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    input.click = {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  });
  return input;
}

export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has('left')) x -= 1;
  if (input.keys.has('right')) x += 1;
  if (input.keys.has('up')) y -= 1;
  if (input.keys.has('down')) y += 1;
  if (x !== 0 && y !== 0) {
    x *= Math.SQRT1_2;
    y *= Math.SQRT1_2;
  }
  return { x, y };
}
