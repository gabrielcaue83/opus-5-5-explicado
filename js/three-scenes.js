/* Opus 5.5, explicado — as duas cenas em Three.js
   1. Abertura: pedaços de palavra (tokens) flutuam atrás do título e são lidos pela janela que se abre.
   2. A pilha: 680 mil linhas de código impressas viram uma pilha de papel de 1,13 m, que depois é "migrada". */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

const ST = window.ScrollTrigger;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;

const hasGL = (() => {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
})();

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const dpr = () => Math.min(window.devicePixelRatio || 1, 1.75);
const fmt = (n, d = 0) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

// gerador fixo, para a pilha ter sempre o mesmo desenho
const seeded = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Desenha só enquanto o elemento está na tela; com movimento reduzido, desenha uma vez.
function runWhileVisible(el, frame) {
  let raf = 0;
  let visible = false;
  let last = performance.now();
  const tick = (now) => {
    if (!visible) { raf = 0; return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frame(dt, now / 1000);
    raf = requestAnimationFrame(tick);
  };
  if (reduced) return;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }, { rootMargin: '100px 0px' }).observe(el);
}

function sizeRenderer(renderer, camera, canvas) {
  const w = canvas.clientWidth || 1;
  const h = canvas.clientHeight || 1;
  renderer.setPixelRatio(dpr());
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  return { w, h };
}

function textTexture(text, { color = '#050f16', bg = null, size = 64, weight = 600, pad = 10 } = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = `${weight} ${size}px Barlow, "Arial Narrow", sans-serif`;
  ctx.font = font;
  const padX = bg ? size * 0.38 : pad;
  const w = Math.ceil(ctx.measureText(text).width + padX * 2);
  const h = Math.ceil(size * (bg ? 1.45 : 1.25));
  c.width = w;
  c.height = h;
  ctx.font = font;
  ctx.textBaseline = 'middle';
  if (bg) {
    ctx.fillStyle = bg;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, 0, w, h, h * 0.26); else ctx.rect(0, 0, w, h);
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.fillText(text, padX, h / 2 + size * 0.04);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, aspect: w / h };
}

/* ------------------------------------------------------------------
   1. Abertura: tokens
   ------------------------------------------------------------------ */
