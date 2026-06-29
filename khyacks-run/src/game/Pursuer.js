import * as THREE from 'three';

export class Pursuer {
  constructor(scene, profile) {
    this.scene = scene;
    this.profile = profile;
    this.mesh = this._buildMesh();
    this.mesh.visible = false;
    scene.add(this.mesh);

    this.distance = profile.baseDistance;
    this._lungeTimer = this._randInterval(profile.lungeInterval);
    this._rockTimer = profile.rockThrowInterval
      ? this._randInterval(profile.rockThrowInterval)
      : Infinity;
    this._lunging = false;
    this._lungeProgress = 0;
    this._rocks = [];
    this.active = false;
  }

  _buildMesh() {
    const p = this.profile;
    const group = new THREE.Group();

    // Main body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: p.color,
      roughness: 0.5,
      metalness: 0.15,
      emissive: p.emissive,
      emissiveIntensity: 0.2,
    });

    // Torso - larger, more menacing
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(1.2 * p.scale / 2, 1.4 * p.scale / 2, 0.8 * p.scale / 2),
      bodyMat
    );
    torso.position.y = p.scale * 0.5;
    torso.castShadow = true;
    group.add(torso);

    // Head
    const headMat = new THREE.MeshStandardMaterial({
      color: p.color,
      roughness: 0.4,
      metalness: 0.1,
      emissive: p.emissive,
      emissiveIntensity: 0.3,
    });
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.35 * p.scale / 2, 10, 8),
      headMat
    );
    head.position.y = p.scale * 0.9;
    head.castShadow = true;
    group.add(head);

    // Eyes - glowing
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff2200,
      emissiveIntensity: 2.0,
      roughness: 0.1,
      metalness: 0.0,
    });
    const eyeGeo = new THREE.SphereGeometry(0.06 * p.scale / 2, 6, 6);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.1 * p.scale / 2, p.scale * 0.95, 0.3 * p.scale / 2);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.1 * p.scale / 2, p.scale * 0.95, 0.3 * p.scale / 2);
    group.add(eyeL, eyeR);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.3 * p.scale / 2, 0.9 * p.scale / 2, 0.3 * p.scale / 2);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.8 * p.scale / 2, p.scale * 0.45, 0);
    armL.castShadow = true;
    const armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.set(0.8 * p.scale / 2, p.scale * 0.45, 0);
    armR.castShadow = true;
    group.add(armL, armR);
    this._armL = armL;
    this._armR = armR;

    // Legs
    const legGeo = new THREE.BoxGeometry(0.35 * p.scale / 2, 0.7 * p.scale / 2, 0.35 * p.scale / 2);
    const legL = new THREE.Mesh(legGeo, bodyMat);
    legL.position.set(-0.3 * p.scale / 2, 0.25 * p.scale / 2, 0);
    legL.castShadow = true;
    const legR = new THREE.Mesh(legGeo, bodyMat);
    legR.position.set(0.3 * p.scale / 2, 0.25 * p.scale / 2, 0);
    legR.castShadow = true;
    group.add(legL, legR);
    this._legL = legL;
    this._legR = legR;

    // Point light for glowing eyes
    const eyeLight = new THREE.PointLight(
      p.name === 'Yeti' ? 0x4488ff : 0xff4400,
      1.5,
      8
    );
    eyeLight.position.set(0, p.scale * 0.9, 0.4 * p.scale / 2);
    group.add(eyeLight);
    this._eyeLight = eyeLight;

    group.scale.set(1, 1, 1);
    return group;
  }

  _randInterval(range) {
    return range[0] + Math.random() * (range[1] - range[0]);
  }

  activate(playerZ) {
    this.active = true;
    this.mesh.visible = true;
    this.distance = this.profile.baseDistance;
    this._lungeTimer = this._randInterval(this.profile.lungeInterval);
  }

  deactivate() {
    this.active = false;
    this.mesh.visible = false;
    this._rocks.forEach(r => this.scene.remove(r));
    this._rocks = [];
  }

  throwRock(playerPos) {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x666677,
      roughness: 0.8,
      metalness: 0.2,
    });
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.4, 0),
      rockMat
    );
    rock.position.copy(this.mesh.position);
    rock.position.y = 2;
    rock.castShadow = true;
    rock.userData = {
      vel: new THREE.Vector3(
        (playerPos.x - rock.position.x) * 0.5,
        3,
        -15
      ),
      life: 3,
    };
    this.scene.add(rock);
    this._rocks.push(rock);
  }

  update(dt, playerPos, speed) {
    if (!this.active) return;

    // Lunge mechanic
    this._lungeTimer -= dt;
    if (this._lungeTimer <= 0 && !this._lunging) {
      this._lunging = true;
      this._lungeProgress = 0;
    }
    if (this._lunging) {
      this._lungeProgress += dt * 2;
      const surge = Math.sin(this._lungeProgress * Math.PI) * this.profile.lungeSpeed;
      this.distance -= surge * dt;
      if (this._lungeProgress >= 1) {
        this._lunging = false;
        this._lungeTimer = this._randInterval(this.profile.lungeInterval);
      }
    }

    // Slowly approach
    const approach = 0.3 * dt;
    this.distance = Math.max(this.profile.catchDistance, this.distance - approach);

    // Rock throwing (Yeti)
    if (this.profile.rockThrowInterval) {
      this._rockTimer -= dt;
      if (this._rockTimer <= 0) {
        this.throwRock(playerPos);
        this._rockTimer = this._randInterval(this.profile.rockThrowInterval);
      }
    }

    // Position behind player
    this.mesh.position.set(
      playerPos.x * 0.3,
      0,
      playerPos.z + this.distance
    );

    // Run animation
    const cycle = performance.now() * 0.005;
    const swing = Math.sin(cycle) * 0.3;
    this._legL.rotation.x = swing;
    this._legR.rotation.x = -swing;
    this._armL.rotation.x = -swing * 0.5;
    this._armR.rotation.x = swing * 0.5;

    // Eye glow pulse
    this._eyeLight.intensity = 1.5 + Math.sin(cycle * 2) * 0.5;

    // Update rocks
    for (let i = this._rocks.length - 1; i >= 0; i--) {
      const rock = this._rocks[i];
      const ud = rock.userData;
      ud.vel.y -= 15 * dt;
      rock.position.add(ud.vel.clone().multiplyScalar(dt));
      rock.rotation.x += dt * 3;
      rock.rotation.z += dt * 2;
      ud.life -= dt;
      if (ud.life <= 0 || rock.position.y < -2) {
        this.scene.remove(rock);
        this._rocks.splice(i, 1);
      }
    }
  }

  getProximityRatio() {
    const range = this.profile.baseDistance - this.profile.catchDistance;
    return 1 - (this.distance - this.profile.catchDistance) / range;
  }

  isCatching() {
    return this.distance <= this.profile.catchDistance + 0.5;
  }

  getRocks() {
    return this._rocks;
  }
}
