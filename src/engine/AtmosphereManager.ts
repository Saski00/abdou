import * as THREE from 'three';
import { MaterialPalette } from '../assets/models/proceduralModels';
import { TimeSnapshot } from '../game/timeSystem';
import { WeatherSnapshot } from '../game/weatherSystem';
import { BuiltWorld } from './WorldBuilder';

interface SkyStop {
  hour: number;
  zenith: number;
  horizon: number;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  envIntensity: number;
}

const SKY_STOPS: SkyStop[] = [
  {
    hour: 0.0,
    zenith: 0x070b14,
    horizon: 0x101724,
    sunColor: 0x7c92b0,
    sunIntensity: 0.25,
    hemiSky: 0x2a3b54,
    hemiGround: 0x161412,
    hemiIntensity: 0.48,
    envIntensity: 0.22,
  },
  {
    hour: 5.0,
    zenith: 0x101829,
    horizon: 0x2a2f44,
    sunColor: 0x9aa6c4,
    sunIntensity: 0.28,
    hemiSky: 0x3f4c69,
    hemiGround: 0x1c1917,
    hemiIntensity: 0.52,
    envIntensity: 0.25,
  },
  {
    hour: 6.25,
    zenith: 0x3b5276,
    horizon: 0xc98462,
    sunColor: 0xffb884,
    sunIntensity: 0.82,
    hemiSky: 0x8294b2,
    hemiGround: 0x302721,
    hemiIntensity: 0.68,
    envIntensity: 0.38,
  },
  {
    hour: 8.5,
    zenith: 0x5c80a6,
    horizon: 0xa6b9ca,
    sunColor: 0xfff0d8,
    sunIntensity: 1.48,
    hemiSky: 0x9cb7d2,
    hemiGround: 0x3e372f,
    hemiIntensity: 0.86,
    envIntensity: 0.54,
  },
  {
    hour: 12.5,
    zenith: 0x557aa0,
    horizon: 0xb4c2ce,
    sunColor: 0xfff5e4,
    sunIntensity: 1.62,
    hemiSky: 0xa7bfd6,
    hemiGround: 0x423a32,
    hemiIntensity: 0.88,
    envIntensity: 0.56,
  },
  {
    hour: 16.5,
    zenith: 0x507096,
    horizon: 0xb9b8bd,
    sunColor: 0xffe4be,
    sunIntensity: 1.36,
    hemiSky: 0x95abc4,
    hemiGround: 0x39312a,
    hemiIntensity: 0.8,
    envIntensity: 0.48,
  },
  {
    hour: 18.0,
    zenith: 0x2d3a5b,
    horizon: 0xd47846,
    sunColor: 0xff924c,
    sunIntensity: 0.94,
    hemiSky: 0x84728e,
    hemiGround: 0x2e221b,
    hemiIntensity: 0.64,
    envIntensity: 0.36,
  },
  {
    hour: 19.25,
    zenith: 0x131b2e,
    horizon: 0x2b3146,
    sunColor: 0x8796b2,
    sunIntensity: 0.34,
    hemiSky: 0x3d4b66,
    hemiGround: 0x1a1716,
    hemiIntensity: 0.52,
    envIntensity: 0.25,
  },
  {
    hour: 24.0,
    zenith: 0x070b14,
    horizon: 0x101724,
    sunColor: 0x7c92b0,
    sunIntensity: 0.25,
    hemiSky: 0x2a3b54,
    hemiGround: 0x161412,
    hemiIntensity: 0.48,
    envIntensity: 0.22,
  },
];

// Module-scope reusable scratch objects (zero per-frame GC allocations)
const _zenithA = new THREE.Color();
const _zenithB = new THREE.Color();
const _horizonA = new THREE.Color();
const _horizonB = new THREE.Color();
const _sunColA = new THREE.Color();
const _sunColB = new THREE.Color();
const _hemiSkyA = new THREE.Color();
const _hemiSkyB = new THREE.Color();
const _hemiGndA = new THREE.Color();
const _hemiGndB = new THREE.Color();
const _overcastZenith = new THREE.Color();
const _overcastHorizon = new THREE.Color();
const _fogColor = new THREE.Color();
const _lampOffColor = new THREE.Color(0x475569);
const _lampOnColor = new THREE.Color(0xfef3c7);
const _winOffColor = new THREE.Color(0x16202c);
const _winOnColor = new THREE.Color(0xf59e0b);
const _shaftDayColor = new THREE.Color(0xdbeafe);
const _shaftSunsetColor = new THREE.Color(0xffb570);
const _shaftNightColor = new THREE.Color(0x6485ad);

