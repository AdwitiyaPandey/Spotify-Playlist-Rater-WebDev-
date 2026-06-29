import * as THREE from 'three';

const _canvas = document.createElement('canvas');
const _ctx = _canvas.getContext('2d');

/**
 * Procedural texture generator — creates high-quality textures at runtime
 * with detail, noise, and weathering effects for PBR materials.
 */

function setCanvas(w, h) {
  _canvas.width = w;
  _canvas.height = h;
  _ctx.clearRect(0, 0, w, h);
  return _ctx;
}

function noiseLayer(ctx, w, h, alpha = 0.06, scale = 1) {
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * alpha;
    d[i]     = Math.min(255, Math.max(0, d[i] + n * scale));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n * scale));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n * scale));
  }
  ctx.putImageData(id, 0, 0);
}

function fbmNoise(x, y, octaves = 4) {
  let val = 0, amp = 1, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    val += amp * simplerNoise(x * freq, y * freq);
    max += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return val / max;
}

function simplerNoise(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function makeTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  return tex;
}

function cloneCanvas() {
  const c = document.createElement('canvas');
  c.width = _canvas.width;
  c.height = _canvas.height;
  c.getContext('2d').drawImage(_canvas, 0, 0);
  return c;
}

// ─── Ground Textures ───

export function createUrbanGroundTexture(size = 512) {
  const ctx = setCanvas(size, size);

  // Base asphalt
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(0, 0, size, size);

  // Asphalt grain
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 40 + Math.random() * 30;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  // Road cracks
  ctx.strokeStyle = 'rgba(20,20,20,0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    let cx = Math.random() * size, cy = Math.random() * size;
    ctx.moveTo(cx, cy);
    for (let j = 0; j < 6; j++) {
      cx += (Math.random() - 0.5) * 60;
      cy += (Math.random() - 0.5) * 60;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // Oil stains
  for (let i = 0; i < 3; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 10 + Math.random() * 25;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(25,25,20,0.15)');
    grad.addColorStop(1, 'rgba(25,25,20,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  noiseLayer(ctx, size, size, 0.04);
  return makeTexture(cloneCanvas());
}

export function createUrbanGroundNormal(size = 512) {
  const ctx = setCanvas(size, size);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, size, size);

  // Paving stones pattern
  const tileW = size / 8, tileH = size / 8;
  for (let y = 0; y < size; y += tileH) {
    const offset = (Math.floor(y / tileH) % 2) * (tileW / 2);
    for (let x = -tileW; x < size + tileW; x += tileW) {
      const bx = x + offset;
      // Edge highlights for normal map
      ctx.strokeStyle = 'rgba(140,140,255,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 1, y + 1, tileW - 2, tileH - 2);
    }
  }

  // Surface noise
  const id = ctx.getImageData(0, 0, size, size);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i]     += (Math.random() - 0.5) * 8;
    d[i + 1] += (Math.random() - 0.5) * 8;
  }
  ctx.putImageData(id, 0, 0);

  return makeTexture(cloneCanvas());
}

export function createUrbanGroundRoughness(size = 256) {
  const ctx = setCanvas(size, size);
  ctx.fillStyle = '#b0b0b0'; // moderately rough
  ctx.fillRect(0, 0, size, size);
  noiseLayer(ctx, size, size, 0.1);
  return makeTexture(cloneCanvas());
}

export function createSnowGroundTexture(size = 512) {
  const ctx = setCanvas(size, size);

  // Base snow
  ctx.fillStyle = '#e8eef8';
  ctx.fillRect(0, 0, size, size);

  // Snow drifts via gradient patches
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 30 + Math.random() * 80;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.3)');
    grad.addColorStop(0.6, 'rgba(220,230,245,0.1)');
    grad.addColorStop(1, 'rgba(200,210,230,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Fine snow grain
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 220 + Math.random() * 35;
    ctx.fillStyle = `rgba(${v},${v + 2},${v + 5},0.4)`;
    ctx.fillRect(x, y, 1, 1);
  }

  // Subtle blue shadows in crevices
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 15 + Math.random() * 30;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(160,180,220,0.12)');
    grad.addColorStop(1, 'rgba(160,180,220,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  noiseLayer(ctx, size, size, 0.02);
  return makeTexture(cloneCanvas());
}

export function createSnowNormal(size = 512) {
  const ctx = setCanvas(size, size);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, size, size);

  // Gentle snow bumps
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 5 + Math.random() * 20;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(140,140,255,0.3)');
    grad.addColorStop(1, 'rgba(128,128,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return makeTexture(cloneCanvas());
}

// ─── Building Textures ───

