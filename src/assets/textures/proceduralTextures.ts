import * as THREE from 'three';

export interface ProceduralTextureSet {
  asphalt: THREE.CanvasTexture;
  asphaltNormal: THREE.DataTexture;
  asphaltRoughness: THREE.CanvasTexture;
  sidewalk: THREE.CanvasTexture;
  sidewalkNormal: THREE.DataTexture;
  sidewalkRoughness: THREE.CanvasTexture;
  wasteland: THREE.CanvasTexture;
  wastelandNormal: THREE.DataTexture;
  brickWall: THREE.CanvasTexture;
  brickNormal: THREE.DataTexture;
  brickRoughness: THREE.CanvasTexture;
  concreteWall: THREE.CanvasTexture;
  concreteNormal: THREE.DataTexture;
  concreteRoughness: THREE.CanvasTexture;
  rustedMetal: THREE.CanvasTexture;
  rustedMetalNormal: THREE.DataTexture;
  rustedMetalRoughness: THREE.CanvasTexture;
  woodPlank: THREE.CanvasTexture;
  woodNormal: THREE.DataTexture;
  woodRoughness: THREE.CanvasTexture;
  wornTile: THREE.CanvasTexture;
  wornTileNormal: THREE.DataTexture;
  wornTileRoughness: THREE.CanvasTexture;
  interiorPlaster: THREE.CanvasTexture;
  interiorPlasterNormal: THREE.DataTexture;
  shopSign: THREE.CanvasTexture;
  awningStripe: THREE.CanvasTexture;
  signValeStore: THREE.CanvasTexture;
  signDepot04: THREE.CanvasTexture;
  signStarlightDiner: THREE.CanvasTexture;
  signRedlineAuto: THREE.CanvasTexture;
  signMercerFlats: THREE.CanvasTexture;
  signMainBlvd: THREE.CanvasTexture;
  signCentralAve: THREE.CanvasTexture;
  signQuarantine: THREE.CanvasTexture;
  signPolicePrecinct: THREE.CanvasTexture;
  signFieldClinic: THREE.CanvasTexture;
  signResearchLab: THREE.CanvasTexture;
  signDistrictNorth: THREE.CanvasTexture;
  signDistrictCross: THREE.CanvasTexture;
  hazardStripe: THREE.CanvasTexture;
  dispose: () => void;
}

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
  isColor = true
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Converts a tileable grayscale canvas (luminance = height) into a tangent-space normal map.
 */
