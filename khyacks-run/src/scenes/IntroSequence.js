import * as THREE from 'three';
import { createWoodMaterial } from '../utils/TextureFactory.js';
import { BIOMES } from '../utils/constants.js';

export class IntroSequence {
  constructor(scene, camera, hud, audio, onComplete) {
    this.scene = scene;
    this.camera = camera;
    this.hud = hud;
    this.audio = audio;
    this.onComplete = onComplete;

    this.phase = 0; // 0=bedroom, 1=door, 2=staircase, 3=khyack
    this._timer = 0;
    this._objects = [];
    this._waitingForInput = false;
    this._complete = false;
    this._khyackMesh = null;
    this._doorMesh = null;
    this._cameraTarget = new THREE.Vector3();
    this._cameraPos = new THREE.Vector3();

    this._buildBedroom();
  }

  _buildBedroom() {
    const woodMat = createWoodMaterial();
    const biome = BIOMES.bedroom;

    // Room walls
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x6a5a4a,
      roughness: 0.8,
      metalness: 0.0,
    });

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      woodMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this._objects.push(floor);

    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 4),
      wallMat
    );
    backWall.position.set(0, 2, -3);
    backWall.receiveShadow = true;
    this.scene.add(backWall);
    this._objects.push(backWall);

    // Side walls
    for (const side of [-1, 1]) {
      const sideWall = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 4),
        wallMat
      );
      sideWall.position.set(side * 3, 2, 0);
      sideWall.rotation.y = -side * Math.PI / 2;
      sideWall.receiveShadow = true;
      this.scene.add(sideWall);
      this._objects.push(sideWall);
    }

    // Bed
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.7,
      metalness: 0.05,
    });
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.5, 2.2),
      bedMat
    );
    bed.position.set(-1, 0.25, -1.5);
    bed.castShadow = true;
    this.scene.add(bed);
    this._objects.push(bed);

    // Blanket
    const blanketMat = new THREE.MeshStandardMaterial({
      color: 0xcc3333,
      roughness: 0.6,
      metalness: 0.0,
    });
    const blanket = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.1, 1.8),
      blanketMat
    );
    blanket.position.set(-1, 0.55, -1.5);
    this.scene.add(blanket);
    this._objects.push(blanket);

    // Door
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x5a3a20,
      roughness: 0.6,
      metalness: 0.1,
    });
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.5, 0.1),
      doorMat
    );
    door.position.set(2, 1.25, 0);
    door.castShadow = true;
    this.scene.add(door);
    this._objects.push(door);
    this._doorMesh = door;

    // Door handle
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0xccaa55,
      roughness: 0.3,
      metalness: 0.8,
    });
    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 6),
      handleMat
    );
    handle.position.set(1.6, 1.2, 0.08);
    this.scene.add(handle);
    this._objects.push(handle);

    // Oil lamp on shelf
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xffcc66,
      emissive: 0xff9933,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.2,
    });
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.2, 8),
      lampMat
    );
    lamp.position.set(1.5, 1.8, -2.5);
    this.scene.add(lamp);
    this._objects.push(lamp);

    // Warm light from lamp
    const lampLight = new THREE.PointLight(0xff9933, 1.5, 8, 2);
    lampLight.position.set(1.5, 2, -2.5);
    lampLight.castShadow = true;
    lampLight.shadow.mapSize.set(512, 512);
    this.scene.add(lampLight);
    this._objects.push(lampLight);

    // Camera start position (lying in bed looking at ceiling)
    this.camera.position.set(-1, 1.2, -1);
    this.camera.lookAt(0, 2, -1.5);

    // Intro text
    this.hud.showOverlay(`
      <h2>Khyack's Run</h2>
      <p>You wake to a thundering bang from below...</p>
      <p class="hint">Press Enter to continue</p>
    `);
    this._waitingForInput = true;
  }

  _buildKhyack() {
    // Khyack creature in the doorway
    const khyackMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.4,
      metalness: 0.2,
      emissive: 0x220033,
      emissiveIntensity: 0.3,
    });

    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.2, 0.5),
      khyackMat
    );
    body.position.y = 0.8;
    group.add(body);

    // Head with mask
    const maskMat = new THREE.MeshStandardMaterial({
      color: 0x882200,
      roughness: 0.5,
      metalness: 0.3,
      emissive: 0x441100,
      emissiveIntensity: 0.2,
    });
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.6, 0.4),
      maskMat
    );
    head.position.y = 1.7;
    group.add(head);

    // Glowing eyes
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff66,
      emissiveIntensity: 3.0,
    });
    const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
    const eL = new THREE.Mesh(eyeGeo, eyeMat);
    eL.position.set(-0.1, 1.75, 0.22);
    const eR = new THREE.Mesh(eyeGeo, eyeMat);
    eR.position.set(0.1, 1.75, 0.22);
    group.add(eL, eR);

    // Eerie glow
    const glow = new THREE.PointLight(0x00ff66, 2, 6);
    glow.position.set(0, 1.7, 0.3);
    group.add(glow);

    group.position.set(5, 0, 0);
    group.visible = false;
    this.scene.add(group);
    this._objects.push(group);
    this._khyackMesh = group;
  }

  handleInput(action) {
    if (!this._waitingForInput || action !== 'confirm') return;
    this._waitingForInput = false;
    this._timer = 0;
    this.phase++;

    if (this.phase === 1) {
      // Wake up, look at door
      this.audio.playBang();
      this.hud.showOverlay(`
        <h2>BANG!</h2>
        <p>Something crashed downstairs. You must investigate...</p>
        <p class="hint">Press Enter to open the door</p>
      `);
      this._cameraTarget.set(2, 1.2, 0);
      this._waitingForInput = true;
    } else if (this.phase === 2) {
      // Open door, reveal staircase
      this.hud.showOverlay(`
        <p>You creep down the dark staircase...</p>
        <p>The air grows cold. Something is watching.</p>
        <p class="hint">Press Enter to descend</p>
      `);
      this._waitingForInput = true;
      // Animate door open
      if (this._doorMesh) {
        this._doorMesh.rotation.y = -Math.PI / 3;
        this._doorMesh.position.x = 2.5;
      }
    } else if (this.phase === 3) {
      // Khyack appears
      this._buildKhyack();
      if (this._khyackMesh) this._khyackMesh.visible = true;
      this.audio.playRoar();
      this.hud.showOverlay(`
        <h2>KHYACK!</h2>
        <p>The creature lunges from the shadows and drags you into the street!</p>
        <p class="hint">Press Enter to RUN</p>
      `);
      this._waitingForInput = true;
    } else if (this.phase === 4) {
      this.hud.hideOverlay();
      this._complete = true;
      this._cleanup();
      this.onComplete();
    }
  }

  update(dt) {
    if (this._complete) return;
    this._timer += dt;

    // Camera animation
    if (this.phase === 1) {
      this.camera.position.lerp(new THREE.Vector3(0, 1.5, 1), 0.02);
      this.camera.lookAt(2, 1.2, 0);
    } else if (this.phase >= 2) {
      this.camera.position.lerp(new THREE.Vector3(2, 1.5, 2), 0.02);
      this.camera.lookAt(3, 1, 0);
    }

    // Khyack animation
    if (this._khyackMesh && this._khyackMesh.visible) {
      this._khyackMesh.position.x = 5 - this._timer * 2;
      if (this._khyackMesh.position.x < 3) this._khyackMesh.position.x = 3;
      this._khyackMesh.rotation.y = Math.sin(this._timer * 5) * 0.1;
    }
  }

  _cleanup() {
    for (const obj of this._objects) {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
    }
    this._objects = [];
  }
}
