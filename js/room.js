import * as THREE from "three";

const container = document.getElementById("hero-canvas");
const hero = document.getElementById("home");
// Modo ambiente (index): la habitación de fondo, viva pero sin interacción.
const AMBIENT = document.body.dataset.roomMode === "ambient";
const ui = {
  reticle: document.getElementById("room-reticle"),
  tip: document.getElementById("room-tip"),
  hint: document.getElementById("room-hint"),
  exit: document.getElementById("room-exit"),
  panel: document.getElementById("room-panel"),
  screen: document.getElementById("room-screen"),
};

if (!container) {
  throw new Error("room: sin hero-canvas");
}

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// En pantallas angostas el foco se toma más lejos: si no, el póster llena
// todo y el panel tapa lo poco que queda.
const NARROW = window.matchMedia("(max-width: 768px)").matches;
const currentLang = () =>
  localStorage.getItem("selectedLanguage") === "es" ? "es" : "en";

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
  // Sin WebGL: el diagnóstico clásico de portfolio.html toma el relevo
  // (muestra #room-fallback con la causa).
  document.body.classList.add("room-dead");
  throw e;
}

/* ── Estado ──────────────────────────────────────────────────────────── */
const SPAWN = { x: 0, z: 2.2 };
const CAM_H = 1.6;
const BASE_FOV = 56;
const FREE_DOLLY_MAX = 1.5;

const view = {
  yaw: 0,
  pitch: -0.04,
  dolly: 0,
  fov: BASE_FOV,
  tYaw: 0,
  tPitch: -0.04,
  tDolly: 0,
  tFov: BASE_FOV,
  px: SPAWN.x,
  pz: SPAWN.z,
  tPx: SPAWN.x,
  tPz: SPAWN.z,
  h: CAM_H,
  tH: CAM_H,
};
let lookMode = false;
let focused = null; // id del objeto enfocado
let snapshot = null; // vista previa al foco para volver
let tween = null; // {from, to, t, dur, done}
let visible = true;

const PITCH_MIN = -0.62,
  PITCH_MAX = 0.52;

/* ── Movimiento: WASD + joystick, con colisiones simples ─────────────── */
const COLLIDERS = [
  { box: true, x0: -1.2, x1: 1.2, z0: -2.5, z1: -1.3 }, // escritorio
  { x: 2.9, z: -2.4, r: 0.34 }, // planta
  { x: -2.55, z: -2.15, r: 0.34 }, // lámpara
  { x: -2.5, z: -1.15, r: 0.62 }, // sillón
  { x: -1.55, z: -0.9, r: 0.38 }, // mesa lateral
  { box: true, x0: 2.6, x1: 3.62, z0: -1.55, z1: 0.95 }, // sofá
  { box: true, x0: -3.68, x1: -3.18, z0: 0.85, z1: 2.2 }, // mueble música
  { x: 3.1, z: 3.15, r: 0.3 }, // perchero
  { x: -3.25, z: 3.3, r: 0.45 }, // gomero
];
function resolveCollision(p, r) {
  p.x = THREE.MathUtils.clamp(p.x, -3.35 + r, 3.35 - r);
  p.z = THREE.MathUtils.clamp(p.z, -2.6 + r, 3.45 - r);
  for (const c of COLLIDERS) {
    if (c.box) {
      const nx = THREE.MathUtils.clamp(p.x, c.x0, c.x1);
      const nz = THREE.MathUtils.clamp(p.z, c.z0, c.z1);
      const dx = p.x - nx,
        dz = p.z - nz;
      const d = Math.hypot(dx, dz);
      if (d < r) {
        if (d < 1e-4) {
          // Dentro del mueble: expulsar por el eje más cercano
          const pl = p.x - c.x0,
            pr = c.x1 - p.x,
            pn = p.z - c.z0,
            pf = c.z1 - p.z;
          const m = Math.min(pl, pr, pn, pf);
          if (m === pl) p.x = c.x0 - r;
          else if (m === pr) p.x = c.x1 + r;
          else if (m === pn) p.z = c.z0 - r;
          else p.z = c.z1 + r;
        } else {
          p.x = nx + (dx / d) * r;
          p.z = nz + (dz / d) * r;
        }
      }
    } else {
      const dx = p.x - c.x,
        dz = p.z - c.z;
      const d = Math.hypot(dx, dz),
        min = c.r + r;
      if (d < min) {
        if (d < 1e-4) p.x = c.x + min;
        else {
          p.x = c.x + (dx / d) * min;
          p.z = c.z + (dz / d) * min;
        }
      }
    }
  }
}
const keysDown = new Set();
const stick = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
/* Mirar-libre: el mouse mueve la vista sin arrastrar (ideal trackpad).
   Modelo de posición (no velocidad): la vista tiende al punto mirado, así
   al llevar el cursor al menú la cámara se queda quieta en vez de girar. */
let freeLook = false;
let anchorYaw = 0,
  anchorPitch = -0.04;
try {
  // Por defecto ENCENDIDO en puntero fino (mouse/trackpad): es LA forma de
  // mirar. Solo se respeta un apagado explícito previo.
  const stored = localStorage.getItem("room-freelook");
  freeLook =
    stored === null
      ? window.matchMedia("(pointer: fine)").matches
      : stored === "1";
} catch (e) {
  /* sin storage no hay memoria */
}
function toggleFreeLook() {
  freeLook = !freeLook;
  if (!freeLook) needRelock = false;
  try {
    localStorage.setItem("room-freelook", freeLook ? "1" : "0");
  } catch (e) {
    /* noop */
  }
  anchorYaw = view.tYaw;
  anchorPitch = view.tPitch;
  document
    .getElementById("freelook-toggle")
    ?.classList.toggle("is-on", freeLook);
  if (freeLook) lockPointer();
  else unlockPointer();
}
document.getElementById("freelook-toggle")?.classList.toggle("is-on", freeLook);

// Pointer Lock: el cursor queda centrado y oculto, el mouse rota la vista
// (derecha = derecha, como un FPS) y el click sigue interactuando.
let lockClick = false;
let needRelock = false;
let expectUnlock = false;
function lockPointer() {
  if (document.pointerLockElement === canvas) return;
  try {
    const r = canvas.requestPointerLock();
    if (r && r.catch) r.catch(() => {});
  } catch (e) {
    /* si el navegador lo niega, queda el modo hover de respaldo */
  }
}
function unlockPointer() {
  if (document.pointerLockElement === canvas) {
    try {
      document.exitPointerLock();
    } catch (e) {
      /* noop */
    }
  }
}
document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement === canvas;
  if (locked) {
    needRelock = false;
    if (lookMode && !focused) {
      flashTip(
        currentLang() === "es"
          ? "mira con el mouse · click para usar · ESC para soltar"
          : "look with the mouse · click to use · ESC to release",
      );
    }
  } else if (freeLook && lookMode) {
    if (expectUnlock) {
      // Soltado a propósito (abrir panel): no pedir re-click
      expectUnlock = false;
    } else {
      // El navegador suelta el lock al tabular o con ESC: no se puede
      // re-encerrar solo (exige gesto), así que se congela el hover para que
      // la vista no gire loca y se pide el click de vuelta.
      needRelock = true;
      flashTip(
        currentLang() === "es"
          ? "click en la escena para volver a mirar libre"
          : "click the scene to look around again",
      );
    }
  }
});

/* ── Renderer / escena ──────────────────────────────────────────────── */
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(
  container.clientWidth || window.innerWidth,
  container.clientHeight || window.innerHeight,
);
renderer.shadowMap.enabled = true;
// VSM: sombras difusas en vez de recortes nítidos (la luz del ventanal debe
// insinuarse, no dibujar barrotes). El blur lo da radius + blurSamples.
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.domElement.style.display = "block";
container.appendChild(renderer.domElement);
const canvas = renderer.domElement;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141210);
scene.fog = new THREE.Fog(0x141210, 9, 18);

const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.05, 60);
camera.rotation.order = "YXZ";
// Oído del visitante: el AudioContext nace suspendido y se reanuda con el
// primer click (política de autoplay satisfecha por el gesto).
const audioListener = new THREE.AudioListener();
camera.add(audioListener);
let radioPanner = null;
let bobPhase = 0;
let bobAmp = 0;
function applyView() {
  camera.rotation.y = view.yaw;
  camera.rotation.x = view.pitch;
  const cp = Math.cos(view.pitch);
  const dir = new THREE.Vector3(
    -Math.sin(view.yaw) * cp,
    Math.sin(view.pitch),
    -Math.cos(view.yaw) * cp,
  );
  camera.position
    .set(view.px, view.h, view.pz)
    .addScaledVector(dir, view.dolly);
  camera.position.y += Math.sin(bobPhase) * bobAmp;
  if (Math.abs(camera.fov - view.fov) > 0.01) {
    camera.fov = view.fov;
    camera.updateProjectionMatrix();
  }
}
function resize() {
  const w = container.clientWidth || window.innerWidth;
  const h = container.clientHeight || window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

/* ── Luces ───────────────────────────────────────────────────────────── */
scene.add(new THREE.HemisphereLight(0xfff2e0, 0x3a2f26, 0.75));

const daylight = new THREE.DirectionalLight(0xd4e4ff, 1.35);
daylight.position.set(-1.5, 6.5, -4.2);
daylight.target.position.set(0.2, 0, 1.2);
daylight.castShadow = true;
daylight.shadow.mapSize.set(1024, 1024);
daylight.shadow.camera.left = -4;
daylight.shadow.camera.right = 4;
daylight.shadow.camera.top = 4;
daylight.shadow.camera.bottom = -4;
daylight.shadow.bias = -0.0001;
daylight.shadow.normalBias = 0.02;
daylight.shadow.radius = 6;
daylight.shadow.blurSamples = 12;
scene.add(daylight, daylight.target);

const lampLight = new THREE.PointLight(0xffb46b, 8, 7, 2);
lampLight.position.set(-2.55, 1.62, -2.15);
// La lámpara SÍ arroja sombras: así la planta sombrea hacia la derecha,
// lejos de la lámpara, como pide el ojo (y el escritorio asienta en cálido).
lampLight.castShadow = true;
lampLight.shadow.mapSize.set(512, 512);
lampLight.shadow.camera.near = 0.08;
lampLight.shadow.camera.far = 7;
lampLight.shadow.bias = -0.005;
lampLight.shadow.radius = 4;
lampLight.shadow.blurSamples = 8;
scene.add(lampLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.12));

/* ── Materiales base ─────────────────────────────────────────────────── */
const M = {
  wall: new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.95 }),
  wallBack: new THREE.MeshStandardMaterial({
    color: 0xded3bf,
    roughness: 0.95,
  }),
  floor: new THREE.MeshStandardMaterial({ color: 0x8a6844, roughness: 0.8 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x6f5133, roughness: 0.7 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x4a3823, roughness: 0.7 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0x7d8aa0, roughness: 1 }),
  paper: new THREE.MeshStandardMaterial({ color: 0xf6f1e6, roughness: 0.9 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1c1a17, roughness: 0.6 }),
  plant: new THREE.MeshStandardMaterial({
    color: 0x4d7c4f,
    roughness: 0.9,
    flatShading: true,
  }),
  pot: new THREE.MeshStandardMaterial({ color: 0xb5654a, roughness: 0.9 }),
};
const roomAccent = { color: new THREE.Color(0xc96f2e) };

/* ── Construcción ────────────────────────────────────────────────────── */
const interactables = []; // meshes con userData.room = {id,...}
function markInteractive(mesh, data) {
  mesh.userData.room = data;
  interactables.push(mesh);
}

