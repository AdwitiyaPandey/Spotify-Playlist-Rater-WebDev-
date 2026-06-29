import { Game } from './game/Game.js';

const game = new Game();
let lastTime = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  game.update(dt);
  game.render();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
