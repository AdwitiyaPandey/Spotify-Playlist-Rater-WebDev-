import * as THREE from 'three';
import { STATES, BIOMES, PURSUERS, BASE_SPEED } from '../utils/constants.js';
import { Player } from './Player.js';
import { Pursuer } from './Pursuer.js';
import { ChunkSpawner } from './ChunkSpawner.js';
import { DifficultyManager } from './DifficultyManager.js';
import { InputManager } from './InputManager.js';
import { AudioManager } from './AudioManager.js';
import { CameraController } from './CameraController.js';
import { HUD } from './HUD.js';
import { IntroSequence } from '../scenes/IntroSequence.js';

export class Game {
  constructor() {
    this.state = STATES.LOADING;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      65, window.innerWidth / window.innerHeight, 0.1, 200
    );

    // Systems
    this.input = new InputManager();
    this.audio = new AudioManager();
    this.difficulty = new DifficultyManager();
    this.hud = new HUD();
    this.camCtrl = new CameraController(this.camera);

    // Game objects (created on start)
    this.player = null;
    this.chunks = null;
    this.pursuer = null;
    this.intro = null;

    // Biome state
    this.currentBiome = 'bedroom';
    this._transitionDist = 0;
    this._biomeTransitioning = false;

    // Particle systems
    this._particles = [];
    this._dustSystem = null;

    // Resize
    window.addEventListener('resize', () => this._onResize());