function box(w, h, d, mat, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

/* Sombra de contacto: elipse suave bajo cada mueble. Es lo que vende que
   los objetos "pesan" y tocan el suelo (la direccional sola los deja
   flotando porque su sombra cae desplazada). */
let blobTex = null;
function blobShadow(x, z, sx, sz, opacity = 0.32, y = 0.015) {
  if (!blobTex) {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const g2 = c.getContext("2d");
    const grad = g2.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, "rgba(0,0,0,0.85)");
    grad.addColorStop(0.6, "rgba(0,0,0,0.35)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g2.fillStyle = grad;
    g2.fillRect(0, 0, 128, 128);
    blobTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({
      map: blobTex,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.renderOrder = 1;
  scene.add(m);
  return m;
}

/* Punto suave reutilizable (polvo, nieve, vapor) */
let softDotTex = null;
function getSoftDot() {
  if (softDotTex) return softDotTex;
  const dc = document.createElement("canvas");
  dc.width = 32;
  dc.height = 32;
  const dg = dc.getContext("2d");
  const dgrad = dg.createRadialGradient(16, 16, 0, 16, 16, 15);
  dgrad.addColorStop(0, "rgba(255,255,255,1)");
  dgrad.addColorStop(0.5, "rgba(255,255,255,0.4)");
  dgrad.addColorStop(1, "rgba(255,255,255,0)");
  dg.fillStyle = dgrad;
  dg.fillRect(0, 0, 32, 32);
  softDotTex = new THREE.CanvasTexture(dc);
  return softDotTex;
}

/* Piso de tablones: vetas + nudos + tono por tabla */
function plankTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g2 = c.getContext("2d");
  const rows = 6;
  for (let r = 0; r < rows; r++) {
    const y = (r * 512) / rows;
    const tone = 138 + ((r * 47) % 26) - 13;
    g2.fillStyle = `rgb(${tone},${Math.round(tone * 0.78)},${Math.round(tone * 0.58)})`;
    g2.fillRect(0, y, 512, 512 / rows);
    // Vetas
    g2.strokeStyle = "rgba(60,40,22,0.25)";
    g2.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      const gy = y + 8 + ((r * 31 + i * 53) % 70);
      g2.beginPath();
      g2.moveTo(0, gy);
      g2.bezierCurveTo(150, gy + 4, 350, gy - 4, 512, gy + 2);
      g2.stroke();
    }
    // Nudo ocasional
    if (r % 2 === 0) {
      const kx = (r * 173 + 90) % 512;
      g2.fillStyle = "rgba(70,45,25,0.5)";
      g2.beginPath();
      g2.ellipse(kx, y + 42, 7, 5, 0.3, 0, 7);
      g2.fill();
    }
    // Junta entre tablas + junta vertical alternada
    g2.fillStyle = "rgba(40,26,14,0.85)";
    g2.fillRect(0, y + 512 / rows - 2, 512, 2);
    const jx = r % 2 ? 170 : 390;
    g2.fillRect(jx, y, 2, 512 / rows);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = 4;
  return tex;
}

/* Alfombra tejida: anillos + moteado para que no sea un plato rojo */
function rugTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g2 = c.getContext("2d");
  g2.fillStyle = "#a3543f";
  g2.fillRect(0, 0, 256, 256);
  for (let r = 122; r > 8; r -= 13) {
    g2.strokeStyle =
      r % 26 < 13 ? "rgba(0,0,0,0.20)" : "rgba(255,235,210,0.10)";
    g2.lineWidth = 5;
    g2.beginPath();
    g2.arc(128, 128, r, 0, 7);
    g2.stroke();
  }
  for (let i = 0; i < 1100; i++) {
    g2.fillStyle =
      Math.random() < 0.5 ? "rgba(0,0,0,0.09)" : "rgba(255,230,200,0.07)";
    g2.fillRect((i * 37) % 256, (i * 91) % 256, 2, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* Vida y cacharros nuevos: nieve, vapor, gato y sus estados */
let snowPts, snowSeed, steamPts, steamLife;
let cat, catTail, catBlob, catLegs, clockHands;
const catState = {
  x: 1.8,
  z: 1.6,
  yaw: 0,
  tx: 1.8,
  tz: 1.6,
  pause: 2,
  attn: 0,
  hop: 0,
};

function buildRoom() {
  // Suelo / techo / paredes
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(7.4, 7),
    new THREE.MeshStandardMaterial({ map: plankTexture(), roughness: 0.75 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0.4);
  floor.receiveShadow = true;
  scene.add(floor);

  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(7.4, 7),
    new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 1 }),
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 2.9, 0.4);
  scene.add(ceil);

  const wallGeo = new THREE.PlaneGeometry(7.4, 2.9);
  // Muro frontal con vano real para el ventanal x[-2.6,-0.8] y[0.35,2.5]
  const segDefs = [
    [1.1, 2.9, -3.15, 1.45],
    [4.5, 2.9, 1.45, 1.45],
    [1.8, 0.35, -1.7, 0.175],
    [1.8, 0.4, -1.7, 2.7],
  ];
  for (const [w, h, x, y] of segDefs) {
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.wall);
    seg.position.set(x, y, -3);
    seg.receiveShadow = true;
    scene.add(seg);
  }
  const back = new THREE.Mesh(wallGeo, M.wallBack);
  back.position.set(0, 1.45, 3.8);
  back.rotation.y = Math.PI;
  scene.add(back);
  const sideGeo = new THREE.PlaneGeometry(6.8, 2.9);
  const left = new THREE.Mesh(sideGeo, M.wall);
  left.position.set(-3.7, 1.45, 0.4);
  left.rotation.y = Math.PI / 2;
  scene.add(left);
  const right = new THREE.Mesh(sideGeo, M.wall);
  right.position.set(3.7, 1.45, 0.4);
  right.rotation.y = -Math.PI / 2;
  scene.add(right);

  // Alfombra
  const rug = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, 40),
    new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 }),
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.012, 0.7);
  rug.receiveShadow = true;
  scene.add(rug);

  // Zócalos: una línea oscura abajo ordena todos los muros
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xcabfa8,
    roughness: 0.9,
  });
  box(7.4, 0.09, 0.03, trimMat, 0, 0.045, -2.985).castShadow = false;
  box(7.4, 0.09, 0.03, trimMat, 0, 0.045, 3.785).castShadow = false;
  box(0.03, 0.09, 6.8, trimMat, -3.685, 0.045, 0.4).castShadow = false;
  box(0.03, 0.09, 6.8, trimMat, 3.685, 0.045, 0.4).castShadow = false;

  // Escritorio + patas + travesaño trasero
  box(2.0, 0.07, 0.85, M.wood, 0, 0.76, -1.9);
  for (const [lx, lz] of [
    [-0.9, -2.25],
    [0.9, -2.25],
    [-0.9, -1.55],
    [0.9, -1.55],
  ]) {
    box(0.07, 0.76, 0.07, M.woodDark, lx, 0.38, lz);
  }
  box(1.73, 0.06, 0.05, M.woodDark, 0, 0.45, -2.25);
  blobShadow(0, -1.9, 2.4, 1.25, 0.44);
  // Teclado + taza (venden el "estás sentado"; se ven al mirar abajo)
  box(0.62, 0.03, 0.2, M.black, -0.3, 0.815, -1.72);
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.045, 0.11, 20),
    new THREE.MeshStandardMaterial({ color: 0x2e6f8e, roughness: 0.5 }),
  );
  mug.position.set(0.78, 0.855, -1.78);
  mug.castShadow = true;
  scene.add(mug);
  // Café: superficie oscura lista para el vapor
  const coffee = new THREE.Mesh(
    new THREE.CircleGeometry(0.042, 20),
    new THREE.MeshStandardMaterial({ color: 0x2b1a10, roughness: 0.3 }),
  );
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.set(0.78, 0.912, -1.78);
  scene.add(coffee);
  // Asiento sobre la mesa: cada cacharro lleva su propio contacto
  blobShadow(0.78, -1.78, 0.24, 0.24, 0.4, 0.8); // taza
  blobShadow(-0.72, -2.0, 0.32, 0.32, 0.38, 0.8); // bonsái
  blobShadow(0.15, -2.0, 0.55, 0.4, 0.32, 0.8); // pie del monitor
  blobShadow(-0.3, -1.72, 0.72, 0.3, 0.3, 0.8); // teclado

  buildMonitor();
  buildLamp();
  buildFinishes();
  buildGarland();
  buildDeskLamp();
  buildBeams();
  buildCurtains();
  buildVentanal();
  buildOutside();
  buildSnow();
  buildMirror();
  buildShelf();
  buildPlant();
  buildArmchair();
  buildSideTable();
  buildSofa();
  buildSideboard();
  buildBoombox();
  buildBonsai();
  buildGomero();
  buildDoor();
  buildClock();
  buildCoatRack();
  buildSteam();
  buildCat();
  buildPosters();
  buildDust();
}

/* Monitor del escritorio: pantalla viva con CanvasTexture */
let screenCanvas, screenTex, screenMesh, screenGlow;
function buildMonitor() {
  const g = new THREE.Group();
  g.position.set(0.15, 0, -2.05);
  g.rotation.y = 0.06;
  const stand = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.32, 0.08),
    M.black,
  );
  stand.position.set(0, 0.95, -0.07);
  g.add(stand);
  // Pie por delante: antes el mástil asomaba por delante de la pantalla
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.24), M.black);
  foot.position.set(0, 0.81, 0.0);
  foot.castShadow = true;
  g.add(foot);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.6, 0.05), M.black);
  shell.position.y = 1.24;
  shell.castShadow = true;
  g.add(shell);
  screenCanvas = document.createElement("canvas");
  screenCanvas.width = 512;
  screenCanvas.height = 300;
  screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.527),
    new THREE.MeshBasicMaterial({ map: screenTex }),
  );
  screenMesh.position.set(0, 1.24, 0.028);
  g.add(screenMesh);
  markInteractive(screenMesh, { id: "monitor", dollyGap: 0.75, fov: 30 });
  // El caparazón también enfoca (blanco más generoso para el click)
  shell.userData.room = { id: "monitor", dollyGap: 0.75, fov: 30 };
  interactables.push(shell);
  scene.add(g);
  // Resplandor frío sobre el escritorio: vende que la pantalla emite luz
  screenGlow = new THREE.PointLight(0xc96f2e, 1.1, 2.4, 2);
  screenGlow.position.set(0.15, 1.25, -1.65);
  scene.add(screenGlow);
  drawScreen();
}
function drawScreen() {
  const c = screenCanvas.getContext("2d");
  const acc = "#" + roomAccent.color.getHexString();
  c.fillStyle = "#0d1117";
  c.fillRect(0, 0, 512, 300);
  c.fillStyle = "#161b22";
  c.fillRect(0, 0, 512, 34);
  c.fillStyle = acc;
  c.beginPath();
  c.arc(22, 17, 6, 0, 7);
  c.fill();
  c.fillStyle = "#30363d";
  c.fillRect(40, 11, 120, 12);
  c.fillStyle = "#161b22";
  c.fillRect(0, 34, 130, 266);
  const rows = ["#79c0ff", "#d2a8ff", "#7ee787", "#ffa657", "#79c0ff"];
  rows.forEach((col, i) => {
    c.fillStyle = "#21262d";
    c.fillRect(12, 52 + i * 46, 106, 34);
    c.fillStyle = col;
    c.fillRect(12, 52 + i * 46, 5, 34);
  });
  for (let i = 0; i < 9; i++) {
    c.fillStyle = i % 3 ? "#30363d" : acc;
    const w = 200 + ((i * 67) % 140);
    c.fillRect(150, 58 + i * 24, Math.min(w, 330), 10);
  }
  c.fillStyle = acc;
  c.fillRect(150, 262, 150, 24);
  c.fillStyle = "#0d1117";
  c.font = "bold 13px sans-serif";
  c.fillText("probar skins →", 162, 279);
  screenTex.needsUpdate = true;
}

/* Lámpara de pie esquinera */
function buildLamp() {
  const g = new THREE.Group();
  g.position.set(-2.55, 0, -2.15);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.18, 0.04, 20),
    M.black,
  );
  base.position.y = 0.02;
  g.add(base);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1.55, 10),
    M.black,
  );
  pole.position.y = 0.8;
  g.add(pole);
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.23, 0.26, 20, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xf3e3c2,
      roughness: 0.8,
      side: THREE.DoubleSide,
    }),
  );
  shade.position.y = 1.62;
  g.add(shade);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
  );
  bulb.position.y = 1.56;
  g.add(bulb);
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  // La pantalla y la ampolleta NO bloquean: la luz vive dentro de ellas.
  // (Si la ampolleta arrojara sombra, taparía toda la PointLight.)
  shade.castShadow = false;
  bulb.castShadow = false;
  scene.add(g);
  blobShadow(-2.55, -2.15, 0.62, 0.62, 0.4);
}

/* Ventana con luz día (plano emisivo, sin exterior modelado) */
/* Ventanal al atardecer nevado: marco + parteluz sobre el vano real */
function buildVentanal() {
  const frameMat = M.woodDark;
  box(0.1, 2.25, 0.14, frameMat, -2.6, 1.425, -2.97);
  box(0.1, 2.25, 0.14, frameMat, -0.8, 1.425, -2.97);
  box(1.9, 0.1, 0.14, frameMat, -1.7, 2.53, -2.97);
  box(2.0, 0.06, 0.26, frameMat, -1.7, 0.35, -2.9);
  box(0.06, 2.15, 0.08, frameMat, -1.7, 1.425, -2.97);
  box(1.8, 0.06, 0.08, frameMat, -1.7, 1.5, -2.97);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 2.15),
    new THREE.MeshStandardMaterial({
      color: 0xdfeaf2,
      transparent: true,
      opacity: 0.07,
      roughness: 0.05,
      metalness: 0.4,
      depthWrite: false,
    }),
  );
  glass.position.set(-1.7, 1.425, -2.99);
  glass.renderOrder = 2;
  scene.add(glass);
}

/* Afuera: paisaje falso pintado + suelo nevado */
function buildOutside() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 288;
  const g2 = c.getContext("2d");
  const sky = g2.createLinearGradient(0, 0, 0, 288);
  sky.addColorStop(0, "#16233f");
  sky.addColorStop(0.45, "#4a3a63");
  sky.addColorStop(0.62, "#c96f5a");
  sky.addColorStop(0.7, "#e8a06b");
  sky.addColorStop(0.72, "#f4cf9a");
  g2.fillStyle = sky;
  g2.fillRect(0, 0, 512, 288);
  // Luna + halo
  const halo = g2.createRadialGradient(400, 58, 2, 400, 58, 46);
  halo.addColorStop(0, "rgba(244,236,216,0.9)");
  halo.addColorStop(0.25, "rgba(244,236,216,0.35)");
  halo.addColorStop(1, "rgba(244,236,216,0)");
  g2.fillStyle = halo;
  g2.fillRect(340, 0, 172, 120);
  g2.fillStyle = "#f4ecd8";
  g2.beginPath();
  g2.arc(400, 58, 13, 0, 7);
  g2.fill();
  // Cordones montañosos
  g2.fillStyle = "#3a4666";
  g2.beginPath();
  g2.moveTo(0, 210);
  const far = [
    [70, 140],
    [150, 205],
    [240, 135],
    [330, 205],
    [420, 150],
    [512, 208],
  ];
  for (const [x, y] of far) g2.lineTo(x, y);
  g2.lineTo(512, 235);
  g2.lineTo(0, 235);
  g2.fill();
  g2.fillStyle = "#2b3550";
  g2.beginPath();
  g2.moveTo(0, 225);
  const near = [
    [110, 175],
    [210, 228],
    [320, 180],
    [430, 228],
    [512, 195],
  ];
  for (const [x, y] of near) g2.lineTo(x, y);
  g2.lineTo(512, 250);
  g2.lineTo(0, 250);
  g2.fill();
  // Pinos
  g2.fillStyle = "#1d2637";
  for (let i = 0; i < 16; i++) {
    const x = 12 + i * 32 + ((i * 37) % 12);
    const h = 26 + ((i * 53) % 18);
    g2.beginPath();
    g2.moveTo(x, 232 - h);
    g2.lineTo(x - 9, 232);
    g2.lineTo(x + 9, 232);
    g2.fill();
    g2.fillRect(x - 1.5, 232, 3, 7);
  }
  // Campo nevado + brillos
  g2.fillStyle = "#dfe8f2";
  g2.fillRect(0, 236, 512, 52);
  g2.fillStyle = "rgba(255,255,255,0.9)";
  for (let i = 0; i < 60; i++) {
    g2.fillRect((i * 41 + 7) % 512, 240 + ((i * 29) % 44), 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const pano = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 5),
    new THREE.MeshBasicMaterial({ map: tex, fog: false }),
  );
  pano.position.set(-1.2, 1.9, -7.4);
  scene.add(pano);
  const snow = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 4.4),
    new THREE.MeshStandardMaterial({ color: 0xcfdce8, roughness: 1 }),
  );
  snow.rotation.x = -Math.PI / 2;
  snow.position.set(-1, 0.005, -5.3);
  snow.receiveShadow = true;
  scene.add(snow);
  // Dunas
  const driftMat = new THREE.MeshStandardMaterial({
    color: 0xe4edf5,
    roughness: 1,
  });
  for (const [x, z, s] of [
    [-2.8, -5.6, 0.7],
    [0.4, -6.0, 0.9],
    [-0.9, -4.4, 0.5],
  ]) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(s, 14, 10), driftMat);
    d.scale.y = 0.28;
    d.position.set(x, 0, z);
    scene.add(d);
  }
}

