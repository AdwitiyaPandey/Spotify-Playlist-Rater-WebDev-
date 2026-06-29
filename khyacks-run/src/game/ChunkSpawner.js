import * as THREE from 'three';
import {
  CHUNK_LENGTH, LANE_POSITIONS, LANE_WIDTH,
  OBSTACLE_TYPES, TOKEN_RADIUS, TOKEN_FLOAT_HEIGHT,
  BIOMES,
} from '../utils/constants.js';
import {
  createUrbanGroundMaterial, createSnowGroundMaterial,
  createBuildingMaterial, createObstacleMaterial,
  createTokenMaterial, createRockMaterial, createWoodMaterial,
} from '../utils/TextureFactory.js';

export class ChunkSpawner {
  constructor(scene, difficulty) {
    this.scene = scene;
    this.difficulty = difficulty;
    this.chunks = [];
    this._nextZ = 0;
    this.biome = 'urban';
    this._matCache = {};
    this._tokenMat = createTokenMaterial();
    this._tokenGeo = new THREE.TorusGeometry(TOKEN_RADIUS, TOKEN_RADIUS * 0.35, 8, 16);
  }

  setBiome(biome) {
    this.biome = biome;
  }

  _getMat(key, factory) {
    if (!this._matCache[key]) {
      this._matCache[key] = factory();
    }
    return this._matCache[key];
  }

  _getGroundMat() {
    if (this.biome === 'himalayan') {
      return this._getMat('snowGround', createSnowGroundMaterial);
    }
    return this._getMat('urbanGround', createUrbanGroundMaterial);
  }

  _getObstacleMat() {
    return createObstacleMaterial(this.biome);
  }

  spawnInitial(playerZ) {
    for (let i = -2; i < 5; i++) {
      this._spawnChunk(i * CHUNK_LENGTH, i < 1);
    }
    this._nextZ = 5 * CHUNK_LENGTH;
  }

