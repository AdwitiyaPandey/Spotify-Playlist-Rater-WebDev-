import * as THREE from 'three';
import {
  LANE_POSITIONS, GRAVITY, JUMP_VELOCITY,
  SLIDE_DURATION, STUMBLE_DURATION, PLAYER_HEIGHT, PLAYER_SLIDE_HEIGHT
} from '../utils/constants.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.lane = 1; // center
    this.mesh = this._buildMesh();
    this.scene.add(this.mesh);

    this.vy = 0;
    this.grounded = true;
    this.sliding = false;
    this.stumbling = false;
    this._slideTimer = 0;
    this._stumbleTimer = 0;
    this._laneX = LANE_POSITIONS[1];
    this._targetLaneX = LANE_POSITIONS[1];
    this._runCycle = 0;

    this.distance = 0;
    this.tokens = 0;
    this.multiplier = 1;
    this._multTimer = 0;
    this.alive = true;
  }

  _buildMesh() {
    const group = new THREE.Group();

    // Body - stylized character with PBR materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xcc4422,
      roughness: 0.6,
      metalness: 0.1,
      emissive: 0x331100,
      emissiveIntensity: 0.1,
    });

    // Torso
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.9, 0.4),
      bodyMat
    );
    torso.position.y = 1.15;
    torso.castShadow = true;
    group.add(torso);

    // Head
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xd4a574,
      roughness: 0.5,
      metalness: 0.0,
    });
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 10),
      headMat
    );
    head.position.y = 1.82;
    head.castShadow = true;
    group.add(head);

    // Legs
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x334455,
      roughness: 0.7,
      metalness: 0.05,
    });
    const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.25);
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.15, 0.4, 0);
    legL.castShadow = true;
    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.15, 0.4, 0);
    legR.castShadow = true;
    group.add(legL, legR);
    this._legL = legL;
    this._legR = legR;

    // Arms
    const armGeo = new THREE.BoxGeometry(0.15, 0.5, 0.18);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.42, 1.1, 0);
    armL.castShadow = true;
    const armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.set(0.42, 1.1, 0);
    armR.castShadow = true;
    group.add(armL, armR);
    this._armL = armL;
    this._armR = armR;

    // Dhaka topi (Nepali cap)
    const topiMat = new THREE.MeshStandardMaterial({
      color: 0x8b2500,
      roughness: 0.5,
      metalness: 0.1,
    });
    const topi = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.15, 8),
      topiMat
    );
    topi.position.y = 2.0;
    topi.castShadow = true;
    group.add(topi);

    return group;
  }

  reset() {
    this.lane = 1;
    this._laneX = LANE_POSITIONS[1];
    this._targetLaneX = LANE_POSITIONS[1];
    this.mesh.position.set(0, 0, 0);
    this.vy = 0;
    this.grounded = true;
    this.sliding = false;
    this.stumbling = false;
    this.distance = 0;
    this.tokens = 0;
    this.multiplier = 1;
    this._multTimer = 0;
    this.alive = true;
    this._runCycle = 0;
  }

  moveLeft() {
    if (this.lane > 0) {
      this.lane--;
      this._targetLaneX = LANE_POSITIONS[this.lane];
    }
  }

  moveRight() {
    if (this.lane < 2) {
      this.lane++;
      this._targetLaneX = LANE_POSITIONS[this.lane];
    }
  }

  jump() {
    if (this.grounded && !this.sliding) {
      this.vy = JUMP_VELOCITY;
      this.grounded = false;
    }
  }

  slide() {
    if (this.grounded && !this.sliding) {
      this.sliding = true;
      this._slideTimer = SLIDE_DURATION;
    }
  }

  stumble() {
    if (this.stumbling) return;
    this.stumbling = true;
    this._stumbleTimer = STUMBLE_DURATION;
  }

  collectToken() {
    this.tokens++;
    this.multiplier = Math.min(5, this.multiplier + 1);
    this._multTimer = 5;
  }

  update(dt, speed) {
    // Lane lerp
    this._laneX += (this._targetLaneX - this._laneX) * 0.15;
    this.mesh.position.x = this._laneX;

    // Vertical physics
    if (!this.grounded) {
      this.vy += GRAVITY * dt;
      this.mesh.position.y += this.vy * dt;
      if (this.mesh.position.y <= 0) {
        this.mesh.position.y = 0;
        this.vy = 0;
        this.grounded = true;
      }
    }

    // Slide
    if (this.sliding) {
      this._slideTimer -= dt;
      if (this._slideTimer <= 0) this.sliding = false;
    }

    // Scale for slide
    const targetScaleY = this.sliding ? PLAYER_SLIDE_HEIGHT / PLAYER_HEIGHT : 1;
    this.mesh.scale.y += (targetScaleY - this.mesh.scale.y) * 0.2;

    // Stumble
    if (this.stumbling) {
      this._stumbleTimer -= dt;
      this.mesh.rotation.x = Math.sin(this._stumbleTimer * 20) * 0.15;
      if (this._stumbleTimer <= 0) {
        this.stumbling = false;
        this.mesh.rotation.x = 0;
      }
    }

    // Run animation
    this._runCycle += dt * speed * 0.5;
    if (this.grounded && !this.sliding) {
      const swing = Math.sin(this._runCycle) * 0.4;
      this._legL.rotation.x = swing;
      this._legR.rotation.x = -swing;
      this._armL.rotation.x = -swing * 0.6;
      this._armR.rotation.x = swing * 0.6;
    } else if (!this.grounded) {
      // Air pose
      this._legL.rotation.x = -0.3;
      this._legR.rotation.x = 0.2;
      this._armL.rotation.x = -0.4;
      this._armR.rotation.x = -0.4;
    }

    // Distance
    this.distance += speed * dt;

    // Multiplier decay
    if (this._multTimer > 0) {
      this._multTimer -= dt;
      if (this._multTimer <= 0) this.multiplier = Math.max(1, this.multiplier - 1);
    }
  }

  getCollisionBox() {
    const h = this.sliding ? PLAYER_SLIDE_HEIGHT : PLAYER_HEIGHT;
    return new THREE.Box3(
      new THREE.Vector3(this.mesh.position.x - 0.3, this.mesh.position.y, this.mesh.position.z - 0.2),
      new THREE.Vector3(this.mesh.position.x + 0.3, this.mesh.position.y + h, this.mesh.position.z + 0.2)
    );
  }
}
