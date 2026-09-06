import * as THREE from "three";
import { CONTENT } from "./content.js";

/* ================= content injection ================= */
const $ = (s) => document.querySelector(s);

$("#hello").textContent = `${CONTENT.hello}`;
$("#name").innerHTML = [...CONTENT.name.toUpperCase()]
  .map((ch, i) => `<span style="--i:${i}">${ch}</span>`)
  .join("");
$("#role").textContent = CONTENT.role;
$("#tagline").textContent = CONTENT.tagline;
$("#foot-name").textContent = CONTENT.name;

$("#about-card").innerHTML = `
  <div class="avatar">${CONTENT.avatar}</div>
  <h3>About me</h3>
  <p>${CONTENT.about}</p>
  <ul class="facts">${CONTENT.facts.map((f) => `<li>${f}</li>`).join("")}</ul>`;

const half = Math.ceil(CONTENT.skills.length / 2);
const mkRow = (list) => {
  const pills = list.map((s) => `<span class="mq-pill">${s}</span>`).join("");
  return `${pills}${pills}`; // duplicated for a seamless -50% loop
};
$("#marquee").innerHTML = `
  <div class="mq-row">${mkRow(CONTENT.skills.slice(0, half))}</div>
  <div class="mq-row rev">${mkRow(CONTENT.skills.slice(half))}</div>`;

$("#projects").innerHTML = CONTENT.projects
  .map(
    (p) => `
  <article class="project" style="--c1:${p.c1};--c2:${p.c2}">
    <div class="p-cover"><span>${p.emoji}</span></div>
    <div class="p-body">
      <h3>${p.title}</h3>
      <p>${p.desc}</p>
      <div class="p-tags">${p.tags.map((t) => `<span>${t}</span>`).join("")}</div>
      ${p.link && p.link !== "#"
        ? `<a class="p-link" href="${p.link}" target="_blank" rel="noopener">View project →</a>`
        : `<span class="p-link ghost">More soon…</span>`}
    </div>
  </article>`
  )
  .join("");

$("#contact-buttons").innerHTML = CONTENT.contact
  .map(
    (c) => `
  <a class="c-btn" style="--c:${c.c}" href="${c.href}" ${c.href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>
    <span class="c-icon">${c.icon}</span>
    <span class="c-txt">
      <span class="c-label">${c.label}</span>
      <span class="c-value">${c.value}</span>
    </span>
    <span class="c-arrow">→</span>
  </a>`
  )
  .join("");

/* ================= toast ================= */
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ================= tiny synth (no assets) ================= */
const Sound = {
  on: true,
  ctx: null,
  ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* no audio */ }
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },
  blip(f0 = 300, f1 = 80, dur = 0.14, type = "sine", vol = 0.2) {
    if (!this.on) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
  },
  fanfare() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      setTimeout(() => this.blip(f, f, 0.2, "triangle", 0.16), i * 95)
    );
  },
};
$("#sound-toggle").addEventListener("click", (e) => {
  Sound.on = !Sound.on;
  e.currentTarget.textContent = Sound.on ? "🔊" : "🔇";
  if (Sound.on) Sound.blip(500, 900, 0.09, "sine", 0.14);
});