const RAIN_COUNT = 320;
const RAIN_BOX_W = 24;
const RAIN_BOX_H = 10;

export class AtmosphereManager {
  private skyMesh: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private sunDisc: THREE.Mesh;
  private sunDiscMat: THREE.MeshBasicMaterial;
  private moonDisc: THREE.Mesh;
  private moonDiscMat: THREE.MeshBasicMaterial;

  private fog: THREE.FogExp2;

  private rainLines: THREE.LineSegments;
  private rainMat: THREE.LineBasicMaterial;
  private rainPositions: Float32Array;
  private rainSpeeds: Float32Array;
  private rainOffsetsX: Float32Array;
  private rainOffsetsY: Float32Array;
  private rainOffsetsZ: Float32Array;
  private lightningFlash = 0;
  private powerFlickerTimer = 0;
  private powerFlickerDuration = 4.0;

  public triggerLightningFlash(strength = 1.0): void {
    this.lightningFlash = Math.max(this.lightningFlash, Math.min(1.3, Math.max(0.2, strength)));
  }

  public triggerLocalPowerFlicker(durationSec = 4.2): void {
    this.powerFlickerDuration = Math.max(1.5, durationSec);
    this.powerFlickerTimer = Math.max(this.powerFlickerTimer, this.powerFlickerDuration);
  }

  public getPowerFlickerIntensity(): number {
    if (this.powerFlickerTimer <= 0) return 0;
    return Math.max(0, Math.min(1, this.powerFlickerTimer / this.powerFlickerDuration));
  }