function heroTokens() {
  const canvas = document.querySelector('[data-tokens]');
  const opening = document.querySelector('.opening');
  const slot = document.querySelector('.hero__slot');
  if (!canvas || !opening || !slot) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
  const BASE_Z = 6;
  camera.position.set(0, 0, BASE_Z);
  const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

  // pedaços reais de palavras em português, como um modelo as quebra
  const PIECES = ['pa', 'la', 'vra', 'to', 'ken', 'pen', 'sa', 'men', 'to', 'có', 'digo', 'li', 'nhas', 'mi', 'lhão',
    'res', 'pos', 'ta', 'cur', 'ta', 'di', 're', 'to', 'an', 'tes', 'de', 'es', 'for', 'ço', 'cla', 'ro', 'im', 'por', 'ta',
    'o', 'que', 'mais', 'lê', 'es', 'cre', 've', '?', '.', ','];
  const cache = new Map();
  const tex = (t, chip) => {
    const k = t + (chip ? '§' : '');
    if (!cache.has(k)) cache.set(k, chip ? textTexture(t, { color: '#ff7a1f', bg: '#050f16', size: 56 }) : textTexture(t, { color: '#5a2306', size: 64 }));
    return cache.get(k);
  };

  const rnd = seeded(5);
  const r = (a, b) => a + (b - a) * rnd();
  const COUNT = innerWidth < 700 ? 46 : 84;
  const items = [];
  for (let i = 0; i < COUNT; i++) {
    const chip = rnd() < 0.14;
    const word = PIECES[Math.floor(rnd() * PIECES.length)];
    const { tex: map, aspect } = tex(word, chip);
    const mat = new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, opacity: 0 });
    const sprite = new THREE.Sprite(mat);
    scene.add(sprite);
    items.push({
      sprite, aspect,
      nx: r(-1.08, 1.08), ny: r(-1.15, 1.15), d: r(7, 19),
      px: chip ? r(24, 32) : r(16, 30),
      vy: r(0.008, 0.026), sway: r(0.2, 0.6), phase: r(0, Math.PI * 2),
      alpha: chip ? 0.9 : r(0.4, 0.75),
      k: rnd(),
      vis: 1,
    });
  }

  let view = sizeRenderer(renderer, camera, canvas);
  addEventListener('resize', () => { view = sizeRenderer(renderer, camera, canvas); if (reduced) draw(0, 0); });

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ty = -((e.clientY / innerHeight) * 2 - 1);
  }, { passive: true });

  const pinTrigger = () => (ST ? ST.getAll().find((t) => t.pin === opening) : null);

  // tokens somem perto do que se lê: título, frase de apoio, botão e cabeçalho
  let zones = [];
  let zonesAt = -1;
  const readZones = () => {
    const cr = canvas.getBoundingClientRect();
    zones = ['.hero__title', '.hero__lead', '.hero__cta', '.top'].map((sel) => document.querySelector(sel)).filter(Boolean).map((el) => {
      const b = el.getBoundingClientRect();
      const pad = 22;
      return {
        x0: ((b.left - pad - cr.left) / cr.width) * 2 - 1,
        x1: ((b.right + pad - cr.left) / cr.width) * 2 - 1,
        y0: -(((b.bottom + pad - cr.top) / cr.height) * 2 - 1),
        y1: -(((b.top - pad - cr.top) / cr.height) * 2 - 1),
      };
    });
  };
  const inZone = (x, y) => zones.some((z) => x > z.x0 && x < z.x1 && y > z.y0 && y < z.y1);
  // os tokens aparecem só depois do preloader
  let born = window.__opusLoaded || !document.querySelector('[data-loader]') ? performance.now() / 1000 : Infinity;
  addEventListener('opus:loaded', () => { born = performance.now() / 1000; }, { once: true });

  function draw(dt, t) {
    // o quanto a janela já se abriu (só na cena de rolagem do desktop)
    const pin = opening.classList.contains('is-scene') ? pinTrigger() : null;
    const absorb = pin ? clamp01(pin.progress / 0.42) : 0;
    const appear = reduced ? 1 : smooth(clamp01((t - born - 0.25) / 1.4));

    pointer.x = lerp(pointer.x, pointer.tx, 1 - Math.exp(-dt * 3));
    pointer.y = lerp(pointer.y, pointer.ty, 1 - Math.exp(-dt * 3));
    camera.position.set(pointer.x * 0.45, pointer.y * 0.3, BASE_Z);
    camera.lookAt(0, 0, BASE_Z - 12);

    // para onde os tokens são puxados: o centro da faixa do título
    const cr = canvas.getBoundingClientRect();
    const sr = slot.getBoundingClientRect();
    const tnx = ((sr.left + sr.width / 2 - cr.left) / cr.width) * 2 - 1;
    const tny = -(((sr.top + sr.height / 2 - cr.top) / cr.height) * 2 - 1);
    const aspect = view.w / view.h;
    if (zonesAt < 0 || t - zonesAt > 0.5) { readZones(); zonesAt = t; }

    for (const it of items) {
      if (!reduced) {
        it.ny += it.vy * dt;
        if (it.ny > 1.2) { it.ny = -1.2; it.nx = r(-1.08, 1.08); }
      }
      const half = halfTan * it.d;
      const sway = reduced ? 0 : Math.sin(t * it.sway + it.phase) * 0.012;
      let x = (it.nx + sway) * half * aspect;
      let y = it.ny * half;
      const z = BASE_Z - it.d;
      const a = smooth(clamp01(absorb * 1.35 - it.k * 0.35));
      const e = a * a;
      x = lerp(x, tnx * half * aspect, e);
      y = lerp(y, tny * half, e);
      it.sprite.position.set(x, y, z);
      const worldPerPx = (2 * half) / view.h;
      const s = it.px * worldPerPx * (1 - 0.7 * e);
      it.sprite.scale.set(s * it.aspect, s, 1);
      const hidden = e < 0.05 && inZone(it.nx + sway, it.ny);
      it.vis = reduced ? (hidden ? 0 : 1) : lerp(it.vis, hidden ? 0 : 1, 1 - Math.exp(-dt * 8));
      const depthFade = lerp(1, 0.5, (it.d - 7) / 12);
      it.sprite.material.opacity = it.alpha * depthFade * appear * it.vis * (1 - smooth(clamp01((e - 0.5) / 0.5)));
    }
    renderer.render(scene, camera);
  }

  canvas.classList.add('is-ready');
  if (reduced) draw(0, 0);
  else runWhileVisible(opening, draw);
}

