export class InputManager {
  constructor() {
    this._queue = [];
    this._keys = {};
    this._touchStart = null;

    window.addEventListener('keydown', (e) => {
      this._keys[e.code] = true;
      const action = this._mapKey(e.code);
      if (action) this._queue.push(action);
    });
    window.addEventListener('keyup', (e) => { this._keys[e.code] = false; });

    window.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      this._touchStart = { x: t.clientX, y: t.clientY, time: performance.now() };
    }, { passive: true });
    window.addEventListener('touchend', (e) => {
      if (!this._touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this._touchStart.x;
      const dy = t.clientY - this._touchStart.y;
      const dt = performance.now() - this._touchStart.time;
      this._touchStart = null;
      if (dt > 500) return;
      const absDx = Math.abs(dx), absDy = Math.abs(dy);
      if (absDx < 20 && absDy < 20) return;
      if (absDx > absDy) {
        this._queue.push(dx > 0 ? 'right' : 'left');
      } else {
        this._queue.push(dy < 0 ? 'jump' : 'slide');
      }
    }, { passive: true });
  }

  _mapKey(code) {
    switch (code) {
      case 'KeyA': case 'ArrowLeft':  return 'left';
      case 'KeyD': case 'ArrowRight': return 'right';
      case 'KeyW': case 'ArrowUp': case 'Space': return 'jump';
      case 'KeyS': case 'ArrowDown': return 'slide';
      case 'Enter': return 'confirm';
      default: return null;
    }
  }

  poll() {
    const q = this._queue;
    this._queue = [];
    return q;
  }

  isDown(code) {
    return !!this._keys[code];
  }
}