function createNormalFromHeightCanvas(
  heightCanvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
  strength = 2.2
): THREE.DataTexture {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const ctx = heightCanvas.getContext('2d')!;
  const src = ctx.getImageData(0, 0, w, h).data;
  const out = new Uint8Array(w * h * 4);

  const sampleH = (x: number, y: number): number => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const hL = sampleH(x - 1, y);
      const hR = sampleH(x + 1, y);
      const hU = sampleH(x, y - 1);
      const hD = sampleH(x, y + 1);

      const dx = (hL - hR) * strength;
      const dy = (hU - hD) * strength;
      const dz = 1.0;
      const invLen = 1 / Math.hypot(dx, dy, dz);

      const idx = (y * w + x) * 4;
      out[idx] = Math.max(0, Math.min(255, Math.round((dx * invLen * 0.5 + 0.5) * 255)));
      out[idx + 1] = Math.max(0, Math.min(255, Math.round((dy * invLen * 0.5 + 0.5) * 255)));
      out[idx + 2] = Math.max(0, Math.min(255, Math.round((dz * invLen * 0.5 + 0.5) * 255)));
      out[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(out, w, h, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function makeCanvasPair(size = 256): {
  color: HTMLCanvasElement;
  cctx: CanvasRenderingContext2D;
  height: HTMLCanvasElement;
  hctx: CanvasRenderingContext2D;
  rough: HTMLCanvasElement;
  rctx: CanvasRenderingContext2D;
} {
  const color = document.createElement('canvas');
  color.width = size;
  color.height = size;
  const height = document.createElement('canvas');
  height.width = size;
  height.height = size;
  const rough = document.createElement('canvas');
  rough.width = size;
  rough.height = size;
  return {
    color,
    cctx: color.getContext('2d')!,
    height,
    hctx: height.getContext('2d')!,
    rough,
    rctx: rough.getContext('2d')!,
  };
}

function createSignboardTexture(
  opts: {
    bg: string;
    border: string;
    text: string;
    textColor: string;
    subText?: string;
    subColor?: string;
    width?: number;
    height?: number;
    fontSize?: number;
  },
  maxAnisotropy: number
): THREE.CanvasTexture {
  const w = opts.width ?? 512;
  const h = opts.height ?? 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = opts.bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = opts.border;
  ctx.lineWidth = Math.max(4, Math.round(h * 0.055));
  ctx.strokeRect(6, 6, w - 12, h - 12);

  // Grime & water-streak weathering along bottom and corners
  const grime = ctx.createLinearGradient(0, 0, 0, h);
  grime.addColorStop(0, 'rgba(0,0,0,0.08)');
  grime.addColorStop(0.65, 'rgba(0,0,0,0)');
  grime.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = grime;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = opts.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const mainY = opts.subText ? h * 0.41 : h * 0.52;
  ctx.font = `700 ${opts.fontSize ?? Math.round(h * 0.44)}px "Barlow Condensed", sans-serif`;
  ctx.fillText(opts.text, w * 0.5, mainY, w - 36);

  if (opts.subText) {
    ctx.fillStyle = opts.subColor ?? opts.textColor;
    ctx.font = `600 ${Math.round(h * 0.21)}px "Barlow Condensed", sans-serif`;
    ctx.fillText(opts.subText, w * 0.5, h * 0.76, w - 36);
  }

  const tex = finalizeTexture(canvas, 1, 1, maxAnisotropy, true);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function createProceduralTextureSet(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Weathered Cracked Asphalt + Aggregate Normal + Damp Puddle Roughness
  const asp = makeCanvasPair(256);
  const randA = seededRand(101);
  asp.cctx.fillStyle = '#1b1e25';
  asp.cctx.fillRect(0, 0, 256, 256);
  asp.hctx.fillStyle = 'rgb(138,138,138)';
  asp.hctx.fillRect(0, 0, 256, 256);
  asp.rctx.fillStyle = 'rgb(225,225,225)'; // ~0.88 rough dry asphalt baseline
  asp.rctx.fillRect(0, 0, 256, 256);

  // Subtle dark tar patches
  for (let i = 0; i < 6; i++) {
    const px = randA() * 200;
    const py = randA() * 200;
    const pw = 24 + randA() * 44;
    const ph = 18 + randA() * 34;
    asp.cctx.fillStyle = 'rgba(13, 15, 19, 0.42)';
    asp.cctx.fillRect(px, py, pw, ph);
    asp.rctx.fillStyle = 'rgb(155,155,155)';
    asp.rctx.fillRect(px, py, pw, ph);
  }

  // Damp oil/rain sheen pockets (lower roughness = 0.38-0.55)
  for (let i = 0; i < 7; i++) {
    const x = randA() * 256;
    const y = randA() * 256;
    const rad = 18 + randA() * 36;
    const grad = asp.rctx.createRadialGradient(x, y, 2, x, y, rad);
    grad.addColorStop(0, 'rgba(98, 98, 98, 0.92)');
    grad.addColorStop(1, 'rgba(225, 225, 225, 0)');
    asp.rctx.fillStyle = grad;
    asp.rctx.beginPath();
    asp.rctx.arc(x, y, rad, 0, Math.PI * 2);
    asp.rctx.fill();

    const cGrad = asp.cctx.createRadialGradient(x, y, 2, x, y, rad);
    cGrad.addColorStop(0, 'rgba(12, 15, 20, 0.35)');
    cGrad.addColorStop(1, 'rgba(12, 15, 20, 0)');
    asp.cctx.fillStyle = cGrad;
    asp.cctx.beginPath();
    asp.cctx.arc(x, y, rad, 0, Math.PI * 2);
    asp.cctx.fill();
  }

  // Fine mineral gravel aggregate
  for (let i = 0; i < 950; i++) {
    const rx = randA() * 256;
    const ry = randA() * 256;
    const rSize = 0.6 + randA() * 1.5;
    const bright = randA() > 0.5;
    asp.cctx.fillStyle = bright ? 'rgba(210,215,222,0.055)' : 'rgba(8,10,13,0.09)';
    asp.cctx.fillRect(rx, ry, rSize, rSize);
    asp.hctx.fillStyle = bright ? 'rgba(195,195,195,0.28)' : 'rgba(72,72,72,0.3)';
    asp.hctx.fillRect(rx, ry, rSize, rSize);
  }

  // Branching asphalt fractures
  asp.cctx.strokeStyle = 'rgba(7,9,12,0.68)';
  asp.hctx.strokeStyle = 'rgb(34,34,34)';
  asp.cctx.lineWidth = 1.4;
  asp.hctx.lineWidth = 2.0;
  for (let i = 0; i < 8; i++) {
    let x = randA() * 256;
    let y = randA() * 256;
    asp.cctx.beginPath();
    asp.hctx.beginPath();
    asp.cctx.moveTo(x, y);
    asp.hctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (randA() - 0.5) * 38;
      y += (randA() - 0.5) * 38;
      asp.cctx.lineTo(x, y);
      asp.hctx.lineTo(x, y);
    }
    asp.cctx.stroke();
    asp.hctx.stroke();
  }
  const asphalt = finalizeTexture(asp.color, 20, 20, maxAnisotropy, true);
  const asphaltNormal = createNormalFromHeightCanvas(asp.height, 20, 20, maxAnisotropy, 1.9);
  const asphaltRoughness = finalizeTexture(asp.rough, 20, 20, maxAnisotropy, false);

  // 2. Cracked Concrete Sidewalk Slabs
  const sw = makeCanvasPair(256);
  const randS = seededRand(202);
  sw.cctx.fillStyle = '#3f454d';
  sw.cctx.fillRect(0, 0, 256, 256);
  sw.hctx.fillStyle = 'rgb(155,155,155)';
  sw.hctx.fillRect(0, 0, 256, 256);
  sw.rctx.fillStyle = 'rgb(230,230,230)';
  sw.rctx.fillRect(0, 0, 256, 256);

  for (let gx = 0; gx < 256; gx += 64) {
    for (let gy = 0; gy < 256; gy += 64) {
      const shade = (randS() - 0.5) * 14;
      sw.cctx.fillStyle = `rgb(${64 + shade},${68 + shade},${75 + shade})`;
      sw.cctx.fillRect(gx + 2, gy + 2, 60, 60);
      const hTone = 148 + Math.round((randS() - 0.5) * 20);
      sw.hctx.fillStyle = `rgb(${hTone},${hTone},${hTone})`;
      sw.hctx.fillRect(gx + 2, gy + 2, 60, 60);
    }
  }
  // Subtle grime & olive moss near joints
  for (let i = 0; i < 180; i++) {
    const rx = randS() * 256;
    const ry = randS() * 256;
    sw.cctx.fillStyle = randS() > 0.7 ? 'rgba(56,68,46,0.12)' : 'rgba(18,20,24,0.12)';
    sw.cctx.fillRect(rx, ry, 2 + randS() * 4, 2 + randS() * 4);
    sw.hctx.fillStyle = 'rgba(105,105,105,0.22)';
    sw.hctx.fillRect(rx, ry, 2, 2);
  }
  // Expansion grooves
  sw.cctx.strokeStyle = 'rgba(14,17,22,0.72)';
  sw.cctx.lineWidth = 2.5;
  sw.hctx.strokeStyle = 'rgb(42,42,42)';
  sw.hctx.lineWidth = 3.0;
  for (let i = 0; i <= 256; i += 64) {
    sw.cctx.beginPath();
    sw.cctx.moveTo(i, 0);
    sw.cctx.lineTo(i, 256);
    sw.cctx.moveTo(0, i);
    sw.cctx.lineTo(256, i);
    sw.cctx.stroke();

    sw.hctx.beginPath();
    sw.hctx.moveTo(i, 0);
    sw.hctx.lineTo(i, 256);
    sw.hctx.moveTo(0, i);
    sw.hctx.lineTo(256, i);
    sw.hctx.stroke();
  }
  const sidewalk = finalizeTexture(sw.color, 6, 6, maxAnisotropy, true);
  const sidewalkNormal = createNormalFromHeightCanvas(sw.height, 6, 6, maxAnisotropy, 2.2);
  const sidewalkRoughness = finalizeTexture(sw.rough, 6, 6, maxAnisotropy, false);

  // 3. Wasteland Ground (damp earth, ash & muted scrub)
  const wst = makeCanvasPair(256);
  const randW = seededRand(303);
  wst.cctx.fillStyle = '#21241f';
  wst.cctx.fillRect(0, 0, 256, 256);
  wst.hctx.fillStyle = 'rgb(120,120,120)';
  wst.hctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 52; i++) {
    const x = randW() * 256;
    const y = randW() * 256;
    const rad = 14 + randW() * 34;
    const isMoss = randW() > 0.48;
    const grad = wst.cctx.createRadialGradient(x, y, 2, x, y, rad);
    grad.addColorStop(0, isMoss ? 'rgba(46,58,40,0.32)' : 'rgba(50,42,35,0.32)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    wst.cctx.fillStyle = grad;
    wst.cctx.beginPath();
    wst.cctx.arc(x, y, rad, 0, Math.PI * 2);
    wst.cctx.fill();

    const hGrad = wst.hctx.createRadialGradient(x, y, 2, x, y, rad);
    hGrad.addColorStop(0, isMoss ? 'rgba(175,175,175,0.4)' : 'rgba(78,78,78,0.4)');
    hGrad.addColorStop(1, 'rgba(120,120,120,0)');
    wst.hctx.fillStyle = hGrad;
    wst.hctx.beginPath();
    wst.hctx.arc(x, y, rad, 0, Math.PI * 2);
    wst.hctx.fill();
  }
  for (let i = 0; i < 650; i++) {
    const rx = randW() * 256;
    const ry = randW() * 256;
    wst.cctx.fillStyle = randW() > 0.5 ? 'rgba(84,92,72,0.12)' : 'rgba(12,12,10,0.18)';
    wst.cctx.fillRect(rx, ry, 2, 2);
    wst.hctx.fillStyle = randW() > 0.5 ? 'rgba(195,195,195,0.22)' : 'rgba(55,55,55,0.24)';
    wst.hctx.fillRect(rx, ry, 2, 2);
  }
  const wasteland = finalizeTexture(wst.color, 18, 18, maxAnisotropy, true);
  const wastelandNormal = createNormalFromHeightCanvas(wst.height, 18, 18, maxAnisotropy, 1.8);

  // 4. Weathered Brick Wall (mortar recess + aged brick color + soot gradient)
  const brk = makeCanvasPair(256);
  const randB = seededRand(404);
  brk.cctx.fillStyle = '#292220'; // dark recessed mortar
  brk.cctx.fillRect(0, 0, 256, 256);
  brk.hctx.fillStyle = 'rgb(48,48,48)'; // recessed mortar height
  brk.hctx.fillRect(0, 0, 256, 256);
  brk.rctx.fillStyle = 'rgb(245,245,245)';
  brk.rctx.fillRect(0, 0, 256, 256);

  const bh = 16;
  const bw = 32;
  for (let row = 0; row < 16; row++) {
    const offset = (row % 2) * (bw * 0.5);
    for (let col = -1; col < 9; col++) {
      const bx = col * bw + offset;
      const by = row * bh;
      const tone = (randB() - 0.5) * 18;
      const r = Math.round(76 + tone);
      const g = Math.round(48 + tone * 0.65);
      const b = Math.round(41 + tone * 0.55);
      brk.cctx.fillStyle = `rgb(${r},${g},${b})`;
      brk.cctx.fillRect(bx + 1.5, by + 1.5, bw - 3, bh - 3);

      const hVal = Math.round(176 + (randB() - 0.5) * 32);
      brk.hctx.fillStyle = `rgb(${hVal},${hVal},${hVal})`;
      brk.hctx.fillRect(bx + 1.5, by + 1.5, bw - 3, bh - 3);

      const rVal = Math.round(215 + (randB() - 0.5) * 26);
      brk.rctx.fillStyle = `rgb(${rVal},${rVal},${rVal})`;
      brk.rctx.fillRect(bx + 1.5, by + 1.5, bw - 3, bh - 3);
    }
  }
  const bGrad = brk.cctx.createLinearGradient(0, 0, 0, 256);
  bGrad.addColorStop(0, 'rgba(10,10,12,0.32)');
  bGrad.addColorStop(0.45, 'rgba(0,0,0,0)');
  bGrad.addColorStop(1, 'rgba(8,10,8,0.52)');
  brk.cctx.fillStyle = bGrad;
  brk.cctx.fillRect(0, 0, 256, 256);
  const brickWall = finalizeTexture(brk.color, 2, 2, maxAnisotropy, true);
  const brickNormal = createNormalFromHeightCanvas(brk.height, 2, 2, maxAnisotropy, 2.8);
  const brickRoughness = finalizeTexture(brk.rough, 2, 2, maxAnisotropy, false);

  // 5. Weathered Concrete Wall (form seams + drip stains + pitting)
  const cnc = makeCanvasPair(256);
  const randC = seededRand(505);
  cnc.cctx.fillStyle = '#41464e';
  cnc.cctx.fillRect(0, 0, 256, 256);
  cnc.hctx.fillStyle = 'rgb(148,148,148)';
  cnc.hctx.fillRect(0, 0, 256, 256);
  cnc.rctx.fillStyle = 'rgb(228,228,228)';
  cnc.rctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 42; i++) {
    const cx = randC() * 256;
    const cy = randC() * 256;
    const cr = 8 + randC() * 26;
    cnc.cctx.fillStyle = randC() > 0.5 ? 'rgba(18,21,26,0.14)' : 'rgba(165,172,180,0.06)';
    cnc.cctx.beginPath();
    cnc.cctx.arc(cx, cy, cr, 0, Math.PI * 2);
    cnc.cctx.fill();
    cnc.hctx.fillStyle = randC() > 0.5 ? 'rgba(96,96,96,0.22)' : 'rgba(182,182,182,0.18)';
    cnc.hctx.beginPath();
    cnc.hctx.arc(cx, cy, cr * 0.65, 0, Math.PI * 2);
    cnc.hctx.fill();
  }
  // Rainwater stain streaks
  for (let i = 0; i < 14; i++) {
    const sx = randC() * 256;
    const sh = 40 + randC() * 110;
    const g = cnc.cctx.createLinearGradient(sx, 0, sx, sh);
    g.addColorStop(0, 'rgba(12,14,18,0.28)');
    g.addColorStop(1, 'rgba(12,14,18,0)');
    cnc.cctx.fillStyle = g;
    cnc.cctx.fillRect(sx, 0, 4 + randC() * 8, sh);
    cnc.rctx.fillStyle = 'rgb(185,185,185)';
    cnc.rctx.fillRect(sx, 0, 3 + randC() * 5, sh * 0.7);
  }
  cnc.cctx.strokeStyle = 'rgba(16,18,22,0.45)';
  cnc.cctx.lineWidth = 2;
  cnc.cctx.strokeRect(1, 1, 254, 126);
  cnc.cctx.strokeRect(1, 129, 254, 126);
  cnc.hctx.strokeStyle = 'rgb(52,52,52)';
  cnc.hctx.lineWidth = 2.5;
  cnc.hctx.strokeRect(1, 1, 254, 126);
  cnc.hctx.strokeRect(1, 129, 254, 126);
  const concreteWall = finalizeTexture(cnc.color, 2, 2, maxAnisotropy, true);
  const concreteNormal = createNormalFromHeightCanvas(cnc.height, 2, 2, maxAnisotropy, 2.1);
  const concreteRoughness = finalizeTexture(cnc.rough, 2, 2, maxAnisotropy, false);

  // 6. Rusted Metal (corrugated steel ribs + flaking oxidation roughness)
  const rst = makeCanvasPair(256);
  const randR = seededRand(606);
  rst.cctx.fillStyle = '#424852';
  rst.cctx.fillRect(0, 0, 256, 256);
  rst.hctx.fillStyle = 'rgb(142,142,142)';
  rst.hctx.fillRect(0, 0, 256, 256);
  rst.rctx.fillStyle = 'rgb(125,125,125)'; // metallic base ~0.49 roughness
  rst.rctx.fillRect(0, 0, 256, 256);

  // Subtle vertical metal ribbing
  for (let x = 0; x < 256; x += 16) {
    rst.cctx.fillStyle = 'rgba(15,18,24,0.16)';
    rst.cctx.fillRect(x, 0, 3, 256);
    rst.hctx.fillStyle = 'rgb(88,88,88)';
    rst.hctx.fillRect(x, 0, 4, 256);
  }
  for (let i = 0; i < 48; i++) {
    const x = randR() * 256;
    const y = randR() * 256;
    const rad = 8 + randR() * 26;
    const grad = rst.cctx.createRadialGradient(x, y, 2, x, y, rad);
    grad.addColorStop(0, 'rgba(118, 52, 26, 0.62)');
    grad.addColorStop(1, 'rgba(118, 52, 26, 0)');
    rst.cctx.fillStyle = grad;
    rst.cctx.beginPath();
    rst.cctx.arc(x, y, rad, 0, Math.PI * 2);
    rst.cctx.fill();

    // Rust is rough & pitted
    const rGrad = rst.rctx.createRadialGradient(x, y, 2, x, y, rad);
    rGrad.addColorStop(0, 'rgba(240,240,240,0.9)');
    rGrad.addColorStop(1, 'rgba(240,240,240,0)');
    rst.rctx.fillStyle = rGrad;
    rst.rctx.beginPath();
    rst.rctx.arc(x, y, rad, 0, Math.PI * 2);
    rst.rctx.fill();

    rst.hctx.fillStyle = 'rgba(182,182,182,0.28)';
    rst.hctx.beginPath();
    rst.hctx.arc(x, y, rad * 0.45, 0, Math.PI * 2);
    rst.hctx.fill();
  }
  const rustedMetal = finalizeTexture(rst.color, 1, 1, maxAnisotropy, true);
  const rustedMetalNormal = createNormalFromHeightCanvas(rst.height, 1, 1, maxAnisotropy, 2.4);
  const rustedMetalRoughness = finalizeTexture(rst.rough, 1, 1, maxAnisotropy, false);

  // 7. Wood Plank (grain + deep plank grooves)
  const wdp = makeCanvasPair(256);
  const randP = seededRand(707);
  wdp.cctx.fillStyle = '#473424';
  wdp.cctx.fillRect(0, 0, 256, 256);
  wdp.hctx.fillStyle = 'rgb(160,160,160)';
  wdp.hctx.fillRect(0, 0, 256, 256);
  wdp.rctx.fillStyle = 'rgb(218,218,218)';
  wdp.rctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 32) {
    const tone = (randP() - 0.5) * 14;
    wdp.cctx.fillStyle = `rgb(${76 + tone},${55 + tone * 0.7},${38 + tone * 0.5})`;
    wdp.cctx.fillRect(0, y + 1, 256, 30);
    // Grain streaks
    for (let g = 0; g < 6; g++) {
      const gy = y + 4 + randP() * 24;
      wdp.cctx.fillStyle = 'rgba(24,16,9,0.22)';
      wdp.cctx.fillRect(0, gy, 256, 1.4);
      wdp.hctx.fillStyle = 'rgba(118,118,118,0.32)';
      wdp.hctx.fillRect(0, gy, 256, 1.5);
    }
    // Plank seam groove
    wdp.cctx.fillStyle = 'rgba(15,10,6,0.72)';
    wdp.cctx.fillRect(0, y, 256, 2);
    wdp.hctx.fillStyle = 'rgb(36,36,36)';
    wdp.hctx.fillRect(0, y, 256, 2.5);
  }
  const woodPlank = finalizeTexture(wdp.color, 1, 1, maxAnisotropy, true);
  const woodNormal = createNormalFromHeightCanvas(wdp.height, 1, 1, maxAnisotropy, 2.3);
  const woodRoughness = finalizeTexture(wdp.rough, 1, 1, maxAnisotropy, false);

  // 8. Worn Clinic / Store Tile Floor (checkered muted tiles + dirty grout + grime stains)
  const til = makeCanvasPair(256);
  const randT = seededRand(808);
  til.cctx.fillStyle = '#2b3139';
  til.cctx.fillRect(0, 0, 256, 256);
  til.hctx.fillStyle = 'rgb(166,166,166)';
  til.hctx.fillRect(0, 0, 256, 256);
  til.rctx.fillStyle = 'rgb(156,156,156)'; // subtly scuffed semi-gloss ceramic tile
  til.rctx.fillRect(0, 0, 256, 256);

  for (let gx = 0; gx < 256; gx += 32) {
    for (let gy = 0; gy < 256; gy += 32) {
      const alt = ((gx / 32 + gy / 32) & 1) === 0;
      const jitter = (randT() - 0.5) * 10;
      const base = (alt ? 66 : 54) + jitter;
      til.cctx.fillStyle = `rgb(${base - 4},${base + 2},${base + 7})`;
      til.cctx.fillRect(gx + 1.5, gy + 1.5, 29, 29);

      const roughTile = alt ? 148 : 172;
      til.rctx.fillStyle = `rgb(${roughTile},${roughTile},${roughTile})`;
      til.rctx.fillRect(gx + 1.5, gy + 1.5, 29, 29);
    }
  }
  for (let i = 0; i < 24; i++) {
    const sx = randT() * 256;
    const sy = randT() * 256;
    const sr = 10 + randT() * 24;
    const g = til.cctx.createRadialGradient(sx, sy, 2, sx, sy, sr);
    g.addColorStop(0, 'rgba(20, 22, 18, 0.34)');
    g.addColorStop(1, 'rgba(20, 22, 18, 0)');
    til.cctx.fillStyle = g;
    til.cctx.beginPath();
    til.cctx.arc(sx, sy, sr, 0, Math.PI * 2);
    til.cctx.fill();

    til.rctx.fillStyle = 'rgba(232,232,232,0.5)';
    til.rctx.beginPath();
    til.rctx.arc(sx, sy, sr * 0.7, 0, Math.PI * 2);
    til.rctx.fill();
  }
  til.hctx.strokeStyle = 'rgb(45,45,45)';
  til.hctx.lineWidth = 2;
  til.cctx.strokeStyle = 'rgba(15,18,22,0.75)';
  til.cctx.lineWidth = 1.8;
  for (let i = 0; i <= 256; i += 32) {
    til.cctx.beginPath();
    til.cctx.moveTo(i, 0);
    til.cctx.lineTo(i, 256);
    til.cctx.moveTo(0, i);
    til.cctx.lineTo(256, i);
    til.cctx.stroke();

    til.hctx.beginPath();
    til.hctx.moveTo(i, 0);
    til.hctx.lineTo(i, 256);
    til.hctx.moveTo(0, i);
    til.hctx.lineTo(256, i);
    til.hctx.stroke();
  }
  const wornTile = finalizeTexture(til.color, 3, 3, maxAnisotropy, true);
  const wornTileNormal = createNormalFromHeightCanvas(til.height, 3, 3, maxAnisotropy, 1.8);
  const wornTileRoughness = finalizeTexture(til.rough, 3, 3, maxAnisotropy, false);

  // 9. Interior Stained Plaster Wall (peeling damp plaster)
  const pls = makeCanvasPair(256);
  const randPls = seededRand(909);
  pls.cctx.fillStyle = '#4c5258';
  pls.cctx.fillRect(0, 0, 256, 256);
  pls.hctx.fillStyle = 'rgb(142,142,142)';
  pls.hctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 38; i++) {
    const x = randPls() * 256;
    const y = randPls() * 256;
    const rad = 10 + randPls() * 24;
    pls.cctx.fillStyle = randPls() > 0.5 ? 'rgba(22,26,30,0.14)' : 'rgba(145,150,152,0.08)';
    pls.cctx.beginPath();
    pls.cctx.arc(x, y, rad, 0, Math.PI * 2);
    pls.cctx.fill();
    pls.hctx.fillStyle = randPls() > 0.5 ? 'rgba(92,92,92,0.28)' : 'rgba(176,176,176,0.22)';
    pls.hctx.beginPath();
    pls.hctx.arc(x, y, rad * 0.6, 0, Math.PI * 2);
    pls.hctx.fill();
  }
  const pGrad = pls.cctx.createLinearGradient(0, 0, 0, 256);
  pGrad.addColorStop(0, 'rgba(14,16,18,0.18)');
  pGrad.addColorStop(0.65, 'rgba(0,0,0,0)');
  pGrad.addColorStop(1, 'rgba(14,18,16,0.38)');
  pls.cctx.fillStyle = pGrad;
  pls.cctx.fillRect(0, 0, 256, 256);
  const interiorPlaster = finalizeTexture(pls.color, 2, 1, maxAnisotropy, true);
  const interiorPlasterNormal = createNormalFromHeightCanvas(pls.height, 2, 1, maxAnisotropy, 1.5);

  // 10. LAST SHOP Signboard Texture
  const shopSign = createSignboardTexture(
    {
      bg: '#1c1917',
      border: '#d97706',
      text: 'LAST SHOP',
      textColor: '#fbbf24',
      subText: 'SAFE TRADE & SUPPLIES',
      subColor: '#fde68a',
      fontSize: 58,
    },
    maxAnisotropy
  );

  // 11. Striped Shop Awning
  const awCanvas = document.createElement('canvas');
  awCanvas.width = 256;
  awCanvas.height = 128;
  const awctx = awCanvas.getContext('2d')!;
  const stripeCount = 8;
  const swPx = 256 / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    awctx.fillStyle = i % 2 === 0 ? '#8c2f11' : '#262321';
    awctx.fillRect(i * swPx, 0, swPx + 1, 128);
  }
  awctx.fillStyle = 'rgba(0,0,0,0.28)';
  awctx.fillRect(0, 92, 256, 36);
  const awningStripe = finalizeTexture(awCanvas, 2, 1, maxAnisotropy, true);

  // 12. Landmark Building & Street Signage
  const signValeStore = createSignboardTexture(
    {
      bg: '#2c1718',
      border: '#991b1b',
      text: 'VALE CORNER STORE',
      textColor: '#fca5a5',
      subText: 'DISPENSARY · SECTOR B',
      subColor: '#cbd5e1',
      fontSize: 44,
    },
    maxAnisotropy
  );

  const signDepot04 = createSignboardTexture(
    {
      bg: '#1f242c',
      border: '#64748b',
      text: 'DEPOT 04',
      textColor: '#cbd5e1',
      subText: 'FREIGHT & CONTINGENCY',
      subColor: '#94a3b8',
      fontSize: 52,
    },
    maxAnisotropy
  );

  const signStarlightDiner = createSignboardTexture(
    {
      bg: '#172536',
      border: '#b91c1c',
      text: 'STARLIGHT DINER',
      textColor: '#fde68a',
      subText: 'EVACUATION STAGING',
      subColor: '#93c5fd',
      fontSize: 46,
    },
    maxAnisotropy
  );

  const signRedlineAuto = createSignboardTexture(
    {
      bg: '#231c18',
      border: '#c2410c',
      text: 'REDLINE AUTO',
      textColor: '#fdba74',
      subText: 'SERVICE & PARTS',
      subColor: '#cbd5e1',
      fontSize: 50,
    },
    maxAnisotropy
  );

  const signMercerFlats = createSignboardTexture(
    {
      bg: '#1c1f24',
      border: '#475569',
      text: 'MERCER FLATS',
      textColor: '#cbd5e1',
      subText: 'RESIDENTIAL BLOCK',
      subColor: '#94a3b8',
      fontSize: 46,
    },
    maxAnisotropy
  );

  const signMainBlvd = createSignboardTexture(
    {
      bg: '#143828',
      border: '#d1d5db',
      text: 'MAIN BLVD',
      textColor: '#f8fafc',
      width: 256,
      height: 64,
      fontSize: 34,
    },
    maxAnisotropy
  );

  const signCentralAve = createSignboardTexture(
    {
      bg: '#143828',
      border: '#d1d5db',
      text: 'CENTRAL AVE',
      textColor: '#f8fafc',
      width: 256,
      height: 64,
      fontSize: 32,
    },
    maxAnisotropy
  );

  const signQuarantine = createSignboardTexture(
    {
      bg: '#422006',
      border: '#eab308',
      text: 'QUARANTINE ZONE',
      textColor: '#facc15',
      subText: 'NORTH ROADBLOCK · STAY CLEAR',
      subColor: '#fde047',
      width: 384,
      height: 128,
      fontSize: 36,
    },
    maxAnisotropy
  );

  const signPolicePrecinct = createSignboardTexture(
    {
      bg: '#132136',
      border: '#3b82f6',
      text: 'POLICE PRECINCT 04',
      textColor: '#dbeafe',
      subText: 'DISPATCH & EVIDENCE',
      subColor: '#93c5fd',
      fontSize: 42,
    },
    maxAnisotropy
  );

  const signFieldClinic = createSignboardTexture(
    {
      bg: '#142a2e',
      border: '#06b6d4',
      text: 'MERCY FIELD CLINIC',
      textColor: '#e0f2fe',
      subText: 'TRIAGE & MEDICAL BAY',
      subColor: '#67e8f9',
      fontSize: 42,
    },
    maxAnisotropy
  );

  const signResearchLab = createSignboardTexture(
    {
      bg: '#1b1b24',
      border: '#f59e0b',
      text: 'V4 CONTAINMENT LAB',
      textColor: '#fde68a',
      subText: 'RESTRICTED RESEARCH SECTOR',
      subColor: '#fca5a5',
      fontSize: 42,
    },
    maxAnisotropy
  );

  const signDistrictNorth = createSignboardTexture(
    {
      bg: '#172536',
      border: '#eab308',
      text: '<- SHOP / MERCER  |  AUTO / LAB ->',
      textColor: '#fde68a',
      width: 384,
      height: 64,
      fontSize: 22,
    },
    maxAnisotropy
  );

  const signDistrictCross = createSignboardTexture(
    {
      bg: '#1c1917',
      border: '#38bdf8',
      text: '<- ROADBLOCK  |  POLICE / CLINIC ->',
      textColor: '#bae6fd',
      width: 384,
      height: 64,
      fontSize: 22,
    },
    maxAnisotropy
  );

  // Hazard caution tape / barrier texture
  const hzCanvas = document.createElement('canvas');
  hzCanvas.width = 256;
  hzCanvas.height = 64;
  const hzctx = hzCanvas.getContext('2d')!;
  hzctx.fillStyle = '#c46d08';
  hzctx.fillRect(0, 0, 256, 64);
  hzctx.fillStyle = '#18181b';
  for (let x = -64; x < 320; x += 48) {
    hzctx.beginPath();
    hzctx.moveTo(x, 64);
    hzctx.lineTo(x + 24, 64);
    hzctx.lineTo(x + 56, 0);
    hzctx.lineTo(x + 32, 0);
    hzctx.closePath();
    hzctx.fill();
  }
  const hazardStripe = finalizeTexture(hzCanvas, 2, 1, maxAnisotropy, true);

  const all: THREE.Texture[] = [
    asphalt,
    asphaltNormal,
    asphaltRoughness,
    sidewalk,
    sidewalkNormal,
    sidewalkRoughness,
    wasteland,
    wastelandNormal,
    brickWall,
    brickNormal,
    brickRoughness,
    concreteWall,
    concreteNormal,
    concreteRoughness,
    rustedMetal,
    rustedMetalNormal,
    rustedMetalRoughness,
    woodPlank,
    woodNormal,
    woodRoughness,
    wornTile,
    wornTileNormal,
    wornTileRoughness,
    interiorPlaster,
    interiorPlasterNormal,
    shopSign,
    awningStripe,
    signValeStore,
    signDepot04,
    signStarlightDiner,
    signRedlineAuto,
    signMercerFlats,
    signMainBlvd,
    signCentralAve,
    signQuarantine,
    signPolicePrecinct,
    signFieldClinic,
    signResearchLab,
    signDistrictNorth,
    signDistrictCross,
    hazardStripe,
  ];

  return {
    asphalt,
    asphaltNormal,
    asphaltRoughness,
    sidewalk,
    sidewalkNormal,
    sidewalkRoughness,
    wasteland,
    wastelandNormal,
    brickWall,
    brickNormal,
    brickRoughness,
    concreteWall,
    concreteNormal,
    concreteRoughness,
    rustedMetal,
    rustedMetalNormal,
    rustedMetalRoughness,
    woodPlank,
    woodNormal,
    woodRoughness,
    wornTile,
    wornTileNormal,
    wornTileRoughness,
    interiorPlaster,
    interiorPlasterNormal,
    shopSign,
    awningStripe,
    signValeStore,
    signDepot04,
    signStarlightDiner,
    signRedlineAuto,
    signMercerFlats,
    signMainBlvd,
    signCentralAve,
    signQuarantine,
    signPolicePrecinct,
    signFieldClinic,
    signResearchLab,
    signDistrictNorth,
    signDistrictCross,
    hazardStripe,
    dispose: () => {
      for (const tex of all) tex.dispose();
    },
  };
}
