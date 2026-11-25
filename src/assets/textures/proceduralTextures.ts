import * as THREE from 'three';

export interface ProceduralTextureSet {
  asphalt: THREE.CanvasTexture;
  sidewalk: THREE.CanvasTexture;
  wasteland: THREE.CanvasTexture;
  brickWall: THREE.CanvasTexture;
  concreteWall: THREE.CanvasTexture;
  rustedMetal: THREE.CanvasTexture;
  woodPlank: THREE.CanvasTexture;
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
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
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

  // Subtle weathering grit
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, h - Math.round(h * 0.16), w, Math.round(h * 0.16));

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

  const tex = finalizeTexture(canvas, 1, 1, maxAnisotropy);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function createProceduralTextureSet(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Weathered Asphalt
  const asphaltCanvas = document.createElement('canvas');
  asphaltCanvas.width = 256;
  asphaltCanvas.height = 256;
  const actx = asphaltCanvas.getContext('2d')!;
  const randA = seededRand(101);
  actx.fillStyle = '#20242c';
  actx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 650; i++) {
    const v = randA() > 0.5 ? 240 : 12;
    actx.fillStyle = `rgba(${v},${v},${v},${0.025 + randA() * 0.045})`;
    actx.beginPath();
    actx.arc(randA() * 256, randA() * 256, 0.7 + randA() * 1.6, 0, Math.PI * 2);
    actx.fill();
  }
  actx.strokeStyle = 'rgba(10,12,16,0.5)';
  actx.lineWidth = 1.3;
  for (let i = 0; i < 5; i++) {
    let x = randA() * 256;
    let y = randA() * 256;
    actx.beginPath();
    actx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (randA() - 0.5) * 34;
      y += (randA() - 0.5) * 34;
      actx.lineTo(x, y);
    }
    actx.stroke();
  }
  const asphalt = finalizeTexture(asphaltCanvas, 20, 20, maxAnisotropy);

  // 2. Concrete Sidewalk Slabs
  const swCanvas = document.createElement('canvas');
  swCanvas.width = 256;
  swCanvas.height = 256;
  const sctx = swCanvas.getContext('2d')!;
  const randS = seededRand(202);
  sctx.fillStyle = '#484e58';
  sctx.fillRect(0, 0, 256, 256);
  for (let gx = 0; gx < 256; gx += 64) {
    for (let gy = 0; gy < 256; gy += 64) {
      const shade = (randS() - 0.5) * 14;
      sctx.fillStyle = `rgb(${72 + shade},${77 + shade},${86 + shade})`;
      sctx.fillRect(gx + 1, gy + 1, 62, 62);
    }
  }
  sctx.strokeStyle = 'rgba(18,21,26,0.65)';
  sctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    sctx.beginPath();
    sctx.moveTo(i, 0);
    sctx.lineTo(i, 256);
    sctx.moveTo(0, i);
    sctx.lineTo(256, i);
    sctx.stroke();
  }
  const sidewalk = finalizeTexture(swCanvas, 6, 6, maxAnisotropy);

  // 3. Wasteland Ground (dirt, ash & muted moss)
  const wCanvas = document.createElement('canvas');
  wCanvas.width = 256;
  wCanvas.height = 256;
  const wctx = wCanvas.getContext('2d')!;
  const randW = seededRand(303);
  wctx.fillStyle = '#252923';
  wctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 42; i++) {
    const x = randW() * 256;
    const y = randW() * 256;
    const rad = 14 + randW() * 34;
    const grad = wctx.createRadialGradient(x, y, 2, x, y, rad);
    grad.addColorStop(0, randW() > 0.5 ? 'rgba(52,66,46,0.28)' : 'rgba(54,47,39,0.28)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    wctx.fillStyle = grad;
    wctx.beginPath();
    wctx.arc(x, y, rad, 0, Math.PI * 2);
    wctx.fill();
  }
  const wasteland = finalizeTexture(wCanvas, 16, 16, maxAnisotropy);

  // 4. Weathered Brick Wall
  const bCanvas = document.createElement('canvas');
  bCanvas.width = 256;
  bCanvas.height = 256;
  const bctx = bCanvas.getContext('2d')!;
  const randB = seededRand(404);
  bctx.fillStyle = '#332926';
  bctx.fillRect(0, 0, 256, 256);
  const bh = 16;
  const bw = 32;
  for (let row = 0; row < 16; row++) {
    const offset = (row % 2) * (bw * 0.5);
    for (let col = -1; col < 9; col++) {
      const bx = col * bw + offset;
      const by = row * bh;
      const tone = (randB() - 0.5) * 18;
      bctx.fillStyle = `rgb(${84 + tone},${52 + tone * 0.7},${44 + tone * 0.6})`;
      bctx.fillRect(bx + 1.5, by + 1.5, bw - 3, bh - 3);
    }
  }
  const bGrad = bctx.createLinearGradient(0, 0, 0, 256);
  bGrad.addColorStop(0, 'rgba(12,12,14,0.25)');
  bGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
  bGrad.addColorStop(1, 'rgba(10,12,10,0.45)');
  bctx.fillStyle = bGrad;
  bctx.fillRect(0, 0, 256, 256);
  const brickWall = finalizeTexture(bCanvas, 2, 2, maxAnisotropy);

  // 5. Weathered Concrete Wall
  const cCanvas = document.createElement('canvas');
  cCanvas.width = 256;
  cCanvas.height = 256;
  const cctx = cCanvas.getContext('2d')!;
  const randC = seededRand(505);
  cctx.fillStyle = '#474c54';
  cctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 36; i++) {
    cctx.fillStyle = randC() > 0.5 ? 'rgba(20,24,28,0.12)' : 'rgba(180,185,190,0.06)';
    cctx.beginPath();
    cctx.arc(randC() * 256, randC() * 256, 10 + randC() * 28, 0, Math.PI * 2);
    cctx.fill();
  }
  cctx.strokeStyle = 'rgba(20,22,26,0.35)';
  cctx.lineWidth = 2;
  cctx.strokeRect(1, 1, 254, 126);
  cctx.strokeRect(1, 129, 254, 126);
  const concreteWall = finalizeTexture(cCanvas, 2, 2, maxAnisotropy);

  // 6. Rusted Metal
  const rCanvas = document.createElement('canvas');
  rCanvas.width = 256;
  rCanvas.height = 256;
  const rctx = rCanvas.getContext('2d')!;
  const randR = seededRand(606);
  rctx.fillStyle = '#495059';
  rctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 45; i++) {
    const x = randR() * 256;
    const y = randR() * 256;
    const rad = 8 + randR() * 26;
    const grad = rctx.createRadialGradient(x, y, 2, x, y, rad);
    grad.addColorStop(0, 'rgba(122, 58, 28, 0.55)');
    grad.addColorStop(1, 'rgba(122, 58, 28, 0)');
    rctx.fillStyle = grad;
    rctx.beginPath();
    rctx.arc(x, y, rad, 0, Math.PI * 2);
    rctx.fill();
  }
  const rustedMetal = finalizeTexture(rCanvas, 1, 1, maxAnisotropy);

  // 7. Wood Plank
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 256;
  pCanvas.height = 256;
  const pctx = pCanvas.getContext('2d')!;
  const randP = seededRand(707);
  pctx.fillStyle = '#4e3928';
  pctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    const tone = (randP() - 0.5) * 14;
    pctx.fillStyle = `rgb(${82 + tone},${60 + tone * 0.7},${41 + tone * 0.5})`;
    pctx.fillRect(0, y + 1, 256, 30);
    pctx.fillStyle = 'rgba(20,14,8,0.6)';
    pctx.fillRect(0, y, 256, 2);
  }
  const woodPlank = finalizeTexture(pCanvas, 1, 1, maxAnisotropy);

  // 8. LAST SHOP Signboard Texture
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

  // 9. Striped Shop Awning
  const awCanvas = document.createElement('canvas');
  awCanvas.width = 256;
  awCanvas.height = 128;
  const awctx = awCanvas.getContext('2d')!;
  const stripeCount = 8;
  const sw = 256 / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    awctx.fillStyle = i % 2 === 0 ? '#9a3412' : '#292524';
    awctx.fillRect(i * sw, 0, sw + 1, 128);
  }
  awctx.fillStyle = 'rgba(0,0,0,0.22)';
  awctx.fillRect(0, 96, 256, 32);
  const awningStripe = finalizeTexture(awCanvas, 2, 1, maxAnisotropy);

  // 10. Landmark Building & Street Signage
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

  // Hazard caution tape / barrier texture
  const hzCanvas = document.createElement('canvas');
  hzCanvas.width = 256;
  hzCanvas.height = 64;
  const hzctx = hzCanvas.getContext('2d')!;
  hzctx.fillStyle = '#d97706';
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
  const hazardStripe = finalizeTexture(hzCanvas, 2, 1, maxAnisotropy);

  const all = [
    asphalt,
    sidewalk,
    wasteland,
    brickWall,
    concreteWall,
    rustedMetal,
    woodPlank,
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
    hazardStripe,
  ];

  return {
    asphalt,
    sidewalk,
    wasteland,
    brickWall,
    concreteWall,
    rustedMetal,
    woodPlank,
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
    hazardStripe,
    dispose: () => {
      for (const tex of all) tex.dispose();
    },
  };
}