    this._init();
  }

  _init() {
    this._setupLighting('bedroom');
    this.hud.hideLoading();
    this.state = STATES.INTRO;
    this._startIntro();
  }

  _setupLighting(biomeName) {
    // Remove old lights
    const toRemove = [];
    this.scene.traverse(c => {
      if (c.isLight && c.userData._envLight) toRemove.push(c);
    });
    toRemove.forEach(l => this.scene.remove(l));

    const b = BIOMES[biomeName];

    // Fog
    this.scene.fog = new THREE.Fog(b.fogColor, b.fogNear, b.fogFar);
    this.scene.background = new THREE.Color(b.skyColor);

    // Ambient
    const ambient = new THREE.AmbientLight(b.ambientColor, b.ambientIntensity);
    ambient.userData._envLight = true;
    this.scene.add(ambient);

    // Hemisphere for sky-ground color
    const hemi = new THREE.HemisphereLight(
      b.skyColor, b.groundColor, 0.3
    );
    hemi.userData._envLight = true;
    this.scene.add(hemi);

    // Directional (sun/moon)
    const dir = new THREE.DirectionalLight(b.dirColor, b.dirIntensity);
    dir.position.set(5, 15, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 80;
    dir.shadow.camera.left = -20;
    dir.shadow.camera.right = 20;
    dir.shadow.camera.top = 20;
    dir.shadow.camera.bottom = -20;
    dir.shadow.bias = -0.001;
    dir.shadow.normalBias = 0.02;
    dir.userData._envLight = true;
    this.scene.add(dir);
    this._sunLight = dir;

    // Rim light for depth
    const rim = new THREE.DirectionalLight(b.dirColor, b.dirIntensity * 0.3);
    rim.position.set(-3, 8, -5);
    rim.userData._envLight = true;
    this.scene.add(rim);
  }

  _startIntro() {
    this.camCtrl.setMode('intro');
    this.intro = new IntroSequence(
      this.scene, this.camera, this.hud, this.audio,
      () => this._startRunning()
    );
  }

  _startRunning() {
    this.state = STATES.RUNNING;
    this.currentBiome = 'urban';
    this._setupLighting('urban');

    this.player = new Player(this.scene);
    this.difficulty.reset();
    this.chunks = new ChunkSpawner(this.scene, this.difficulty);
    this.chunks.setBiome('urban');
    this.chunks.spawnInitial(0);

    this.pursuer = new Pursuer(this.scene, PURSUERS.LAKHAY);
    this.pursuer.activate(this.player.mesh.position);

    this.camCtrl.setMode('chase');
    this.hud.show();
    this.hud.showControls();
    this.hud.setPhase(BIOMES.urban.name);

    this.audio.resume();

    this._setupDustParticles();
  }

  _setupDustParticles() {
    // Clean up existing
    if (this._dustSystem) {
      this.scene.remove(this._dustSystem);
      this._dustSystem.geometry.dispose();
      this._dustSystem.material.dispose();
    }

    const count = 200;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      sizes[i] = 0.02 + Math.random() * 0.06;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const isSnow = this.currentBiome === 'himalayan';
    const mat = new THREE.PointsMaterial({
      color: isSnow ? 0xffffff : 0xaa9977,
      size: isSnow ? 0.08 : 0.04,
      transparent: true,
      opacity: isSnow ? 0.7 : 0.3,
      sizeAttenuation: true,
      depthWrite: false,
    });

    this._dustSystem = new THREE.Points(geo, mat);
    this.scene.add(this._dustSystem);
  }

  _updateDustParticles(dt, playerZ) {
    if (!this._dustSystem) return;
    const positions = this._dustSystem.geometry.attributes.position;
    const arr = positions.array;

    for (let i = 0; i < positions.count; i++) {
      const i3 = i * 3;

      // Move relative to player
      arr[i3 + 2] += dt * 2; // drift
      arr[i3 + 1] -= dt * (this.currentBiome === 'himalayan' ? 1.5 : 0.3); // fall

      // Wrap
      if (arr[i3 + 2] > playerZ + 5) {
        arr[i3 + 2] = playerZ - 30 - Math.random() * 10;
        arr[i3]     = (Math.random() - 0.5) * 20;
        arr[i3 + 1] = 1 + Math.random() * 5;
      }
      if (arr[i3 + 1] < 0) {
        arr[i3 + 1] = 3 + Math.random() * 3;
      }
    }
    positions.needsUpdate = true;
  }

  _handleTransition() {
    const dist = this.player.distance;

    // Urban → Transition at ~600m
    if (this.currentBiome === 'urban' && dist > PURSUERS.LAKHAY.segmentLength) {
      this.currentBiome = 'transition';
      this.chunks.setBiome('transition');
      this._setupLighting('transition');
      this.hud.setPhase(BIOMES.transition.name);
      this.pursuer.deactivate();
      this._transitionDist = dist;
    }

    // Transition → Himalayan after ~100m
    if (this.currentBiome === 'transition' && dist > this._transitionDist + 100) {
      this.currentBiome = 'himalayan';
      this.chunks.setBiome('himalayan');
      this._setupLighting('himalayan');
      this.hud.setPhase(BIOMES.himalayan.name);

      // Switch to Yeti
      this.pursuer.deactivate();
      this.scene.remove(this.pursuer.mesh);
      this.pursuer = new Pursuer(this.scene, PURSUERS.YETI);
      this.pursuer.activate(this.player.mesh.position);
      this.audio.playRoar();

      this._setupDustParticles(); // Switch to snow
    }
  }

  _checkCollisions() {
    const pBox = this.player.getCollisionBox();

    // Obstacles
    for (const obs of this.chunks.getActiveObstacles()) {
      obs.box.setFromObject(obs.mesh);
      if (pBox.intersectsBox(obs.box)) {
        if (obs.type.action === 'jump' && this.player.grounded && !this.player.sliding) {
          this.player.stumble();
          this.audio.playHit();
          this.camCtrl.shake(0.4, 0.3);
          this.pursuer.distance -= 2; // pursuer gains
        }
        if (obs.type.action === 'slide' && !this.player.sliding) {
          this.player.stumble();
          this.audio.playHit();
          this.camCtrl.shake(0.4, 0.3);
          this.pursuer.distance -= 2;
        }
      }
    }

    // Tokens
    for (const token of this.chunks.getActiveTokens()) {
      token.box.setFromObject(token.mesh);
      if (pBox.intersectsBox(token.box)) {
        token.collected = true;
        this.scene.remove(token.mesh);
        this.player.collectToken();
        this.audio.playToken();
      }
    }

    // Pursuer rocks
    if (this.pursuer && this.pursuer.active) {
      for (const rock of this.pursuer.getRocks()) {
        const rBox = new THREE.Box3().setFromObject(rock);
        if (pBox.intersectsBox(rBox)) {
          this.player.stumble();
          this.audio.playHit();
          this.camCtrl.shake(0.5, 0.4);
          this.pursuer.distance -= 3;
          this.scene.remove(rock);
        }
      }
    }
  }

  _gameOver() {
    this.state = STATES.GAME_OVER;
    this.audio.playCaught();
    this.camCtrl.shake(0.8, 0.5);
    this.hud.hideControls();
    this.hud.showGameOver(this.player.distance, this.player.tokens);
    this.player.alive = false;
  }

  _restart() {
    // Clean up
    if (this.player) {
      this.scene.remove(this.player.mesh);
    }
    if (this.pursuer) {
      this.pursuer.deactivate();
      this.scene.remove(this.pursuer.mesh);
    }
    if (this.chunks) {
      this.chunks.clear();
    }
    if (this._dustSystem) {
      this.scene.remove(this._dustSystem);
      this._dustSystem = null;
    }

    this.hud.hideOverlay();
    this._startRunning();
  }

  update(dt) {
    const actions = this.input.poll();

    switch (this.state) {
      case STATES.INTRO:
        for (const a of actions) this.intro.handleInput(a);
        this.intro.update(dt);
        break;

      case STATES.RUNNING:
        this._updateRunning(dt, actions);
        break;

      case STATES.GAME_OVER:
        for (const a of actions) {
          if (a === 'confirm') this._restart();
        }
        // Also listen for restart button click
        const btn = document.getElementById('restart-btn');
        if (btn && !btn._bound) {
          btn._bound = true;
          btn.addEventListener('click', () => this._restart());
        }
        break;
    }
  }

  _updateRunning(dt, actions) {
    // Input
    for (const a of actions) {
      switch (a) {
        case 'left':  this.player.moveLeft(); break;
        case 'right': this.player.moveRight(); break;
        case 'jump':  this.player.jump(); this.audio.playJump(); break;
        case 'slide': this.player.slide(); break;
      }
    }

    // Difficulty & speed
    this.difficulty.update(dt);
    const speed = this.difficulty.speed;

    // Player
    this.player.update(dt, speed);

    // Move player forward (world scrolls, player stays at z=0 visually)
    // Actually, we move player Z and camera follows
    this.player.mesh.position.z -= speed * dt;

    // Camera
    this.camCtrl.setSpeedFOV(speed, BASE_SPEED);
    this.camCtrl.update(dt, this.player.mesh.position);

    // Follow sun light with player
    if (this._sunLight) {
      this._sunLight.position.set(
        this.player.mesh.position.x + 5,
        15,
        this.player.mesh.position.z + 10
      );
      this._sunLight.target.position.copy(this.player.mesh.position);
      this._sunLight.target.updateMatrixWorld();
    }

    // Chunks
    this.chunks.update(this.player.mesh.position.z);

    // Animate tokens
    const time = performance.now() * 0.001;
    for (const t of this.chunks.getActiveTokens()) {
      t.mesh.rotation.y = time * 2;
      t.mesh.position.y = 1.2 + Math.sin(time * 3 + t.mesh.position.z) * 0.2;
    }

    // Pursuer
    if (this.pursuer && this.pursuer.active) {
      this.pursuer.update(dt, this.player.mesh.position, speed);

      if (this.pursuer.isCatching()) {
        this._gameOver();
        return;
      }
    }

    // Collisions
    this._checkCollisions();

    // Biome transitions
    this._handleTransition();

    // Particles
    this._updateDustParticles(dt, this.player.mesh.position.z);

    // HUD
    this.hud.updateDistance(this.player.distance);
    this.hud.updateMultiplier(this.player.multiplier);
    if (this.pursuer && this.pursuer.active) {
      this.hud.updateProximity(this.pursuer.getProximityRatio(), this.pursuer.profile.name);
    }
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