/* Nieve cayendo entre el paisaje y el vidrio */
function buildSnow() {
  const n = 380;
  const pos = new Float32Array(n * 3);
  snowSeed = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = -3.4 + Math.random() * 4.4;
    pos[i * 3 + 1] = Math.random() * 3.4;
    pos[i * 3 + 2] = -6.9 + Math.random() * 3.6;
    snowSeed[i * 2] = 0.25 + Math.random() * 0.45;
    snowSeed[i * 2 + 1] = Math.random() * 6.28;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  snowPts = new THREE.Points(
    g,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.055,
      map: getSoftDot(),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
  );
  snowPts.frustumCulled = false;
  scene.add(snowPts);
}
function updateSnow(dt, t) {
  if (!snowPts) return;
  const a = snowPts.geometry.attributes.position;
  for (let i = 0; i < a.count; i++) {
    let y = a.getY(i) - snowSeed[i * 2] * dt;
    if (y < 0) y = 3.4;
    a.setY(i, y);
    a.setX(i, a.getX(i) + Math.sin(t * 1.5 + snowSeed[i * 2 + 1]) * dt * 0.12);
  }
  a.needsUpdate = true;
}

/* Espejo redondo decorativo: vidrio esmerilado abstracto, sin reflejo.
   Un reflejo falso se veía a juguete; como decoración no necesita
   interacción ni animación. */
function buildMirror() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g2 = c.getContext("2d");
  const grad = g2.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "#dfe9ee");
  grad.addColorStop(0.55, "#b9c9d2");
  grad.addColorStop(1, "#8fa2ad");
  g2.fillStyle = grad;
  g2.fillRect(0, 0, 128, 128);
  // Velo esmerilado: manchas suaves, nada figurativo
  for (let i = 0; i < 26; i++) {
    const x = (i * 37 + 11) % 128;
    const y = (i * 53 + 29) % 128;
    const r = 12 + ((i * 17) % 22);
    const blob = g2.createRadialGradient(x, y, 0, x, y, r);
    blob.addColorStop(0, "rgba(255,255,255,0.20)");
    blob.addColorStop(1, "rgba(255,255,255,0)");
    g2.fillStyle = blob;
    g2.beginPath();
    g2.arc(x, y, r, 0, 7);
    g2.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 40),
    new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.35,
      metalness: 0.1,
    }),
  );
  glass.position.set(1.9, 1.68, -2.96);
  scene.add(glass);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.03, 12, 40),
    M.woodDark,
  );
  rim.position.set(1.9, 1.68, -2.96);
  // Pegado al muro: sin sombra arrojada, no tiene sentido físico ahí.
  rim.castShadow = false;
  scene.add(rim);
}

/* Estantería con libros, en el muro trasero: antes tapaba el póster */
function buildShelf() {
  box(1.6, 0.05, 0.3, M.wood, 1.6, 1.5, 3.62);
  box(1.6, 0.05, 0.3, M.wood, 1.6, 1.95, 3.62);
  const cols = [0xa3543f, 0x2e6f8e, 0xc9a227, 0x4d7c4f, 0x6d4c7d, 0xb5654a];
  cols.forEach((col, i) => {
    const h = 0.24 + (i % 3) * 0.05;
    const b = box(
      0.09,
      h,
      0.2,
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 }),
      0.95 + i * 0.13,
      1.525 + h / 2,
      3.62,
    );
    b.castShadow = false;
  });
}
/* Lengua de suegra: roseta de hojas rígidas, la silueta se lee sola */
function buildPlant() {
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.12, 0.24, 16),
    M.pot,
  );
  pot.position.set(2.9, 0.12, -2.4);
  pot.castShadow = true;
  scene.add(pot);
  const soil = new THREE.Mesh(
    new THREE.CircleGeometry(0.13, 16),
    new THREE.MeshStandardMaterial({ color: 0x3a2c1e, roughness: 1 }),
  );
  soil.rotation.x = -Math.PI / 2;
  soil.position.set(2.9, 0.245, -2.4);
  scene.add(soil);
  const greens = [0x3f6b41, 0x4d7c4f, 0x35603a];
  for (let i = 0; i < 9; i++) {
    const h = 0.5 + ((i * 37) % 40) / 100;
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, h, 5),
      new THREE.MeshStandardMaterial({
        color: greens[i % 3],
        roughness: 0.85,
        flatShading: true,
      }),
    );
    const a = (i / 9) * Math.PI * 2;
    const tilt = 0.1 + ((i * 53) % 20) / 100;
    leaf.position.set(
      2.9 + Math.cos(a) * 0.05,
      0.24 + h / 2 - 0.06,
      -2.4 + Math.sin(a) * 0.05,
    );
    leaf.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
    leaf.scale.z = 0.5;
    leaf.castShadow = true;
    scene.add(leaf);
  }
  blobShadow(2.9, -2.4, 0.75, 0.75, 0.42);
}

/* Sillón esquinero para mirar la nieve: patas de madera, brazos con
   rodillo y cojines sueltos para que no parezca un bloque */
function buildArmchair() {
  const g = new THREE.Group();
  g.position.set(-2.5, 0, -1.15);
  g.rotation.y = 0.55;
  const rust = new THREE.MeshStandardMaterial({
    color: 0x9a5f43,
    roughness: 0.95,
  });
  const cream = new THREE.MeshStandardMaterial({
    color: 0xe5d9c3,
    roughness: 0.95,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x3a3129,
    roughness: 0.9,
  });
  const add = (geo, mat, x, y, z, rx = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    m.rotation.z = rz;
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  // Patas cónicas de madera
  for (const [lx, lz] of [
    [-0.28, 0.24],
    [0.28, 0.24],
    [-0.28, -0.24],
    [0.28, -0.24],
  ]) {
    add(new THREE.CylinderGeometry(0.025, 0.035, 0.18, 8), dark, lx, 0.09, lz);
  }
  add(new THREE.BoxGeometry(0.68, 0.2, 0.6), rust, 0, 0.28, 0);
  const chairSeat = add(
    new THREE.BoxGeometry(0.5, 0.13, 0.44),
    cream,
    0,
    0.44,
    0.03,
  );
  markInteractive(chairSeat, {
    id: "sit",
    px: -2.48,
    pz: -1.12,
    yaw: -2.59,
    h: 1.1,
  });
  add(new THREE.BoxGeometry(0.68, 0.6, 0.16), rust, 0, 0.66, -0.26, -0.1);
  add(new THREE.BoxGeometry(0.5, 0.4, 0.1), cream, 0, 0.62, -0.16, -0.1);
  // Brazos + apoyos planos (los rodillos tangentes flickereaban)
  add(new THREE.BoxGeometry(0.15, 0.3, 0.58), rust, -0.415, 0.53, 0);
  add(new THREE.BoxGeometry(0.15, 0.3, 0.58), rust, 0.415, 0.53, 0);
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.17, 0.04, 0.6), dark, s * 0.415, 0.705, 0);
  }
  add(
    new THREE.BoxGeometry(0.3, 0.28, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.95 }),
    -0.12,
    0.58,
    -0.1,
    -0.15,
    0.08,
  );
  scene.add(g);
  blobShadow(-2.5, -1.15, 1.25, 1.15, 0.36);
}

/* Sofá grande contra la pared derecha, bajo los pósters */
function buildSofa() {
  const g = new THREE.Group();
  g.position.set(3.15, 0, -0.3);
  g.rotation.y = Math.PI / 2; // respaldo al muro (+x), frente al centro
  const sage = new THREE.MeshStandardMaterial({
    color: 0x7d8b6f,
    roughness: 0.95,
  });
  const cream = new THREE.MeshStandardMaterial({
    color: 0xe5d9c3,
    roughness: 0.95,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x3a3129,
    roughness: 0.9,
  });
  const add = (geo, mat, x, y, z, rx = 0, rz = 0, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  for (const [lx, lz] of [
    [-0.95, 0.32],
    [0.95, 0.32],
    [-0.95, -0.32],
    [0.95, -0.32],
  ]) {
    add(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 8), dark, lx, 0.06, lz);
  }
  add(new THREE.BoxGeometry(2.2, 0.3, 0.85), sage, 0, 0.27, 0);
  // Respaldo y brazos
  add(new THREE.BoxGeometry(2.2, 0.72, 0.24), sage, 0, 0.66, 0.42, -0.08);
  add(new THREE.BoxGeometry(0.26, 0.34, 0.85), sage, -1.0, 0.6, 0);
  add(new THREE.BoxGeometry(0.26, 0.34, 0.85), sage, 1.0, 0.6, 0);
  // Cojines de asiento + respaldo, con luz entre ellos
  for (const s of [-0.5, 0.5]) {
    const seat = add(
      new THREE.BoxGeometry(0.94, 0.17, 0.68),
      cream,
      s,
      0.5,
      -0.04,
    );
    // local (±0.5, ·, -0.04) con ry=π/2 → mundo (3.11, ·, -0.3∓0.5)
    markInteractive(seat, {
      id: "sit",
      px: 3.11,
      pz: -0.3 - s,
      yaw: Math.PI / 2,
      h: 1.2,
    });
    add(new THREE.BoxGeometry(0.94, 0.44, 0.16), cream, s, 0.72, 0.28, -0.12);
  }
  // Almohadones tirados
  add(
    new THREE.BoxGeometry(0.36, 0.36, 0.13),
    new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.95 }),
    -0.72,
    0.72,
    0.05,
    -0.1,
    0,
    0.35,
  );
  add(
    new THREE.BoxGeometry(0.34, 0.34, 0.13),
    new THREE.MeshStandardMaterial({ color: 0xa3543f, roughness: 0.95 }),
    0.75,
    0.7,
    0.02,
    -0.08,
    0,
    -0.3,
  );
  scene.add(g);
  blobShadow(3.15, -0.3, 1.15, 2.5, 0.38);
}

/* Mesita lateral con libros */
function buildSideTable() {
  const g = new THREE.Group();
  g.position.set(-1.55, 0, -0.9);
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.26, 0.05, 20),
    M.wood,
  );
  top.position.y = 0.52;
  g.add(top);
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.5, 10),
    M.woodDark,
  );
  leg.position.y = 0.27;
  g.add(leg);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.18, 0.04, 16),
    M.woodDark,
  );
  base.position.y = 0.02;
  g.add(base);
  const cols = [0x2e6f8e, 0xc9a227, 0xa3543f];
  cols.forEach((col, i) => {
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.04, 0.22),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 }),
    );
    b.position.y = 0.57 + i * 0.045;
    b.rotation.y = 0.25 - i * 0.3;
    g.add(b);
  });
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(g);
  blobShadow(-1.55, -0.9, 0.7, 0.7, 0.38);
}