  update(playerZ) {
    // Spawn ahead
    while (this._nextZ < playerZ + CHUNK_LENGTH * 5) {
      this._spawnChunk(this._nextZ, false);
      this._nextZ += CHUNK_LENGTH;
    }

    // Despawn behind
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      if (this.chunks[i].z < playerZ - CHUNK_LENGTH * 2) {
        this._removeChunk(this.chunks[i]);
        this.chunks.splice(i, 1);
      }
    }
  }

  _spawnChunk(z, empty) {
    const chunk = { z, objects: [], obstacles: [], tokens: [] };
    const groundMat = this._getGroundMat();

    // Ground plane
    const roadWidth = LANE_WIDTH * 4;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(roadWidth, CHUNK_LENGTH),
      groundMat
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.01, z - CHUNK_LENGTH / 2);
    ground.receiveShadow = true;
    this.scene.add(ground);
    chunk.objects.push(ground);

    // Side ground (wider)
    const sideGroundMat = this.biome === 'himalayan'
      ? this._getMat('snowGround', createSnowGroundMaterial)
      : this._getMat('urbanGround', createUrbanGroundMaterial);
    for (const side of [-1, 1]) {
      const sideGround = new THREE.Mesh(
        new THREE.PlaneGeometry(20, CHUNK_LENGTH),
        sideGroundMat
      );
      sideGround.rotation.x = -Math.PI / 2;
      sideGround.position.set(side * (roadWidth / 2 + 10), -0.02, z - CHUNK_LENGTH / 2);
      sideGround.receiveShadow = true;
      this.scene.add(sideGround);
      chunk.objects.push(sideGround);
    }

    // Lane dividers
    const dividerMat = new THREE.MeshStandardMaterial({
      color: this.biome === 'himalayan' ? 0xbbccdd : 0xeeeeee,
      roughness: 0.5,
      metalness: 0.0,
      emissive: this.biome === 'himalayan' ? 0x223344 : 0x333333,
      emissiveIntensity: 0.1,
    });
    for (let i = 0; i < 2; i++) {
      const lx = LANE_WIDTH * (i === 0 ? -0.5 : 0.5);
      for (let dz = 0; dz < CHUNK_LENGTH; dz += 4) {
        const dash = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.02, 1.5),
          dividerMat
        );
        dash.position.set(lx, 0.01, z - dz);
        dash.receiveShadow = true;
        this.scene.add(dash);
        chunk.objects.push(dash);
      }
    }

    // Environment
    this._spawnEnvironment(chunk, z);

    // Obstacles & tokens
    if (!empty) {
      this._spawnObstacles(chunk, z);
      this._spawnTokens(chunk, z);
    }

    this.chunks.push(chunk);
  }

  _spawnEnvironment(chunk, z) {
    if (this.biome === 'urban') {
      this._spawnUrbanEnv(chunk, z);
    } else if (this.biome === 'himalayan') {
      this._spawnHimalayanEnv(chunk, z);
    } else if (this.biome === 'transition') {
      this._spawnTransitionEnv(chunk, z);
    }
  }

  _spawnUrbanEnv(chunk, z) {
    const colors = BIOMES.urban.buildingColors;
    for (const side of [-1, 1]) {
      const count = 2 + Math.floor(Math.random() * 3);
      let bz = z;
      for (let i = 0; i < count; i++) {
        const w = 4 + Math.random() * 6;
        const h = 6 + Math.random() * 12;
        const d = 5 + Math.random() * 8;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const mat = createBuildingMaterial(color);

        const building = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          mat
        );
        building.position.set(
          side * (LANE_WIDTH * 2 + w / 2 + 1 + Math.random() * 2),
          h / 2,
          bz - d / 2
        );
        building.castShadow = true;
        building.receiveShadow = true;
        this.scene.add(building);
        chunk.objects.push(building);

        // Roof detail
        const roofMat = new THREE.MeshStandardMaterial({
          color: 0x4a3a2a,
          roughness: 0.8,
          metalness: 0.1,
        });
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.3, 0.3, d + 0.3),
          roofMat
        );
        roof.position.set(building.position.x, h + 0.15, building.position.z);
        roof.castShadow = true;
        this.scene.add(roof);
        chunk.objects.push(roof);

        // Street lamp occasionally
        if (Math.random() < 0.3) {
          this._spawnStreetLamp(chunk, side * (LANE_WIDTH * 2 + 0.5), bz - d / 2);
        }

        bz -= d + 1 + Math.random() * 2;
      }
    }
  }

  _spawnStreetLamp(chunk, x, z) {
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.4,
      metalness: 0.6,
    });
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 4, 6),
      poleMat
    );
    pole.position.set(x, 2, z);
    pole.castShadow = true;
    this.scene.add(pole);
    chunk.objects.push(pole);

    // Lamp head
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xffeecc,
      emissive: 0xffcc66,
      emissiveIntensity: 1.5,
      roughness: 0.3,
      metalness: 0.2,
    });
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 6),
      lampMat
    );
    lamp.position.set(x, 4.1, z);
    this.scene.add(lamp);
    chunk.objects.push(lamp);

    // Light
    const light = new THREE.PointLight(0xffcc66, 0.8, 12, 2);
    light.position.set(x, 4, z);
    light.castShadow = false; // Performance: only main light casts shadows
    this.scene.add(light);
    chunk.objects.push(light);
  }

  _spawnHimalayanEnv(chunk, z) {
    const rockMat = this._getMat('rock', createRockMaterial);
    for (const side of [-1, 1]) {
      const count = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        const s = 1 + Math.random() * 3;
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(s, 1),
          rockMat
        );
        rock.position.set(
          side * (LANE_WIDTH * 2 + 2 + Math.random() * 8),
          s * 0.4,
          z - Math.random() * CHUNK_LENGTH
        );
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        rock.receiveShadow = true;
        this.scene.add(rock);
        chunk.objects.push(rock);
      }

      // Snow-capped peaks in background
      if (Math.random() < 0.3) {
        const peakMat = new THREE.MeshStandardMaterial({
          color: 0xddeeff,
          roughness: 0.3,
          metalness: 0.0,
          emissive: 0x445566,
          emissiveIntensity: 0.05,
        });
        const peakSize = 10 + Math.random() * 20;
        const peak = new THREE.Mesh(
          new THREE.ConeGeometry(peakSize * 0.6, peakSize, 6),
          peakMat
        );
        peak.position.set(
          side * (20 + Math.random() * 30),
          peakSize * 0.3,
          z - Math.random() * CHUNK_LENGTH
        );
        this.scene.add(peak);
        chunk.objects.push(peak);
      }
    }

    // Prayer flags across the path occasionally
    if (Math.random() < 0.15) {
      this._spawnPrayerFlags(chunk, z - Math.random() * CHUNK_LENGTH);
    }
  }

  _spawnPrayerFlags(chunk, z) {
    const flagColors = [0xdd2222, 0x2255cc, 0xffffff, 0x22aa22, 0xffcc00];
    const y = 3.5;
    const span = LANE_WIDTH * 3;

    // Rope
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.8 });
    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, span + 2, 4),
      ropeMat
    );
    rope.rotation.z = Math.PI / 2;
    rope.position.set(0, y, z);
    this.scene.add(rope);
    chunk.objects.push(rope);

    // Flags
    for (let i = 0; i < 8; i++) {
      const fx = -span / 2 + (i / 7) * span;
      const flagMat = new THREE.MeshStandardMaterial({
        color: flagColors[i % flagColors.length],
        roughness: 0.7,
        metalness: 0.0,
        side: THREE.DoubleSide,
      });
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, 0.6),
        flagMat
      );
      flag.position.set(fx, y - 0.35, z);
      flag.rotation.y = Math.random() * 0.3;
      this.scene.add(flag);
      chunk.objects.push(flag);
    }
  }

  _spawnTransitionEnv(chunk, z) {
    // Mix of urban debris and nature
    const rockMat = this._getMat('rock', createRockMaterial);
    for (const side of [-1, 1]) {
      // Scattered rocks
      for (let i = 0; i < 2; i++) {
        const s = 0.5 + Math.random() * 1.5;
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(s, 1),
          rockMat
        );
        rock.position.set(
          side * (LANE_WIDTH * 2 + 1 + Math.random() * 5),
          s * 0.3,
          z - Math.random() * CHUNK_LENGTH
        );
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        this.scene.add(rock);
        chunk.objects.push(rock);
      }

      // Sparse trees
      if (Math.random() < 0.4) {
        this._spawnTree(chunk, side * (LANE_WIDTH * 2 + 2 + Math.random() * 4), z - Math.random() * CHUNK_LENGTH);
      }
    }
  }

  _spawnTree(chunk, x, z) {
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5a3a20,
      roughness: 0.8,
      metalness: 0.0,
    });
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.25, 3, 6),
      trunkMat
    );
    trunk.position.set(x, 1.5, z);
    trunk.castShadow = true;
    this.scene.add(trunk);
    chunk.objects.push(trunk);

    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x2a6a2a,
      roughness: 0.7,
      metalness: 0.0,
    });
    const foliage = new THREE.Mesh(
      new THREE.ConeGeometry(1.5, 3, 6),
      foliageMat
    );
    foliage.position.set(x, 4, z);
    foliage.castShadow = true;
    this.scene.add(foliage);
    chunk.objects.push(foliage);
  }

  _spawnObstacles(chunk, z) {
    const freq = this.difficulty.obstacleFreq;
    const spacing = 8;
    const obstacleMat = this._getObstacleMat();

    for (let oz = 0; oz < CHUNK_LENGTH; oz += spacing) {
      if (Math.random() > freq) continue;

      // Pick type
      const types = Object.values(OBSTACLE_TYPES);
      const type = types[Math.floor(Math.random() * types.length)];

      // Pick lanes
      const lanes = [Math.floor(Math.random() * 3)];
      if (Math.random() < this.difficulty.multiLaneChance && type.name !== 'gap') {
        const other = (lanes[0] + 1 + Math.floor(Math.random() * 2)) % 3;
        lanes.push(other);
      }

      for (const lane of lanes) {
        const obs = this._createObstacle(type, obstacleMat);
        const x = LANE_POSITIONS[lane];
        obs.position.set(x, (type.yOff || 0) + (type.height || 1) / 2, z - oz);
        obs.castShadow = true;
        obs.receiveShadow = true;
        this.scene.add(obs);
        chunk.obstacles.push({
          mesh: obs,
          type,
          lane,
          box: new THREE.Box3().setFromObject(obs),
        });
        chunk.objects.push(obs);
      }
    }
  }

  _createObstacle(type, mat) {
    if (type.name === 'gap') {
      // Gap visualized as missing ground
      const gapMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 1.0,
        metalness: 0.0,
      });
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(LANE_WIDTH * 0.9, 0.1, type.depth || 4),
        gapMat
      );
      mesh.position.y = -0.05;
      return mesh;
    }

    const h = type.height || 1;
    const d = type.depth || 0.6;
    const w = LANE_WIDTH * 0.7;

    if (type.name === 'barrier') {
      // Low barrier - like a road barrier
      const group = new THREE.Group();
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        mat
      );
      group.add(bar);

      // Stripes
      const stripeMat = new THREE.MeshStandardMaterial({
        color: 0xffcc00,
        emissive: 0x665500,
        emissiveIntensity: 0.2,
        roughness: 0.5,
        metalness: 0.2,
      });
      for (let i = 0; i < 3; i++) {
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.15, h + 0.02, d + 0.02),
          stripeMat
        );
        stripe.position.x = -w * 0.3 + i * w * 0.3;
        group.add(stripe);
      }
      return group;
    }

    return new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      mat
    );
  }

  _spawnTokens(chunk, z) {
    const tokenSpacing = 6;
    for (let tz = 2; tz < CHUNK_LENGTH; tz += tokenSpacing) {
      if (Math.random() > 0.4) continue;
      const lane = Math.floor(Math.random() * 3);
      const x = LANE_POSITIONS[lane];
      const token = new THREE.Mesh(this._tokenGeo, this._tokenMat);
      token.position.set(x, TOKEN_FLOAT_HEIGHT, z - tz);
      token.castShadow = true;
      this.scene.add(token);
      chunk.tokens.push({
        mesh: token,
        collected: false,
        box: new THREE.Box3(),
      });
      chunk.objects.push(token);
    }
  }

  _removeChunk(chunk) {
    for (const obj of chunk.objects) {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }
  }

  getActiveObstacles() {
    const obs = [];
    for (const chunk of this.chunks) {
      for (const o of chunk.obstacles) {
        obs.push(o);
      }
    }
    return obs;
  }

  getActiveTokens() {
    const tokens = [];
    for (const chunk of this.chunks) {
      for (const t of chunk.tokens) {
        if (!t.collected) tokens.push(t);
      }
    }
    return tokens;
  }

  clear() {
    for (const chunk of this.chunks) {
      this._removeChunk(chunk);
    }
    this.chunks = [];
    this._nextZ = 0;
    this._matCache = {};
  }
}
