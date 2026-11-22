import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export type RelicFinish = 'orange' | 'cyan' | 'titanium';
export type CameraPreset = 'front' | 'coil' | 'overhead';

export interface SonicSceneOptions {
  container: HTMLElement;
  onContextLost?: () => void;
  onContextRestored?: () => void;
}

export interface SonicSceneController {
  setExplodeFactor: (value: number) => void;
  setFinish: (finish: RelicFinish) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  setPlaying: (playing: boolean) => void;
  dispose: () => void;
}

// Pre-allocated scratch helpers (zero per-frame GC allocation)
const _dummy = new THREE.Object3D();
const _targetCam = new THREE.Vector3();
const _targetLook = new THREE.Vector3(0, 1.45, 0);

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
  // Roughness/bump data map stays linear (NoColorSpace)
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.32)');
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
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.16)';
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
  tex.repeat.set(16, 16);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createNumber4Geometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  // Clean angular "4" silhouette inspired by the channel emblem
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

export function mountSonicRelicScene({
  container,
  onContextLost,
  onContextRestored,
}: SonicSceneOptions): SonicSceneController {
  const isSoftwareGl = detectSoftwareGl();

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(container.clientWidth || 800, container.clientHeight || 600);

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
  scene.background = new THREE.Color(0x03050a);
  scene.fog = new THREE.FogExp2(0x03050a, 0.048);

  // Studio environment reflection via RoomEnvironment + PMREMGenerator
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envRenderTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRenderTarget.texture;
  pmremGenerator.dispose();

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 600;
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(0.4, 2.2, 6.1);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.45, 0);
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.06;
  controls.minDistance = 3.2;
  controls.maxDistance = 10.5;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.enablePan = false;

  // 3-Point Studio Lighting Rig
  const keyLight = new THREE.DirectionalLight(0xffe8cc, 2.4);
  keyLight.position.set(4.5, 6.5, 5.2);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 22;
  keyLight.shadow.camera.left = -4.5;
  keyLight.shadow.camera.right = 4.5;
  keyLight.shadow.camera.top = 4.5;
  keyLight.shadow.camera.bottom = -4.5;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const hemiFill = new THREE.HemisphereLight(0x00d8ff, 0x050818, 0.78);
  scene.add(hemiFill);

  const rimLight = new THREE.DirectionalLight(0xff7b00, 1.55);
  rimLight.position.set(-5.0, 3.2, -4.5);
  scene.add(rimLight);

  // Procedural Textures
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const brushedMap = createBrushedMetalTexture();
  const shadowMap = createContactShadowTexture();
  const floorMap = createFloorGridTexture(maxAniso);

  // Ground Plane + Contact Shadow (flush grounding, zero Z-fighting)
  const floorGeo = new THREE.PlaneGeometry(36, 36);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorMap,
    roughness: 0.72,
    metalness: 0.18,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const contactGeo = new THREE.PlaneGeometry(4.2, 4.2);
  const contactMat = new THREE.MeshBasicMaterial({
    map: shadowMap,
    transparent: true,
    depthWrite: false,
    opacity: 0.65,
  });
  const contactShadow = new THREE.Mesh(contactGeo, contactMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.006;
  scene.add(contactShadow);

  // Materials with deliberate roughness/metalness contrast
  const pedestalMat = new THREE.MeshStandardMaterial({
    color: 0x0b1024,
    roughness: 0.36,
    metalness: 0.85,
    bumpMap: brushedMap,
    bumpScale: 0.008,
  });

  const chassisMetalMat = new THREE.MeshPhysicalMaterial({
    color: 0xff7b00,
    metalness: 0.92,
    roughness: 0.18,
    roughnessMap: brushedMap,
    anisotropy: 0.85,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
  });

  const cushionMat = new THREE.MeshStandardMaterial({
    color: 0x0c1122,
    roughness: 0.88,
    metalness: 0.04,
  });

  const cyanCoreMat = new THREE.MeshPhysicalMaterial({
    color: 0x00f0ff,
    emissive: 0x00a8cc,
    emissiveIntensity: 0.75,
    roughness: 0.12,
    metalness: 0.28,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  });

  const reticleRingMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x0099bb,
    emissiveIntensity: 0.45,
    roughness: 0.25,
    metalness: 0.85,
  });

  const eqMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.22,
    metalness: 0.72,
    emissive: 0x004455,
    emissiveIntensity: 0.35,
  });

  // Composite Hero Assembly (pivoted bottom-center at y = 0)
  const relicGroup = new THREE.Group();
  scene.add(relicGroup);

  // 1. Grounded LatheGeometry Pedestal (y = 0 .. 0.42)
  const pedestalPoints = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(1.48, 0),
    new THREE.Vector2(1.42, 0.12),
    new THREE.Vector2(1.22, 0.22),
    new THREE.Vector2(1.16, 0.38),
    new THREE.Vector2(0, 0.38),
  ];
  const pedestalGeo = new THREE.LatheGeometry(pedestalPoints, 48);
  const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  relicGroup.add(pedestal);

  // Pedestal glowing trim ring
  const trimGeo = new THREE.TorusGeometry(1.18, 0.022, 12, 64);
  const trimMesh = new THREE.Mesh(trimGeo, reticleRingMat);
  trimMesh.rotation.x = Math.PI / 2;
  trimMesh.position.y = 0.39;
  relicGroup.add(trimMesh);

  // Upper floating/mounted Sonic Assembly centered around y = 1.68
  const headCenterY = 1.68;

  // 2. Sculpted Beveled "4" Core Emblem
  const num4Geo = createNumber4Geometry();
  const num4Mesh = new THREE.Mesh(num4Geo, cyanCoreMat);
  num4Mesh.position.set(0, headCenterY - 0.04, 0);
  num4Mesh.castShadow = true;
  relicGroup.add(num4Mesh);

  // 3. Beveled Headband Arch
  const headbandGeo = createHeadbandGeometry();
  const headbandMesh = new THREE.Mesh(headbandGeo, chassisMetalMat);
  headbandMesh.position.set(0, headCenterY + 0.56, 0);
  headbandMesh.castShadow = true;
  relicGroup.add(headbandMesh);

  // 4 & 5. Earcup Housings (LatheGeometry) + Matte Cushions
  const cupOuterPoints = [
    new THREE.Vector2(0.01, -0.2),
    new THREE.Vector2(0.28, -0.2),
    new THREE.Vector2(0.46, -0.06),
    new THREE.Vector2(0.48, 0.12),
    new THREE.Vector2(0.32, 0.18),
    new THREE.Vector2(0.01, 0.18),
  ];
  const cupGeo = new THREE.LatheGeometry(cupOuterPoints, 36);
  const padGeo = new THREE.TorusGeometry(0.34, 0.11, 16, 36);

  const leftCupGroup = new THREE.Group();
  const leftCup = new THREE.Mesh(cupGeo, chassisMetalMat);
  leftCup.rotation.z = -Math.PI / 2;
  leftCup.castShadow = true;
  const leftPad = new THREE.Mesh(padGeo, cushionMat);
  leftPad.rotation.y = Math.PI / 2;
  leftPad.position.x = 0.16;
  leftCupGroup.add(leftCup, leftPad);
  leftCupGroup.position.set(-1.18, headCenterY - 0.08, 0);
  relicGroup.add(leftCupGroup);

  const rightCupGroup = new THREE.Group();
  const rightCup = new THREE.Mesh(cupGeo, chassisMetalMat);
  rightCup.rotation.z = Math.PI / 2;
  rightCup.castShadow = true;
  const rightPad = new THREE.Mesh(padGeo, cushionMat);
  rightPad.rotation.y = Math.PI / 2;
  rightPad.position.x = -0.16;
  rightCupGroup.add(rightCup, rightPad);
  rightCupGroup.position.set(1.18, headCenterY - 0.08, 0);
  relicGroup.add(rightCupGroup);

  // 6. Signature Helical Coiled Audio Cable (TubeGeometry)
  const coilPts: THREE.Vector3[] = [];
  const coilTurns = 3.5;
  const coilSamples = 64;
  for (let i = 0; i <= coilSamples; i++) {
    const t = i / coilSamples;
    const angle = t * Math.PI * 2 * coilTurns;
    const x = 0.15 + t * 0.72;
    const y = Math.sin(angle) * 0.13;
    const z = Math.cos(angle) * 0.13;
    coilPts.push(new THREE.Vector3(x, y, z));
  }
  const coilCurve = new THREE.CatmullRomCurve3(coilPts);
  const coilGeo = new THREE.TubeGeometry(coilCurve, 72, 0.042, 12, false);
  const coilMesh = new THREE.Mesh(coilGeo, chassisMetalMat);
  coilMesh.position.set(1.22, headCenterY - 0.18, 0);
  coilMesh.castShadow = true;
  relicGroup.add(coilMesh);

  // 7. Concentric Gimbaled Cybernetic Reticle Rings
  const outerReticleGeo = new THREE.TorusGeometry(1.75, 0.018, 12, 72);
  const outerReticle = new THREE.Mesh(outerReticleGeo, reticleRingMat);
  outerReticle.position.set(0, headCenterY, 0);
  relicGroup.add(outerReticle);

  const innerReticleGeo = new THREE.TorusGeometry(0.92, 0.014, 10, 56);
  const innerReticle = new THREE.Mesh(innerReticleGeo, chassisMetalMat);
  innerReticle.position.set(0, headCenterY, 0);
  relicGroup.add(innerReticle);

  // 8. InstancedMesh 36-Bar Orbital Equalizer Ring around pedestal
  const eqCount = 36;
  const eqBarGeo = new THREE.BoxGeometry(0.08, 0.28, 0.08);
  const eqInstanced = new THREE.InstancedMesh(eqBarGeo, eqMat, eqCount);
  const cyanColor = new THREE.Color(0x00f0ff);
  const orangeColor = new THREE.Color(0xff7b00);
  for (let i = 0; i < eqCount; i++) {
    eqInstanced.setColorAt(i, i % 3 === 0 ? orangeColor : cyanColor);
  }
  if (eqInstanced.instanceColor) eqInstanced.instanceColor.needsUpdate = true;
  eqInstanced.frustumCulled = false;
  relicGroup.add(eqInstanced);

  // Pre-warm shaders once on GPU
  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  // Mutable animation & control targets
  let explodeTarget = 0;
  let explodeCurrent = 0;
  let playing = false;
  let camTransitionActive = false;
  let activePreset: CameraPreset = 'front';
  let frameId = 0;
  let disposed = false;

  const cancelCamTransition = () => {
    camTransitionActive = false;
  };
  controls.addEventListener('start', cancelCamTransition);

  const getPresetCoords = (preset: CameraPreset) => {
    if (preset === 'coil') return { pos: [4.6, 2.1, 3.6] as const, look: [0.3, 1.55, 0] as const };
    if (preset === 'overhead') return { pos: [0.1, 5.4, 2.2] as const, look: [0, 1.4, 0] as const };
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
    // Exponential damping for exploded-view separation
    explodeCurrent = THREE.MathUtils.damp(explodeCurrent, explodeTarget, 6.5, dt);

    leftCupGroup.position.x = -1.18 - explodeCurrent * 0.72;
    rightCupGroup.position.x = 1.18 + explodeCurrent * 0.72;
    headbandMesh.position.y = headCenterY + 0.56 + explodeCurrent * 0.52;
    coilMesh.position.x = 1.22 + explodeCurrent * 0.88;
    num4Mesh.position.z = explodeCurrent * 0.45;
    outerReticle.scale.setScalar(1 + explodeCurrent * 0.16);

    // Smooth rotational & pulse choreography
    const rotSpeed = playing ? 0.55 : 0.18;
    outerReticle.rotation.y = elapsed * rotSpeed;
    outerReticle.rotation.x = Math.sin(elapsed * 0.4) * 0.22;
    innerReticle.rotation.y = -elapsed * rotSpeed * 1.4;
    innerReticle.rotation.z = Math.cos(elapsed * 0.5) * 0.25;
    num4Mesh.rotation.y = Math.sin(elapsed * 0.7) * 0.18;
    cyanCoreMat.emissiveIntensity = playing
      ? 0.8 + Math.sin(elapsed * 5.2) * 0.35
      : 0.65;

    // Update 36 orbital equalizer bars without allocating
    const eqRadius = 1.62;
    for (let i = 0; i < eqCount; i++) {
      const angle = (i / eqCount) * Math.PI * 2 + elapsed * (playing ? 0.25 : 0.06);
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

    // Smooth camera preset damping
    if (camTransitionActive) {
      const target = getPresetCoords(activePreset);
      _targetCam.set(target.pos[0], target.pos[1], target.pos[2]);
      _targetLook.set(target.look[0], target.look[1], target.look[2]);

      const alpha = 1 - Math.exp(-5.2 * dt);
      camera.position.lerp(_targetCam, alpha);
      controls.target.lerp(_targetLook, alpha);

      if (camera.position.distanceTo(_targetCam) < 0.02) {
        camera.position.copy(_targetCam);
        controls.target.copy(_targetLook);
        camTransitionActive = false;
      }
    }

    controls.update();
  };

  const tick = () => {
    if (disposed) return;
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

  const handleResize = () => {
    if (disposed) return;
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', handleResize);

  return {
    setExplodeFactor: (value: number) => {
      explodeTarget = THREE.MathUtils.clamp(value, 0, 1);
    },
    setFinish: (finish: RelicFinish) => {
      if (finish === 'orange') {
        chassisMetalMat.color.setHex(0xff7b00);
        chassisMetalMat.roughness = 0.18;
        cyanCoreMat.color.setHex(0x00f0ff);
      } else if (finish === 'cyan') {
        chassisMetalMat.color.setHex(0x00d8ff);
        chassisMetalMat.roughness = 0.14;
        cyanCoreMat.color.setHex(0xff7b00);
      } else {
        chassisMetalMat.color.setHex(0xcbd5e1);
        chassisMetalMat.roughness = 0.24;
        cyanCoreMat.color.setHex(0x00f0ff);
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
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