/* Mueble bajo el reloj + equipo de música con radio online */
let boomCanvas, boomTex, radioAudio, radioOn, radioStation, radioLabel;
function buildSideboard() {
  const g = new THREE.Group();
  g.position.set(-3.44, 0, 1.55);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 1.3), M.wood);
  body.position.y = 0.42;
  g.add(body);
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.05, 1.36),
    M.woodDark,
  );
  top.position.y = 0.695;
  g.add(top);
  for (const s of [-1, 1]) {
    for (const zz of [-0.55, 0.55]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.03, 0.18, 8),
        M.woodDark,
      );
      leg.position.set(s * 0.16, 0.09, zz);
      g.add(leg);
    }
  }
  // Dos puertas insinuadas al frente (+x)
  const grooveMat = new THREE.MeshStandardMaterial({
    color: 0x4a3823,
    roughness: 0.8,
  });
  for (const zz of [-0.32, 0.32]) {
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.4, 0.56),
      grooveMat,
    );
    door.position.set(0.215, 0.42, zz);
    g.add(door);
  }
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(g);
  blobShadow(-3.44, 1.55, 0.6, 1.5, 0.34);
}
/* HI-FI: receiver + torres + satélites en la estantería */
function buildBoombox() {
  const g = new THREE.Group();
  g.position.set(-3.44, 0.72, 1.55);
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x232326,
    roughness: 0.55,
  });
  const faceMat = new THREE.MeshStandardMaterial({
    color: 0x2e2e34,
    roughness: 0.5,
  });
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.22, 0.56),
    shellMat,
  );
  body.position.y = 0.11;
  g.add(body);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.5), faceMat);
  face.position.set(0.13, 0.11, 0);
  g.add(face);
  // Pantalla con ecualizador + nombre de la estación
  boomCanvas = document.createElement("canvas");
  boomCanvas.width = 128;
  boomCanvas.height = 40;
  boomTex = new THREE.CanvasTexture(boomCanvas);
  boomTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.094),
    new THREE.MeshBasicMaterial({ map: boomTex }),
  );
  screen.rotation.y = Math.PI / 2;
  screen.position.set(0.142, 0.14, -0.06);
  g.add(screen);
  // Perilla de volumen + botonera + ranura CD
  const knob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16),
    new THREE.MeshStandardMaterial({
      color: 0xc9a227,
      roughness: 0.35,
      metalness: 0.5,
    }),
  );
  knob.rotation.z = Math.PI / 2;
  knob.position.set(0.145, 0.06, 0.17);
  g.add(knob);
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.018, 0.045),
      new THREE.MeshStandardMaterial({ color: 0x8a8a92, roughness: 0.5 }),
    );
    btn.position.set(0.14, 0.045, -0.14 + i * 0.075);
    g.add(btn);
  }
  const slot = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.012, 0.3),
    M.black,
  );
  slot.position.set(0.132, 0.2, 0);
  g.add(slot);
  const ant = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.5, 6),
    M.black,
  );
  ant.position.set(-0.06, 0.42, -0.18);
  ant.rotation.z = 0.35;
  g.add(ant);
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  scene.add(g);
  // Torres a cada lado del mueble
  for (const tz of [0.55, 2.55]) {
    const t = new THREE.Group();
    t.position.set(-3.42, 0, tz);
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.72, 0.3),
      M.woodDark,
    );
    cab.position.y = 0.4;
    t.add(cab);
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.04, 0.34),
      M.black,
    );
    plinth.position.y = 0.02;
    t.add(plinth);
    const woofer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.03, 20),
      new THREE.MeshStandardMaterial({ color: 0x3d3d44, roughness: 0.7 }),
    );
    woofer.rotation.z = Math.PI / 2;
    woofer.position.set(0.135, 0.28, 0);
    t.add(woofer);
    const tweeter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.032, 16),
      M.black,
    );
    tweeter.rotation.z = Math.PI / 2;
    tweeter.position.set(0.136, 0.58, 0);
    t.add(tweeter);
    t.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    scene.add(t);
    blobShadow(-3.42, tz, 0.42, 0.46, 0.34);
  }
  // Satélites sobre la estantería trasera
  for (const sx of [0.95, 2.25]) {
    const s = new THREE.Group();
    s.position.set(sx, 1.975, 3.62);
    const boxm = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.13, 0.14),
      shellMat,
    );
    boxm.position.y = 0.065;
    s.add(boxm);
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16),
      new THREE.MeshStandardMaterial({ color: 0x3d3d44, roughness: 0.7 }),
    );
    cone.rotation.x = Math.PI / 2;
    cone.position.set(0, 0.06, -0.075);
    s.add(cone);
    s.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    scene.add(s);
  }
  drawBoomScreen(0);
  markInteractive(body, { id: "music", dollyGap: 1.2, fov: 46 });
}
function drawBoomScreen(t) {
  if (!boomCanvas) return;
  const g2 = boomCanvas.getContext("2d");
  g2.fillStyle = radioOn ? "#0d2b1d" : "#101418";
  g2.fillRect(0, 0, 128, 40);
  // Nombre de la estación con scroll si no cabe
  g2.font = "bold 11px monospace";
  const label = radioOn && radioLabel ? `▶ ${radioLabel}` : "— HI-FI —";
  const tw = g2.measureText(label).width;
  let tx = 4;
  if (tw > 120) {
    tx = 4 - ((t * 28) % (tw + 16));
    if (tx < 4 - tw) tx += tw + 16;
  }
  g2.fillStyle = radioOn ? "#5cffc4" : "#3a4550";
  g2.fillText(label, tx, 12);
  if (tw > 120) {
    g2.fillText(label, tx + tw + 16, 12);
  }
  // Ecualizador
  for (let i = 0; i < 14; i++) {
    const h = radioOn
      ? 3 +
        Math.abs(Math.sin(t * 3.1 + i * 1.7)) * 18 +
        Math.sin(t * 7.3 + i * 3.1) * 2.5
      : 2;
    g2.fillRect(4 + i * 8.8, 37 - Math.max(h, 2), 6, Math.max(h, 2));
  }
  boomTex.needsUpdate = true;
}
function playStation(url, label) {
  try {
    if (!radioAudio) {
      radioAudio = new Audio();
      radioAudio.volume = 0.8;
      radioAudio.preload = "none";
      // CORS SÍ o SÍ antes del primer src: sin crossOrigin, un stream
      // cross-origin pasa por MediaElementSource en SILENCIO (taint).
      // Todos nuestros streams mandan ACAO, así que el grafo recibe audio.
      // Si alguno no lo mandara, el elemento falla con error y se avisa.
      radioAudio.crossOrigin = "anonymous";
      // Si el stream se cae (403, corte), se avisa y se apaga el ecualizador
      radioAudio.addEventListener("error", () => {
        radioOn = false;
        radioStation = null;
        flashTip(
          currentLang() === "es"
            ? "Esa señal se cayó · prueba otra estación"
            : "Stream down · try another station",
        );
      });
      // El elemento suena A TRAVÉS del equipo: fuente posicional 3D.
      // El ecualizador es procedural, no necesita analyser.
      radioPanner = new THREE.PositionalAudio(audioListener);
      radioPanner.setMediaElementSource(radioAudio);
      radioPanner.setRefDistance(1.4);
      radioPanner.setRolloffFactor(1.2);
      radioPanner.setMaxDistance(14);
      radioPanner.position.set(-3.3, 1.0, 1.55);
      // En escena SÍ o SÍ: sin esto su matrixWorld nunca se actualiza y el
      // panner se queda clavado en el origen (además de no espacializar).
      scene.add(radioPanner);
    }
    if (radioOn && radioStation === url) return;
    if (audioListener.context.state === "suspended") {
      audioListener.context.resume();
    }
    radioAudio.src = url;
    radioAudio.play();
    radioOn = true;
    radioStation = url;
    radioLabel = label;
    flashTip("♪ " + label);
  } catch (e) {
    flashTip("La radio no quiso arrancar");
  }
}
function stopRadio() {
  if (radioAudio) radioAudio.pause();
  radioOn = false;
  radioStation = null;
  radioLabel = null;
}

/* Bonsái sobre el escritorio */
function buildBonsai() {
  const g = new THREE.Group();
  g.position.set(-0.72, 0.795, -2.0);
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.06, 0.07, 14),
    new THREE.MeshStandardMaterial({ color: 0x4a5d7a, roughness: 0.6 }),
  );
  pot.position.y = 0.035;
  g.add(pot);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x4a3826,
    roughness: 0.9,
  });
  const t1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.024, 0.16, 8),
    trunkMat,
  );
  t1.position.set(0, 0.14, 0);
  t1.rotation.z = 0.15;
  g.add(t1);
  const t2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.018, 0.12, 8),
    trunkMat,
  );
  t2.position.set(0.035, 0.24, 0);
  t2.rotation.z = -0.35;
  g.add(t2);
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x3d6b35,
    roughness: 0.85,
    flatShading: true,
  });
  for (const [x, y, z, s] of [
    [-0.02, 0.3, 0, 1],
    [0.09, 0.28, 0.02, 0.75],
    [-0.07, 0.24, -0.02, 0.65],
  ]) {
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), leafMat);
    pad.scale.set(s, s * 0.45, s);
    pad.position.set(x, y, z);
    g.add(pad);
  }
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(g);
}

/* Gomero grande en la esquina de la puerta */
function buildGomero() {
  const g = new THREE.Group();
  g.position.set(-3.25, 0, 3.3);
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.19, 0.36, 16),
    M.pot,
  );
  pot.position.y = 0.18;
  g.add(pot);
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x4a3d2c,
    roughness: 0.9,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x2f5b33,
    roughness: 0.45,
  });
  const stems = [
    [0, 0, 1.25, 0.05],
    [0.07, 0.03, 1.05, -0.08],
    [-0.06, -0.02, 1.12, 0.1],
  ];
  for (const [sx, sz, sh, tilt] of stems) {
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.03, sh, 8),
      stemMat,
    );
    stem.position.set(sx, 0.36 + sh / 2, sz);
    stem.rotation.z = tilt;
    g.add(stem);
  }
  for (let i = 0; i < 12; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), leafMat);
    const a = (i / 12) * Math.PI * 2;
    const h = 0.85 + ((i * 53) % 60) / 100;
    leaf.scale.set(0.55, 1.15, 0.32);
    leaf.position.set(Math.cos(a) * 0.2, h, Math.sin(a) * 0.2);
    leaf.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55);
    g.add(leaf);
  }
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(g);
  blobShadow(-3.25, 3.3, 0.85, 0.85, 0.4);
}

/* Puerta falsa del fondo: pintada, como tus excusas para no salir */
function buildDoor() {
  const g = new THREE.Group();
  g.position.set(-2.2, 0, 3.76);
  const frameMat = M.woodDark;
  const slabMat = new THREE.MeshStandardMaterial({
    color: 0x6f5133,
    roughness: 0.75,
  });
  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(0.1, 2.1, 0.12), frameMat, -0.52, 1.05, 0);
  add(new THREE.BoxGeometry(0.1, 2.1, 0.12), frameMat, 0.52, 1.05, 0);
  add(new THREE.BoxGeometry(1.14, 0.1, 0.12), frameMat, 0, 2.12, 0);
  const slab = add(
    new THREE.BoxGeometry(0.94, 2.02, 0.06),
    slabMat,
    0,
    1.03,
    0,
  );
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x5f452a,
    roughness: 0.8,
  });
  add(new THREE.BoxGeometry(0.62, 0.7, 0.02), panelMat, 0, 1.5, -0.035);
  add(new THREE.BoxGeometry(0.62, 0.7, 0.02), panelMat, 0, 0.62, -0.035);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0xc9a227,
      roughness: 0.35,
      metalness: 0.7,
    }),
  );
  knob.position.set(0.34, 1.02, -0.07);
  g.add(knob);
  scene.add(g);
  markInteractive(slab, {
    id: "door",
    joke: {
      es: "Pintada. Como mis excusas para no salir de acá.",
      en: "Painted shut. Like my excuses for never leaving.",
    },
  });
}

/* Reloj mural con la hora real */
function buildClock() {
  const g = new THREE.Group();
  g.position.set(-3.63, 2.05, 1.7);
  g.rotation.y = Math.PI / 2;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.025, 10, 32),
    M.woodDark,
  );
  g.add(rim);
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const faceTex = new THREE.CanvasTexture(c);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.155, 32),
    new THREE.MeshBasicMaterial({ map: faceTex }),
  );
  face.position.z = 0.004;
  g.add(face);
  const handMat = new THREE.MeshBasicMaterial({ color: 0x1c1a17 });
  const hour = new THREE.Group();
  const hourMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 0.07, 0.004),
    handMat,
  );
  hourMesh.position.y = 0.028;
  hour.add(hourMesh);
  hour.position.z = 0.008;
  g.add(hour);
  const minute = new THREE.Group();
  const minuteMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.11, 0.004),
    handMat,
  );
  minuteMesh.position.y = 0.045;
  minute.add(minuteMesh);
  minute.position.z = 0.01;
  g.add(minute);
  const pin = new THREE.Mesh(new THREE.CircleGeometry(0.012, 12), handMat);
  pin.position.z = 0.012;
  g.add(pin);
  scene.add(g);
  clockHands = { canvas: c, tex: faceTex, hour, minute };
  drawClockFace();
  updateClockHands();
}
function drawClockFace() {
  if (!clockHands) return;
  const g2 = clockHands.canvas.getContext("2d");
  g2.fillStyle = "#f6f1e6";
  g2.beginPath();
  g2.arc(64, 64, 62, 0, 7);
  g2.fill();
  g2.fillStyle = "#1c1a17";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const big = i % 3 === 0;
    g2.save();
    g2.translate(64, 64);
    g2.rotate(a);
    g2.fillRect(-2, -58, 4, big ? 14 : 8);
    g2.restore();
  }
  clockHands.tex.needsUpdate = true;
}
function updateClockHands() {
  if (!clockHands) return;
  const now = new Date();
  const m = now.getMinutes() + now.getSeconds() / 60;
  const h = (now.getHours() % 12) + m / 60;
  clockHands.minute.rotation.z = -(m / 60) * Math.PI * 2;
  clockHands.hour.rotation.z = -(h / 12) * Math.PI * 2;
}
function updateRoomClock() {
  const el = document.getElementById("room-clock");
  if (!el) return;
  const n = new Date();
  el.textContent =
    String(n.getHours()).padStart(2, "0") +
    ":" +
    String(n.getMinutes()).padStart(2, "0");
}

/* Perchero de la esquina trasera */
function buildCoatRack() {
  const g = new THREE.Group();
  g.position.set(3.1, 0, 3.15);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 1.75, 10),
    M.woodDark,
  );
  pole.position.y = 0.875;
  g.add(pole);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.22, 0.05, 16),
    M.woodDark,
  );
  base.position.y = 0.025;
  g.add(base);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), M.wood);
  knob.position.y = 1.78;
  g.add(knob);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const peg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.24, 8),
      M.wood,
    );
    peg.position.set(Math.cos(a) * 0.11, 1.56, Math.sin(a) * 0.11);
    peg.rotation.z = Math.PI / 2 - 0.5;
    peg.rotation.y = -a;
    g.add(peg);
  }
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(g);
  blobShadow(3.1, 3.15, 0.55, 0.55, 0.34);
}

/* Vapor del cafecito */
const STEAM_X = 0.78,
  STEAM_Z = -1.78;
function buildSteam() {
  const n = 12;
  const pos = new Float32Array(n * 3);
  steamLife = new Float32Array(n);
  for (let i = 0; i < n; i++) steamLife[i] = Math.random();
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  steamPts = new THREE.Points(
    g,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      map: getSoftDot(),
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),
  );
  steamPts.frustumCulled = false;
  scene.add(steamPts);
}
function updateSteam(dt) {
  if (!steamPts) return;
  const a = steamPts.geometry.attributes.position;
  for (let i = 0; i < a.count; i++) {
    steamLife[i] += dt * 0.45;
    if (steamLife[i] > 1) steamLife[i] = 0;
    const l = steamLife[i];
    a.setXYZ(
      i,
      STEAM_X + Math.sin(l * 6 + i * 2.4) * 0.02 * l,
      0.93 + l * 0.34,
      STEAM_Z + Math.cos(l * 5 + i * 1.7) * 0.015 * l,
    );
  }
  a.needsUpdate = true;
}

