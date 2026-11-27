import * as THREE from 'three';

export interface BenchmarkMaterialMaps {
  map: THREE.CanvasTexture;
  normalMap: THREE.DataTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
}

export interface BenchmarkTextureBundle {
  humanSkin: BenchmarkMaterialMaps;
  zombieSkin: BenchmarkMaterialMaps;
  dirtyCloth: BenchmarkMaterialMaps;
  leather: BenchmarkMaterialMaps;
  metal: BenchmarkMaterialMaps;
  bloodStained: BenchmarkMaterialMaps;
  hair: BenchmarkMaterialMaps;
  stageFloor: BenchmarkMaterialMaps;
  dispose: () => void;
}

function seededRand(seed: number): () => number {
  let s = (Math.floor(seed * 9973) % 2147483647) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeCanvas(size: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

function heightToNormalTexture(
  heightCanvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  anisotropy: number,
  strength: number
): THREE.DataTexture {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const ctx = heightCanvas.getContext('2d')!;
  const src = ctx.getImageData(0, 0, w, h).data;
  const out = new Uint8Array(w * h * 4);

  const sample = (x: number, y: number): number => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // 3x3 Sobel gradient for cleaner micro-normals
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dx = (tr + 2 * r + br - (tl + 2 * l + bl)) * 0.25 * strength;
      const dy = (bl + 2 * b + br - (tl + 2 * t + tr)) * 0.25 * strength;
      const dz = 1.0;
      const inv = 1 / Math.hypot(dx, dy, dz);

      const idx = (y * w + x) * 4;
      out[idx] = Math.max(0, Math.min(255, Math.round((dx * inv * 0.5 + 0.5) * 255)));
      out[idx + 1] = Math.max(0, Math.min(255, Math.round((dy * inv * 0.5 + 0.5) * 255)));
      out[idx + 2] = Math.max(0, Math.min(255, Math.round((dz * inv * 0.5 + 0.5) * 255)));
      out[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(out, w, h, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, anisotropy);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function toCanvasTex(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  anisotropy: number,
  srgb: boolean
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, anisotropy);
  tex.needsUpdate = true;
  return tex;
}

function buildPbrSet(
  size: number,
  repeatX: number,
  repeatY: number,
  anisotropy: number,
  normalStrength: number,
  paint: (ctx: {
    albedo: CanvasRenderingContext2D;
    height: CanvasRenderingContext2D;
    rough: CanvasRenderingContext2D;
    ao: CanvasRenderingContext2D;
    s: number;
  }) => void
): BenchmarkMaterialMaps {
  const a = makeCanvas(size);
  const h = makeCanvas(size);
  const r = makeCanvas(size);
  const o = makeCanvas(size);

  paint({
    albedo: a.ctx,
    height: h.ctx,
    rough: r.ctx,
    ao: o.ctx,
    s: size,
  });

  return {
    map: toCanvasTex(a.canvas, repeatX, repeatY, anisotropy, true),
    normalMap: heightToNormalTexture(h.canvas, repeatX, repeatY, anisotropy, normalStrength),
    roughnessMap: toCanvasTex(r.canvas, repeatX, repeatY, anisotropy, false),
    aoMap: toCanvasTex(o.canvas, repeatX, repeatY, anisotropy, false),
  };
}

export function createBenchmarkTextureBundle(
  resolution: 512 | 256 = 512,
  maxAnisotropy = 4
): BenchmarkTextureBundle {
  // 1. Human Skin (pores, capillary warmth, creases, grime, oil sheen variation)
  const humanSkin = buildPbrSet(resolution, 1.5, 1.5, maxAnisotropy, 1.4, ({ albedo, height, rough, ao, s }) => {
    const rand = seededRand(101);
    albedo.fillStyle = '#cca289';
    albedo.fillRect(0, 0, s, s);
    height.fillStyle = '#808080';
    height.fillRect(0, 0, s, s);
    rough.fillStyle = '#d4d4d4';
    rough.fillRect(0, 0, s, s);
    ao.fillStyle = '#ededed';
    ao.fillRect(0, 0, s, s);

    // Subtle organic subsurface warmth mottling
    for (let i = 0; i < 160; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const rad = (0.04 + rand() * 0.1) * s;
      const g = albedo.createRadialGradient(x, y, 0, x, y, rad);
      const warm = rand() > 0.42;
      g.addColorStop(0, warm ? 'rgba(165, 86, 68, 0.08)' : 'rgba(132, 114, 102, 0.08)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      albedo.fillStyle = g;
      albedo.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }

    // Fine pores + skin micro-texture
    const poreCount = Math.floor(s * 5.0);
    for (let i = 0; i < poreCount; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const d = 1 + rand() * 1.1;
      albedo.fillStyle = rand() > 0.5 ? 'rgba(95,62,48,0.05)' : 'rgba(225,192,172,0.05)';
      albedo.fillRect(x, y, d, d);
      height.fillStyle = rand() > 0.45 ? 'rgba(65,65,65,0.16)' : 'rgba(195,195,195,0.10)';
      height.fillRect(x, y, d, d);
      rough.fillStyle = rand() > 0.5 ? 'rgba(190,190,190,0.16)' : 'rgba(135,135,135,0.16)';
      rough.fillRect(x, y, d * 1.6, d * 1.6);
    }

    // Subtle skin crease lines
    for (let i = 0; i < 28; i++) {
      const x0 = rand() * s;
      const y0 = rand() * s;
      const len = (0.04 + rand() * 0.08) * s;
      const ang = (rand() - 0.5) * 0.5;
      height.strokeStyle = 'rgba(55,55,55,0.16)';
      height.lineWidth = 1.0;
      height.beginPath();
      height.moveTo(x0, y0);
      height.lineTo(x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len);
      height.stroke();

      ao.strokeStyle = 'rgba(155,155,155,0.10)';
      ao.lineWidth = 1.5;
      ao.beginPath();
      ao.moveTo(x0, y0);
      ao.lineTo(x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len);
      ao.stroke();
    }
  });

  // 2. Zombie Skin (pallid necrotic grey-olive, bruised veins, wet lesions, crusty flaking)
  const zombieSkin = buildPbrSet(resolution, 1.5, 1.5, maxAnisotropy, 2.8, ({ albedo, height, rough, ao, s }) => {
    const rand = seededRand(203);
    albedo.fillStyle = '#8e937f';
    albedo.fillRect(0, 0, s, s);
    height.fillStyle = '#7e7e7e';
    height.fillRect(0, 0, s, s);
    rough.fillStyle = '#dcdcdc';
    rough.fillRect(0, 0, s, s);
    ao.fillStyle = '#e0e0e0';
    ao.fillRect(0, 0, s, s);

    // Necrotic lividity blotches
    for (let i = 0; i < 120; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const rad = (0.05 + rand() * 0.14) * s;
      const g = albedo.createRadialGradient(x, y, 0, x, y, rad);
      const tone = rand();
      g.addColorStop(
        0,
        tone < 0.4
          ? 'rgba(54, 46, 54, 0.28)'
          : tone < 0.78
            ? 'rgba(84, 34, 30, 0.22)'
            : 'rgba(140, 146, 128, 0.18)'
      );
      g.addColorStop(1, 'rgba(0,0,0,0)');
      albedo.fillStyle = g;
      albedo.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }

    // Dark branching veins & cracked skin fissures
    for (let i = 0; i < 72; i++) {
      let cx = rand() * s;
      let cy = rand() * s;
      albedo.strokeStyle = rand() > 0.35 ? 'rgba(38, 22, 26, 0.42)' : 'rgba(26, 36, 32, 0.36)';
      albedo.lineWidth = 0.8 + rand() * 1.4;
      height.strokeStyle = 'rgba(24,24,24,0.45)';
      height.lineWidth = albedo.lineWidth * 1.2;
      ao.strokeStyle = 'rgba(70,70,70,0.35)';
      ao.lineWidth = albedo.lineWidth * 1.8;

      albedo.beginPath();
      height.beginPath();
      ao.beginPath();
      albedo.moveTo(cx, cy);
      height.moveTo(cx, cy);
      ao.moveTo(cx, cy);
      for (let seg = 0; seg < 4; seg++) {
        cx += (rand() - 0.5) * s * 0.12;
        cy += (rand() - 0.5) * s * 0.12;
        albedo.lineTo(cx, cy);
        height.lineTo(cx, cy);
        ao.lineTo(cx, cy);
      }
      albedo.stroke();
      height.stroke();
      ao.stroke();
    }

    // Ragged matte necrotic abrasions & bruised lividity (avoid circular polka-dots)
    for (let i = 0; i < 16; i++) {
      let lx = rand() * s;
      let ly = rand() * s;
      albedo.strokeStyle = 'rgba(72, 22, 22, 0.46)';
      albedo.lineWidth = 2.5 + rand() * 3.5;
      height.strokeStyle = 'rgba(28, 28, 28, 0.48)';
      height.lineWidth = albedo.lineWidth;
      rough.strokeStyle = 'rgba(135, 135, 135, 0.35)';
      rough.lineWidth = albedo.lineWidth;

      albedo.beginPath();
      height.beginPath();
      rough.beginPath();
      albedo.moveTo(lx, ly);
      height.moveTo(lx, ly);
      rough.moveTo(lx, ly);
      for (let k = 0; k < 3; k++) {
        lx += (rand() - 0.5) * s * 0.06;
        ly += (rand() - 0.5) * s * 0.06;
        albedo.lineTo(lx, ly);
        height.lineTo(lx, ly);
        rough.lineTo(lx, ly);
      }
      albedo.stroke();
      height.stroke();
      rough.stroke();
    }
  });

  // 3. Dirty Cloth (diagonal twill weave, frayed threads, mud/soot patches)
  const dirtyCloth = buildPbrSet(resolution, 3.0, 3.0, maxAnisotropy, 2.2, ({ albedo, height, rough, ao, s }) => {
    const rand = seededRand(307);
    albedo.fillStyle = '#8a8e86';
    albedo.fillRect(0, 0, s, s);
    height.fillStyle = '#808080';
    height.fillRect(0, 0, s, s);
    rough.fillStyle = '#ededed';
    rough.fillRect(0, 0, s, s);
    ao.fillStyle = '#ededed';
    ao.fillRect(0, 0, s, s);

    // Twill weave threads
    const step = Math.max(3, Math.floor(s / 96));
    for (let y = 0; y < s; y += step) {
      for (let x = 0; x < s; x += step) {
        const diag = ((x + y) / step) % 4;
        const bright = diag < 2;
        albedo.fillStyle = bright ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)';
        albedo.fillRect(x, y, step - 1, step - 1);
        height.fillStyle = bright ? 'rgba(220,220,220,0.28)' : 'rgba(45,45,45,0.28)';
        height.fillRect(x, y, step - 1, step - 1);
      }
    }

    // Soft dusty grime wash & subtle cloth wear creases (no spotted camo look)
    for (let i = 0; i < 42; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const rad = (0.12 + rand() * 0.22) * s;
      const g = albedo.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, rand() > 0.4 ? 'rgba(30, 26, 22, 0.09)' : 'rgba(110, 102, 88, 0.07)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      albedo.fillStyle = g;
      albedo.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 28; i++) {
      const y0 = rand() * s;
      albedo.strokeStyle = 'rgba(20, 18, 16, 0.08)';
      albedo.lineWidth = 1.5 + rand() * 2;
      albedo.beginPath();
      albedo.moveTo(0, y0);
      albedo.lineTo(s, y0 + (rand() - 0.5) * s * 0.14);
      albedo.stroke();
    }
  });

  // 4. Weathered Leather (pebbled grain cells, crease wrinkles, scuffed edges)
  const leather = buildPbrSet(resolution, 2.2, 2.2, maxAnisotropy, 2.5, ({ albedo, height, rough, ao, s }) => {
    const rand = seededRand(409);
    albedo.fillStyle = '#6f513e';
    albedo.fillRect(0, 0, s, s);
    height.fillStyle = '#848484';
    height.fillRect(0, 0, s, s);
    rough.fillStyle = '#c6c6c6';
    rough.fillRect(0, 0, s, s);
    ao.fillStyle = '#e6e6e6';
    ao.fillRect(0, 0, s, s);

    // Pebbled leather pores/cells
    const cells = Math.floor(s * 5.2);
    for (let i = 0; i < cells; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const rad = 1.6 + rand() * 3.2;
      height.fillStyle = 'rgba(235,235,235,0.22)';
      height.beginPath();
      height.arc(x, y, rad, 0, Math.PI * 2);
      height.fill();

      height.strokeStyle = 'rgba(25,25,25,0.34)';
      height.lineWidth = 0.8;
      height.stroke();

      albedo.fillStyle = rand() > 0.5 ? 'rgba(72,52,40,0.16)' : 'rgba(18,12,9,0.18)';
      albedo.beginPath();
      albedo.arc(x, y, rad * 0.85, 0, Math.PI * 2);
      albedo.fill();
    }

    // Flex creases & worn scuffed ridges
    for (let i = 0; i < 45; i++) {
      const x0 = rand() * s;
      const y0 = rand() * s;
      const x1 = x0 + (rand() - 0.5) * s * 0.35;
      const y1 = y0 + (rand() - 0.5) * s * 0.18;
      albedo.strokeStyle = rand() > 0.45 ? 'rgba(92, 68, 52, 0.28)' : 'rgba(16, 11, 8, 0.36)';
      albedo.lineWidth = 1.2 + rand() * 2;
      albedo.beginPath();
      albedo.moveTo(x0, y0);
      albedo.lineTo(x1, y1);
      albedo.stroke();

      rough.strokeStyle = rand() > 0.5 ? 'rgba(110,110,110,0.35)' : 'rgba(175,175,175,0.3)';
      rough.lineWidth = albedo.lineWidth;
      rough.beginPath();
      rough.moveTo(x0, y0);
      rough.lineTo(x1, y1);
      rough.stroke();
    }
  });

  // 5. Forged / Pitted Metal (brushed steel + oxidized rust pits)
  const metal = buildPbrSet(resolution, 2.0, 2.0, maxAnisotropy, 2.4, ({ albedo, height, rough, ao, s }) => {
    const rand = seededRand(509);
    albedo.fillStyle = '#5c636b';
    albedo.fillRect(0, 0, s, s);
    height.fillStyle = '#858585';
    height.fillRect(0, 0, s, s);
    rough.fillStyle = '#686868';
    rough.fillRect(0, 0, s, s);
    ao.fillStyle = '#ededed';
    ao.fillRect(0, 0, s, s);

    // Anisotropic brushed metal lines
    for (let i = 0; i < s * 2; i++) {
      const y = rand() * s;
      const x = rand() * s;
      const w = (0.1 + rand() * 0.3) * s;
      const light = rand() > 0.5;
      albedo.fillStyle = light ? 'rgba(215,225,235,0.08)' : 'rgba(25,30,36,0.1)';
      albedo.fillRect(x, y, w, 1);
      height.fillStyle = light ? 'rgba(200,200,200,0.18)' : 'rgba(55,55,55,0.18)';
      height.fillRect(x, y, w, 1);
      rough.fillStyle = light ? 'rgba(85,85,85,0.22)' : 'rgba(135,135,135,0.22)';
      rough.fillRect(x, y, w, 1);
    }

    // Scratches & rust pitting
    for (let i = 0; i < 65; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const rad = (0.012 + rand() * 0.045) * s;
      const g = albedo.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(82, 42, 24, 0.62)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      albedo.fillStyle = g;
      albedo.fillRect(x - rad, y - rad, rad * 2, rad * 2);

      height.fillStyle = 'rgba(28,28,28,0.45)';
      height.beginPath();
      height.arc(x, y, rad * 0.55, 0, Math.PI * 2);
      height.fill();

      rough.fillStyle = 'rgba(215,215,215,0.68)';
      rough.beginPath();
      rough.arc(x, y, rad * 0.75, 0, Math.PI * 2);
      rough.fill();

      ao.fillStyle = 'rgba(95,95,95,0.28)';
      ao.beginPath();
      ao.arc(x, y, rad * 0.6, 0, Math.PI * 2);
      ao.fill();
    }
  });

  // 6. Blood-Stained Surface (dried oxidized dark crimson crust + wet coagulated glossy pools)
  const bloodStained = buildPbrSet(resolution, 1.5, 1.5, maxAnisotropy, 2.2, ({ albedo, height, rough, ao, s }) => {
    const rand = seededRand(613);
    albedo.fillStyle = '#7e766d';
    albedo.fillRect(0, 0, s, s);
    height.fillStyle = '#7c7c7c';
    height.fillRect(0, 0, s, s);
    rough.fillStyle = '#dcdcdc';
    rough.fillRect(0, 0, s, s);
    ao.fillStyle = '#e6e6e6';
    ao.fillRect(0, 0, s, s);

    // Base cloth/tissue fiber under blood
    for (let y = 0; y < s; y += 3) {
      height.fillStyle = y % 6 === 0 ? 'rgba(205,205,205,0.14)' : 'rgba(60,60,60,0.14)';
      height.fillRect(0, y, s, 1);
    }

    // Dried dark blood smears
    for (let i = 0; i < 42; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const rad = (0.04 + rand() * 0.14) * s;
      const g = albedo.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(62, 12, 12, 0.78)');
      g.addColorStop(0.6, 'rgba(42, 10, 10, 0.45)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      albedo.fillStyle = g;
      albedo.fillRect(x - rad, y - rad, rad * 2, rad * 2);

      rough.fillStyle = 'rgba(130,130,130,0.45)';
      rough.beginPath();
      rough.arc(x, y, rad * 0.7, 0, Math.PI * 2);
      rough.fill();
    }

    // Fresh wet arterial streaks (very low roughness = crisp specular wet sheen)
    for (let i = 0; i < 36; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const dripLen = (0.06 + rand() * 0.24) * s;
      const w = 2 + rand() * 5.5;
      albedo.fillStyle = 'rgba(108, 12, 14, 0.85)';
      albedo.beginPath();
      albedo.ellipse(x, y + dripLen * 0.5, w, dripLen * 0.5, (rand() - 0.5) * 0.25, 0, Math.PI * 2);
      albedo.fill();

      height.fillStyle = 'rgba(215,215,215,0.4)';
      height.beginPath();
      height.ellipse(x, y + dripLen * 0.5, w, dripLen * 0.5, 0, 0, Math.PI * 2);
      height.fill();

      rough.fillStyle = 'rgba(34,34,34,0.88)';
      rough.beginPath();
      rough.ellipse(x, y + dripLen * 0.5, w * 1.1, dripLen * 0.52, 0, 0, Math.PI * 2);
      rough.fill();

      ao.fillStyle = 'rgba(90,90,90,0.32)';
      ao.beginPath();
      ao.ellipse(x, y + dripLen * 0.5, w * 1.2, dripLen * 0.55, 0, 0, Math.PI * 2);
      ao.fill();
    }
  });

  // 7. Hair Strand Map (directional strands + roughness)
  const hair = buildPbrSet(resolution, 2.0, 2.0, maxAnisotropy, 2.6, ({ albedo, height, rough, ao, s }) => {
    const rand = seededRand(719);
    albedo.fillStyle = '#4b3b2f';
    albedo.fillRect(0, 0, s, s);
    height.fillStyle = '#7e7e7e';
    height.fillRect(0, 0, s, s);
    rough.fillStyle = '#d8d8d8';
    rough.fillRect(0, 0, s, s);
    ao.fillStyle = '#e2e2e2';
    ao.fillRect(0, 0, s, s);

    for (let i = 0; i < s * 3.5; i++) {
      const x = rand() * s;
      const w = 1 + rand() * 1.6;
      const bright = rand();
      albedo.fillStyle = bright > 0.65 ? 'rgba(72,56,42,0.45)' : 'rgba(12,9,7,0.48)';
      albedo.fillRect(x, 0, w, s);
      height.fillStyle = bright > 0.5 ? 'rgba(220,220,220,0.34)' : 'rgba(38,38,38,0.34)';
      height.fillRect(x, 0, w, s);
      rough.fillStyle = bright > 0.5 ? 'rgba(115,115,115,0.28)' : 'rgba(165,165,165,0.28)';
      rough.fillRect(x, 0, w, s);
    }
  });

  // 8. Stage Concrete Floor
  const stageFloor = buildPbrSet(resolution, 4.0, 4.0, maxAnisotropy, 1.8, ({ albedo, height, rough, ao, s }) => {
    const rand = seededRand(823);
    albedo.fillStyle = '#22262c';
    albedo.fillRect(0, 0, s, s);
    height.fillStyle = '#808080';
    height.fillRect(0, 0, s, s);
    rough.fillStyle = '#d4d4d4';
    rough.fillRect(0, 0, s, s);
    ao.fillStyle = '#ececec';
    ao.fillRect(0, 0, s, s);

    for (let i = 0; i < 420; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const rad = (0.01 + rand() * 0.05) * s;
      albedo.fillStyle = rand() > 0.5 ? 'rgba(54,58,64,0.18)' : 'rgba(12,14,18,0.22)';
      albedo.beginPath();
      albedo.arc(x, y, rad, 0, Math.PI * 2);
      albedo.fill();
      height.fillStyle = rand() > 0.5 ? 'rgba(180,180,180,0.14)' : 'rgba(65,65,65,0.14)';
      height.fillRect(x, y, rad * 0.4, rad * 0.4);
    }
  });

  const allSets = [
    humanSkin,
    zombieSkin,
    dirtyCloth,
    leather,
    metal,
    bloodStained,
    hair,
    stageFloor,
  ];

  return {
    humanSkin,
    zombieSkin,
    dirtyCloth,
    leather,
    metal,
    bloodStained,
    hair,
    stageFloor,
    dispose: () => {
      for (const set of allSets) {
        set.map.dispose();
        set.normalMap.dispose();
        set.roughnessMap.dispose();
        set.aoMap.dispose();
      }
    },
  };
}
