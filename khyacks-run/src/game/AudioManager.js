export class AudioManager {
  constructor() {
    this._ctx = null;
    this._started = false;
  }

  _ensure() {
    if (this._ctx) return this._ctx;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    return this._ctx;
  }

  resume() {
    const ctx = this._ensure();
    if (ctx.state === 'suspended') ctx.resume();
    this._started = true;
  }

  _tone(freq, dur, type = 'square', vol = 0.15) {
    if (!this._started) return;
    const ctx = this._ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  _noise(dur, vol = 0.1) {
    if (!this._started) return;
    const ctx = this._ensure();
    const bufSize = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * vol;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(gain).connect(ctx.destination);
    src.start();
  }

  playBang()  { this._noise(0.3, 0.25); this._tone(80, 0.4, 'sawtooth', 0.2); }
  playJump()  { this._tone(300, 0.15, 'sine', 0.1); this._tone(500, 0.1, 'sine', 0.08); }
  playHit()   { this._noise(0.15, 0.2); this._tone(100, 0.2, 'sawtooth', 0.15); }
  playToken() { this._tone(800, 0.08, 'sine', 0.1); this._tone(1200, 0.1, 'sine', 0.08); }
  playRoar()  { this._tone(60, 0.8, 'sawtooth', 0.25); this._noise(0.6, 0.15); }
  playCaught(){ this._tone(200, 0.3, 'sawtooth', 0.2); this._tone(100, 0.5, 'sawtooth', 0.25); this._noise(0.4, 0.2); }

  playFootstep() {
    this._noise(0.05, 0.03);
  }
}