/* Gato gris que pasea libre por la habitación */
function buildCat() {
  cat = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({
    color: 0x2f2f36,
    roughness: 0.9,
  });
  const add = (mesh, x, y, z) => {
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    cat.add(mesh);
  };
  // Abdomen cápsula: la caja se veía muy Minecraft
  const bellyGeo = new THREE.CapsuleGeometry(0.1, 0.22, 6, 12);
  bellyGeo.rotateZ(Math.PI / 2);
  const catBody = new THREE.Mesh(bellyGeo, fur);
  add(catBody, 0, 0.24, 0);
  const catHead = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), fur);
  add(catHead, 0.21, 0.38, 0);
  markInteractive(catBody, { id: "cat" });
  markInteractive(catHead, { id: "cat" });
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.09, 4), fur);
    ear.position.set(0.19, 0.48, s * 0.06);
    ear.rotation.x = s * 0.15;
    ear.castShadow = true;
    cat.add(ear);
    add(
      new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xa8e0c8 }),
      ),
      0.3,
      0.4,
      s * 0.05,
    );
  }
  catLegs = [];
  const legGeo = new THREE.CylinderGeometry(0.032, 0.03, 0.16, 8);
  legGeo.translate(0, -0.08, 0); // pivote arriba: la pata cuelga de la cadera
  for (const [lx, lz] of [
    [0.12, 0.07],
    [0.12, -0.07],
    [-0.12, 0.07],
    [-0.12, -0.07],
  ]) {
    const leg = new THREE.Mesh(legGeo, fur);
    leg.position.set(lx, 0.16, lz);
    leg.castShadow = true;
    cat.add(leg);
    catLegs.push(leg);
  }
  catTail = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.032, 8, 14, Math.PI * 0.75),
    fur,
  );
  // Rizo vertical: nace abajo-atrás y se enrosca hacia arriba
  catTail.position.set(-0.21, 0.36, 0);
  catTail.rotation.z = -Math.PI / 2;
  catTail.castShadow = true;
  cat.add(catTail);
  cat.position.set(catState.x, 0, catState.z);
  scene.add(cat);
  catBlob = blobShadow(catState.x, catState.z, 0.5, 0.4, 0.38);
}
function pickCatTarget() {
  const p = { x: -2.9 + Math.random() * 5.8, z: -1.9 + Math.random() * 5.1 };
  resolveCollision(p, 0.18);
  catState.tx = p.x;
  catState.tz = p.z;
  catState.pause = 1 + Math.random() * 3;
}
function petCat() {
  meow();
  catState.attn = 2.5;
  catState.hop = 0.45;
  flashTip(currentLang() === "es" ? "miau ♥" : "meow ♥");
}
// Miau sintetizado: sierra con envolvente de tono + vibrato por lowpass.
// Sin assets, sin red, suena por el master (no posicional).
function meow() {
  try {
    const ctx = audioListener.context;
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime + 0.02;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(520, t0);
    osc.frequency.exponentialRampToValueAtTime(820, t0 + 0.14);
    osc.frequency.exponentialRampToValueAtTime(430, t0 + 0.45);
    const vib = ctx.createOscillator();
    vib.frequency.value = 8;
    const vibG = ctx.createGain();
    vibG.gain.value = 28;
    vib.connect(vibG);
    vibG.connect(osc.frequency);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1900;
    lp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.06);
    g.gain.setValueAtTime(0.22, t0 + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    osc.connect(lp);
    lp.connect(g);
    g.connect(audioListener.getInput());
    osc.start(t0);
    vib.start(t0);
    osc.stop(t0 + 0.55);
    vib.stop(t0 + 0.55);
  } catch (e) {
    /* sin miau no hay portfolio */
  }
}
function updateCat(dt, t) {
  if (!cat) return;
  // Atención: te mira 2.5s y da un saltito (tras la caricia)
  if (catState.attn > 0) {
    catState.attn -= dt;
    const dx = view.px - catState.x,
      dz = view.pz - catState.z;
    const ty = Math.atan2(-dz, dx);
    let dy = ty - catState.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    catState.yaw += dy * Math.min(dt * 8, 1);
    let hopY = 0;
    if (catState.hop > 0) {
      catState.hop -= dt;
      hopY =
        Math.sin(((0.45 - Math.max(catState.hop, 0)) / 0.45) * Math.PI) * 0.12;
    }
    cat.position.set(catState.x, hopY, catState.z);
    cat.rotation.y = catState.yaw;
    if (catBlob) catBlob.position.set(catState.x, 0.015, catState.z);
    return;
  }
  const dx = catState.tx - catState.x,
    dz = catState.tz - catState.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.1) {
    if (catState.pause > 0) catState.pause -= dt;
    else pickCatTarget();
    // Reposo: patas tiesas
    if (catLegs && !REDUCED) {
      for (const leg of catLegs)
        leg.rotation.x += (0 - leg.rotation.x) * Math.min(dt * 8, 1);
    }
  } else {
    const targetYaw = Math.atan2(-dz, dx);
    let dy = targetYaw - catState.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    catState.yaw += dy * Math.min(dt * 6, 1);
    const sp = 0.5;
    const p = {
      x: catState.x + Math.cos(catState.yaw) * sp * dt,
      z: catState.z - Math.sin(catState.yaw) * sp * dt,
    };
    resolveCollision(p, 0.18);
    const moved = Math.hypot(p.x - catState.x, p.z - catState.z);
    catState.x = p.x;
    catState.z = p.z;
    if (moved < sp * dt * 0.3) pickCatTarget();
    cat.position.set(
      catState.x,
      REDUCED ? 0 : Math.abs(Math.sin(t * 9)) * 0.012,
      catState.z,
    );
    cat.rotation.y = catState.yaw;
    // Trote: pares diagonales alternados
    if (catLegs && !REDUCED) {
      for (let li = 0; li < catLegs.length; li++) {
        catLegs[li].rotation.x =
          Math.sin(t * 11 + (li % 2) * Math.PI + (li > 1 ? 0.6 : 0)) * 0.55;
      }
    }
  }
  if (catTail) catTail.rotation.x = Math.sin(t * 2.2) * 0.35;
  if (catBlob) catBlob.position.set(catState.x, 0.015, catState.z);
}

/* Terminaciones:arrimado dos tonos + molduras de cuadro */
function buildFinishes() {
  const lowMat = new THREE.MeshStandardMaterial({
    color: 0xd6c8ab,
    roughness: 0.95,
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: 0xb8a988,
    roughness: 0.85,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xcfc2a6,
    roughness: 0.9,
  });
  // Franja inferior (el vano del ventanal la interrumpe al frente)
  const bands = [
    [7.4, 0, 3.79, Math.PI],
    [6.8, -3.69, 0.4, Math.PI / 2],
    [6.8, 3.69, 0.4, -Math.PI / 2],
    [1.1, -3.15, -2.99, 0],
    [4.5, 1.45, -2.99, 0],
  ];
  for (const [w, x, z, ry] of bands) {
    const band = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.95), lowMat);
    band.position.set(x, 0.475, z);
    band.rotation.y = ry;
    band.receiveShadow = true;
    scene.add(band);
  }
  // Riel de silla sobre la franja (el fondo se parte por la puerta)
  const rails = [
    [0.93, -3.235, 3.77],
    [5.33, 1.035, 3.77],
    [1.1, -3.15, -2.97],
    [4.5, 1.45, -2.97],
  ];
  for (const [w, x, z] of rails) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.04), railMat);
    r.position.set(x, 0.97, z);
    scene.add(r);
  }
  for (const x of [-3.66, 3.66]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 6.8), railMat);
    r.position.set(x, 0.97, 0.4);
    scene.add(r);
  }
  // Molduras de cuadro en los paños vacíos
  const molding = (cx, cy, cz, w, h, ry, tex = null, flip = false) => {
    const grp = new THREE.Group();
    grp.position.set(cx, cy, cz);
    grp.rotation.y = ry;
    const t = 0.045,
      d = 0.025;
    const top = new THREE.Mesh(new THREE.BoxGeometry(w + t, t, d), trimMat);
    top.position.y = h / 2;
    const bot = top.clone();
    bot.position.y = -h / 2;
    const side = new THREE.BoxGeometry(t, h, d);
    const l = new THREE.Mesh(side, trimMat);
    l.position.x = -w / 2;
    const r2 = new THREE.Mesh(side, trimMat);
    r2.position.x = w / 2;
    grp.add(top, bot, l, r2);
    if (tex) {
      const art = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.14, h - 0.14),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }),
      );
      art.position.z = flip ? -0.016 : 0.016;
      if (flip) art.rotation.y = Math.PI;
      grp.add(art);
    }
    scene.add(grp);
  };
  molding(-3.2, 1.7, 3.74, 0.7, 1.1, 0, miniPrint("bauhaus"), true); // fondo, junto a la puerta
  molding(3.66, 1.7, 2.2, 1.2, 1.3, -Math.PI / 2, miniPrint("tipo")); // derecha, pasado los pósters
  molding(-3.66, 1.7, -2.25, 1.0, 1.2, Math.PI / 2, miniPrint("grid")); // izquierda, lado ventana
}

/* Mini-láminas brutalistas dentro de las molduras */
function miniPrint(kind) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 320;
  const g2 = c.getContext("2d");
  if (kind === "tipo") {
    g2.fillStyle = "#141414";
    g2.fillRect(0, 0, 256, 320);
    g2.fillStyle = "#f2ede2";
    g2.font = "900 150px Outfit, sans-serif";
    g2.fillText("Aa", 28, 170);
    g2.fillStyle = "#e1121c";
    g2.fillRect(28, 200, 200, 14);
    g2.fillStyle = "#f2ede2";
    g2.font = "20px monospace";
    g2.fillText("ISAMORA·DEV", 28, 250);
    g2.fillText("2026", 28, 278);
  } else if (kind === "grid") {
    g2.fillStyle = "#2b3550";
    g2.fillRect(0, 0, 256, 320);
    g2.strokeStyle = "rgba(255,255,255,0.35)";
    g2.lineWidth = 1;
    for (let x = 0; x <= 256; x += 32) {
      g2.beginPath();
      g2.moveTo(x, 0);
      g2.lineTo(x, 320);
      g2.stroke();
    }
    for (let y = 0; y <= 320; y += 32) {
      g2.beginPath();
      g2.moveTo(0, y);
      g2.lineTo(256, y);
      g2.stroke();
    }
    g2.strokeStyle = "#e8a06b";
    g2.lineWidth = 3;
    g2.beginPath();
    g2.arc(128, 150, 62, 0, 7);
    g2.stroke();
    g2.fillStyle = "#e8a06b";
    g2.font = "20px monospace";
    g2.fillText("PLANO·03", 24, 290);
  } else {
    g2.fillStyle = "#ece7db";
    g2.fillRect(0, 0, 256, 320);
    g2.fillStyle = "#e1121c";
    g2.beginPath();
    g2.arc(170, 100, 62, 0, 7);
    g2.fill();
    g2.fillStyle = "#111111";
    g2.fillRect(28, 220, 200, 26);
    g2.fillStyle = "#2a6d9e";
    g2.fillRect(28, 120, 56, 56);
    g2.fillStyle = "#111111";
    g2.font = "20px monospace";
    g2.fillText("IM—26", 28, 290);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* Guirnalda cálida sobre el ventanal: cable + focos con halo */
function buildGarland() {
  const a = new THREE.Vector3(-2.75, 2.62, -2.88);
  const b = new THREE.Vector3(-0.65, 2.62, -2.88);
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const k = i / 20;
    const p = new THREE.Vector3().lerpVectors(a, b, k);
    p.y -= Math.sin(k * Math.PI) * 0.22;
    pts.push(p);
  }
  const wire = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.006, 6),
    M.black,
  );
  scene.add(wire);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  for (let i = 1; i < 10; i++) {
    const p = pts[Math.round((i / 10) * 20)];
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 10, 8),
      bulbMat,
    );
    bulb.position.copy(p);
    bulb.position.y -= 0.035;
    scene.add(bulb);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getSoftDot(),
        color: 0xffc98a,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    halo.scale.set(0.16, 0.16, 1);
    halo.position.copy(bulb.position);
    scene.add(halo);
  }
}

/* Lámpara de banquero: base de latón + pantalla esmeralda, charco cálido */
function buildDeskLamp() {
  const g = new THREE.Group();
  g.position.set(0.88, 0.795, -2.2);
  const brass = new THREE.MeshStandardMaterial({
    color: 0xc9a227,
    roughness: 0.35,
    metalness: 0.65,
  });
  const emerald = new THREE.MeshStandardMaterial({
    color: 0x1f6b4a,
    roughness: 0.4,
    metalness: 0.15,
    side: THREE.DoubleSide,
    emissive: 0x0d3a26,
    emissiveIntensity: 0.5,
  });
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.085, 0.035, 18),
    brass,
  );
  base.position.y = 0.018;
  g.add(base);
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.3, 10),
    brass,
  );
  stem.position.y = 0.18;
  g.add(stem);
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), brass);
  joint.position.y = 0.33;
  g.add(joint);
  // Pantalla: semiesfera esmeralda bocabajo que abraza la ampolleta
  // (sin rotación: la semiesfera superior ya abre hacia abajo)
  const shade = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    emerald,
  );
  shade.position.y = 0.4;
  g.add(shade);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 8, 24), brass);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.4;
  g.add(rim);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe2b0 }),
  );
  bulb.position.y = 0.37;
  g.add(bulb);
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  shade.castShadow = false;
  bulb.castShadow = false;
  scene.add(g);
  const glow = new THREE.PointLight(0xffc98a, 3, 2.4, 2);
  glow.position.set(0.58, 1.1, -2.2);
  scene.add(glow);
  blobShadow(0.88, -2.2, 0.3, 0.3, 0.35, 0.8);
}

/* Vigas + farolillo colgante sobre la alfombra */
function buildBeams() {
  for (const z of [-1.5, 0.4, 2.3]) {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(7.4, 0.14, 0.18),
      M.woodDark,
    );
    beam.position.set(0, 2.83, z);
    scene.add(beam);
  }
  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8),
    M.black,
  );
  cord.position.set(0, 2.72, 0.9);
  scene.add(cord);
  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 18, 14),
    new THREE.MeshStandardMaterial({
      color: 0xf6e3c2,
      emissive: 0xffc98a,
      emissiveIntensity: 0.55,
      roughness: 0.9,
    }),
  );
  lantern.scale.y = 0.85;
  lantern.position.set(0, 2.45, 0.9);
  scene.add(lantern);
  const glow = new THREE.PointLight(0xffd9a0, 4, 6.5, 2);
  glow.position.set(0, 2.37, 0.9);
  scene.add(glow);
}

/* Cortinas con caída ondulada a los lados del ventanal */
function buildCurtains() {
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 3.1, 10),
    M.woodDark,
  );
  rod.rotation.z = Math.PI / 2;
  rod.position.set(-1.7, 2.64, -2.88);
  rod.castShadow = true;
  scene.add(rod);
  for (const s of [-1, 1]) {
    const fin = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 10),
      M.woodDark,
    );
    fin.position.set(-1.7 + s * 1.57, 2.64, -2.88);
    scene.add(fin);
  }
  const linen = new THREE.MeshStandardMaterial({
    color: 0xd9cbb2,
    roughness: 0.95,
    side: THREE.DoubleSide,
  });
  for (const cx of [-2.94, -0.46]) {
    const geo = new THREE.PlaneGeometry(0.55, 2.3, 12, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, Math.sin(((x + 0.275) / 0.55) * Math.PI * 3) * 0.06);
    }
    geo.computeVertexNormals();
    const drape = new THREE.Mesh(geo, linen);
    drape.position.set(cx, 1.48, -2.86);
    drape.castShadow = true;
    drape.receiveShadow = true;
    scene.add(drape);
  }
}

