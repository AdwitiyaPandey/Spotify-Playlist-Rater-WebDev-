export class HUD {
  constructor() {
    this.el = document.getElementById('hud');
    this.distEl = document.getElementById('distance');
    this.multEl = document.getElementById('multiplier');
    this.proxFill = document.getElementById('proximity-fill');
    this.proxLabel = document.getElementById('proximity-label');
    this.phaseLabel = document.getElementById('phase-label');
    this.overlay = document.getElementById('overlay');
    this.overlayContent = document.getElementById('overlay-content');
    this.controlsHint = document.getElementById('controls-hint');
    this.loadingEl = document.getElementById('loading');
  }

  show() { this.el.classList.remove('hidden'); }
  hide() { this.el.classList.add('hidden'); }

  hideLoading() { this.loadingEl.classList.add('hidden'); }

  showControls() { this.controlsHint.classList.remove('hidden'); }
  hideControls() { this.controlsHint.classList.add('hidden'); }

  updateDistance(meters) {
    this.distEl.textContent = `${Math.floor(meters)}m`;
  }

  updateMultiplier(mult) {
    this.multEl.textContent = `×${mult}`;
    this.multEl.style.color = mult > 1 ? '#ffcc02' : '#fff';
  }

  updateProximity(ratio, name) {
    const pct = Math.min(100, Math.max(0, ratio * 100));
    this.proxFill.style.width = `${pct}%`;
    this.proxLabel.textContent = name || 'Pursuer';
  }

  setPhase(text) {
    this.phaseLabel.textContent = text;
  }

  showOverlay(html) {
    this.overlayContent.innerHTML = html;
    this.overlay.classList.remove('hidden');
  }

  hideOverlay() {
    this.overlay.classList.add('hidden');
  }

  showGameOver(distance, tokens) {
    this.showOverlay(`
      <h2>Caught!</h2>
      <p>Distance: ${Math.floor(distance)}m</p>
      <p>Tokens: ${tokens}</p>
      <button id="restart-btn">Run Again</button>
      <p class="hint">Press Enter or click to restart</p>
    `);
    setTimeout(() => {
      const btn = document.getElementById('restart-btn');
      if (btn) btn.focus();
    }, 100);
  }
}