/* ================= three.js scene ================= */
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const canvas = $("#scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0d0821, 0.05);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 60);
camera.position.set(0, 0, 6.4);

const rig = new THREE.Group();
scene.add(rig);

/* lights */
scene.add(new THREE.AmbientLight(0x9988ff, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(3, 4, 5);
scene.add(key);
const lPink = new THREE.PointLight(0xff5fa2, 60, 40);
const lTeal = new THREE.PointLight(0x22e0c0, 60, 40);
scene.add(lPink, lTeal);

/* ---- the blob (custom noise shader) ---- */
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

const blobMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uAmp: { value: 0.34 },
    uColA: { value: new THREE.Color() },
    uColB: { value: new THREE.Color() },
    uColC: { value: new THREE.Color() },
  },
  vertexShader: NOISE + /* glsl */ `
    uniform float uTime;
    uniform float uAmp;
    varying float vNoise;
    varying vec3 vN;
    varying vec3 vV;
    void main() {
      float n  = snoise(normal * 1.35 + vec3(0.0, uTime * 0.32, uTime * 0.21));
      float n2 = snoise(normal * 3.1 - vec3(uTime * 0.26, uTime * 0.12, 0.0));
      float d = n * 0.6 + n2 * 0.28;
      vNoise = d;
      vec3 displaced = position + normal * d * uAmp;
      vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
      vN = normalize(normalMatrix * normal);
      vV = -mv.xyz;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uColA;
    uniform vec3 uColB;
    uniform vec3 uColC;
    varying float vNoise;
    varying vec3 vN;
    varying vec3 vV;
    void main() {
      vec3 N = normalize(vN);
      vec3 V = normalize(vV);
      float fres = pow(1.0 - max(dot(N, V), 0.0), 2.0);
      float t = clamp(vNoise * 0.75 + 0.5, 0.0, 1.0);
      vec3 col = mix(uColA, uColB, smoothstep(-0.6, 0.7, vNoise));
      col += fres * uColC * (0.85 + 0.35 * sin(uTime * 2.0));
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 48), blobMat);
rig.add(blob);

/* ---- orbiting shape friends ---- */
const shapeDefs = [
  { geo: new THREE.TorusKnotGeometry(0.3, 0.1, 100, 14), color: 0xff5fa2, r: 2.7, speed: 0.5,  spin: [1.2, 0.8, 0.4], y: 0.5 },
  { geo: new THREE.TorusGeometry(0.42, 0.15, 14, 48),    color: 0x22e0c0, r: 3.2, speed: -0.35, spin: [0.6, 1.1, 0.2], y: -0.5 },
  { geo: new THREE.OctahedronGeometry(0.34),             color: 0xffd166, r: 2.35, speed: 0.7, spin: [0.8, 0.4, 1.0], y: 0.95 },
  { geo: new THREE.DodecahedronGeometry(0.3),            color: 0x7c5cff, r: 3.5, speed: -0.5, spin: [0.5, 0.7, 0.9], y: -0.95 },
  { geo: new THREE.CapsuleGeometry(0.2, 0.42, 6, 14),    color: 0x4cc9f0, r: 3.0, speed: 0.42, spin: [1.0, 0.5, 0.3], y: 1.5 },
  { geo: new THREE.BoxGeometry(0.4, 0.4, 0.4),           color: 0xf72585, r: 3.85, speed: -0.28, spin: [0.7, 0.9, 0.6], y: -1.5 },
];
const shapes = shapeDefs.map((d, i) => {
  const m = new THREE.Mesh(
    d.geo,
    new THREE.MeshStandardMaterial({
      color: d.color, roughness: 0.25, metalness: 0.35,
      emissive: d.color, emissiveIntensity: 0.14,
    })
  );
  rig.add(m);
  return {
    mesh: m, r: d.r, speed: d.speed, spin: d.spin, y: d.y,
    phase0: (i / shapeDefs.length) * Math.PI * 2,
    bob: Math.random() * Math.PI * 2,
  };
});

/* ---- starfield ---- */
const STAR_N = 550;
const starPos = new Float32Array(STAR_N * 3);
for (let i = 0; i < STAR_N; i++) {
  const r = 9 + Math.random() * 24;
  const th = Math.random() * Math.PI * 2;
  const ph = Math.acos(2 * Math.random() - 1);
  starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
  starPos[i * 3 + 1] = r * Math.cos(ph);
  starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({
  color: 0xc9b6ff, size: 0.075, sizeAttenuation: true,
  transparent: true, opacity: 0.85,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

/* ---- burst particles (pops & confetti) ---- */
const MAXP = 260;
const parts = Array.from({ length: MAXP }, () => ({
  active: false, life: 0, maxLife: 1,
  x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
}));
const partPos = new Float32Array(MAXP * 3);
const partCol = new Float32Array(MAXP * 3);
const partGeo = new THREE.BufferGeometry();
partGeo.setAttribute("position", new THREE.BufferAttribute(partPos, 3));
partGeo.setAttribute("color", new THREE.BufferAttribute(partCol, 3));
const partMat = new THREE.PointsMaterial({
  size: 0.085, vertexColors: true, transparent: true, opacity: 0.95,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
const partsMesh = new THREE.Points(partGeo, partMat);
partsMesh.frustumCulled = false;
scene.add(partsMesh);
partGeo.setDrawRange(0, 0);

const PALETTE = [0xff5fa2, 0x22e0c0, 0xffd166, 0x7c5cff, 0xffffff];
const tmpColor = new THREE.Color();
function spawnBurst(count, power = 1) {
  let spawned = 0;
  for (const p of parts) {
    if (spawned >= count) break;
    if (p.active) continue;
    p.active = true;
    p.life = p.maxLife = 0.9 + Math.random() * 0.7;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    const s = (1.4 + Math.random() * 2.2) * power;
    p.x = Math.sin(ph) * Math.cos(th) * 0.3;
    p.y = Math.cos(ph) * 0.3;
    p.z = Math.sin(ph) * Math.sin(th) * 0.3;
    p.vx = Math.sin(ph) * Math.cos(th) * s;
    p.vy = Math.cos(ph) * s + 0.5;
    p.vz = Math.sin(ph) * Math.sin(th) * s;
    tmpColor.setHex(PALETTE[(Math.random() * PALETTE.length) | 0]);
    const idx = parts.indexOf(p) * 3;
    partCol[idx] = tmpColor.r;
    partCol[idx + 1] = tmpColor.g;
    partCol[idx + 2] = tmpColor.b;
    spawned++;
  }
}
function updateParticles(dt) {
  let draw = 0;
  for (const p of parts) {
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) { p.active = false; continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    p.vx *= 1 - 1.4 * dt; p.vy *= 1 - 1.4 * dt; p.vz *= 1 - 1.4 * dt;
    p.vy -= 1.1 * dt;
    const i3 = draw * 3;
    partPos[i3] = p.x; partPos[i3 + 1] = p.y; partPos[i3 + 2] = p.z;
    draw++;
  }
  partGeo.attributes.position.needsUpdate = true;
  partGeo.attributes.color.needsUpdate = true;
  partGeo.setDrawRange(0, draw);
}

/* ================= interaction state ================= */
let scrollP = 0;
const onScroll = () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  scrollP = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
};
addEventListener("scroll", onScroll, { passive: true });
onScroll();

let tRotX = 0.12, tRotY = 0, velX = 0, velY = 0;
let dragging = false, moved = 0, lastX = 0, lastY = 0, downX = 0, downY = 0, downT = 0;
let autoRot = 0;
let pop = 0, popV = 0;            // blob squash spring
let hueSpin = 0;                  // accumulated party hue spin
let party = 0, partyUntil = 0;    // party mode 0..1

let holdTimer = null, holdShowTimer = null, holdActive = false, ringVisible = false;
function showRing() {
  if (ringVisible) return;
  ringVisible = true;
  $("#hold-ring").hidden = false;
}
function hideRing() {
  if (!ringVisible) return;
  ringVisible = false;
  $("#hold-ring").hidden = true;
}
function cancelHold() {
  if (!holdActive) return;
  holdActive = false;
  clearTimeout(holdTimer);
  clearTimeout(holdShowTimer);
  hideRing();
}

function startParty(ms, msg = "🪩 PARTY MODE!") {
  partyUntil = performance.now() + ms;
  Sound.fanfare();
  spawnBurst(140, 1.5);
  toast(msg);
}

/* canvas pointer: drag = spin, tap = pop, hold = surprise */
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

canvas.addEventListener("pointerdown", (e) => {
  dragging = true;
  moved = 0;
  lastX = downX = e.clientX;
  lastY = downY = e.clientY;
  downT = performance.now();
  velX = velY = 0;
  Sound.ensure();

  holdActive = true;
  clearTimeout(holdTimer);
  clearTimeout(holdShowTimer);
  holdShowTimer = setTimeout(showRing, 250);
  holdTimer = setTimeout(() => {
    // long-press easter egg
    if (!holdActive) return;
    holdActive = false;
    startParty(8000);
    setTimeout(hideRing, 1400);
  }, 1800);
});

addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  moved += Math.abs(dx) + Math.abs(dy);
  lastX = e.clientX; lastY = e.clientY;
  if (moved > 14) cancelHold(); // user is dragging, cancel hold
  tRotY += dx * 0.0052;
  tRotX += dy * 0.0038;
  tRotX = Math.max(-0.85, Math.min(0.85, tRotX));
  velY = dx * 0.0045;
  velX = dy * 0.0025;
});

const endPointer = (e) => {
  if (!dragging) return;
  dragging = false;
  cancelHold();
  const dt = performance.now() - downT;
  if (e.type === "pointerup" && moved < 12 && dt < 380) {
    // tap → poke the blob?
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.intersectObject(blob).length) {
      popV += 6.5;
      spawnBurst(46, 1);
      Sound.blip(320, 70, 0.16, "sine", 0.24);
    }
  }
};
addEventListener("pointerup", endPointer);
addEventListener("pointercancel", () => {
  dragging = false;
  cancelHold();
});

/* logo: tap 5× → party */
let logoTaps = 0, logoTimer;
$("#logo").addEventListener("click", () => {
  logoTaps++;
  clearTimeout(logoTimer);
  logoTimer = setTimeout(() => (logoTaps = 0), 1400);
  Sound.blip(600, 900, 0.06, "sine", 0.1);
  if (logoTaps >= 5) {
    logoTaps = 0;
    const logo = $("#logo");
    logo.classList.remove("party-bounce");
    void logo.offsetWidth; // restart animation
    logo.classList.add("party-bounce");
    startParty(6000, "✨ you found the secret! ✨");
  }
});

/* device tilt parallax (free events only, no permission flow) */
let tiltX = 0, tiltY = 0;
addEventListener("deviceorientation", (e) => {
  if (e.gamma == null || e.beta == null) return;
  tiltX = Math.max(-30, Math.min(30, e.gamma)) * 0.012;
  tiltY = Math.max(-40, Math.min(60, e.beta - 45)) * 0.012;
});

/* ================= scroll reveals ================= */
const io = new IntersectionObserver(
  (entries) =>
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("in");
        io.unobserve(en.target);
      }
    }),
  { threshold: 0.2 }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

/* ================= project card 3D tilt ================= */
document.querySelectorAll(".project").forEach((card) => {
  const setTilt = (px, py, press = 1) => {
    card.style.transform =
      `perspective(700px) rotateY(${px * 9}deg) rotateX(${-py * 9}deg) scale(${press})`;
  };
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    setTilt((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
  });
  card.addEventListener("pointerdown", () => {
    Sound.blip(520, 760, 0.06, "sine", 0.08);
    const r = card.getBoundingClientRect();
    setTilt(0, 0, 0.955);
  });
  const reset = () => (card.style.transform = "");
  card.addEventListener("pointerup", reset);
  card.addEventListener("pointerleave", reset);
  card.addEventListener("pointercancel", reset);
});

/* ================= render loop ================= */
const clock = new THREE.Clock();
const colA = new THREE.Color(), colB = new THREE.Color(), colC = new THREE.Color();
let introPopDone = false;

renderer.setAnimationLoop(() => {
  if (document.hidden) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  const now = performance.now();

  /* intro pop ~1s after load */
  if (!introPopDone && time > 1.1) {
    introPopDone = true;
    popV += 5;
    spawnBurst(60, 1.2);
  }

  /* party easing */
  const isParty = now < partyUntil;
  party += ((isParty ? 1 : 0) - party) * Math.min(1, dt * 3.5);
  hueSpin += dt * party * 0.5;
  autoRot += dt * (reducedMotion ? 0.03 : 0.14 + party * 1.7);

  /* drag inertia when not dragging */
  if (!dragging) {
    tRotY += velY;
    tRotX += velX;
    tRotX = Math.max(-0.85, Math.min(0.85, tRotX));
    velY *= 0.94;
    velX *= 0.94;
  }

  /* blob squash spring */
  popV += (-110 * pop - 11 * popV) * dt;
  pop += popV * dt;
  const blobScale = 1 + Math.max(pop, -0.35) * 0.16;
  blob.scale.setScalar(blobScale);

  /* blob uniforms */
  const hue = 0.86 + scrollP * 0.5 + hueSpin;
  colA.setHSL(hue, 0.85, 0.4);
  colB.setHSL(hue + 0.09, 0.9, 0.62);
  colC.setHSL(hue + 0.52, 0.9, 0.66);
  const u = blobMat.uniforms;
  u.uTime.value = time;
  u.uAmp.value = 0.34 + scrollP * 0.12 + party * 0.3 + Math.max(pop, 0) * 0.35;

  /* rig */
  rig.rotation.y = tRotY + autoRot;
  rig.rotation.x = tRotX + scrollP * 0.35;

  /* shapes orbit */
  for (const s of shapes) {
    const a = s.phase0 + time * s.speed * (1 + party * 2.2);
    s.mesh.position.set(
      Math.cos(a) * s.r,
      s.y + Math.sin(time * 0.8 + s.bob) * 0.28,
      Math.sin(a) * s.r * 0.8
    );
    s.mesh.rotation.set(time * s.spin[0], time * s.spin[1], time * s.spin[2]);
  }

  /* lights orbit */
  lPink.position.set(Math.cos(time * 0.7) * 4, Math.sin(time * 0.5) * 2.5, Math.sin(time * 0.7) * 4);
  lTeal.position.set(Math.cos(-time * 0.6 + 2) * 4, Math.sin(time * 0.4 + 1) * 2.5, Math.sin(-time * 0.6 + 2) * 4);

  /* stars */
  stars.rotation.y = time * 0.012 * (1 + scrollP * 2 + party * 5);
  stars.rotation.x = scrollP * 0.3;

  /* camera: scroll dolly + tilt parallax */
  camera.position.x += (tiltX * 2.2 - camera.position.x) * Math.min(1, dt * 3);
  camera.position.y += (-tiltY * 1.6 + Math.sin(time * 0.5) * 0.06 - camera.position.y) * Math.min(1, dt * 3);
  camera.position.z = 6.4 - scrollP * 1.3 + party * 0.4;
  camera.lookAt(0, 0, 0);

  updateParticles(dt);
  renderer.render(scene, camera);
});

/* ================= resize ================= */
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  onScroll();
});