/* Posters: marcos con CanvasTexture nítida (estética indie, no pixel) */
function drawPosterCanvas(c, title, sub, lines) {
  const g2 = c.getContext("2d");
  const acc = "#" + roomAccent.color.getHexString();
  g2.fillStyle = "#f6f1e6";
  g2.fillRect(0, 0, 512, 640);
  g2.fillStyle = acc;
  g2.fillRect(0, 0, 512, 26);
  g2.fillStyle = "#1c1a17";
  g2.font = "bold 54px Outfit, sans-serif";
  const words = title.split(" ");
  let y = 120;
  for (const w of words) {
    g2.fillText(w, 44, y);
    y += 62;
  }
  g2.fillStyle = "#6b6257";
  g2.font = "28px Inter, sans-serif";
  g2.fillText(sub, 44, y + 8);
  g2.fillStyle = "#d8d0c0";
  for (let i = 0; i < lines; i++)
    g2.fillRect(44, y + 50 + i * 34, 424 - (i % 3) * 60, 12);
  g2.fillStyle = acc;
  g2.fillRect(44, 560, 150, 34);
  g2.fillStyle = "#f6f1e6";
  g2.font = "bold 20px Inter, sans-serif";
  g2.fillText("click →", 62, 584);
}
function posterTitle(id) {
  const lang = currentLang();
  if (id === "about")
    return {
      title: lang === "es" ? "SOBRE MÍ" : "ABOUT ME",
      sub: "Isaac Mora · Fullstack",
    };
  if (id === "showcase")
    return {
      title: "STYLE SHOWCASE",
      sub: lang === "es" ? "Catálogo vivo" : "Live catalogue",
    };
  if (id === "contact") return { title: "CONTACTO", sub: "hablemos · links" };
  return { title: "RUTA DE CENIZAS", sub: "Android · Godot" };
}
const posterDefs = [];
function buildPosters() {
  const defs = [
    {
      id: "about",
      lines: 5,
      pos: [-3.66, 1.66, 0.2],
      ry: Math.PI / 2,
      size: [0.95, 1.19],
    },
    {
      id: "projects",
      lines: 4,
      pos: [3.66, 1.66, 0.5],
      ry: -Math.PI / 2,
      size: [0.95, 1.19],
    },
    {
      id: "showcase",
      lines: 4,
      pos: [3.66, 1.66, -1.15],
      ry: -Math.PI / 2,
      size: [0.95, 1.19],
    },
    {
      id: "contact",
      lines: 4,
      pos: [-0.8, 1.66, 3.76],
      ry: Math.PI,
      size: [0.95, 1.19],
    },
  ];
  for (const d of defs) {
    const { title, sub } = posterTitle(d.id);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(d.size[0] + 0.1, d.size[1] + 0.1, 0.05),
      M.woodDark,
    );
    frame.position.set(...d.pos);
    frame.rotation.y = d.ry;
    // Pegados al muro: sin sombra arrojada (evita el "doble" fantasma)
    frame.castShadow = false;
    scene.add(frame);
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 640;
    drawPosterCanvas(c, title, sub, d.lines);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(d.size[0], d.size[1]),
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.85,
        emissive: 0xffffff,
        emissiveIntensity: 0,
      }),
    );
    art.position.set(...d.pos);
    art.rotation.y = d.ry;
    // Despegar 3cm del muro hacia dentro
    art.translateZ(0.032);
    scene.add(art);
    markInteractive(art, {
      id: d.id,
      dollyGap: 1.5,
      fov: 46,
      glow: art.material,
    });
    posterDefs.push({ id: d.id, canvas: c, tex, lines: d.lines });
  }
}
function redrawPosters() {
  // Solo se repinta el arte existente: los marcos no se tocan.
  for (const p of posterDefs) {
    const { title, sub } = posterTitle(p.id);
    drawPosterCanvas(p.canvas, title, sub, p.lines);
    p.tex.needsUpdate = true;
  }
}

/* Polvo flotante acogedor */
let dust;
function buildDust() {
  const n = 130;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 6;
    pos[i * 3 + 1] = 0.3 + Math.random() * 2.3;
    pos[i * 3 + 2] = -2.6 + Math.random() * 5.6;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  dust = new THREE.Points(
    g,
    new THREE.PointsMaterial({
      color: 0xffe6bf,
      size: 0.03,
      map: getSoftDot(),
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),
  );
  scene.add(dust);
}

// Se invoca aquí (y no antes): los builders asignan lets declarados arriba;
// ejecutarlo antes caía en zona muerta temporal y el módulo moría.
buildRoom();

// Sombra del visitante: un blob suave bajo la cámara vende que "estás ahí"
const playerBlob = blobShadow(SPAWN.x, SPAWN.z, 0.55, 0.55, 0.3);

/* ── Contenido DOM (panel + overlay) ─────────────────────────────────── */
const LABELS = {
  about: { es: "Póster · Sobre mí", en: "Poster · About me" },
  projects: { es: "Póster · Ruta de Cenizas", en: "Poster · Ruta de Cenizas" },
  showcase: { es: "Póster · Style Showcase", en: "Poster · Style Showcase" },
  contact: { es: "Póster · Contacto", en: "Poster · Contact" },
  monitor: {
    es: "Monitor · estación de estilos",
    en: "Monitor · style station",
  },
  door: { es: "Puerta (falsa)", en: "Door (fake)" },
  music: { es: "Equipo · radio", en: "Stereo · radio" },
  cat: { es: "Gato · acariciar", en: "Cat · pet" },
  sit: { es: "Sentarse", en: "Sit down" },
};
const PANELS = {
  about: {
    es: {
      k: "Póster · Sobre mí",
      t: "Soy Isaac",
      b: "Analista Programador y desarrollador Fullstack. Python, C#, Flutter, JS; me muevo entre backend, frontend y un poco de juegos. Esta habitación es mi CV: siéntete libre de curiosear.",
    },
    en: {
      k: "Poster · About me",
      t: "I'm Isaac",
      b: "Programmer Analyst & Fullstack developer. Python, C#, Flutter, JS — backend, frontend and a bit of games. This room is my CV: feel free to look around.",
    },
    actions: [
      { label: "GitHub ↗", href: "https://github.com/Isamorap" },
      { label: "LinkedIn ↗", href: "https://www.linkedin.com/in/isaacmop/" },
    ],
  },
  projects: {
    es: {
      k: "Póster · Proyecto",
      t: "Ruta de Cenizas",
      b: "Juego Android inspirado en Serpientes y Escaleras: subir una montaña en un mundo de cenizas. PreAlpha disponible con APK descargable.",
    },
    en: {
      k: "Poster · Project",
      t: "Ruta de Cenizas",
      b: "Android game inspired by Snakes & Ladders: climbing a mountain in a world of ashes. PreAlpha with downloadable APK.",
    },
    actions: [
      { label: "Repo ↗", href: "https://github.com/Isamorap/ruta_de_cenizas" },
      {
        label: "APK 0.0.6 ⬇",
        href: "https://github.com/Isamorap/ruta_de_cenizas/releases/download/Ruta_de_Cenizas_0.0.6/Ruta_de_Cenizas_v0.0.6.apk",
      },
    ],
  },
  showcase: {
    es: {
      k: "Póster · Proyecto",
      t: "Style Showcase",
      b: "Mi catálogo de 23 lenguajes visuales sobre la misma base de componentes — referencia para clientes y para mí cuando arranco un front.",
    },
    en: {
      k: "Poster · Project",
      t: "Style Showcase",
      b: "My catalogue of 23 visual languages on the same component base — a reference for clients and for me when starting a front-end.",
    },
    actions: [
      { label: "Galería ↗", href: "styleshowcase/index.html" },
      { label: "Espécimen ↗", href: "styleshowcase/_template/specimen.html" },
    ],
  },
  contact: {
    es: {
      k: "Póster · Contacto",
      t: "Hablemos",
      b: "Siempre abierto a nuevos proyectos e ideas. Escríbeme directo al mail o encuéntrame en estas redes.",
    },
    en: {
      k: "Poster · Contact",
      t: "Let's talk",
      b: "Always open to new projects and ideas. Write me directly or find me here.",
    },
    actions: [
      {
        label: "isaacmorap@outlook.com",
        href: "mailto:isaacmorap@outlook.com",
      },
      { label: "GitHub ↗", href: "https://github.com/Isamorap" },
      { label: "LinkedIn ↗", href: "https://www.linkedin.com/in/isaacmop/" },
    ],
  },
  music: {
    es: {
      k: "Equipo · radio 24/7",
      t: "Música del cuarto",
      b: "Sintonizador online: las 11 radios de San Andreas + ambiente 24/7. Suena desde el equipo y se apaga con la distancia.",
    },
    en: {
      k: "Stereo · 24/7 radio",
      t: "Room music",
      b: "Online tuner: all 11 San Andreas stations + 24/7 ambience. It plays from the stereo and fades with distance.",
    },
    actions: [],
    stations: [
      { section: "San Andreas" },
      { label: "Bounce FM", url: "https://audio.gtaradio.net/sa/bounce-fm" },
      { label: "CSR 103.9", url: "https://audio.gtaradio.net/sa/csr" },
      { label: "K-DST", url: "https://audio.gtaradio.net/sa/k-dst" },
      { label: "K-JAH West", url: "https://audio.gtaradio.net/sa/k-jah" },
      { label: "K-Rose", url: "https://audio.gtaradio.net/sa/k-rose" },
      {
        label: "Master Sounds 98.3",
        url: "https://audio.gtaradio.net/sa/master-sounds",
      },
      {
        label: "Playback FM",
        url: "https://audio.gtaradio.net/sa/playback-fm",
      },
      {
        label: "Radio Los Santos",
        url: "https://audio.gtaradio.net/sa/radio-los-santos",
      },
      { label: "Radio X", url: "https://audio.gtaradio.net/sa/radio-x" },
      { label: "SF-UR", url: "https://audio.gtaradio.net/sa/sfur" },
      { label: "WCTR", url: "https://audio.gtaradio.net/sa/wctr" },
      { section: "Ambiente 24/7" },
      {
        label: "Nightwave Plaza",
        url: "https://radio.plaza.one/mp3",
      },
    ],
  },
};
const ORDER = ["about", "projects", "showcase", "monitor", "contact"];
function fillPanel(id) {
  const lang = currentLang();
  const p = PANELS[id]?.[lang];
  if (!p) return;
  ui.panel.innerHTML =
    `<button class="room-close" id="room-panel-close" aria-label="Cerrar">✕</button>` +
    `<h3><span class="kicker">${p.k}</span>${p.t}</h3><p>${p.b}</p>` +
    `<div class="room-actions">${(PANELS[id].actions || [])
      .map((a) => {
        const ext = a.href.startsWith("http")
          ? ` target="_blank" rel="noopener"`
          : "";
        return `<a class="btn secondary" href="${a.href}"${ext}>${a.label}</a>`;
      })
      .join("")}</div>` +
    (PANELS[id].stations
      ? `<div class="room-actions" style="margin-top:.6rem">${PANELS[
          id
        ].stations
          .map((s) => {
            if (!s.url)
              return `</div><div class="room-stations-h">${s.section}</div><div class="room-actions" style="margin-top:.4rem">`;
            const pi = PANELS[id].stations.filter((x) => x.url).indexOf(s);
            return `<button type="button" class="btn secondary" data-station="${pi}">▶ ${s.label}</button>`;
          })
          .join(
            "",
          )}<button type="button" class="btn secondary" data-stop="1">⏹</button></div>`
      : "");
  ui.panel.classList.add("is-open");
  document
    .getElementById("room-panel-close")
    .addEventListener("click", exitFocus);
  document.getElementById("room-panel-close").focus({ preventScroll: true });
  if (PANELS[id].stations) {
    const playable = PANELS[id].stations.filter((x) => x.url);
    ui.panel.querySelectorAll("[data-station]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const s = playable[+btn.dataset.station];
        playStation(s.url, s.label);
      });
    });
    ui.panel.querySelector("[data-stop]")?.addEventListener("click", stopRadio);
  }
}
function fillScreen() {
  const lang = currentLang();
  ui.screen.querySelector(".room-screen-card").innerHTML =
    `<button class="room-close" id="room-screen-close" aria-label="Cerrar">✕</button>` +
    `<h3><span class="kicker">${lang === "es" ? "Monitor · estación de estilos" : "Monitor · style station"}</span>` +
    `${lang === "es" ? "Style Showcase" : "Style Showcase"}</h3>` +
    `<p>${
      lang === "es"
        ? "Mi muestrario de estilos UI: los mismos componentes, varias identidades. Cambia de skin aquí mismo — la habitación y el monitor cambian contigo."
        : "My UI style sampler: the same components, several identities. Switch skins right here — the room and monitor follow."
    }</p>` +
    `<div class="room-skinstage"><div class="ss-loading">…</div></div>` +
    `<div class="room-skinbar" role="group" aria-label="skins">` +
    SKINS.map(
      (s) => `<button type="button" data-skin="${s.id}">${s.label}</button>`,
    ).join("") +
    `</div>` +
    `<div class="room-actions" style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem">` +
    `<a class="btn primary" href="styleshowcase/index.html">` +
    `${lang === "es" ? "Abrir galería completa ↗" : "Open full gallery ↗"}</a></div>`;
  ui.screen.classList.add("is-open");
  document
    .getElementById("room-screen-close")
    .addEventListener("click", exitFocus);
  ui.screen.querySelectorAll("[data-skin]").forEach((btn) => {
    btn.addEventListener("click", () => setSkin(btn.dataset.skin));
  });
  ensureSkinStage();
  document.getElementById("room-screen-close").focus({ preventScroll: true });
}