  constructor(
    private scene: THREE.Scene,
    private sunLight: THREE.DirectionalLight,
    private hemiLight: THREE.HemisphereLight,
    private materials: MaterialPalette,
    private world: BuiltWorld
  ) {
    // 1. Lightweight Sky Dome Gradient (no shadows, no fog, minimal fragment work)
    const skyGeo = new THREE.SphereGeometry(128, 16, 10);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uZenith: { value: new THREE.Color(0x557aa0) },
        uHorizon: { value: new THREE.Color(0xb4c2ce) },
      },
      vertexShader: `
        varying float vHeight;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vHeight = normalize(position).y;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        varying float vHeight;
        void main() {
          float h = clamp(vHeight, 0.0, 1.0);
          float factor = pow(h, 0.55);
          vec3 col = mix(uHorizon, uZenith, factor);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.skyMesh = new THREE.Mesh(skyGeo, this.skyMat);
    this.skyMesh.frustumCulled = false;
    this.scene.add(this.skyMesh);

    // 2. Celestial Sun & Moon Discs
    this.sunDiscMat = new THREE.MeshBasicMaterial({
      color: 0xfff3d1,
      transparent: true,
      opacity: 0.9,
      fog: false,
      depthWrite: false,
    });
    this.sunDisc = new THREE.Mesh(new THREE.SphereGeometry(3.4, 12, 8), this.sunDiscMat);
    this.scene.add(this.sunDisc);

    this.moonDiscMat = new THREE.MeshBasicMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.75,
      fog: false,
      depthWrite: false,
    });
    this.moonDisc = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 8), this.moonDiscMat);
    this.scene.add(this.moonDisc);

    // 3. Exponential Horizon Fog synced with Sky
    this.fog = new THREE.FogExp2(0x121822, 0.015);
    this.scene.fog = this.fog;
    if (!(this.scene.background instanceof THREE.Color)) {
      this.scene.background = new THREE.Color(0x121822);
    }

    // 4. Lightweight Rain Streak Particle Buffer (1 draw call)
    this.rainPositions = new Float32Array(RAIN_COUNT * 6);
    this.rainSpeeds = new Float32Array(RAIN_COUNT);
    this.rainOffsetsX = new Float32Array(RAIN_COUNT);
    this.rainOffsetsY = new Float32Array(RAIN_COUNT);
    this.rainOffsetsZ = new Float32Array(RAIN_COUNT);

    for (let i = 0; i < RAIN_COUNT; i++) {
      this.rainOffsetsX[i] = (Math.random() - 0.5) * RAIN_BOX_W;
      this.rainOffsetsY[i] = Math.random() * RAIN_BOX_H;
      this.rainOffsetsZ[i] = (Math.random() - 0.5) * RAIN_BOX_W;
      this.rainSpeeds[i] = 13.5 + Math.random() * 4.5;
    }

    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainMat = new THREE.LineBasicMaterial({
      color: 0xc2d5e8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(rainGeo, this.rainMat);
    this.rainLines.frustumCulled = false;
    this.rainLines.visible = false;
    this.scene.add(this.rainLines);
  }

  public update(
    dt: number,
    elapsedTime: number,
    time: TimeSnapshot,
    weather: WeatherSnapshot,
    playerX: number,
    playerZ: number,
    lightingQuality: 'atmospheric' | 'performance'
  ): void {
    const hours = time.timeOfDay * 24;

    // 1. Find surrounding sky keyframes
    let stopA = SKY_STOPS[0];
    let stopB = SKY_STOPS[SKY_STOPS.length - 1];
    for (let i = 0; i < SKY_STOPS.length - 1; i++) {
      if (hours >= SKY_STOPS[i].hour && hours <= SKY_STOPS[i + 1].hour) {
        stopA = SKY_STOPS[i];
        stopB = SKY_STOPS[i + 1];
        break;
      }
    }
    const span = Math.max(0.001, stopB.hour - stopA.hour);
    const alpha = Math.max(0, Math.min(1, (hours - stopA.hour) / span));

    _zenithA.setHex(stopA.zenith);
    _zenithB.setHex(stopB.zenith);
    _zenithA.lerp(_zenithB, alpha);

    _horizonA.setHex(stopA.horizon);
    _horizonB.setHex(stopB.horizon);
    _horizonA.lerp(_horizonB, alpha);

    _sunColA.setHex(stopA.sunColor);
    _sunColB.setHex(stopB.sunColor);
    _sunColA.lerp(_sunColB, alpha);

    _hemiSkyA.setHex(stopA.hemiSky);
    _hemiSkyB.setHex(stopB.hemiSky);
    _hemiSkyA.lerp(_hemiSkyB, alpha);

    _hemiGndA.setHex(stopA.hemiGround);
    _hemiGndB.setHex(stopB.hemiGround);
    _hemiGndA.lerp(_hemiGndB, alpha);

    const baseSunInt = THREE.MathUtils.lerp(stopA.sunIntensity, stopB.sunIntensity, alpha);
    const baseHemiInt = THREE.MathUtils.lerp(stopA.hemiIntensity, stopB.hemiIntensity, alpha);
    const baseEnvInt = THREE.MathUtils.lerp(stopA.envIntensity, stopB.envIntensity, alpha);

    // 2. Apply Weather Overcast & Fog Blending
    const overcastStrength = Math.min(1, weather.rainIntensity * 0.65 + weather.fogIntensity * 0.85);
    const overcastBright = 0.14 + 0.44 * time.daylightFactor;
    _overcastZenith.setRGB(
      overcastBright * 0.84,
      overcastBright * 0.9,
      overcastBright * 1.0
    );
    _overcastHorizon.setRGB(
      overcastBright * 0.95,
      overcastBright * 1.0,
      overcastBright * 1.06
    );
    if (weather.fogIntensity > 0.05) {
      // Mistier neutral pale grey-blue during heavy fog
      _overcastHorizon.offsetHSL(0, -0.04, 0.06 * weather.fogIntensity * time.daylightFactor);
    }

    _zenithA.lerp(_overcastZenith, overcastStrength);
    _horizonA.lerp(_overcastHorizon, overcastStrength);
    _hemiSkyA.lerp(_overcastHorizon, overcastStrength * 0.55);

    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 3.4);
    }
    const flashBoost = this.lightningFlash > 0.01 ? this.lightningFlash * this.lightningFlash : 0;

    if (flashBoost > 0.005) {
      _overcastHorizon.setRGB(0.72, 0.82, 0.96);
      _zenithA.lerp(_overcastHorizon, flashBoost * 0.65);
      _horizonA.lerp(_overcastHorizon, flashBoost * 0.52);
    }

    (this.skyMat.uniforms.uZenith.value as THREE.Color).copy(_zenithA);
    (this.skyMat.uniforms.uHorizon.value as THREE.Color).copy(_horizonA);
    _fogColor.copy(_horizonA);
    (this.scene.background as THREE.Color).copy(_fogColor);
    this.fog.color.copy(_fogColor);

    // Keep sky dome centered on camera/player XZ so horizon never clips
    this.skyMesh.position.set(playerX, 0, playerZ);

    // Dynamic Fog Density (day clearer than night, rain & fog noticeably thicken distance haze)
    const perfBoost = lightingQuality === 'performance' ? 0.0025 : 0;
    const baseFog = THREE.MathUtils.lerp(0.0175, 0.0105, time.daylightFactor);
    this.fog.density =
      baseFog +
      perfBoost +
      weather.rainIntensity * 0.0085 +
      weather.fogIntensity * 0.0285;

    // 3. Sun / Moon Position & Directional Lighting
    const sunAngle = (time.timeOfDay - 0.25) * Math.PI * 2;
    const cosA = Math.cos(sunAngle);
    const sinA = Math.sin(sunAngle);
    const sunX = cosA * 96;
    const sunY = sinA * 96;
    const sunZ = 32;

    this.sunDisc.position.set(playerX + sunX, sunY, playerZ + sunZ);
    const sunVisible = sinA > -0.06 && overcastStrength < 0.92;
    this.sunDisc.visible = sunVisible;
    this.sunDiscMat.opacity =
      Math.max(0, Math.min(1, (sinA + 0.05) * 3.5)) * (1 - overcastStrength * 0.85);
    this.sunDiscMat.color.copy(_sunColA);

    const moonX = -sunX;
    const moonY = -sunY;
    const moonZ = -26;
    this.moonDisc.position.set(playerX + moonX, moonY, playerZ + moonZ);
    this.moonDisc.visible = -sinA > -0.04 && overcastStrength < 0.92;
    this.moonDiscMat.opacity =
      Math.max(0, Math.min(0.8, (-sinA + 0.04) * 3.0)) * (1 - overcastStrength * 0.85);

    // Directional light smoothly tracks sun during day and high cool moon arc at night
    if (sinA >= 0.05) {
      this.sunLight.position.set(cosA * 40, Math.max(8, sinA * 46), 16);
    } else {
      this.sunLight.position.set(-cosA * 26, Math.max(18, Math.abs(sinA) * 34), -14);
    }

    const sunWeatherDamp = 1 - weather.rainIntensity * 0.48 - weather.fogIntensity * 0.35;
    this.sunLight.color.copy(_sunColA);
    this.sunLight.intensity = baseSunInt * sunWeatherDamp + flashBoost * 1.45;

    this.hemiLight.color.copy(_hemiSkyA);
    this.hemiLight.groundColor.copy(_hemiGndA);
    this.hemiLight.intensity = baseHemiInt * (1 - weather.rainIntensity * 0.12) + flashBoost * 0.72;
    this.scene.environmentIntensity = baseEnvInt * (1 - overcastStrength * 0.25);

    if (this.powerFlickerTimer > 0) {
      this.powerFlickerTimer = Math.max(0, this.powerFlickerTimer - dt);
    }
    const powerSurge = this.powerFlickerTimer > 0
      ? Math.max(0, Math.min(1, 0.45 + 0.55 * Math.sin(elapsedTime * 31.0) * Math.sin(elapsedTime * 13.7)))
      : 0;

    // 4. Street Lamps (Automatic On/Off + Subtle Flicker + Grid Surge Dip)
    const lampFactor = time.lampFactor;
    const lampDip = this.powerFlickerTimer > 0 ? 1 - powerSurge * 0.62 : 1;
    this.materials.streetLampBulb.color.copy(_lampOffColor).lerp(_lampOnColor, lampFactor * lampDip);
    this.materials.streetLampBulb.emissiveIntensity = lampFactor * 2.35 * lampDip;
    this.world.streetLampPoolMat.opacity = lampFactor * 0.92 * lampDip;

    for (const sl of this.world.streetLampLights) {
      const dx = sl.light.position.x - playerX;
      const dz = sl.light.position.z - playerZ;
      const inRange = lampFactor > 0.01 && dx * dx + dz * dz <= 38 * 38;
      sl.light.visible = inRange;
      if (!inRange) {
        sl.light.intensity = 0;
      } else {
        const flicker =
          0.93 +
          Math.sin(elapsedTime * 3.8 + sl.seed) * 0.05 +
          Math.sin(elapsedTime * 13.0 + sl.seed) * 0.02;
        const surgeFactor =
          this.powerFlickerTimer > 0
            ? Math.max(0.18, 1 - powerSurge * (0.45 + 0.35 * Math.abs(Math.sin(elapsedTime * 19 + sl.seed))))
            : 1;
        sl.light.intensity = sl.baseIntensity * lampFactor * flicker * surgeFactor;
      }
    }

    // 5. Porch Lantern, City Windows & Enterable Building Interiors
    const nightGlow = time.nightFactor;
    this.materials.warmWindow.color.copy(_winOffColor).lerp(_winOnColor, nightGlow);
    this.materials.warmWindow.emissiveIntensity = 0.08 + nightGlow * 1.15;
    this.materials.shopSign.emissiveIntensity = 0.16 + nightGlow * 0.55;
    this.materials.lampBulbLit.emissiveIntensity = 0.45 + Math.max(lampFactor, 0.2) * 1.95;

    for (const pl of this.world.porchLights) {
      const flicker =
        0.95 +
        Math.sin(elapsedTime * 3.4 + pl.seed) * 0.03 +
        Math.sin(elapsedTime * 11.2 + pl.seed) * 0.02;
      const surgeDip = this.powerFlickerTimer > 0 ? 1 - powerSurge * 0.25 : 1;
      pl.light.intensity = pl.baseIntensity * (0.22 + 0.85 * lampFactor) * flicker * surgeDip;
    }

    for (const il of this.world.interiorLights) {
      const dx = il.light.position.x - playerX;
      const dz = il.light.position.z - playerZ;
      const inRange = il.isSafeBase || dx * dx + dz * dz <= 26 * 26;
      il.light.visible = inRange;
      if (!inRange) {
        il.light.intensity = 0;
        continue;
      }

      if (il.isSafeBase) {
        // Warm, reliable backup generator lighting inside The Last Shop (only tiny sag on grid surge)
        const baseScale = 0.84 + nightGlow * 0.42;
        const steadyWarm = 0.97 + Math.sin(elapsedTime * 2.8 + il.seed) * 0.025;
        const genSag = this.powerFlickerTimer > 0 ? 1 - powerSurge * 0.12 : 1;
        il.light.intensity = il.baseIntensity * baseScale * steadyWarm * genSag;
      } else {
        // Abandoned buildings stay dim & eerie with intermittent failing emergency-bulb flicker
        const baseScale = 0.24 + nightGlow * 0.14;
        const sputterCycle = (elapsedTime * 0.85 + il.seed) % 9.5;
        let sputter =
          sputterCycle > 8.55
            ? 0.16 + Math.abs(Math.sin(elapsedTime * 29 + il.seed)) * 0.72
            : 0.84 + Math.sin(elapsedTime * 5.7 + il.seed) * 0.12;
        if (this.powerFlickerTimer > 0) {
          sputter *= Math.max(0.14, 1 - powerSurge * 0.68);
        }
        il.light.intensity = il.baseIntensity * baseScale * sputter;
      }
    }

    // Interior window light shafts reflect outdoor daylight/sunset/moonlight
    const twilightFactor = Math.max(
      0,
      1 - Math.abs(Math.abs(time.sunElevation) - 0.12) * 4.5
    ) * (1 - overcastStrength * 0.7);
    this.world.windowLightShaftMat.color
      .copy(_shaftNightColor)
      .lerp(_shaftDayColor, time.daylightFactor)
      .lerp(_shaftSunsetColor, twilightFactor * 0.65);
    this.world.windowLightShaftMat.opacity =
      (0.028 + time.daylightFactor * 0.095) * (1 - overcastStrength * 0.55);

    // 6. Lightweight Outdoor Rain Particles (hidden completely when dry; skips indoor roof footprints)
    this.updateRain(
      dt,
      weather.rainIntensity,
      weather.windGust ?? 0.25,
      playerX,
      playerZ,
      lightingQuality
    );
  }

  private updateRain(
    dt: number,
    rainIntensity: number,
    windGust: number,
    playerX: number,
    playerZ: number,
    lightingQuality: 'atmospheric' | 'performance'
  ): void {
    if (rainIntensity <= 0.015) {
      this.rainLines.visible = false;
      return;
    }

    this.rainLines.visible = true;
    this.rainMat.opacity = Math.min(0.45, rainIntensity * 0.44);

    const activeCount = lightingQuality === 'performance' ? Math.floor(RAIN_COUNT * 0.5) : RAIN_COUNT;
    this.rainLines.geometry.setDrawRange(0, activeCount * 2);

    const pos = this.rainPositions;
    const floors = this.world.colliders.floors;
    const halfW = RAIN_BOX_W * 0.5;
    const windDriftX = 1.1 + windGust * 3.4;
    const windDriftZ = 0.45 + windGust * 1.4;
    const tiltX = 0.07 + windGust * 0.14;
    const tiltZ = 0.03 + windGust * 0.06;

    for (let i = 0; i < activeCount; i++) {
      let ox = this.rainOffsetsX[i] + dt * windDriftX;
      let oy = this.rainOffsetsY[i] - this.rainSpeeds[i] * dt;
      let oz = this.rainOffsetsZ[i] + dt * windDriftZ;

      if (ox > halfW) ox -= RAIN_BOX_W;
      if (ox < -halfW) ox += RAIN_BOX_W;
      if (oz > halfW) oz -= RAIN_BOX_W;
      if (oz < -halfW) oz += RAIN_BOX_W;
      if (oy < 0.1) oy += RAIN_BOX_H;

      this.rainOffsetsX[i] = ox;
      this.rainOffsetsY[i] = oy;
      this.rainOffsetsZ[i] = oz;

      const wx = playerX + ox;
      const wz = playerZ + oz;

      // Keep rain strictly outdoors — skip drops that fall over building roof footprints
      let insideBuilding = false;
      for (let f = 0; f < floors.length; f++) {
        const fl = floors[f];
        if (wx >= fl.minX && wx <= fl.maxX && wz >= fl.minZ && wz <= fl.maxZ) {
          insideBuilding = true;
          break;
        }
      }

      const idx = i * 6;
      if (insideBuilding) {
        pos[idx] = wx;
        pos[idx + 1] = -10;
        pos[idx + 2] = wz;
        pos[idx + 3] = wx;
        pos[idx + 4] = -10;
        pos[idx + 5] = wz;
      } else {
        pos[idx] = wx;
        pos[idx + 1] = oy;
        pos[idx + 2] = wz;
        pos[idx + 3] = wx - tiltX;
        pos[idx + 4] = oy + 0.46;
        pos[idx + 5] = wz - tiltZ;
      }
    }

    this.rainLines.geometry.attributes.position.needsUpdate = true;
  }

  public dispose(): void {
    this.skyMesh.geometry.dispose();
    this.skyMat.dispose();
    this.sunDisc.geometry.dispose();
    this.sunDiscMat.dispose();
    this.moonDisc.geometry.dispose();
    this.moonDiscMat.dispose();
    this.rainLines.geometry.dispose();
    this.rainMat.dispose();
  }
}
