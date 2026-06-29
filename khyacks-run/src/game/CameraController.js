import * as THREE from 'three';

export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.offset = new THREE.Vector3(0, 4.5, 8);
    this.lookAhead = new THREE.Vector3(0, 1.5, -6);
    this._shakeTime = 0;
    this._shakeIntensity = 0;
    this._targetFOV = 65;
    this._fovLerp = 0.03;
  }

  setMode(mode) {
    switch (mode) {
      case 'intro':
        this.offset.set(0, 2, 5);
        this.lookAhead.set(0, 1.5, 0);
        this._targetFOV = 55;
        break;
      case 'chase':
        this.offset.set(0, 4.5, 8);
        this.lookAhead.set(0, 1.5, -6);
        this._targetFOV = 65;
        break;
      case 'close':
        this.offset.set(0, 3, 5);
        this.lookAhead.set(0, 1.5, -4);
        this._targetFOV = 70;
        break;
    }
  }

  shake(intensity = 0.3, duration = 0.3) {
    this._shakeIntensity = intensity;
    this._shakeTime = duration;
  }

  setSpeedFOV(speed, baseSpeed) {
    const ratio = speed / baseSpeed;
    this._targetFOV = 60 + (ratio - 1) * 10;
  }

  update(dt, playerPos) {
    const target = playerPos.clone().add(this.offset);
    this.camera.position.lerp(target, 0.08);

    const lookAt = playerPos.clone().add(this.lookAhead);
    this.camera.lookAt(lookAt);

    // Shake
    if (this._shakeTime > 0) {
      this._shakeTime -= dt;
      const s = this._shakeIntensity * (this._shakeTime / 0.3);
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s * 0.5;
    }

    // FOV lerp
    this.camera.fov += (this._targetFOV - this.camera.fov) * this._fovLerp;
    this.camera.updateProjectionMatrix();
  }
}