/* ── Skins del monitor (solo 3, carga perezosa) ───────────────────────── */
const SKINS = [
  {
    id: "corporativo",
    file: "23-corporativo",
    label: "Corporativo · día",
    accent: 0xc96f2e,
    theme: "light",
  },
  {
    id: "ethereal",
    file: "04-ethereal",
    label: "Ethereal · atardecer",
    accent: 0x8f83e0,
    theme: "light",
  },
  {
    id: "glassmorphism",
    file: "03-glassmorphism",
    label: "Glass · noche",
    accent: 0x38bdf8,
    theme: "dark",
  },
];
let skinsLoaded = false;
let activeSkin = SKINS[0].id;
async function lazyLoadSkins() {
  if (skinsLoaded) return;
  skinsLoaded = true;
  // La base del showcase trae clases GENÉRICAS (.hero, .btn…) que romperían
  // el portfolio si se cargan tal cual (ya nos puso el hero en 1240px).
  // Se inyecta acotada con @scope: todo queda dentro de .ss-scope y los
  // skins ([data-style="…"]) ya vienen acotados de fábrica.
  const scope = document.createElement("style");
  scope.id = "ss-scope";
  document.head.appendChild(scope);
  try {
    const [tokens, comps] = await Promise.all([
      fetch("styleshowcase/tokens.css").then((r) => {
        if (!r.ok) throw new Error("tokens");
        return r.text();
      }),
      fetch("styleshowcase/components.css").then((r) => {
        if (!r.ok) throw new Error("components");
        return r.text();
      }),
    ]);
    scope.textContent = `@scope (.ss-scope) {\n${tokens}\n}\n@scope (.ss-scope) {\n${comps}\n}`;
  } catch (e) {
    scope.textContent =
      "/* showcase base no disponible: el stage usa estilos propios */";
  }
  for (const s of SKINS) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `styleshowcase/${s.file}/style.css`;
    document.head.appendChild(link);
  }
}
function ensureSkinStage() {
  const stage = ui.screen.querySelector(".room-skinstage");
  if (!stage || stage.dataset.ready) {
    paintSkinButtons();
    return;
  }
  stage.dataset.ready = "1";
  const nativeTheme =
    (SKINS.find((x) => x.id === activeSkin) || {}).theme || "light";
  stage.innerHTML =
    `<div class="ss-demo ss-scope" data-style="${activeSkin}" data-theme="${nativeTheme}">` +
    `<h4>Componentes universales</h4><p>Misma estructura, otra identidad.</p>` +
    `<div class="ss-row"><button class="btn-primary" type="button">Primario</button>` +
    `<button class="btn-accent" type="button">Acento</button>` +
    `<button class="btn-ghost" type="button">Fantasma</button></div>` +
    `<div class="ss-meta"><span class="ss-dot" style="background:var(--skin-accent,#c96f2e)"></span>` +
    `<span>tokens vivos del skin · AA verificado</span></div></div>`;
  paintSkinButtons();
}
function paintSkinButtons() {
  ui.screen
    .querySelectorAll("[data-skin]")
    .forEach((b) => b.classList.toggle("is-on", b.dataset.skin === activeSkin));
}
function setSkin(id) {
  const s = SKINS.find((x) => x.id === id);
  if (!s) return;
  activeSkin = id;
  roomAccent.color.setHex(s.accent);
  const demo = ui.screen.querySelector(".ss-demo");
  // Cada skin se diseñó en su modo nativo: sin data-theme las reglas del
  // modo contrario no aplican y el stage se ve roto.
  if (demo) {
    demo.setAttribute("data-style", id);
    demo.setAttribute("data-theme", s.theme);
  }
  lampLight.color.setHex(
    id === "corporativo" ? 0xffb46b : id === "ethereal" ? 0xc9b8ff : 0x7fd4ff,
  );
  daylight.intensity = id === "glassmorphism" ? 0.35 : 1.15;
  if (screenGlow) screenGlow.color.setHex(s.accent);
  drawScreen();
  paintSkinButtons();
}

/* ── Foco / travelling ───────────────────────────────────────────────── */
const raycaster = new THREE.Raycaster();
const centerNDC = new THREE.Vector2(0, 0);
function pickAt(nx, ny) {
  raycaster.setFromCamera({ x: nx, y: ny }, camera);
  const hits = raycaster.intersectObjects(interactables, false);
  return hits.length ? hits[0].object : null;
}
function faceFromPos(pos) {
  const dx = pos.x - view.px,
    dy = pos.y - CAM_H,
    dz = pos.z - view.pz;
  const dist = Math.hypot(dx, dy, dz);
  let yaw = Math.atan2(-dx, -dz);
  // Normalizar respecto al yaw actual (giro más corto)
  while (yaw - view.yaw > Math.PI) yaw -= Math.PI * 2;
  while (yaw - view.yaw < -Math.PI) yaw += Math.PI * 2;
  return {
    yaw,
    pitch: THREE.MathUtils.clamp(
      Math.atan2(dy, Math.hypot(dx, dz)),
      PITCH_MIN,
      PITCH_MAX,
    ),
    dist,
  };
}
function startTween(to, done) {
  if (REDUCED) {
    Object.assign(view, {
      yaw: to.yaw ?? view.yaw,
      pitch: to.pitch ?? view.pitch,
      dolly: to.dolly ?? view.dolly,
      fov: to.fov ?? view.fov,
      px: to.px ?? view.px,
      pz: to.pz ?? view.pz,
      h: to.h ?? view.h,
      tYaw: to.yaw ?? view.tYaw,
      tPitch: to.pitch ?? view.tPitch,
      tDolly: to.dolly ?? view.tDolly,
      tFov: to.fov ?? view.tFov,
      tPx: to.px ?? view.tPx,
      tPz: to.pz ?? view.tPz,
      tH: to.h ?? view.tH,
    });
    done?.();
    return;
  }
  tween = {
    from: {
      yaw: view.yaw,
      pitch: view.pitch,
      dolly: view.dolly,
      fov: view.fov,
      px: view.px,
      pz: view.pz,
      h: view.h,
    },
    to: {
      yaw: to.yaw ?? view.yaw,
      pitch: to.pitch ?? view.pitch,
      dolly: to.dolly ?? view.dolly,
      fov: to.fov ?? view.fov,
      px: to.px ?? view.px,
      pz: to.pz ?? view.pz,
      h: to.h ?? view.h,
    },
    t: 0,
    dur: to.dur ?? 1.0,
    done,
  };
}
const easeInOut = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function focusObject(mesh) {
  const data = mesh.userData.room;
  if (!data || focused) return;
  // Solo se suelta el cursor si se va a abrir UI (panel/overlay). Gato,
  // puerta y sillones no abren nada: se sigue mirando encerrado.
  if (data.id === "monitor" || PANELS[data.id]) {
    expectUnlock = true;
    unlockPointer();
  }
  // Gato: caricia (miau + te mira + saltito), sin foco ni panel
  if (data.id === "cat") {
    petCat();
    return;
  }
  // Sentarse en sillones: la cámara se muda al asiento
  if (data.id === "sit") {
    snapshot = {
      yaw: view.tYaw,
      pitch: view.tPitch,
      dolly: view.tDolly,
      fov: view.tFov,
      px: view.tPx,
      pz: view.tPz,
      h: view.tH,
    };
    focused = "sit";
    hero.classList.add("is-focused");
    ui.tip?.classList.remove("is-on");
    ui.reticle?.classList.remove("is-hot");
    startTween(
      {
        yaw: data.yaw,
        pitch: data.pitch ?? -0.02,
        dolly: 0,
        fov: 50,
        px: data.px,
        pz: data.pz,
        h: data.h ?? 1.15,
        dur: 1.8,
      },
      () => {
        flashTip(
          currentLang() === "es"
            ? "cómodo, ¿no? (WASD o E para pararte)"
            : "comfy, right? (WASD or E to stand)",
        );
      },
    );
    return;
  }
  // Objetos de chiste (puerta): tooltip y nada más, sin foco ni panel
  if (data.id !== "monitor" && !PANELS[data.id]) {
    flashTip(data.joke ? data.joke[currentLang()] || data.joke.es : "…");
    return;
  }
  snapshot = {
    yaw: view.tYaw,
    pitch: view.tPitch,
    dolly: view.tDolly,
    fov: view.tFov,
    px: view.tPx,
    pz: view.tPz,
  };
  const wp = new THREE.Vector3();
  mesh.getWorldPosition(wp);
  const f = faceFromPos(wp);
  const gap = NARROW ? data.dollyGap * 1.8 + 0.4 : data.dollyGap;
  const dolly = THREE.MathUtils.clamp(f.dist - gap, 0, 4.2);
  focused = data.id;
  hero.classList.add("is-focused");
  ui.tip?.classList.remove("is-on");
  ui.reticle?.classList.remove("is-hot");
  startTween(
    { yaw: f.yaw, pitch: f.pitch, dolly, fov: data.fov ?? 46, dur: 1.0 },
    () => {
      if (data.id === "monitor") fillScreen();
      else fillPanel(data.id);
    },
  );
  // Marca el viaje: si tabulas a mitad del travelling, al volver NO debe
  // abrirse el panel "solo" (ver visibilitychange).
  if (tween) tween.opensUI = true;
}
function exitFocus() {
  ui.panel.classList.remove("is-open");
  ui.screen.classList.remove("is-open");
  hero.classList.remove("is-focused");
  // Cerrar panel con click/tecla ES gesto: re-encerrar de inmediato para
  // seguir mirando sin fricción (si falla por cooldown, queda el hover).
  if (freeLook) lockPointer();
  if (!focused) return;
  const back = snapshot || {
    yaw: 0,
    pitch: -0.04,
    dolly: 0,
    fov: BASE_FOV,
    px: SPAWN.x,
    pz: SPAWN.z,
    h: CAM_H,
  };
  focused = null;
  startTween({ ...back, dur: 0.8 });
  anchorYaw = back.yaw;
  anchorPitch = back.pitch;
}

// Pararse del sillón SIN teletransporte: se queda donde está, de pie.
function standUp() {
  ui.panel.classList.remove("is-open");
  ui.screen.classList.remove("is-open");
  hero.classList.remove("is-focused");
  focused = null;
  view.h = view.tH = CAM_H;
}

/* ── Entrada / home ────────────────────────────────────────────────────
   La habitación ES el portfolio: se entra solo al cargar y no hay scroll.
   El botón ⌂ devuelve la cámara al asiento. */
function enterLook() {
  if (lookMode) return;
  lookMode = true;
  hero.classList.add("room-look");
  canvas.style.touchAction = "none";
  lazyLoadSkins();
}
function goHome() {
  exitFocus();
  snapshot = null;
  anchorYaw = 0;
  anchorPitch = -0.04;
  startTween({
    yaw: 0,
    pitch: -0.04,
    dolly: 0,
    fov: BASE_FOV,
    px: SPAWN.x,
    pz: SPAWN.z,
    h: CAM_H,
    dur: 0.9,
  });
}
ui.exit?.addEventListener("click", goHome);

// Menú flotante: enfoca el objeto 3D de cada sección · 🎨 cicla temas
document.getElementById("room-menu")?.addEventListener("click", (e) => {
  const b = e.target.closest("[data-focus]");
  if (b && !focused) {
    const m = interactables.find((o) => o.userData.room.id === b.dataset.focus);
    if (m) focusObject(m);
    return;
  }
  if (e.target.closest("#theme-cycle")) window.cycleTheme?.();
  if (e.target.closest("#freelook-toggle")) toggleFreeLook();
});

/* ── Gestos ────────────────────────────────────────────────────────────
   Ratón / mitad derecha táctil = mirar · mitad izquierda táctil = joystick
   para moverse · rueda = inclinarse · tap = activar */
const pointers = new Map();
let lookId = null;
let dragLast = null;
let downInfo = null;
let mouseNDC = null;
const stickUI = document.getElementById("room-stick");
const stickKnob = document.getElementById("room-knob");

function stickShow(x, y) {
  if (!stickUI) return;
  stickUI.style.display = "block";
  stickUI.style.left = `${x - 60}px`;
  stickUI.style.top = `${y - 60}px`;
  stickKnob.style.transform = "translate(0px, 0px)";
}
function stickMove() {
  if (!stickKnob) return;
  stickKnob.style.transform = `translate(${stick.dx * 34}px, ${stick.dy * 34}px)`;
}
function stickHide() {
  if (stickUI) stickUI.style.display = "none";
}