/* ------------------------------------------------------------------
   2. A pilha de 680 mil linhas
   ------------------------------------------------------------------ */
function paperStack() {
  const section = document.querySelector('[data-stack]');
  const stage = section && section.querySelector('.stack__stage');
  const canvas = section && section.querySelector('[data-stack-canvas]');
  if (!canvas || !stage) return;
  const steps = [...section.querySelectorAll('[data-step]')];
  const outPages = section.querySelector('[data-stack-pages]');
  const outHeight = section.querySelector('[data-stack-height]');
  const outDone = section.querySelector('[data-stack-done]');

  const LINES = 680000;
  const PER_SHEET = 60;
  const SHEET_MM = 0.1;
  const SHEETS = Math.ceil(LINES / PER_SHEET); // 11.334 folhas
  const PACK = 50; // folhas por bloco desenhado
  const PACKS = Math.ceil(SHEETS / PACK);
  const PACK_H = (PACK * SHEET_MM) / 1000;
  const FULL_H = (SHEETS * SHEET_MM) / 1000; // 1,1334 m

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 40);

  scene.add(new THREE.HemisphereLight(0xfff3e6, 0x0b1620, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(1.6, 2.8, 2.0);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff7a1f, 1.4);
  rim.position.set(-2.2, 1.4, -1.6);
  scene.add(rim);

  // chão discreto e uma sombra de contato sob a pilha
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d');
  const grd = sctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,0.65)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = grd;
  sctx.fillRect(0, 0, 128, 128);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.72), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.001;
  scene.add(contact);

  // os blocos de papel, com a linha laranja que marca o que já foi migrado
  const uniforms = { uScan: { value: 99 }, uDone: { value: new THREE.Color('#ff7a1f') } };
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.93, metalness: 0 });
  paperMat.onBeforeCompile = (sh) => {
    sh.uniforms.uScan = uniforms.uScan;
    sh.uniforms.uDone = uniforms.uDone;
    sh.vertexShader = 'varying float vWorldY;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n  vWorldY = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).y;',
    );
    sh.fragmentShader = 'uniform float uScan;\nuniform vec3 uDone;\nvarying float vWorldY;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, uDone, step(uScan, vWorldY) * 0.95);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += uDone * (1.0 - smoothstep(0.0, 0.012, abs(vWorldY - uScan))) * 1.8;');
  };
  const packGeo = new THREE.BoxGeometry(0.21, PACK_H, 0.297);
  packGeo.translate(0, PACK_H / 2, 0);
  const packs = new THREE.InstancedMesh(packGeo, paperMat, PACKS);
  packs.frustumCulled = false;
  const rnd = seeded(680);
  const r = (a, b) => a + (b - a) * rnd();
  const base = [];
  const color = new THREE.Color();
  let ox = 0;
  let oz = 0;
  for (let i = 0; i < PACKS; i++) {
    ox = THREE.MathUtils.clamp(ox + r(-0.0018, 0.0018), -0.016, 0.016);
    oz = THREE.MathUtils.clamp(oz + r(-0.0018, 0.0018), -0.016, 0.016);
    base.push({ x: ox + r(-0.0014, 0.0014), z: oz + r(-0.0014, 0.0014), ry: r(-0.035, 0.035) });
    color.setHSL(0.08, r(0.12, 0.3), r(0.84, 0.95));
    packs.setColorAt(i, color);
  }
  scene.add(packs);

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const eu = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3(1, 1, 1);
  let lastSheets = -1;
  let stackH = 0;
  const setSheets = (n) => {
    n = Math.round(n);
    if (n === lastSheets) return;
    lastSheets = n;
    const full = Math.floor(n / PACK);
    const rest = (n % PACK) / PACK;
    const count = Math.min(PACKS, full + (rest > 0 ? 1 : 0));
    for (let i = 0; i < count; i++) {
      const b = base[i];
      eu.set(0, b.ry, 0);
      q.setFromEuler(eu);
      pos.set(b.x, i * PACK_H, b.z);
      scl.set(1, i === full ? Math.max(rest, 0.04) : 1, 1);
      m4.compose(pos, q, scl);
      packs.setMatrixAt(i, m4);
    }
    packs.count = count;
    packs.instanceMatrix.needsUpdate = true;
    stackH = (n * SHEET_MM) / 1000;
  };

  // a faixa de luz que percorre a pilha
  const scanPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.42),
    new THREE.MeshBasicMaterial({ color: 0xff7a1f, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
  );
  scanPlane.rotation.x = -Math.PI / 2;
  scanPlane.visible = false;
  scene.add(scanPlane);

  // folhas que caem sobre o topo enquanto a pilha cresce
  const sheetGeo = new THREE.BoxGeometry(0.21, 0.0008, 0.297);
  const falling = Array.from({ length: 4 }, (_, i) => {
    const m = new THREE.Mesh(sheetGeo, new THREE.MeshStandardMaterial({ color: 0xfbf6ef, roughness: 0.9, transparent: true }));
    m.userData.offset = i * 0.22;
    m.visible = false;
    scene.add(m);
    return m;
  });

  // a mesa de escritório (75 cm), para dar a escala
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x1f3242, roughness: 0.75 });
  const desk = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 0.6), deskMat);
  top.position.y = 0.735;
  desk.add(top);
  for (const [lx, lz] of [[-0.51, -0.26], [0.51, -0.26], [-0.51, 0.26], [0.51, 0.26]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.72, 0.04), deskMat);
    leg.position.set(lx, 0.36, lz);
    desk.add(leg);
  }
  desk.position.set(0.86, 0, -0.18);
  scene.add(desk);

  // régua com marcas a cada 10 cm
  const rulerMat = new THREE.MeshStandardMaterial({ color: 0x4d6577, roughness: 0.6 });
  const ruler = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.006, 1.25, 0.006), rulerMat);
  bar.position.y = 0.625;
  ruler.add(bar);
  for (let i = 0; i <= 12; i++) {
    const big = i % 5 === 0;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.05 : 0.028, 0.004, 0.004), rulerMat);
    tick.position.set(big ? 0.022 : 0.012, i * 0.1, 0);
    ruler.add(tick);
  }
  const marker = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.006, 0.006), new THREE.MeshBasicMaterial({ color: 0xff7a1f }));
  marker.position.x = 0.03;
  ruler.add(marker);
  ruler.position.set(-0.27, 0, 0.12);
  scene.add(ruler);

  const label = (text, x, y, z, h = 0.034, color = '#9eabb5', anchor = 0) => {
    const { tex, aspect } = textTexture(text, { color, size: 64, weight: 500 });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.scale.set(h * aspect, h, 1);
    s.center.set(anchor, 0.5);
    s.position.set(x, y, z);
    scene.add(s);
    return s;
  };
  label('50 cm', -0.3, 0.5, 0.12, 0.034, '#9eabb5', 1);
  label('1 m', -0.3, 1.0, 0.12, 0.034, '#9eabb5', 1);
  label('mesa de escritório, 75 cm', 0.42, 0.79, 0.14, 0.03);

  // estado da rolagem
  let progress = reduced ? 1 : 0;
  let lastMove = 0;
  const cam = { th: 0.95, r: 0.8, y: 0.3, ty: 0.1, tx: 0 };
  const desired = { ...cam };

  const solve = (p) => {
    const grow = clamp01((p - 0.06) / 0.5);
    const back = smooth(clamp01((p - 0.56) / 0.12));
    const scan = clamp01((p - 0.68) / 0.27);
    setSheets(SHEETS * (1 - Math.pow(1 - grow, 1.6)));
    const tY = Math.max(0.08, stackH * 0.92);
    desired.th = lerp(lerp(0.95, 0.35, grow), lerp(0.42, 0.62, scan), back);
    desired.r = lerp(lerp(0.78, 1.4, grow), 2.75, back);
    desired.y = lerp(tY + lerp(0.2, 0.3, grow), 1.02, back);
    desired.ty = lerp(tY - 0.04, 0.56, back);
    desired.tx = lerp(0, 0.3, back);
    uniforms.uScan.value = scan > 0 ? lerp(FULL_H + 0.015, -0.02, smooth(scan)) : 99;
    scanPlane.visible = scan > 0 && scan < 1;
    scanPlane.position.y = uniforms.uScan.value;
    marker.position.y = stackH;

    // texto ao lado: um passo por vez
    const idx = p < 0.17 ? 0 : p < 0.45 ? 1 : p < 0.64 ? 2 : 3;
    steps.forEach((s, i) => s.classList.toggle('is-on', i === idx));
    outPages.textContent = fmt(Math.round(stackH * 10000));
    outHeight.textContent = `${fmt(stackH, 2)} m`;
    outDone.textContent = `${Math.round(smooth(scan) * 100)}%`;
    return grow;
  };

  let view = sizeRenderer(renderer, camera, canvas);
  addEventListener('resize', () => { view = sizeRenderer(renderer, camera, canvas); if (reduced) draw(1, 0); });

  function draw(dt, t) {
    const grow = solve(progress);
    const k = reduced ? 1 : 1 - Math.exp(-dt * 5);
    for (const key of Object.keys(cam)) cam[key] = lerp(cam[key], desired[key], k);
    // telas estreitas (celular) afastam a câmera para a pilha, a régua e a mesa caberem
    const fit = Math.max(1, Math.pow(1.05 / camera.aspect, 0.95));
    camera.position.set(Math.sin(cam.th) * cam.r * fit + cam.tx, cam.y + (fit - 1) * 0.25, Math.cos(cam.th) * cam.r * fit);
    camera.lookAt(cam.tx, cam.ty, 0);

    // folhas caindo só enquanto a pilha cresce e a pessoa está rolando
    const active = !reduced && grow > 0 && grow < 1 && t - lastMove < 0.5;
    for (const m of falling) {
      m.visible = active;
      if (!active) continue;
      const s = ((t + m.userData.offset) % 0.88) / 0.88;
      m.position.set(Math.sin(s * 5 + m.userData.offset * 9) * 0.02, stackH + 0.36 * (1 - s * s) + 0.002, Math.cos(s * 4) * 0.015);
      m.rotation.set(Math.sin(s * 6 + m.userData.offset) * 0.25 * (1 - s), m.userData.offset * 3, Math.cos(s * 5) * 0.2 * (1 - s));
      m.material.opacity = Math.min(1, s * 6);
    }
    renderer.render(scene, camera);
  }

  canvas.classList.add('is-ready');
  section.classList.add('has-3d');

  if (reduced || !ST) {
    draw(1, 0);
    return;
  }

  section.classList.add('is-run');
  ST.create({
    trigger: stage,
    start: 'top top',
    end: '+=240%',
    pin: true,
    scrub: true,
    onUpdate: (s) => { progress = s.progress; lastMove = performance.now() / 1000; },
  });
  ST.sort();
  ST.refresh();
  runWhileVisible(stage, draw);
}

// avisa o preloader que as cenas 3D estão montadas (ou que não há 3D neste aparelho)
function signalReady() {
  window.__opus3dReady = true;
  dispatchEvent(new Event('opus:3d-ready'));
}

if (!hasGL) signalReady();

if (hasGL) {
  root.classList.add('has-webgl');
  const start = () => {
    try { heroTokens(); } catch (err) { console.warn('Cena dos tokens não iniciou:', err); }
    try { paperStack(); } catch (err) { console.warn('Cena da pilha não iniciou:', err); }
    signalReady();
  };
  // os rótulos 3D usam a fonte Barlow: espera ela carregar (no máximo 1,5 s)
  const fontsReady = document.fonts ? Promise.race([document.fonts.load('600 64px Barlow'), new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve();
  fontsReady.then(start, start);
}