export function createBuildingTexture(baseColor, size = 256) {
  const ctx = setCanvas(size, size);
  const c = new THREE.Color(baseColor);
  const r = Math.floor(c.r * 255), g = Math.floor(c.g * 255), b = Math.floor(c.b * 255);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, size, size);

  // Brick pattern
  const brickH = size / 16, brickW = size / 8;
  for (let row = 0; row < 16; row++) {
    const offset = (row % 2) * (brickW / 2);
    ctx.strokeStyle = `rgba(${Math.max(0,r-30)},${Math.max(0,g-30)},${Math.max(0,b-30)},0.4)`;
    ctx.lineWidth = 1;
    for (let col = -1; col < 9; col++) {
      const bx = col * brickW + offset;
      const by = row * brickH;
      ctx.strokeRect(bx, by, brickW, brickH);

      // Slight color variation per brick
      const vr = r + (Math.random() - 0.5) * 20;
      const vg = g + (Math.random() - 0.5) * 20;
      const vb = b + (Math.random() - 0.5) * 20;
      ctx.fillStyle = `rgba(${vr},${vg},${vb},0.3)`;
      ctx.fillRect(bx + 1, by + 1, brickW - 2, brickH - 2);
    }
  }

  // Windows
  const winW = size / 6, winH = size / 8;
  for (let wy = size * 0.1; wy < size * 0.85; wy += size / 4) {
    for (let wx = size * 0.15; wx < size * 0.85; wx += size / 3) {
      // Window frame
      ctx.fillStyle = `rgba(${Math.max(0,r-40)},${Math.max(0,g-40)},${Math.max(0,b-40)},0.7)`;
      ctx.fillRect(wx - 2, wy - 2, winW + 4, winH + 4);

      // Glass
      const lit = Math.random() > 0.4;
      if (lit) {
        const grad = ctx.createLinearGradient(wx, wy, wx + winW, wy + winH);
        grad.addColorStop(0, 'rgba(255,220,140,0.6)');
        grad.addColorStop(1, 'rgba(200,170,100,0.3)');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = 'rgba(30,40,60,0.8)';
      }
      ctx.fillRect(wx, wy, winW, winH);

      // Window divider
      ctx.strokeStyle = `rgba(${Math.max(0,r-30)},${Math.max(0,g-30)},${Math.max(0,b-30)},0.6)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(wx + winW / 2, wy);
      ctx.lineTo(wx + winW / 2, wy + winH);
      ctx.moveTo(wx, wy + winH / 2);
      ctx.lineTo(wx + winW, wy + winH / 2);
      ctx.stroke();
    }
  }

  // Weathering / water stains running down
  for (let i = 0; i < 4; i++) {
    const sx = Math.random() * size;
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 2 + Math.random() * 4;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    let cy = 0;
    while (cy < size) {
      cy += 3 + Math.random() * 5;
      ctx.lineTo(sx + (Math.random() - 0.5) * 3, cy);
    }
    ctx.stroke();
  }

  noiseLayer(ctx, size, size, 0.05);
  return makeTexture(cloneCanvas());
}

export function createBuildingNormal(size = 256) {
  const ctx = setCanvas(size, size);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, size, size);

  // Brick relief
  const brickH = size / 16, brickW = size / 8;
  for (let row = 0; row < 16; row++) {
    const offset = (row % 2) * (brickW / 2);
    for (let col = -1; col < 9; col++) {
      const bx = col * brickW + offset;
      const by = row * brickH;
      // Top edge lighter (pointing up in normal space)
      ctx.fillStyle = 'rgba(128,160,255,0.3)';
      ctx.fillRect(bx + 1, by, brickW - 2, 2);
      // Bottom edge darker
      ctx.fillStyle = 'rgba(128,100,255,0.3)';
      ctx.fillRect(bx + 1, by + brickH - 2, brickW - 2, 2);
      // Left edge
      ctx.fillStyle = 'rgba(100,128,255,0.2)';
      ctx.fillRect(bx, by, 2, brickH);
      // Right edge
      ctx.fillStyle = 'rgba(160,128,255,0.2)';
      ctx.fillRect(bx + brickW - 2, by, 2, brickH);
    }
  }

  return makeTexture(cloneCanvas());
}

// ─── Wood Texture (for bedroom) ───

export function createWoodTexture(size = 256) {
  const ctx = setCanvas(size, size);
  ctx.fillStyle = '#5a3a20';
  ctx.fillRect(0, 0, size, size);

  // Wood grain lines
  for (let y = 0; y < size; y++) {
    const wave = Math.sin(y * 0.08) * 8 + Math.sin(y * 0.03) * 12;
    const v = 70 + Math.sin(y * 0.15 + wave * 0.1) * 15;
    ctx.strokeStyle = `rgba(${v + 20},${v},${v - 15},0.15)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  // Knots
  for (let i = 0; i < 2; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 5 + Math.random() * 10;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(40,20,10,0.4)');
    grad.addColorStop(0.5, 'rgba(60,30,15,0.2)');
    grad.addColorStop(1, 'rgba(80,50,25,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  noiseLayer(ctx, size, size, 0.04);
  return makeTexture(cloneCanvas());
}

// ─── Rock Texture (for himalayan) ───

export function createRockTexture(size = 256) {
  const ctx = setCanvas(size, size);
  ctx.fillStyle = '#6a7a8a';
  ctx.fillRect(0, 0, size, size);

  // Layered rock strata
  for (let y = 0; y < size; y += 3 + Math.random() * 8) {
    const v = 80 + Math.random() * 40;
    ctx.fillStyle = `rgba(${v},${v + 5},${v + 10},0.15)`;
    ctx.fillRect(0, y, size, 2 + Math.random() * 4);
  }

  // Cracks
  ctx.strokeStyle = 'rgba(40,45,50,0.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    let cx = Math.random() * size, cy = Math.random() * size;
    ctx.moveTo(cx, cy);
    for (let j = 0; j < 4; j++) {
      cx += (Math.random() - 0.5) * 40;
      cy += (Math.random() - 0.5) * 40;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // Lichen patches
  for (let i = 0; i < 4; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 5 + Math.random() * 15;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(80,100,60,0.2)');
    grad.addColorStop(1, 'rgba(80,100,60,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  noiseLayer(ctx, size, size, 0.06);
  return makeTexture(cloneCanvas());
}

export function createRockNormal(size = 256) {
  const ctx = setCanvas(size, size);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, size, size);

  // Rocky bumps
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 3 + Math.random() * 12;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(150,150,255,0.4)');
    grad.addColorStop(1, 'rgba(128,128,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return makeTexture(cloneCanvas());
}

// ─── Obstacle / Token Textures ───

export function createMetalTexture(size = 128) {
  const ctx = setCanvas(size, size);
  // Brushed metal gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#888');
  grad.addColorStop(0.3, '#aaa');
  grad.addColorStop(0.5, '#999');
  grad.addColorStop(0.7, '#bbb');
  grad.addColorStop(1, '#888');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Brush lines
  for (let y = 0; y < size; y++) {
    const v = 128 + (Math.random() - 0.5) * 20;
    ctx.strokeStyle = `rgba(${v},${v},${v},0.08)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  noiseLayer(ctx, size, size, 0.03);
  return makeTexture(cloneCanvas());
}

export function createTokenTexture(size = 128) {
  const ctx = setCanvas(size, size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, '#ffee55');
  grad.addColorStop(0.5, '#ffcc00');
  grad.addColorStop(1, '#cc9900');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Embossed symbol in center
  ctx.fillStyle = 'rgba(180,130,0,0.3)';
  ctx.font = `bold ${size / 2}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ॐ', size / 2, size / 2);

  noiseLayer(ctx, size, size, 0.03);
  return makeTexture(cloneCanvas());
}

// ─── Material Factory ───

const _matCache = new Map();

export function getPBRMaterial(key, params) {
  if (_matCache.has(key)) return _matCache.get(key).clone();
  const mat = new THREE.MeshStandardMaterial(params);
  _matCache.set(key, mat);
  return mat.clone();
}

export function createUrbanGroundMaterial() {
  return new THREE.MeshStandardMaterial({
    map: createUrbanGroundTexture(),
    normalMap: createUrbanGroundNormal(),
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughnessMap: createUrbanGroundRoughness(),
    roughness: 0.85,
    metalness: 0.05,
  });
}

export function createSnowGroundMaterial() {
  return new THREE.MeshStandardMaterial({
    map: createSnowGroundTexture(),
    normalMap: createSnowNormal(),
    normalScale: new THREE.Vector2(0.3, 0.3),
    roughness: 0.4,
    metalness: 0.0,
    envMapIntensity: 0.8,
  });
}

export function createBuildingMaterial(color) {
  return new THREE.MeshStandardMaterial({
    map: createBuildingTexture(color),
    normalMap: createBuildingNormal(),
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughness: 0.8,
    metalness: 0.05,
  });
}

export function createWoodMaterial() {
  return new THREE.MeshStandardMaterial({
    map: createWoodTexture(),
    roughness: 0.7,
    metalness: 0.0,
  });
}

export function createRockMaterial() {
  return new THREE.MeshStandardMaterial({
    map: createRockTexture(),
    normalMap: createRockNormal(),
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: 0.9,
    metalness: 0.1,
  });
}

export function createObstacleMaterial(biome) {
  if (biome === 'himalayan') {
    return new THREE.MeshStandardMaterial({
      map: createRockTexture(128),
      normalMap: createRockNormal(128),
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 0.85,
      metalness: 0.1,
      color: 0x7a8a9a,
    });
  }
  return new THREE.MeshStandardMaterial({
    map: createMetalTexture(),
    roughness: 0.6,
    metalness: 0.4,
    color: 0x665544,
  });
}

export function createTokenMaterial() {
  return new THREE.MeshStandardMaterial({
    map: createTokenTexture(),
    roughness: 0.25,
    metalness: 0.9,
    emissive: 0xffaa00,
    emissiveIntensity: 0.3,
  });
}