canvas.addEventListener("pointerdown", (e) => {
  if (!lookMode) return;
  const leftZone =
    e.pointerType !== "mouse" && e.clientX < window.innerWidth * 0.45;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch (err) {
    /* noop */
  }
  if (leftZone && !stick.active) {
    stick.active = true;
    stick.id = e.pointerId;
    stick.ox = e.clientX;
    stick.oy = e.clientY;
    stick.dx = 0;
    stick.dy = 0;
    stickShow(e.clientX, e.clientY);
  } else if (lookId === null) {
    lookId = e.pointerId;
    dragLast = { x: e.clientX, y: e.clientY };
    downInfo = { x: e.clientX, y: e.clientY, t: performance.now() };
    // En mirar-libre sin lock, el click re-centra el mouse (lock) en vez de
    // activar de inmediato: ese tap solo encierra el cursor, no dispara.
    if (
      freeLook &&
      e.pointerType === "mouse" &&
      document.pointerLockElement !== canvas
    ) {
      lockClick = true;
      lockPointer();
    }
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (!lookMode) return;
  // Pointer Lock: cursor centrado, derecha = derecha, click = usar
  if (document.pointerLockElement === canvas) {
    if (
      !focused &&
      !tween &&
      Math.abs(e.movementX) + Math.abs(e.movementY) > 0
    ) {
      view.tYaw -= e.movementX * 0.0023;
      view.tPitch = THREE.MathUtils.clamp(
        view.tPitch - e.movementY * 0.0021,
        PITCH_MIN,
        PITCH_MAX,
      );
      anchorYaw = view.tYaw;
      anchorPitch = view.tPitch;
    }
    return;
  }
  const p = pointers.get(e.pointerId);
  if (e.pointerId === stick.id) {
    const R = 52;
    let dx = (e.clientX - stick.ox) / R;
    let dy = (e.clientY - stick.oy) / R;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    stick.dx = dx;
    stick.dy = dy;
    stickMove();
    if (p) {
      p.x = e.clientX;
      p.y = e.clientY;
    }
    return;
  }
  if (e.pointerId !== lookId) {
    // Hover de escritorio: resaltar cursor + mirar-libre por posición
    if (!p) {
      const r = canvas.getBoundingClientRect();
      mouseNDC = {
        x: ((e.clientX - r.left) / r.width) * 2 - 1,
        y: -((e.clientY - r.top) / r.height) * 2 + 1,
      };
      if (
        freeLook &&
        e.pointerType === "mouse" &&
        lookMode &&
        !focused &&
        !tween &&
        !needRelock
      ) {
        tween = null;
        // Signo natural: cursor a la derecha = mirar a la derecha
        view.tYaw = anchorYaw - mouseNDC.x * 1.1;
        view.tPitch = THREE.MathUtils.clamp(
          anchorPitch + mouseNDC.y * 0.45,
          PITCH_MIN,
          PITCH_MAX,
        );
      }
    }
    return;
  }
  if (p) {
    p.x = e.clientX;
    p.y = e.clientY;
    if (dragLast) {
      const dx = e.clientX - dragLast.x,
        dy = e.clientY - dragLast.y;
      dragLast = { x: e.clientX, y: e.clientY };
      if (Math.abs(dx) + Math.abs(dy) > 1) {
        if (focused === "sit") standUp();
        else if (focused) exitFocus();
        tween = null;
        view.tYaw -= dx * 0.0032;
        // Natural en todas partes: arrastrar arriba = mirar arriba
        view.tPitch = THREE.MathUtils.clamp(
          view.tPitch - dy * 0.0026,
          PITCH_MIN,
          PITCH_MAX,
        );
        anchorYaw = view.tYaw;
        anchorPitch = view.tPitch;
      }
    }
  }
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (e.pointerId === stick.id) {
    stick.active = false;
    stick.id = null;
    stick.dx = 0;
    stick.dy = 0;
    stickHide();
    return;
  }
  if (e.pointerId !== lookId) return;
  const wasDown = downInfo;
  lookId = null;
  if (wasDown) {
    const moved = Math.hypot(e.clientX - wasDown.x, e.clientY - wasDown.y);
    const dt = performance.now() - wasDown.t;
    // El click que encierra el cursor no activa nada (solo centra el mouse)
    if (lockClick) {
      lockClick = false;
    } else if (moved < 8 && dt < 450) {
      handleTap(e.clientX, e.clientY);
    }
  }
  dragLast = null;
  downInfo = null;
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);

function handleTap(px, py) {
  // En lock el cursor está congelado: se apunta con la retícula (centro).
  if (document.pointerLockElement === canvas) {
    const center = pickAt(0, 0);
    if (center) {
      focusObject(center);
      return;
    }
    if (focused) {
      exitFocus();
      return;
    }
    return;
  }
  const r = canvas.getBoundingClientRect();
  const nx = ((px - r.left) / r.width) * 2 - 1;
  const ny = -((py - r.top) / r.height) * 2 + 1;
  const hit = pickAt(nx, ny);
  if (hit) {
    focusObject(hit);
    return;
  }
  if (focused) {
    exitFocus();
    return;
  }
  const center = pickAt(0, 0);
  if (center) focusObject(center);
}

// Rueda = inclinarse (en modo look el scroll de página está bloqueado)
canvas.addEventListener(
  "wheel",
  (e) => {
    if (!lookMode) return;
    e.preventDefault();
    if (focused && (e.deltaY < -30 || e.deltaY > 30)) {
      /* micro-dolly permitido */
    }
    view.tDolly = THREE.MathUtils.clamp(
      view.tDolly - e.deltaY * 0.0016,
      0,
      focused ? 4.2 : FREE_DOLLY_MAX,
    );
    tween = null;
  },
  { passive: false },
);

// Teclado: flechas miran, +/- dolly, 1-5 focos, Enter activa, ESC vuelve
const KEY_ORDER = {
  1: "about",
  2: "projects",
  3: "showcase",
  4: "monitor",
  5: "contact",
};
window.addEventListener("keyup", (e) => {
  keysDown.delete(e.code);
});
window.addEventListener("keydown", (e) => {
  if (!lookMode) return;
  if (
    e.code === "KeyW" ||
    e.code === "KeyA" ||
    e.code === "KeyS" ||
    e.code === "KeyD" ||
    e.code === "ShiftLeft" ||
    e.code === "ShiftRight"
  ) {
    keysDown.add(e.code);
    return;
  }
  if (
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)
  ) {
    e.preventDefault();
  }
  const step = 0.12;
  // IJKL = mirar (alternativa gamer a las flechas, compone con WASD)
  const k =
    e.key === "ArrowLeft" || e.code === "KeyJ"
      ? "L"
      : e.key === "ArrowRight" || e.code === "KeyL"
        ? "R"
        : e.key === "ArrowUp" || e.code === "KeyI"
          ? "U"
          : e.key === "ArrowDown" || e.code === "KeyK"
            ? "D"
            : null;
  if (k === "L") {
    view.tYaw += step;
    tween = null;
  } else if (k === "R") {
    view.tYaw -= step;
    tween = null;
  } else if (k === "U") {
    view.tPitch = THREE.MathUtils.clamp(
      view.tPitch + step * 0.6,
      PITCH_MIN,
      PITCH_MAX,
    );
    tween = null;
  } else if (k === "D") {
    view.tPitch = THREE.MathUtils.clamp(
      view.tPitch - step * 0.6,
      PITCH_MIN,
      PITCH_MAX,
    );
    tween = null;
  } else if (e.key === "f" || e.key === "F") {
    toggleFreeLook();
    return;
  } else if (e.key === "+" || e.key === "=") {
    view.tDolly = Math.min(view.tDolly + 0.15, focused ? 4.2 : FREE_DOLLY_MAX);
    tween = null;
  } else if (e.key === "-") {
    view.tDolly = Math.max(view.tDolly - 0.15, 0);
    tween = null;
  } else if (KEY_ORDER[e.key] && !focused) {
    const m = interactables.find(
      (o) => o.userData.room.id === KEY_ORDER[e.key],
    );
    if (m) focusObject(m);
  } else if (e.key === "Enter" && !focused) {
    const c = pickAt(0, 0);
    if (c) focusObject(c);
  } else if (e.key === "e" || e.key === "E") {
    // E = usar lo apuntado; sentado = pararse
    if (focused === "sit") standUp();
    else if (!focused) {
      const c = pickAt(0, 0);
      if (c) focusObject(c);
    }
  } else if (e.key === "Escape") {
    if (
      focused ||
      ui.panel.classList.contains("is-open") ||
      ui.screen.classList.contains("is-open")
    )
      exitFocus();
    else goHome();
  }
  // Las flechas también mueven el ancla del mirar-libre
  anchorYaw = view.tYaw;
  anchorPitch = view.tPitch;
});

/* Tooltip */
let flashUntil = 0;
function flashTip(text) {
  if (!ui.tip) return;
  ui.tip.textContent = text;
  ui.tip.classList.add("is-on");
  flashUntil = Date.now() + 2200;
}

/* Idioma: repintar posters al alternar (los marcos no se tocan) */
document.getElementById("language-toggle")?.addEventListener("click", () => {
  setTimeout(redrawPosters, 60);
});

/* Visibilidad: pausar fuera de pantalla (en ambiente no hay hero: siempre) */
if (hero) {
  new IntersectionObserver(
    (en) => {
      visible = en[0].isIntersecting;
    },
    { threshold: 0.02 },
  ).observe(hero);
}
document.addEventListener("visibilitychange", () => {
  // Al volver de Alt-Tab: retomar sí o sí. El `&& visible` anterior
  // dejaba `visible` en false para siempre (el observer no re-dispara
  // al volver) y la imagen quedaba congelada.
  if (document.hidden) {
    // Soltar teclas: si tabulaste con W apretada, el keyup se pierde y
    // quedaría caminando solo para siempre.
    keysDown.clear();
    stick.active = false;
    stick.id = null;
    stick.dx = 0;
    stick.dy = 0;
    stickHide();
    // Viaje a medio hacer que abriría un panel: se descarta para que al
    // volver no aparezca nada "solo". El usuario re-clickea si quiere.
    if (tween && tween.opensUI) {
      tween = null;
      focused = null;
      hero.classList.remove("is-focused");
    }
    return;
  }
  visible = true;
  clock.getDelta();
});

/* ── Bucle ───────────────────────────────────────────────────────────── */
const clock = new THREE.Clock();
let hoverCheck = 0;
let centerId = null;
let clockTick = 0;
let eqTick = 0;
function animate() {
  requestAnimationFrame(animate);
  if (!visible || document.hidden) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (tween) {
    tween.t += dt / tween.dur;
    const k = easeInOut(Math.min(tween.t, 1));
    for (const key of ["yaw", "pitch", "dolly", "fov", "px", "pz", "h"]) {
      view[key] = view["t" + key[0].toUpperCase() + key.slice(1)] =
        tween.from[key] + (tween.to[key] - tween.from[key]) * k;
    }
    if (tween.t >= 1) {
      const d = tween.done;
      tween = null;
      d?.();
    }
  } else {
    const s = REDUCED ? 1 : 1 - Math.exp(-dt * 9);
    view.yaw += (view.tYaw - view.yaw) * s;
    view.pitch += (view.tPitch - view.pitch) * s;
    view.dolly += (view.tDolly - view.dolly) * s;
    view.fov += (view.tFov - view.fov) * s;
  }
  // Caminar (WASD / joystick). Pausado durante travellings; si caminas con
  // foco abierto, el foco se suelta (igual que al arrastrar).
  if (!tween && lookMode) {
    let mx = (keysDown.has("KeyD") ? 1 : 0) - (keysDown.has("KeyA") ? 1 : 0);
    let mz = (keysDown.has("KeyS") ? 1 : 0) - (keysDown.has("KeyW") ? 1 : 0);
    if (stick.active) {
      mx += stick.dx;
      mz += stick.dy;
    }
    const len = Math.hypot(mx, mz);
    if (len > 0.05) {
      // Sentado + caminar = pararse en el sitio (sin teletransporte)
      if (focused === "sit") standUp();
      else if (focused) exitFocus();
      const run =
        keysDown.has("ShiftLeft") || keysDown.has("ShiftRight") ? 2.7 : 1.6;
      const fx = -Math.sin(view.yaw),
        fz = -Math.cos(view.yaw);
      const rx = -fz,
        rz = fx;
      const nx = ((rx * mx + fx * -mz) / len) * Math.min(len, 1);
      const nz = ((rz * mx + fz * -mz) / len) * Math.min(len, 1);
      const p = { x: view.px + nx * run * dt, z: view.pz + nz * run * dt };
      resolveCollision(p, 0.28);
      view.px = view.tPx = p.x;
      view.pz = view.tPz = p.z;
      if (!REDUCED) {
        bobPhase += dt * (run > 2 ? 11 : 8);
        bobAmp += (0.025 - bobAmp) * Math.min(dt * 6, 1);
      }
    } else {
      bobAmp += (0 - bobAmp) * Math.min(dt * 6, 1);
    }
  } else {
    bobAmp += (0 - bobAmp) * Math.min(dt * 6, 1);
  }
  applyView();
  playerBlob.position.set(view.px, 0.015, view.pz);

  // Retícula: qué hay al centro
  hoverCheck += dt;
  if (lookMode && !focused && hoverCheck > 0.12) {
    hoverCheck = 0;
    const hit = pickAt(0, 0);
    centerId = hit?.userData.room.id ?? null;
    ui.reticle?.classList.toggle("is-hot", !!centerId);
    if (Date.now() > flashUntil) {
      if (centerId && LABELS[centerId]) {
        ui.tip.textContent = LABELS[centerId][currentLang()];
        ui.tip.classList.add("is-on");
      } else {
        ui.tip?.classList.remove("is-on");
      }
    }
  }
  // Highlight del póster apuntado
  for (const m of interactables) {
    const g = m.userData.room.glow;
    if (g) {
      const target = m.userData.room.id === centerId ? 0.35 : 0;
      g.emissiveIntensity += (target - g.emissiveIntensity) * 0.2;
    }
  }
  // Cursor pointer con hover directo (escritorio)
  if (mouseNDC && lookMode && !focused) {
    const hit = pickAt(mouseNDC.x, mouseNDC.y);
    canvas.style.cursor = hit ? "pointer" : "grab";
    mouseNDC = null;
  }

  // Vida: polvo + nieve + vapor + gato + respiración
  if (!REDUCED && dust) {
    dust.rotation.y = t * 0.01;
    dust.position.y = Math.sin(t * 0.4) * 0.03;
  }
  if (!REDUCED) {
    updateSnow(dt, t);
    updateCat(dt, t);
  }
  updateSteam(dt);
  clockTick += dt;
  if (clockTick > 30) {
    clockTick = 0;
    updateClockHands();
    updateRoomClock();
  }
  eqTick += dt;
  if (eqTick > 0.12) {
    eqTick = 0;
    drawBoomScreen(t);
  }
  if (!REDUCED && !focused) {
    camera.position.y += Math.sin(t * 1.1) * 0.0006;
  }
  renderer.render(scene, camera);
  if (!window.__roomReady) {
    // Primer frame: avisa al diagnóstico de portfolio.html y entra a la silla
    // (en ambiente no hay silla: queda de fondo con deriva cinemática).
    window.__roomReady = true;
    document.body.classList.remove("room-dead");
    if (!AMBIENT) enterLook();
  }
  // Deriva lenta del modo ambiente
  if (AMBIENT && !REDUCED) {
    const at = clock.elapsedTime;
    view.yaw = view.tYaw = Math.sin(at * 0.06) * 0.5;
    view.pitch = view.tPitch = -0.03 + Math.sin(at * 0.043) * 0.05;
  }
}
applyView();
animate();
updateRoomClock();
// Diagnóstico de lectura para calibrar (posición, gato). Solo lectura.
window.__roomDebug = () => ({
  px: +view.px.toFixed(2),
  pz: +view.pz.toFixed(2),
  h: +view.h.toFixed(2),
  yaw: +view.yaw.toFixed(2),
  focused,
  cat: {
    x: +catState.x.toFixed(2),
    z: +catState.z.toFixed(2),
    attn: +catState.attn.toFixed(1),
  },
  radio: radioOn ? radioStation : null,
  audioT: radioAudio ? +radioAudio.currentTime.toFixed(1) : null,
});
