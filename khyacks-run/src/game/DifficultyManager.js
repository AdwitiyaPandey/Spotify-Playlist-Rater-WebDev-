import { DIFFICULTY, BASE_SPEED, MAX_SPEED, SPEED_RAMP } from '../utils/constants.js';

export class DifficultyManager {
  constructor() {
    this.elapsed = 0;
    this.speed = BASE_SPEED;
  }

  reset() {
    this.elapsed = 0;
    this.speed = BASE_SPEED;
  }

  update(dt) {
    this.elapsed += dt;
    this.speed = Math.min(MAX_SPEED, BASE_SPEED + this.elapsed * SPEED_RAMP);
  }

  get t() {
    return Math.min(1, this.elapsed / DIFFICULTY.rampTime);
  }

  get obstacleFreq() {
    const { min, max } = DIFFICULTY.obstacleFrequency;
    return min + (max - min) * this.t;
  }

  get multiLaneChance() {
    const { min, max } = DIFFICULTY.multiLaneChance;
    return min + (max - min) * this.t;
  }

  get gapChance() {
    const { min, max } = DIFFICULTY.gapChance;
    return min + (max - min) * this.t;
  }
}
