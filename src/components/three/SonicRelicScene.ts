import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LOGO_GLYPH_MAP, WORDMARK_CHARS } from './logoGlyphs';

export type RelicModelType = 'logo' | 'profile';
export type RelicFinish = 'orange' | 'cyan' | 'titanium';
export type CameraPreset = 'primary' | 'detail' | 'angle';

export interface SonicSceneOptions {
  container: HTMLElement;
  initialModel?: RelicModelType;
  transparentBackground?: boolean;
  enableZoom?: boolean;
  onContextLost?: () => void;
  onContextRestored?: () => void;
}

export interface SonicSceneController {
  setModelType: (model: RelicModelType) => void;
  setExplodeFactor: (value: number) => void;
  setFinish: (finish: RelicFinish) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  setPlaying: (playing: boolean) => void;
  dispose: () => void;
}

// Pre-allocated scratch helpers (zero per-frame GC allocation)
const _dummy = new THREE.Object3D();
const _targetCam = new THREE.Vector3();
const _targetLook = new THREE.Vector3(0.1, 1.72, 0);

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createBrushedMetalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y++) {
      const shade = 112 + Math.floor(Math.random() * 34);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(0, y, 256, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.34)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFloorGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#03050a';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 2;
    const step = 64;
    for (let i = 0; i <= 512; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 123, 0, 0.35)';
    for (let x = 0; x <= 512; x += step) {
      for (let y = 0; y <= 512; y += step) {
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createSubtitlePlaqueTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#040819';
    ctx.fillRect(0, 0, 1536, 192);

    // Hairline cyan/orange cybernetic trim bars
    const grad = ctx.createLinearGradient(0, 0, 1536, 0);
    grad.addColorStop(0, '#FF7B00');
    grad.addColorStop(0.5, '#00F0FF');
    grad.addColorStop(1, '#FF7B00');
    ctx.fillStyle = grad;
    ctx.fillRect(48, 18, 1440, 4);
    ctx.fillRect(48, 170, 1440, 4);

    ctx.font = '700 66px Orbitron, "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 240, 255, 0.85)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#E8FDFF';
    ctx.fillText('MUSIC // GAMING // CYBERNETICS', 768, 98);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createScanlineTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 256);
    for (let y = 0; y < 256; y += 6) {
      const alpha = y % 24 === 0 ? 0.42 : 0.14;
      ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
      ctx.fillRect(0, y, 512, y % 24 === 0 ? 2 : 1);
    }
    // Vertical holographic calibration ticks
    ctx.fillStyle = 'rgba(255, 123, 0, 0.36)';
    for (let x = 0; x < 512; x += 64) {
      ctx.fillRect(x, 16, 2, 20);
      ctx.fillRect(x, 220, 2, 20);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

function createNumber4Geometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0.08, -0.58);
  shape.lineTo(0.28, -0.58);
  shape.lineTo(0.28, -0.22);
  shape.lineTo(0.48, -0.22);
  shape.lineTo(0.48, -0.02);
  shape.lineTo(0.28, -0.02);
  shape.lineTo(0.28, 0.62);
  shape.lineTo(0.04, 0.62);
  shape.lineTo(-0.48, -0.04);
  shape.lineTo(-0.48, -0.22);
  shape.lineTo(0.08, -0.22);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(0.08, -0.02);
  hole.lineTo(-0.22, -0.02);
  hole.lineTo(0.08, 0.36);
  hole.closePath();
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.028,
    bevelSegments: 4,
  });
  geo.center();
  return geo;
}

function createHeadbandGeometry(): THREE.ExtrudeGeometry {
  const outerR = 1.32;
  const innerR = 1.14;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, -0.15, Math.PI + 0.15, false);
  shape.absarc(0, 0, innerR, Math.PI + 0.15, -0.15, true);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.035,
    bevelSegments: 4,
    curveSegments: 40,
  });
  geo.center();
  return geo;
}

function createArcSectorGeometry(
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
  depth: number
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, startAngle, endAngle, false);
  shape.absarc(0, 0, innerR, endAngle, startAngle, true);
  shape.closePath();

  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.015,
    bevelSegments: 3,
    curveSegments: 28,
  });
}

function createRoundedCapsuleLoop(w: number, h: number, r: number): THREE.TubeGeometry {
  const hw = w / 2;
  const hh = h / 2;
  const pts: THREE.Vector3[] = [];
  const cornerSegs = 8;

  const corners = [
    { cx: hw - r, cy: hh - r, a0: 0, a1: Math.PI / 2 },
    { cx: -hw + r, cy: hh - r, a0: Math.PI / 2, a1: Math.PI },
    { cx: -hw + r, cy: -hh + r, a0: Math.PI, a1: Math.PI * 1.5 },
    { cx: hw - r, cy: -hh + r, a0: Math.PI * 1.5, a1: Math.PI * 2 },
  ];

  for (const c of corners) {
    for (let i = 0; i <= cornerSegs; i++) {
      const a = c.a0 + (c.a1 - c.a0) * (i / cornerSegs);
      pts.push(new THREE.Vector3(c.cx + Math.cos(a) * r, c.cy + Math.sin(a) * r, 0));
    }
  }

  const curve = new THREE.CatmullRomCurve3(pts, true);
  return new THREE.TubeGeometry(curve, 64, 0.042, 12, true);
}

export function mountSonicRelicScene({
  container,
  initialModel = 'logo',
  transparentBackground = false,
  enableZoom = true,
  onContextLost,
  onContextRestored,
}: SonicSceneOptions): SonicSceneController {
  const isSoftwareGl = detectSoftwareGl();

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
    alpha: transparentBackground,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.96;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (transparentBackground) {
    renderer.setClearColor(0x000000, 0);
  }

  const initW = container.clientWidth || 800;
  const initH = container.clientHeight || 600;
  renderer.setSize(initW, initH);

  container.appendChild(renderer.domElement);

  const handleContextLost = (e: Event) => {
    e.preventDefault();
    onContextLost?.();
  };
  const handleContextRestored = () => {
    onContextRestored?.();
  };
  renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
  renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

  const scene = new THREE.Scene();
  if (!transparentBackground) {
    scene.background = new THREE.Color(0x03050a);
    scene.fog = new THREE.FogExp2(0x03050a, 0.038);
  }

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envRenderTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRenderTarget.texture;
  pmremGenerator.dispose();

  const aspect = initW / initH;
  const camera = new THREE.PerspectiveCamera(
    transparentBackground ? 36 : 42,
    aspect,
    0.1,
    100
  );

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.06;
  controls.enableZoom = enableZoom;
  controls.minDistance = 3.0;
  controls.maxDistance = 15.0;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.minPolarAngle = Math.PI * 0.25;
  controls.enablePan = false;

  const getResponsiveLogoZ = (curAspect: number) => {
    const baseZ = transparentBackground ? 7.6 : 8.2;
    if (curAspect < 1.85) {
      return Math.min(13.5, baseZ * (1.85 / Math.max(0.95, curAspect)));
    }
    return baseZ;
  };

  // Initial camera framing matched to initialModel
  if (initialModel === 'logo') {
    camera.position.set(0.12, transparentBackground ? 2.02 : 2.35, getResponsiveLogoZ(aspect));
    controls.target.set(0.05, 1.62, 0);
  } else {
    camera.position.set(0.4, 2.2, 6.1);
    controls.target.set(0, 1.45, 0);
  }

  // 3-Point Studio Lighting Rig (calibrated for crisp contrast without white washout)
  const keyLight = new THREE.DirectionalLight(0xffe8cc, 1.68);
  keyLight.position.set(4.5, 7.5, 6.2);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 24;
  keyLight.shadow.camera.left = -6;
  keyLight.shadow.camera.right = 6;
  keyLight.shadow.camera.top = 5;
  keyLight.shadow.camera.bottom = -5;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const hemiFill = new THREE.HemisphereLight(0x00d8ff, 0x050818, 0.56);
  scene.add(hemiFill);

  const rimLight = new THREE.DirectionalLight(0xff7b00, 1.35);
  rimLight.position.set(-5.5, 3.4, -5.0);
  scene.add(rimLight);

  // Procedural Textures
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const brushedMap = createBrushedMetalTexture();
  const shadowMap = createContactShadowTexture();
  const floorMap = createFloorGridTexture(maxAniso);
  const subtitleMap = createSubtitlePlaqueTexture(maxAniso);
  const scanlineMap = createScanlineTexture();

  // Ground Plane + Contact Shadow (flush grounding, zero Z-fighting)
  const floorGeo = new THREE.PlaneGeometry(44, 44);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorMap,
    roughness: 0.72,
    metalness: 0.18,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.visible = !transparentBackground;
  scene.add(floor);

  const contactGeo = new THREE.PlaneGeometry(9.6, 4.4);
  const contactMat = new THREE.MeshBasicMaterial({
    map: shadowMap,
    transparent: true,
    depthWrite: false,
    opacity: transparentBackground ? 0.45 : 0.68,
  });
  const contactShadow = new THREE.Mesh(contactGeo, contactMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.006;
  scene.add(contactShadow);

  // Shared Studio PBR Materials (varied roughness & metalness >= 0.25 delta)
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x0b132b,
    roughness: 0.36,
    metalness: 0.84,
    bumpMap: brushedMap,
    bumpScale: 0.008,
    envMapIntensity: 0.65,
  });

  const gunmetalCarbonMat = new THREE.MeshStandardMaterial({
    color: 0x151d33,
    roughness: 0.42,
    metalness: 0.78,
    bumpMap: brushedMap,
    bumpScale: 0.01,
    envMapIntensity: 0.7,
  });

  // Harmonized Mythic Headphone Hardware Palette (no flat black headband)
  const titaniumRailMat = new THREE.MeshPhysicalMaterial({
    color: 0xdbeafe,
    metalness: 0.88,
    roughness: 0.18,
    roughnessMap: brushedMap,
    clearcoat: 0.65,
    clearcoatRoughness: 0.14,
    envMapIntensity: 0.9,
  });

  const cobaltTechMat = new THREE.MeshPhysicalMaterial({
    color: 0x102a66,
    metalness: 0.76,
    roughness: 0.28,
    bumpMap: brushedMap,
    bumpScale: 0.008,
    clearcoat: 0.42,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.78,
  });

  const satinWhiteMat = new THREE.MeshPhysicalMaterial({
    color: 0xf1f5f9,
    roughness: 0.38,
    metalness: 0.08,
    clearcoat: 0.28,
    clearcoatRoughness: 0.25,
    envMapIntensity: 0.35,
  });

  // High-contrast non-glare wordmark materials so "R4agRek0il" reads cleanly
  const wordmarkFrontMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.52,
    metalness: 0.04,
    envMapIntensity: 0.22,
  });

  const wordmarkOutlineMat = new THREE.MeshStandardMaterial({
    color: 0x030719,
    roughness: 0.82,
    metalness: 0.12,
    envMapIntensity: 0.14,
  });

  const wordmarkCyanRimMat = new THREE.MeshStandardMaterial({
    color: 0x00d8ff,
    emissive: 0x007a99,
    emissiveIntensity: 0.26,
    roughness: 0.34,
    metalness: 0.25,
    envMapIntensity: 0.3,
  });

  const wordmarkOrangeRimMat = new THREE.MeshStandardMaterial({
    color: 0xff7b00,
    emissive: 0x993d00,
    emissiveIntensity: 0.22,
    roughness: 0.34,
    metalness: 0.3,
    envMapIntensity: 0.3,
  });

  const chassisOrangeMat = new THREE.MeshPhysicalMaterial({
    color: 0xff7b00,
    metalness: 0.9,
    roughness: 0.2,
    roughnessMap: brushedMap,
    anisotropy: 0.82,
    clearcoat: 0.75,
    clearcoatRoughness: 0.14,
    envMapIntensity: 0.85,
  });

  const warmAmberGlowMat = new THREE.MeshPhysicalMaterial({
    color: 0xffa600,
    emissive: 0xff6a00,
    emissiveIntensity: 0.48,
    roughness: 0.22,
    metalness: 0.4,
    clearcoat: 0.75,
    envMapIntensity: 0.45,
  });

  const cushionMat = new THREE.MeshStandardMaterial({
    color: 0x0b1c48,
    roughness: 0.84,
    metalness: 0.08,
    envMapIntensity: 0.32,
  });

  const cyanCoreMat = new THREE.MeshPhysicalMaterial({
    color: 0x00f0ff,
    emissive: 0x0099bb,
    emissiveIntensity: 0.52,
    roughness: 0.16,
    metalness: 0.26,
    clearcoat: 0.85,
    clearcoatRoughness: 0.08,
    envMapIntensity: 0.55,
  });

  const energyNodeMat = new THREE.MeshStandardMaterial({
    color: 0x9ef9ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 1.05,
    roughness: 0.15,
    metalness: 0.2,
  });

  const reticleCyanMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x007799,
    emissiveIntensity: 0.36,
    roughness: 0.26,
    metalness: 0.82,
    envMapIntensity: 0.5,
  });

  const eqMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.26,
    metalness: 0.65,
    emissive: 0x003344,
    emissiveIntensity: 0.3,
    envMapIntensity: 0.45,
  });

  const plaqueFaceMat = new THREE.MeshStandardMaterial({
    map: subtitleMap,
    emissiveMap: subtitleMap,
    emissive: 0xffffff,
    emissiveIntensity: 0.34,
    roughness: 0.35,
    metalness: 0.25,
    envMapIntensity: 0.25,
  });

  // =========================================================================
  // MODEL A: R4agRek0il CHANNEL LOGO 3D MONUMENT (Composite Multi-Part Group)
  // =========================================================================
  const logoGroup = new THREE.Group();
  scene.add(logoGroup);

  // A1. Grounded Architectural Studio Base Plinth (y = 0 .. 0.46)
  const baseLowerGeo = new THREE.BoxGeometry(7.6, 0.22, 1.45);
  const baseLower = new THREE.Mesh(baseLowerGeo, darkMetalMat);
  baseLower.position.set(0.05, 0.11, 0);
  baseLower.castShadow = true;
  baseLower.receiveShadow = true;
  logoGroup.add(baseLower);

  const baseUpperGeo = new THREE.BoxGeometry(6.9, 0.18, 1.05);
  const baseUpper = new THREE.Mesh(baseUpperGeo, cushionMat);
  baseUpper.position.set(0.05, 0.31, 0);
  baseUpper.castShadow = true;
  baseUpper.receiveShadow = true;
  logoGroup.add(baseUpper);

  // Subtitle illuminated front nameplate ("MUSIC // GAMING // CYBERNETICS")
  const plaqueGeo = new THREE.PlaneGeometry(5.6, 0.42);
  const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueFaceMat);
  plaqueMesh.position.set(0.65, 0.33, 0.535);
  logoGroup.add(plaqueMesh);

  // Support pylons grounding the logo assembly into the plinth
  const pylonGeo = new THREE.CylinderGeometry(0.075, 0.11, 0.85, 16);
  for (const px of [-2.55, 0.1, 2.55]) {
    const pylon = new THREE.Mesh(pylonGeo, darkMetalMat);
    pylon.position.set(px, 0.78, -0.08);
    pylon.castShadow = true;
    logoGroup.add(pylon);
  }

  // A2. Left Cybernetic Reticle & Glowing "4" Core (x = -2.55, y = 1.86)
  const leftCoreGroup = new THREE.Group();
  leftCoreGroup.position.set(-2.55, 1.86, 0.05);
  logoGroup.add(leftCoreGroup);

  // Outer segmented orange armor arcs (left side of emblem)
  const arcOrange1 = new THREE.Mesh(
    createArcSectorGeometry(1.12, 1.38, Math.PI * 0.62, Math.PI * 1.12, 0.16),
    chassisOrangeMat
  );
  arcOrange1.position.z = -0.08;
  arcOrange1.castShadow = true;

  const arcOrange2 = new THREE.Mesh(
    createArcSectorGeometry(1.12, 1.38, Math.PI * 1.2, Math.PI * 1.48, 0.16),
    chassisOrangeMat
  );
  arcOrange2.position.z = -0.08;
  arcOrange2.castShadow = true;

  // Satin white mechanical tech ring segments
  const arcWhite = new THREE.Mesh(
    createArcSectorGeometry(0.84, 1.06, Math.PI * 0.28, Math.PI * 1.72, 0.14),
    satinWhiteMat
  );
  arcWhite.position.z = -0.05;
  arcWhite.castShadow = true;

  // Inner metallic reticle rings
  const coreRingOuter = new THREE.Mesh(
    new THREE.TorusGeometry(0.74, 0.032, 14, 56),
    reticleCyanMat
  );
  const coreRingDark = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.025, 12, 48),
    darkMetalMat
  );

  // Warm orange glowing rounded capsule stadium loop around the "4"
  const capsuleMesh = new THREE.Mesh(
    createRoundedCapsuleLoop(0.62, 0.96, 0.24),
    warmAmberGlowMat
  );
  capsuleMesh.position.z = 0.08;

  // Sculpted glowing Cyan "4" inside the capsule
  const logo4Mesh = new THREE.Mesh(createNumber4Geometry(), cyanCoreMat);
  logo4Mesh.scale.setScalar(0.56);
  logo4Mesh.position.set(0, 0, 0.1);
  logo4Mesh.castShadow = true;

  // Horizontal sinusoidal waveform pulse passing through center of the "4"
  const pulsePts: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const px = (t - 0.5) * 1.35;
    const envelope = Math.exp(-Math.pow((t - 0.5) * 4.2, 2));
    const py = Math.sin(t * Math.PI * 12) * 0.18 * envelope;
    pulsePts.push(new THREE.Vector3(px, py, 0.16));
  }
  const pulseGeo = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(pulsePts),
    56,
    0.016,
    8,
    false
  );
  const pulseMesh = new THREE.Mesh(pulseGeo, warmAmberGlowMat);

  // Overlapping forward Orange Sniper Crosshair Sight bridging into "R"
  const sightGroup = new THREE.Group();
  sightGroup.position.set(0.92, -0.02, 0.22);
  const sightOrangeRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.028, 14, 56),
    chassisOrangeMat
  );
  const sightCyanRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.51, 0.024, 12, 48),
    reticleCyanMat
  );
  const crosshairV = new THREE.Mesh(
    new THREE.BoxGeometry(0.032, 1.68, 0.04),
    chassisOrangeMat
  );
  const crosshairH = new THREE.Mesh(
    new THREE.BoxGeometry(1.68, 0.032, 0.04),
    reticleCyanMat
  );
  sightGroup.add(sightOrangeRing, sightCyanRing, crosshairV, crosshairH);

  leftCoreGroup.add(
    arcOrange1,
    arcOrange2,
    arcWhite,
    coreRingOuter,
    coreRingDark,
    capsuleMesh,
    logo4Mesh,
    pulseMesh,
    sightGroup
  );

  // Outer radial cybernetic fins & precision tick marks on left reticle
  const finAngles = [
    Math.PI * 0.66,
    Math.PI * 0.78,
    Math.PI * 0.92,
    Math.PI * 1.04,
    Math.PI * 1.24,
    Math.PI * 1.38,
    Math.PI * 1.5,
  ];
  const finGeo = new THREE.BoxGeometry(0.28, 0.045, 0.09);
  finAngles.forEach((ang, idx) => {
    const fin = new THREE.Mesh(
      finGeo,
      idx % 2 === 0 ? chassisOrangeMat : reticleCyanMat
    );
    const radius = 1.48;
    fin.position.set(Math.cos(ang) * radius, Math.sin(ang) * radius, -0.04);
    fin.rotation.z = ang;
    fin.castShadow = true;
    leftCoreGroup.add(fin);
  });

  // A3. High-Contrast Triple-Layer Chromatic Sculpted Wordmark ("R4agRek0il")
  const wordmarkGroup = new THREE.Group();
  wordmarkGroup.position.set(1.12, 1.44, 0.14);
  logoGroup.add(wordmarkGroup);

  const frontLayerGroup = new THREE.Group();
  const cyanEdgeLayerGroup = new THREE.Group();
  const orangeEdgeLayerGroup = new THREE.Group();
  const navyBackingLayerGroup = new THREE.Group();
  wordmarkGroup.add(
    navyBackingLayerGroup,
    orangeEdgeLayerGroup,
    cyanEdgeLayerGroup,
    frontLayerGroup
  );

  const glyphScale = 1.04;
  const letterSpacing = 0.115;
  let cursorX = 0;

  // Measure total width first so wordmark centers cleanly
  let totalWidth = 0;
  for (let i = 0; i < WORDMARK_CHARS.length; i++) {
    const spec = LOGO_GLYPH_MAP[WORDMARK_CHARS[i]];
    totalWidth += spec.width * glyphScale + (i < WORDMARK_CHARS.length - 1 ? letterSpacing : 0);
  }
  cursorX = -totalWidth / 2;

  for (const ch of WORDMARK_CHARS) {
    const spec = LOGO_GLYPH_MAP[ch];
    const shapes = spec.buildShapes();

    const frontGeo = new THREE.ExtrudeGeometry(shapes, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.014,
      bevelSegments: 3,
      curveSegments: 18,
    });

    const rimGeo = new THREE.ExtrudeGeometry(shapes, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.026,
      bevelSize: 0.032,
      bevelSegments: 3,
      curveSegments: 18,
    });

    const backGeo = new THREE.ExtrudeGeometry(shapes, {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.038,
      bevelSize: 0.068,
      bevelSegments: 3,
      curveSegments: 18,
    });

    const frontMesh = new THREE.Mesh(frontGeo, wordmarkFrontMat);
    frontMesh.scale.setScalar(glyphScale);
    frontMesh.position.set(cursorX, 0, 0.1);
    frontMesh.castShadow = true;
    frontLayerGroup.add(frontMesh);

    const cyanEdge = new THREE.Mesh(rimGeo, wordmarkCyanRimMat);
    cyanEdge.scale.setScalar(glyphScale);
    cyanEdge.position.set(cursorX - 0.036, -0.016, 0.035);
    cyanEdgeLayerGroup.add(cyanEdge);

    const orangeEdge = new THREE.Mesh(rimGeo, wordmarkOrangeRimMat);
    orangeEdge.scale.setScalar(glyphScale);
    orangeEdge.position.set(cursorX + 0.036, 0.016, 0.02);
    orangeEdgeLayerGroup.add(orangeEdge);

    const navyBacking = new THREE.Mesh(backGeo, wordmarkOutlineMat);
    navyBacking.scale.setScalar(glyphScale);
    navyBacking.position.set(cursorX, 0, -0.08);
    navyBacking.castShadow = true;
    navyBackingLayerGroup.add(navyBacking);

    cursorX += spec.width * glyphScale + letterSpacing;
  }

  // A4. Upper Dual-Peak Spectrum Equalizer Skyline (InstancedMesh, 42 bars)
  const logoEqCount = 42;
  const logoEqGeo = new THREE.BoxGeometry(0.068, 0.4, 0.08);
  const logoEqInstanced = new THREE.InstancedMesh(logoEqGeo, eqMat, logoEqCount);
  const colOrange = new THREE.Color(0xff7b00);
  const colWhite = new THREE.Color(0xf8fafc);
  const colCyan = new THREE.Color(0x00e5ff);
  const _tempColor = new THREE.Color();

  for (let i = 0; i < logoEqCount; i++) {
    const t = i / (logoEqCount - 1);
    if (t < 0.42) {
      _tempColor.copy(colOrange);
    } else if (t < 0.58) {
      _tempColor.copy(colWhite);
    } else {
      _tempColor.copy(colCyan);
    }
    logoEqInstanced.setColorAt(i, _tempColor);
  }
  if (logoEqInstanced.instanceColor) logoEqInstanced.instanceColor.needsUpdate = true;
  logoEqInstanced.frustumCulled = false;
  logoGroup.add(logoEqInstanced);

  // A5. Right-Side Concentric Sniper / Radar Target Reticle (behind "0il")
  const rightReticleGroup = new THREE.Group();
  rightReticleGroup.position.set(2.58, 1.88, -0.22);
  logoGroup.add(rightReticleGroup);

  for (const r of [0.42, 0.68, 0.94]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.018, 10, 48),
      chassisOrangeMat
    );
    rightReticleGroup.add(ring);
  }
  const rCrossV = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 2.25, 0.022),
    chassisOrangeMat
  );
  const rCrossH = new THREE.Mesh(
    new THREE.BoxGeometry(2.25, 0.022, 0.022),
    chassisOrangeMat
  );
  rightReticleGroup.add(rCrossV, rCrossH);

  // Subtle lower secondary micro-waveform strip below "Rek0il"
  const subWaveCount = 26;
  const subWaveInstanced = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.045, 0.16, 0.04),
    eqMat,
    subWaveCount
  );
  for (let i = 0; i < subWaveCount; i++) {
    const t = i / (subWaveCount - 1);
    const env = Math.sin(t * Math.PI);
    _dummy.position.set(0.35 + t * 2.95, 1.06, 0.04);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1, 0.35 + env * 0.85, 1);
    _dummy.updateMatrix();
    subWaveInstanced.setMatrixAt(i, _dummy.matrix);
    subWaveInstanced.setColorAt(i, i % 3 === 0 ? colCyan : colWhite);
  }
  if (subWaveInstanced.instanceColor) subWaveInstanced.instanceColor.needsUpdate = true;
  logoGroup.add(subWaveInstanced);

  // =========================================================================
  // MODEL B: CODM MYTHIC MECHA PROFILE EMBLEM (Cyan 4 + Mythic Headphones)
  // =========================================================================
  const profileGroup = new THREE.Group();
  scene.add(profileGroup);

  const pedestalPoints = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(1.56, 0),
    new THREE.Vector2(1.48, 0.12),
    new THREE.Vector2(1.26, 0.24),
    new THREE.Vector2(1.18, 0.4),
    new THREE.Vector2(0, 0.4),
  ];
  const pedestal = new THREE.Mesh(
    new THREE.LatheGeometry(pedestalPoints, 8),
    darkMetalMat
  );
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  profileGroup.add(pedestal);

  const trimMesh = new THREE.Mesh(
    new THREE.TorusGeometry(1.22, 0.024, 12, 64),
    reticleCyanMat
  );
  trimMesh.rotation.x = Math.PI / 2;
  trimMesh.position.y = 0.41;
  profileGroup.add(trimMesh);

  const pedestalAmberTrim = new THREE.Mesh(
    new THREE.TorusGeometry(1.48, 0.016, 10, 64),
    warmAmberGlowMat
  );
  pedestalAmberTrim.rotation.x = Math.PI / 2;
  pedestalAmberTrim.position.y = 0.13;
  profileGroup.add(pedestalAmberTrim);

  // 4 Stabilizer Armor Claws around octagonal pedestal
  const clawGeo = new THREE.BoxGeometry(0.18, 0.16, 0.42);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const claw = new THREE.Mesh(clawGeo, chassisOrangeMat);
    claw.position.set(Math.cos(a) * 1.44, 0.08, Math.sin(a) * 1.44);
    claw.rotation.y = -a + Math.PI / 2;
    claw.castShadow = true;
    profileGroup.add(claw);
  }

  const headCenterY = 1.7;

  // Sculpted glowing Cyan "4" core
  const num4Mesh = new THREE.Mesh(createNumber4Geometry(), cyanCoreMat);
  num4Mesh.position.set(0, headCenterY - 0.04, 0);
  num4Mesh.castShadow = true;
  profileGroup.add(num4Mesh);

  // Mythic Exoskeleton Headband Assembly (Anodized Solar-Orange + Brushed Titanium + Cobalt)
  const headbandGroup = new THREE.Group();
  headbandGroup.position.set(0, headCenterY + 0.56, 0);
  profileGroup.add(headbandGroup);

  const headbandCore = new THREE.Mesh(createHeadbandGeometry(), chassisOrangeMat);
  headbandCore.castShadow = true;
  headbandGroup.add(headbandCore);

  // Recessed Sapphire-Cobalt structural channel ribs on front/rear headband flanks
  const headbandFlankRail = new THREE.Mesh(
    createArcSectorGeometry(1.16, 1.29, -0.06, Math.PI + 0.06, 0.3),
    cobaltTechMat
  );
  headbandFlankRail.position.z = -0.15;
  headbandGroup.add(headbandFlankRail);

  // Brushed Platinum-Titanium outer exoskeleton spine rail
  const outerExoArc = new THREE.Mesh(
    createArcSectorGeometry(1.31, 1.38, Math.PI * 0.1, Math.PI * 0.9, 0.22),
    titaniumRailMat
  );
  outerExoArc.position.z = -0.11;
  outerExoArc.castShadow = true;
  headbandGroup.add(outerExoArc);

  // Glowing Cyan Plasma Conduit running across top headband rail
  const conduitPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32;
    const ang = -0.08 + t * (Math.PI + 0.16);
    conduitPts.push(new THREE.Vector3(Math.cos(ang) * 1.39, Math.sin(ang) * 1.39, 0));
  }
  const conduitMesh = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(conduitPts), 48, 0.028, 10, false),
    cyanCoreMat
  );
  headbandGroup.add(conduitMesh);

  // Active Pulsing Energy-Glow Nodes registry (animated in updateScene)
  const energyNodes: THREE.Mesh[] = [];
  const registerEnergyNode = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    radius = 0.055,
    useAmber = false
  ) => {
    const node = new THREE.Mesh(
      new THREE.OctahedronGeometry(radius, 0),
      useAmber ? warmAmberGlowMat : energyNodeMat
    );
    node.position.set(x, y, z);
    parent.add(node);
    energyNodes.push(node);
    return node;
  };

  // Apex Mythic Crown Core & Energy-Glow Nodes
  registerEnergyNode(headbandGroup, 0, 1.44, 0.16, 0.072, false);
  registerEnergyNode(headbandGroup, -0.78, 1.24, 0.14, 0.052, true);
  registerEnergyNode(headbandGroup, 0.78, 1.24, 0.14, 0.052, true);

  // 7 Articulated Floating Mythic Armor Spine Plates along headband arc
  const spinePlates: THREE.Mesh[] = [];
  const spinePlateGeo = new THREE.BoxGeometry(0.24, 0.12, 0.34);
  const spineInnerGeo = new THREE.BoxGeometry(0.18, 0.05, 0.38);
  for (let i = 0; i < 7; i++) {
    const frac = i / 6;
    const ang = Math.PI * 0.14 + frac * Math.PI * 0.72;
    const plate = new THREE.Mesh(
      spinePlateGeo,
      i % 2 === 0 ? titaniumRailMat : chassisOrangeMat
    );
    const r = 1.47;
    plate.position.set(Math.cos(ang) * r, Math.sin(ang) * r, 0);
    plate.rotation.z = ang - Math.PI / 2;
    plate.castShadow = true;
    plate.userData.baseAngle = ang;
    plate.userData.baseRadius = r;
    spinePlates.push(plate);
    headbandGroup.add(plate);

    const railAccent = new THREE.Mesh(spineInnerGeo, reticleCyanMat);
    railAccent.position.set(Math.cos(ang) * 1.38, Math.sin(ang) * 1.38, 0);
    railAccent.rotation.z = ang - Math.PI / 2;
    headbandGroup.add(railAccent);
  }

  // Dual Temple Energy Nodes, CoD:M Mythic Chevron Brackets & Articulated Yokes
  const templeNodeGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.36, 8);
  for (const side of [-1, 1]) {
    const node = new THREE.Mesh(templeNodeGeo, warmAmberGlowMat);
    node.rotation.x = Math.PI / 2;
    node.position.set(side * 1.24, -0.05, 0);
    headbandGroup.add(node);

    // Brushed Titanium temple chevron shield + active cyan energy core
    const templeChevron = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.24, 0.38),
      titaniumRailMat
    );
    templeChevron.position.set(side * 1.28, -0.04, 0);
    templeChevron.rotation.z = side * -0.18;
    headbandGroup.add(templeChevron);

    registerEnergyNode(headbandGroup, side * 1.32, -0.04, 0.21, 0.058, false);

    const yoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.54, 0.26),
      cobaltTechMat
    );
    yoke.position.set(side * 1.33, -0.34, 0);
    yoke.rotation.z = side * 0.14;
    yoke.castShadow = true;
    headbandGroup.add(yoke);

    const yokeRailTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.44, 0.3),
      titaniumRailMat
    );
    yokeRailTrim.position.set(side * 1.35, -0.34, 0);
    yokeRailTrim.rotation.z = side * 0.14;
    headbandGroup.add(yokeRailTrim);
  }

  // Helper to construct Mythic Mecha Earcup Assembly (left/right symmetric)
  const buildMythicEarcup = (side: -1 | 1) => {
    const group = new THREE.Group();
    const cupOuterPoints = [
      new THREE.Vector2(0.01, -0.22),
      new THREE.Vector2(0.3, -0.22),
      new THREE.Vector2(0.5, -0.06),
      new THREE.Vector2(0.52, 0.12),
      new THREE.Vector2(0.34, 0.2),
      new THREE.Vector2(0.01, 0.2),
    ];
    const chassis = new THREE.Mesh(
      new THREE.LatheGeometry(cupOuterPoints, 8),
      cobaltTechMat
    );
    chassis.rotation.z = side === -1 ? -Math.PI / 2 : Math.PI / 2;
    chassis.castShadow = true;

    const armorRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.055, 10, 8),
      chassisOrangeMat
    );
    armorRing.rotation.y = Math.PI / 2;
    armorRing.position.x = side * 0.11;
    armorRing.castShadow = true;

    // Brushed Titanium secondary chamfered bezel around earcup
    const titaniumBezel = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.026, 8, 8),
      titaniumRailMat
    );
    titaniumBezel.rotation.y = Math.PI / 2;
    titaniumBezel.position.x = side * 0.18;

    const pad = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.115, 16, 36),
      cushionMat
    );
    pad.rotation.y = Math.PI / 2;
    pad.position.x = side * -0.18;

    // Mythic Spinning Plasma Reactor Core on outer earcup face
    const reactorGroup = new THREE.Group();
    reactorGroup.position.set(side * 0.24, 0, 0);
    reactorGroup.rotation.y = side === -1 ? -Math.PI / 2 : Math.PI / 2;

    const reactorRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.026, 10, 24),
      cyanCoreMat
    );
    const reactorCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.115, 0),
      warmAmberGlowMat
    );
    reactorGroup.add(reactorRing, reactorCore);

    for (let b = 0; b < 4; b++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.38, 0.03),
        chassisOrangeMat
      );
      blade.rotation.z = (b / 4) * Math.PI;
      reactorGroup.add(blade);
    }

    // Active earcup energy-glow nodes (fore & aft thruster nodes)
    registerEnergyNode(group, side * 0.2, 0.34, 0.28, 0.048, false);
    registerEnergyNode(group, side * 0.2, -0.34, 0.28, 0.048, true);

    // Floating Swept CODM Mythic Mecha Wing Shrouds (4 angled aero fins + vents)
    const shroudGroup = new THREE.Group();
    const upperWing = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.44, 0.22),
      chassisOrangeMat
    );
    upperWing.position.set(side * 0.16, 0.48, -0.16);
    upperWing.rotation.set(0.35, 0, side * -0.32);
    upperWing.castShadow = true;

    const rearBlade = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.22, 0.58),
      titaniumRailMat
    );
    rearBlade.position.set(side * 0.14, 0.04, -0.48);
    rearBlade.rotation.y = side * -0.25;
    rearBlade.castShadow = true;

    const ventEdge = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.12, 0.42),
      cyanCoreMat
    );
    ventEdge.position.set(side * 0.15, 0.04, -0.52);
    ventEdge.rotation.y = side * -0.25;

    const lowerFang = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.38, 0.18),
      chassisOrangeMat
    );
    lowerFang.position.set(side * 0.16, -0.44, -0.14);
    lowerFang.rotation.set(-0.32, 0, side * 0.28);
    lowerFang.castShadow = true;

    shroudGroup.add(upperWing, rearBlade, ventEdge, lowerFang);
    group.add(chassis, armorRing, titaniumBezel, pad, reactorGroup, shroudGroup);
    return { group, reactorGroup, shroudGroup };
  };

  const leftBuilt = buildMythicEarcup(-1);
  const leftCupGroup = leftBuilt.group;
  leftCupGroup.position.set(-1.22, headCenterY - 0.08, 0);
  profileGroup.add(leftCupGroup);

  const rightBuilt = buildMythicEarcup(1);
  const rightCupGroup = rightBuilt.group;
  rightCupGroup.position.set(1.22, headCenterY - 0.08, 0);
  profileGroup.add(rightCupGroup);

  // Dual-Helix Plasma Coiled Cable + Tactical Cyber-Jack Connector
  const coilPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 72; i++) {
    const t = i / 72;
    const angle = t * Math.PI * 2 * 4.0;
    coilPts.push(
      new THREE.Vector3(
        0.16 + t * 0.78,
        Math.sin(angle) * 0.14,
        Math.cos(angle) * 0.14
      )
    );
  }
  const coilGroup = new THREE.Group();
  coilGroup.position.set(1.26, headCenterY - 0.2, 0);

  const coilMesh = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPts), 84, 0.044, 12, false),
    chassisOrangeMat
  );
  coilMesh.castShadow = true;

  const coilInnerWire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.92, 10),
    cyanCoreMat
  );
  coilInnerWire.rotation.z = Math.PI / 2;
  coilInnerWire.position.x = 0.56;

  const jackHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.09, 0.26, 8),
    titaniumRailMat
  );
  jackHousing.rotation.z = Math.PI / 2;
  jackHousing.position.x = 1.04;

  const jackTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.032, 0.22, 12),
    warmAmberGlowMat
  );
  jackTip.rotation.z = Math.PI / 2;
  jackTip.position.x = 1.24;

  coilGroup.add(coilMesh, coilInnerWire, jackHousing, jackTip);
  profileGroup.add(coilGroup);

  // Dual Counter-Rotating Mythic HUD Reticles
  const outerReticle = new THREE.Mesh(
    new THREE.TorusGeometry(1.88, 0.02, 12, 72),
    reticleCyanMat
  );
  outerReticle.position.set(0, headCenterY, 0);
  profileGroup.add(outerReticle);

  const innerReticle = new THREE.Mesh(
    new THREE.TorusGeometry(0.98, 0.016, 10, 56),
    chassisOrangeMat
  );
  innerReticle.position.set(0, headCenterY, 0);
  profileGroup.add(innerReticle);

  // Subtle Rotating Holographic Scan-Line Shroud & Vertical Sweep Ring
  const scanShroudMat = new THREE.MeshBasicMaterial({
    map: scanlineMap,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const scanShroudMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(2.14, 2.14, 2.75, 48, 1, true),
    scanShroudMat
  );
  scanShroudMesh.position.set(0, headCenterY + 0.12, 0);
  profileGroup.add(scanShroudMesh);

  const scanSweepMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const scanSweepRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.94, 0.012, 8, 64),
    scanSweepMat
  );
  scanSweepRing.rotation.x = Math.PI / 2;
  scanSweepRing.position.set(0, headCenterY, 0);
  profileGroup.add(scanSweepRing);

  // 12 Orbiting Mythic Plasma Crystal Shards around Relic
  const shardCount = 12;
  const shardInstanced = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.075, 0),
    cyanCoreMat,
    shardCount
  );
  shardInstanced.frustumCulled = false;
  profileGroup.add(shardInstanced);

  const eqCount = 36;
  const eqInstanced = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.08, 0.28, 0.08),
    eqMat,
    eqCount
  );
  for (let i = 0; i < eqCount; i++) {
    eqInstanced.setColorAt(i, i % 3 === 0 ? colOrange : colCyan);
  }
  if (eqInstanced.instanceColor) eqInstanced.instanceColor.needsUpdate = true;
  eqInstanced.frustumCulled = false;
  profileGroup.add(eqInstanced);

  // Set active model visibility
  let activeModel: RelicModelType = initialModel;
  logoGroup.visible = activeModel === 'logo';
  profileGroup.visible = activeModel === 'profile';

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  let explodeTarget = 0;
  let explodeCurrent = 0;
  let playing = false;
  let camTransitionActive = false;
  let activePreset: CameraPreset = 'primary';
  let frameId = 0;
  let disposed = false;

  const cancelCamTransition = () => {
    camTransitionActive = false;
  };
  controls.addEventListener('start', cancelCamTransition);

  const getPresetCoords = (model: RelicModelType, preset: CameraPreset) => {
    const curAspect = (container.clientWidth || 800) / (container.clientHeight || 600);
    if (model === 'logo') {
      const zMain = getResponsiveLogoZ(curAspect);
      if (preset === 'detail') {
        return { pos: [-2.4, 2.0, 4.4] as const, look: [-2.1, 1.85, 0] as const };
      }
      if (preset === 'angle') {
        return { pos: [3.2, 2.35, 6.2] as const, look: [0.35, 1.66, 0] as const };
      }
      return {
        pos: [0.12, transparentBackground ? 2.02 : 2.35, zMain] as const,
        look: [0.05, 1.62, 0] as const,
      };
    }
    if (preset === 'detail') {
      return { pos: [4.6, 2.1, 3.6] as const, look: [0.3, 1.55, 0] as const };
    }
    if (preset === 'angle') {
      return { pos: [0.1, 5.4, 2.2] as const, look: [0, 1.4, 0] as const };
    }
    return { pos: [0.4, 2.2, 6.1] as const, look: [0, 1.45, 0] as const };
  };

  const clock = new THREE.Clock();

  function afterDraw(cb: () => void) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  const updateScene = (dt: number, elapsed: number) => {
    explodeCurrent = THREE.MathUtils.damp(explodeCurrent, explodeTarget, 6.5, dt);

    if (activeModel === 'logo') {
      // Exploded-view layer separation for Channel Logo Monument
      leftCoreGroup.position.x = -2.55 - explodeCurrent * 0.65;
      sightGroup.position.z = 0.22 + explodeCurrent * 0.52;
      frontLayerGroup.position.z = explodeCurrent * 0.56;
      cyanEdgeLayerGroup.position.z = explodeCurrent * 0.22;
      orangeEdgeLayerGroup.position.z = explodeCurrent * 0.14;
      navyBackingLayerGroup.position.z = -explodeCurrent * 0.38;
      rightReticleGroup.position.x = 2.58 + explodeCurrent * 0.55;
      rightReticleGroup.position.z = -0.22 - explodeCurrent * 0.45;

      // Subtle cybernetic motion
      const spin = playing ? 0.55 : 0.16;
      coreRingOuter.rotation.z = elapsed * spin;
      sightGroup.rotation.z = Math.sin(elapsed * 0.45) * 0.12;
      rightReticleGroup.rotation.z = -elapsed * spin * 0.65;

      cyanCoreMat.emissiveIntensity = playing
        ? 0.56 + Math.sin(elapsed * 5.2) * 0.22
        : 0.42;

      // Update 42 dual-peak equalizer skyline bars above "R4agRek0il"
      for (let i = 0; i < logoEqCount; i++) {
        const t = i / (logoEqCount - 1);
        const peak1 = Math.exp(-Math.pow((t - 0.18) * 6.5, 2));
        const peak2 = Math.exp(-Math.pow((t - 0.66) * 5.8, 2));
        const peak3 = Math.exp(-Math.pow((t - 0.88) * 9.0, 2)) * 0.75;
        const baseEnvelope = 0.22 + peak1 * 1.35 + peak2 * 1.45 + peak3;

        const dynamicMod = playing
          ? 0.72 + Math.abs(Math.sin(elapsed * 6.2 + i * 0.42)) * 0.68
          : 0.88 + Math.sin(elapsed * 1.8 + i * 0.3) * 0.14;

        const scaleY = baseEnvelope * dynamicMod;
        const xPos = -1.18 + t * 4.82;
        const yPos = 2.48 + scaleY * 0.2 + explodeCurrent * 0.35;

        _dummy.position.set(xPos, yPos, 0.04);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(1, scaleY, 1);
        _dummy.updateMatrix();
        logoEqInstanced.setMatrixAt(i, _dummy.matrix);
      }
      logoEqInstanced.instanceMatrix.needsUpdate = true;
    } else {
      // CODM Mythic Profile Emblem Relic animation & multi-layer explode
      leftCupGroup.position.x = -1.22 - explodeCurrent * 0.72;
      rightCupGroup.position.x = 1.22 + explodeCurrent * 0.72;
      leftBuilt.shroudGroup.position.x = -explodeCurrent * 0.38;
      rightBuilt.shroudGroup.position.x = explodeCurrent * 0.38;
      headbandGroup.position.y = headCenterY + 0.56 + explodeCurrent * 0.52;
      coilGroup.position.x = 1.26 + explodeCurrent * 0.92;
      num4Mesh.position.z = explodeCurrent * 0.48;
      outerReticle.scale.setScalar(1 + explodeCurrent * 0.18);

      // Explode radial floating armor spine plates along the headband
      for (let i = 0; i < spinePlates.length; i++) {
        const plate = spinePlates[i];
        const ang = plate.userData.baseAngle as number;
        const r = (plate.userData.baseRadius as number) + explodeCurrent * 0.36;
        plate.position.set(Math.cos(ang) * r, Math.sin(ang) * r, 0);
      }

      const rotSpeed = playing ? 0.72 : 0.22;
      outerReticle.rotation.y = elapsed * rotSpeed;
      outerReticle.rotation.x = Math.sin(elapsed * 0.4) * 0.22;
      innerReticle.rotation.y = -elapsed * rotSpeed * 1.45;
      innerReticle.rotation.z = Math.cos(elapsed * 0.5) * 0.25;
      num4Mesh.rotation.y = Math.sin(elapsed * 0.7) * 0.18;

      // Spin earcup plasma reactors in opposite directions
      leftBuilt.reactorGroup.rotation.z = elapsed * (playing ? 3.2 : 0.9);
      rightBuilt.reactorGroup.rotation.z = -elapsed * (playing ? 3.2 : 0.9);

      // Subtle floating hover on mythic wing shrouds
      const wingBreath = Math.sin(elapsed * (playing ? 4.2 : 1.6)) * 0.035;
      leftBuilt.shroudGroup.position.y = wingBreath;
      rightBuilt.shroudGroup.position.y = -wingBreath;

      cyanCoreMat.emissiveIntensity = playing
        ? 0.65 + Math.sin(elapsed * 5.2) * 0.28
        : 0.48;

      energyNodeMat.emissiveIntensity = playing
        ? 1.15 + Math.sin(elapsed * 6.4) * 0.45
        : 0.85 + Math.sin(elapsed * 2.2) * 0.22;

      // Pulse active CoD:M Mythic hardware energy-glow nodes
      for (let i = 0; i < energyNodes.length; i++) {
        const node = energyNodes[i];
        const pulse = 1 + Math.sin(elapsed * (playing ? 5.6 : 2.6) + i * 0.9) * 0.22;
        node.scale.setScalar(pulse);
        node.rotation.y = elapsed * (playing ? 2.4 : 0.9) + i;
      }

      // Subtle rotating holographic scan-line cylinder + vertical scan sweep ring
      scanShroudMesh.rotation.y = elapsed * (playing ? 0.48 : 0.18);
      scanlineMap.offset.y = (elapsed * (playing ? 0.22 : 0.08)) % 1;
      scanSweepRing.position.y =
        headCenterY + 0.12 + Math.sin(elapsed * (playing ? 1.85 : 1.05)) * 1.15;
      scanSweepMat.opacity = 0.35 + Math.abs(Math.sin(elapsed * 2.2)) * 0.35;

      // Orbiting 12 Mythic Plasma Shards
      const shardOrbitR = 2.02 + explodeCurrent * 0.32;
      for (let i = 0; i < shardCount; i++) {
        const a = (i / shardCount) * Math.PI * 2 + elapsed * (playing ? 0.85 : 0.28);
        const bob = Math.sin(elapsed * 2.4 + i * 1.1) * 0.22;
        _dummy.position.set(
          Math.cos(a) * shardOrbitR,
          headCenterY + bob,
          Math.sin(a) * shardOrbitR
        );
        _dummy.rotation.set(elapsed + i, elapsed * 1.3, 0);
        const sScale = 0.85 + Math.sin(elapsed * 3.5 + i) * 0.25;
        _dummy.scale.setScalar(sScale);
        _dummy.updateMatrix();
        shardInstanced.setMatrixAt(i, _dummy.matrix);
      }
      shardInstanced.instanceMatrix.needsUpdate = true;

      const eqRadius = 1.68;
      for (let i = 0; i < eqCount; i++) {
        const angle = (i / eqCount) * Math.PI * 2 + elapsed * (playing ? 0.28 : 0.07);
        const pulse = playing
          ? 0.55 + Math.abs(Math.sin(elapsed * 5.4 + i * 0.45)) * 1.65
          : 0.35 + Math.abs(Math.sin(elapsed * 1.4 + i * 0.45)) * 0.35;

        _dummy.position.set(
          Math.cos(angle) * eqRadius,
          0.16 + pulse * 0.14,
          Math.sin(angle) * eqRadius
        );
        _dummy.rotation.set(0, -angle, 0);
        _dummy.scale.set(1, pulse, 1);
        _dummy.updateMatrix();
        eqInstanced.setMatrixAt(i, _dummy.matrix);
      }
      eqInstanced.instanceMatrix.needsUpdate = true;
    }

    if (camTransitionActive) {
      const target = getPresetCoords(activeModel, activePreset);
      _targetCam.set(target.pos[0], target.pos[1], target.pos[2]);
      _targetLook.set(target.look[0], target.look[1], target.look[2]);

      const alpha = 1 - Math.exp(-5.5 * dt);
      camera.position.lerp(_targetCam, alpha);
      controls.target.lerp(_targetLook, alpha);

      if (camera.position.distanceTo(_targetCam) < 0.025) {
        camera.position.copy(_targetCam);
        controls.target.copy(_targetLook);
        camTransitionActive = false;
      }
    }

    controls.update();
  };

  let isInView = true;

  const tick = () => {
    if (disposed || !isInView) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.getElapsedTime();
    updateScene(dt, elapsed);
    renderer.render(scene, camera);

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = window.requestAnimationFrame(tick);
    }
  };

  tick();

  let observer: IntersectionObserver | null = null;
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const nextInView = entry.isIntersecting;
        if (nextInView && !isInView) {
          isInView = true;
          clock.getDelta();
          tick();
        } else if (!nextInView) {
          isInView = false;
          window.cancelAnimationFrame(frameId);
          window.clearTimeout(frameId);
        }
      },
      { threshold: 0.02 }
    );
    observer.observe(container);
  }

  const handleResize = () => {
    if (disposed) return;
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;
    const nextAspect = w / h;
    camera.aspect = nextAspect;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (activeModel === 'logo' && activePreset === 'primary' && !camTransitionActive) {
      camera.position.z = getResponsiveLogoZ(nextAspect);
    }
  };
  window.addEventListener('resize', handleResize);

  return {
    setModelType: (model: RelicModelType) => {
      activeModel = model;
      logoGroup.visible = model === 'logo';
      profileGroup.visible = model === 'profile';
      contactShadow.scale.set(model === 'logo' ? 1 : 0.48, 1, 1);
      activePreset = 'primary';
      camTransitionActive = true;
    },
    setExplodeFactor: (value: number) => {
      explodeTarget = THREE.MathUtils.clamp(value, 0, 1);
    },
    setFinish: (finish: RelicFinish) => {
      if (finish === 'orange') {
        chassisOrangeMat.color.setHex(0xff7b00);
        chassisOrangeMat.roughness = 0.2;
        titaniumRailMat.color.setHex(0xdbeafe);
        cobaltTechMat.color.setHex(0x102a66);
        cyanCoreMat.color.setHex(0x00f0ff);
        satinWhiteMat.color.setHex(0xf1f5f9);
        wordmarkOrangeRimMat.color.setHex(0xff7b00);
        wordmarkCyanRimMat.color.setHex(0x00d8ff);
      } else if (finish === 'cyan') {
        chassisOrangeMat.color.setHex(0x00d8ff);
        chassisOrangeMat.roughness = 0.16;
        titaniumRailMat.color.setHex(0xe0fcff);
        cobaltTechMat.color.setHex(0x0b3954);
        cyanCoreMat.color.setHex(0xff7b00);
        satinWhiteMat.color.setHex(0xe0fcff);
        wordmarkOrangeRimMat.color.setHex(0x00d8ff);
        wordmarkCyanRimMat.color.setHex(0xff7b00);
      } else {
        chassisOrangeMat.color.setHex(0xcbd5e1);
        chassisOrangeMat.roughness = 0.24;
        titaniumRailMat.color.setHex(0xf8fafc);
        cobaltTechMat.color.setHex(0x1e3a8a);
        cyanCoreMat.color.setHex(0x00f0ff);
        satinWhiteMat.color.setHex(0xf8fafc);
        wordmarkOrangeRimMat.color.setHex(0x94a3b8);
        wordmarkCyanRimMat.color.setHex(0x00d8ff);
      }
    },
    setCameraPreset: (preset: CameraPreset) => {
      activePreset = preset;
      camTransitionActive = true;
    },
    setPlaying: (nextPlaying: boolean) => {
      playing = nextPlaying;
    },
    dispose: () => {
      disposed = true;
      observer?.disconnect();
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', cancelCamTransition);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      controls.dispose();
      envRenderTarget.dispose();

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });

      brushedMap.dispose();
      shadowMap.dispose();
      floorMap.dispose();
      subtitleMap.dispose();
      scanlineMap.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
