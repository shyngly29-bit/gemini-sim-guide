// Сайт-инструкция: 3D-ноутбук, камера и экран меняются по прокрутке
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sections = [...document.querySelectorAll('[data-ch]')];
const dots = [...document.querySelectorAll('.dots a')];
const barFill = document.getElementById('barFill');

// ---------- Копирование промптов ----------
document.querySelectorAll('.copy').forEach(b => b.addEventListener('click', async () => {
  const el = document.getElementById(b.dataset.copy);
  const txt = el.textContent.trim();
  try { await navigator.clipboard.writeText(txt); b.textContent = 'Көшірілді ✓'; }
  catch (e) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Ctrl+C басыңыз'; }
  setTimeout(() => (b.textContent = 'Көшіру'), 2000);
}));

// ---------- Прогресс прокрутки: t = номер секции (дробный) ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = x => x * x * (3 - 2 * x);
function scrollT() {
  const vc = innerHeight * 0.5;
  const c = sections.map(s => { const r = s.getBoundingClientRect(); return r.top + r.height / 2; });
  if (vc <= c[0]) return 0;
  for (let i = 0; i < c.length - 1; i++) if (vc <= c[i + 1]) return i + (vc - c[i]) / (c[i + 1] - c[i]);
  return c.length - 1;
}
function ui(t) {
  const max = document.documentElement.scrollHeight - innerHeight;
  barFill.style.width = (max > 0 ? scrollY / max * 100 : 0) + '%';
  const on = Math.round(t);
  dots.forEach((d, i) => d.classList.toggle('on', i === on));
}

function hasWebGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }

// ---------- Рисование на canvas ----------
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function wrap(g, text, x, y, maxW, lh, maxLines = 99) {
  const words = text.split(' '); let line = '', n = 0;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y + n * lh); line = w; if (++n >= maxLines) return; }
    else line = test;
  }
  if (line) g.fillText(line, x, y + n * lh);
}
// Декоративный «QR» (иллюстрация, не настоящий код)
const QN = 21;
const QR = (() => {
  const m = []; let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < QN; y++) for (let x = 0; x < QN; x++) {
    const f = (fx, fy) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7;
    let v;
    if (f(0, 0) || f(14, 0) || f(0, 14)) {
      const lx = x < 7 ? x : x - 14, ly = y < 7 ? y : y - 14;
      v = lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4);
    } else if ((x === 7 || y === 7 || x === 13 || y === 13) && (x < 8 || y < 8) && (x < 15 || y < 15)) v = false;
    else v = rnd() > 0.52;
    m.push(v);
  }
  return m;
})();
function drawQR(g, x, y, size, k = 1) {
  const c = size / QN;
  g.fillStyle = '#fff'; rr(g, x - c, y - c, size + 2 * c, size + 2 * c, c); g.fill();
  g.fillStyle = '#0E1020';
  QR.forEach((v, i) => { if (v && (i / QR.length) <= k) g.fillRect(x + (i % QN) * c, y + Math.floor(i / QN) * c, c + .5, c + .5); });
}
// Псевдокод: ширины и цвета токенов по строкам
const CODE = Array.from({ length: 30 }, (_, i) => {
  const ind = [0, 1, 1, 2, 2, 2, 1, 2, 3, 3, 2, 1, 0, 0, 1, 2, 2, 3, 2, 1, 1, 2, 2, 1, 0, 1, 2, 1, 0, 0][i];
  const n = 1 + ((i * 7) % 4);
  return { ind, toks: Array.from({ length: n }, (_, j) => ({ w: 40 + ((i * 31 + j * 57) % 120), c: ['#FF8A65', '#8EA0FF', '#47D7A0', '#E6E8F5', '#F7C66B'][(i + j * 2) % 5] })) };
});
const SCEN = [
  ['1. Материал', 'Фанера', 'МДФ → себебі'],
  ['2. Өлшеу', '130–160 мм', 'Қай өлшем қате'],
  ['3. Белгілеу', '60 ±2 мм', 'Сызық қызыл'],
  ['4. Өңдеу', 'Қысқыш → ара', 'Кесік қисық'],
  ['5. Құрастыру', '60–70°', 'Телефон құлайды'],
  ['6. Нәтиже', '10 ұпай', 'Ұсыныстар'],
];
const PROMPT_LINES = 'Canvas-та көркем еңбек сабағына арналған интерактивті симулятор жаса. Тақырып: ағаштан телефон тұғырын жасау, 6-сынып. Барлық мәтін қазақ тілінде. Бастапқы экран — оқушыға нұсқаулық. Кезеңдер: материал, өлшеу, белгілеу, өңдеу, құрастыру, бағалау…';

function chrome(g, W, H, title, dark = false) {
  g.fillStyle = dark ? '#12152A' : '#F3F2F8'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#1B1E33'; g.fillRect(0, 0, W, 64);
  ['#FF6B6B', '#F7C66B', '#47D7A0'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(34 + i * 26, 32, 8, 0, 7); g.fill(); });
  g.fillStyle = '#E6E8F5'; g.font = '600 26px Inter'; g.textAlign = 'center'; g.fillText(title, W / 2, 41); g.textAlign = 'left';
}
function sparkle(g, x, y, r, c1 = '#8EA0FF', c2 = '#FF8A65') {
  const gr = g.createLinearGradient(x - r, y - r, x + r, y + r); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  g.fillStyle = gr; g.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rad = i % 2 ? r * 0.22 : r; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
  g.closePath(); g.fill();
}

function drawScreen(g, W, H, ch, k) {
  g.save();
  if (ch === 0) {
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#171B3A'); gr.addColorStop(1, '#2B1D33');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    sparkle(g, W / 2, 250, 110);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '800 76px "Inter Tight"'; g.fillText('Сабақ симуляторы', W / 2, 470);
    g.fillStyle = '#A3A9C7'; g.font = '500 34px Inter'; g.fillText('мұғалім  +  Gemini  =  index.html', W / 2, 540);
    g.font = '600 26px "JetBrains Mono"'; g.fillStyle = '#47D7A0'; g.fillText('▸ төмен айналдырыңыз', W / 2, 660);
  } else if (ch === 1) {
    chrome(g, W, H, 'Сценарий.docx');
    g.fillStyle = '#fff'; g.fillRect(120, 96, W - 240, H - 96);
    g.fillStyle = '#1B1E33'; g.font = '800 40px "Inter Tight"'; g.fillText('Телефон тұғыры · 6-сынып', 170, 170);
    const cols = [170, 470, 760], heads = ['Кезең', 'Дұрыс жауап', 'Қате болса'];
    g.font = '700 24px Inter'; g.fillStyle = '#6C7BFF'; heads.forEach((h, i) => g.fillText(h, cols[i], 235));
    const rows = Math.ceil(k * SCEN.length);
    g.font = '500 25px Inter';
    for (let r = 0; r < rows; r++) {
      const y = 290 + r * 72;
      g.fillStyle = r % 2 ? '#F6F5FB' : '#EEF0FF'; g.fillRect(150, y - 40, W - 300, 66);
      g.fillStyle = '#1B1E33'; SCEN[r].forEach((c, i) => g.fillText(c, cols[i], y));
    }
  } else if (ch === 2) {
    chrome(g, W, H, 'Gemini');
    sparkle(g, 120, 140, 34);
    g.fillStyle = '#1B1E33'; g.font = '700 32px Inter'; g.fillText('Сәлем! Не жасаймыз?', 170, 152);
    const n = Math.floor(k * PROMPT_LINES.length);
    g.fillStyle = '#E2E5FF'; rr(g, 300, 210, W - 360, 330, 28); g.fill();
    g.fillStyle = '#1B1E33'; g.font = '500 27px Inter'; wrap(g, PROMPT_LINES.slice(0, n) + (k < 1 ? '▌' : ''), 336, 262, W - 430, 40, 7);
    g.fillStyle = '#fff'; rr(g, 60, H - 130, W - 120, 90, 45); g.fill();
    g.strokeStyle = '#D5D8EA'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#5B6080'; g.font = '600 24px Inter'; g.fillText('⚙ Құралдар', 100, H - 76);
    const on = k > 0.25;
    g.fillStyle = on ? '#6C7BFF' : '#ECEEF8'; rr(g, 270, H - 110, 150, 50, 25); g.fill();
    g.fillStyle = on ? '#fff' : '#5B6080'; g.fillText('Canvas', 300, H - 76);
  } else if (ch === 3) {
    chrome(g, W, H, 'Canvas · index.html', true);
    g.fillStyle = '#1B1E33'; g.fillRect(0, 64, 400, H - 64);
    g.fillStyle = '#2A2F52'; rr(g, 30, 100, 340, 210, 20); g.fill();
    g.fillStyle = '#DDE1F5'; g.font = '500 22px Inter'; wrap(g, 'Жоспар: 1. Нұсқаулық 2. Материал 3. Өлшеу 4. Белгілеу 5. Өңдеу 6. Бағалау', 54, 145, 300, 32);
    g.fillStyle = '#6C7BFF'; rr(g, 430, 84, 120, 44, 12); g.fill();
    g.fillStyle = '#fff'; g.font = '600 22px Inter'; g.fillText('Код', 466, 114);
    g.fillStyle = '#A3A9C7'; g.fillText('Алдын ала қарау', 580, 114);
    const lines = Math.floor(k * CODE.length);
    for (let i = 0; i < lines; i++) {
      const y = 160 + i * 21; if (y > H - 20) break;
      g.fillStyle = '#4B5175'; g.font = '14px "JetBrains Mono"'; g.fillText(String(i + 1).padStart(2, ' '), 432, y + 9);
      let x = 480 + CODE[i].ind * 30;
      for (const t of CODE[i].toks) { g.fillStyle = t.c; rr(g, x, y, t.w, 11, 5); g.fill(); x += t.w + 14; }
    }
  } else if (ch === 4) {
    chrome(g, W, H, 'Алдын ала қарау');
    g.fillStyle = '#1B1E33'; g.font = '800 34px "Inter Tight"'; g.fillText('Телефон тұғыры', 70, 130);
    g.fillStyle = '#FFE9E0'; rr(g, W - 260, 98, 190, 46, 23); g.fill();
    g.fillStyle = '#C2502C'; g.font = '700 22px Inter'; g.fillText(k < 0.55 ? 'Ұпай: 6/10' : 'Ұпай: 8/10', W - 228, 129);
    for (let i = 0; i < 6; i++) {
      const x = 90 + i * 110, done = i < 2 || (i === 2 && k >= 0.55);
      g.fillStyle = done ? '#47D7A0' : i === 2 ? '#6C7BFF' : '#D9DCEB';
      g.beginPath(); g.arc(x, 195, 22, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.font = '700 20px Inter'; g.textAlign = 'center'; g.fillText(done ? '✓' : String(i + 1), x, 202); g.textAlign = 'left';
      if (i < 5) { g.fillStyle = '#D9DCEB'; g.fillRect(x + 26, 193, 58, 4); }
    }
    g.fillStyle = '#fff'; rr(g, 60, 250, W - 120, 380, 24); g.fill();
    g.fillStyle = '#1B1E33'; g.font = '700 28px Inter'; g.fillText('3-кезең: белгілеу. Сызықты 60 мм-ге қойыңыз', 100, 305);
    // Линейка и метка
    g.fillStyle = '#F7E3BF'; g.fillRect(100, 345, W - 200, 80);
    g.strokeStyle = '#8B6A3E'; g.lineWidth = 2;
    for (let mm = 0; mm <= 100; mm += 5) { const x = 120 + mm * ((W - 240) / 100); g.beginPath(); g.moveTo(x, 345); g.lineTo(x, mm % 10 ? 365 : 380); g.stroke(); if (!(mm % 20)) { g.fillStyle = '#8B6A3E'; g.font = '18px Inter'; g.fillText(mm, x - 8, 405); } }
    const pos = k < 0.55 ? 54 : 60, mx = 120 + pos * ((W - 240) / 100);
    g.strokeStyle = k < 0.55 ? '#E5484D' : '#2BB673'; g.lineWidth = 5; g.beginPath(); g.moveTo(mx, 335); g.lineTo(mx, 435); g.stroke();
    const ok = k >= 0.55;
    g.fillStyle = ok ? '#E3F8EE' : '#FDE8E8'; rr(g, 100, 455, W - 200, 70, 16); g.fill();
    g.fillStyle = ok ? '#1E8A57' : '#B42318'; g.font = '600 24px Inter';
    g.fillText(ok ? '✓ Дұрыс! Белгі 60 мм-де.' : '✗ Белгі 54 мм-де. Қажет: 60 ±2 мм. Сызғышты тексеріңіз.', 124, 498);
    g.fillStyle = '#ECEEF8'; rr(g, 100, 550, 150, 56, 16); g.fill();
    g.fillStyle = '#6C7BFF'; rr(g, W - 290, 550, 190, 56, 16); g.fill();
    g.fillStyle = '#5B6080'; g.font = '600 22px Inter'; g.fillText('← Артқа', 128, 586);
    g.fillStyle = '#fff'; g.fillText('Тексеру', W - 240, 586);
  } else if (ch === 5) {
    chrome(g, W, H, 'Блокнот');
    g.fillStyle = '#fff'; g.fillRect(0, 64, W, H - 64);
    g.fillStyle = '#C9CCE0'; g.font = '20px "JetBrains Mono"';
    ['<!doctype html>', '<html lang="kk">', '<head><meta charset="utf-8">', '<title>Телефон тұғыры</title>', '<style> … </style>', '</head><body>', '<script> … </script>'].forEach((l, i) => g.fillText(l, 40, 110 + i * 32));
    g.fillStyle = 'rgba(14,16,32,.35)'; g.fillRect(0, 64, W, H - 64);
    g.fillStyle = '#fff'; rr(g, 200, 150, W - 400, 470, 22); g.fill();
    g.fillStyle = '#1B1E33'; g.font = '800 32px "Inter Tight"'; g.fillText('Басқаша сақтау', 240, 210);
    const f = [['Файл аты', 'index.html'], ['Файл түрі', 'Барлық файлдар (*.*)'], ['Кодтау', 'UTF-8']];
    f.forEach(([l, v], i) => {
      const y = 260 + i * 92, shown = k > i * 0.25 + 0.05;
      g.fillStyle = '#5B6080'; g.font = '600 20px Inter'; g.fillText(l, 240, y);
      g.fillStyle = shown ? '#EEF0FF' : '#F3F3F7'; rr(g, 240, y + 12, W - 480, 50, 12); g.fill();
      if (shown) { g.fillStyle = '#1B1E33'; g.font = '600 24px "JetBrains Mono"'; g.fillText(v, 260, y + 46); }
    });
    g.fillStyle = k > 0.8 ? '#47D7A0' : '#6C7BFF'; rr(g, W - 420, 545, 180, 54, 14); g.fill();
    g.fillStyle = '#fff'; g.font = '700 22px Inter'; g.fillText(k > 0.8 ? 'Сақталды ✓' : 'Сақтау', W - 395, 580);
  } else {
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#141833'); gr.addColorStop(1, '#1F2A3A');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff'; g.font = '800 54px "Inter Tight"'; g.fillText('Педагогикалық оқулар', 80, 140);
    g.fillStyle = '#A3A9C7'; g.font = '500 28px Inter'; g.fillText('5 минуттық көрсетілім', 80, 190);
    const steps = ['Мәселе', 'Сценарий', 'Gemini', 'Симулятор', 'Түзету', 'QR-код'];
    const n = Math.ceil(k * steps.length);
    steps.forEach((s, i) => {
      const y = 270 + i * 74, on = i < n;
      g.fillStyle = on ? '#47D7A0' : '#3A4064'; g.beginPath(); g.arc(100, y, 14, 0, 7); g.fill();
      if (i < 5) { g.fillStyle = '#3A4064'; g.fillRect(98, y + 16, 4, 42); }
      g.fillStyle = on ? '#EEF0FA' : '#6B7194'; g.font = '600 30px Inter'; g.fillText(s, 140, y + 10);
    });
    drawQR(g, W - 430, 260, 330, k);
  }
  g.restore();
}

function init() {
  const canvas = document.getElementById('bg');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0E1020');
  scene.fog = new THREE.Fog('#0E1020', 10, 26);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight('#8EA0FF', '#1A1020', 0.5));
  const key = new THREE.DirectionalLight('#ffffff', 1.4); key.position.set(3, 6, 4); scene.add(key);
  const pl1 = new THREE.PointLight('#6C7BFF', 18, 12); pl1.position.set(-3, 2.5, 2); scene.add(pl1);
  const pl2 = new THREE.PointLight('#FF8A65', 14, 12); pl2.position.set(3.5, 1.5, 2); scene.add(pl2);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);

  // Пол и свечение
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: '#12152A', roughness: 0.55, metalness: 0.3 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const gc = document.createElement('canvas'); gc.width = gc.height = 256;
  const gg = gc.getContext('2d'); const rg = gg.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, 'rgba(108,123,255,.55)'); rg.addColorStop(.5, 'rgba(255,138,101,.15)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  gg.fillStyle = rg; gg.fillRect(0, 0, 256, 256);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.01; scene.add(glow);
  const grid = new THREE.GridHelper(40, 40, '#2A2F55', '#1C2040'); grid.position.y = 0.005; grid.material.transparent = true; grid.material.opacity = 0.35; scene.add(grid);

  // Звёзды
  const sp = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) { const r = 12 + Math.random() * 14, a = Math.random() * Math.PI * 2, y = Math.random() * 14 + 1; sp.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#C6CCFF', size: 0.05, transparent: true, opacity: 0.8 }));
  scene.add(stars);

  // Ноутбук
  const laptop = new THREE.Group(); scene.add(laptop);
  const metal = new THREE.MeshStandardMaterial({ color: '#2A2F45', metalness: 0.7, roughness: 0.32 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.14, 2.1, 4, 0.06), metal); base.position.y = 0.07; laptop.add(base);
  const kb = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.1), new THREE.MeshStandardMaterial({ color: '#161929', roughness: 0.8 }));
  kb.rotation.x = -Math.PI / 2; kb.position.set(0, 0.142, -0.25); laptop.add(kb);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.55), new THREE.MeshStandardMaterial({ color: '#232842', roughness: 0.5 }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.142, 0.65); laptop.add(pad);
  const hinge = new THREE.Group(); hinge.position.set(0, 0.14, -1.03); laptop.add(hinge);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(3.2, 2.05, 0.08, 4, 0.04), metal); lid.position.y = 1.025; hinge.add(lid);
  const SW = 1280, SH = 800;
  const sc = document.createElement('canvas'); sc.width = SW; sc.height = SH;
  const sctx = sc.getContext('2d');
  const stex = new THREE.CanvasTexture(sc); stex.colorSpace = THREE.SRGBColorSpace; stex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.875), new THREE.MeshBasicMaterial({ map: stex, toneMapped: false }));
  screen.position.set(0, 1.025, 0.042); hinge.add(screen);

  // Спутники по главам
  const sats = [];
  // Спутники держатся в свободной половине кадра: ndc (компьютер), mndc (телефон), depth от камеры
  const addSat = (obj, ch, ndc, mndc, depth, extra = {}) => { scene.add(obj); sats.push({ obj, ch, ndc, mndc, depth, phase: Math.random() * 6, spin: 0, tilt: [0, 0, 0], ...extra }); return obj; };

  // 1: лист сценария и карандаш
  const pc = document.createElement('canvas'); pc.width = 512; pc.height = 660;
  const pg = pc.getContext('2d');
  const drawPaper = () => {
    pg.fillStyle = '#FBFAF6'; pg.fillRect(0, 0, 512, 660);
    pg.fillStyle = '#1B1E33'; pg.font = '800 34px "Inter Tight"'; pg.fillText('Сценарий', 40, 70);
    pg.font = '500 22px Inter';
    SCEN.forEach((r, i) => { pg.fillStyle = '#6C7BFF'; pg.fillText(r[0], 40, 130 + i * 70); pg.fillStyle = '#5B6080'; pg.fillText('✓ ' + r[1], 60, 160 + i * 70); });
    pg.strokeStyle = '#E2E0D6'; for (let y = 100; y < 640; y += 35) { pg.beginPath(); pg.moveTo(30, y); pg.lineTo(482, y); pg.stroke(); }
  };
  drawPaper();
  const ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace;
  const paper = new THREE.Group();
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.06), new THREE.MeshStandardMaterial({ map: ptex, roughness: 0.9, side: THREE.DoubleSide }));
  paper.add(sheet);
  const pencil = new THREE.Group();
  const pb = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6), new THREE.MeshStandardMaterial({ color: '#F7C66B', roughness: 0.5 }));
  const pt = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 6), new THREE.MeshStandardMaterial({ color: '#E8C9A0' })); pt.position.y = -0.74;
  pencil.add(pb, pt); pencil.rotation.z = 0.7; pencil.position.set(0.75, -0.6, 0.12); paper.add(pencil);
  
  addSat(paper, 1, [0.7, 0.05], [0.62, 0.62], 4.2, { size: .55, tilt: [-0.15, -0.5, -0.06], spin: .2 });

  // 2: звезда-искра (общий знак ИИ, не логотип)
  const shape = new THREE.Shape();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 2, r = i % 2 ? 0.13 : 0.55; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? shape.lineTo(x, y) : shape.moveTo(x, y); }
  const starGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3 }); starGeo.center();
  const spark = new THREE.Mesh(starGeo, new THREE.MeshPhysicalMaterial({ color: '#8EA0FF', emissive: '#4B3CFF', emissiveIntensity: 0.6, metalness: 0.3, roughness: 0.2, clearcoat: 1 }));
  addSat(spark, 2, [-0.8, 0.55], [-0.65, 0.78], 4.2, { size: .5, spin: 1 });

  // 3: блоки кода, влетающие в экран
  const CN = 36;
  const blocks = new THREE.InstancedMesh(new RoundedBoxGeometry(0.42, 0.1, 0.1, 2, 0.04), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 }), CN);
  const bStart = [], bEnd = [], tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();
  const pal = ['#FF8A65', '#8EA0FF', '#47D7A0', '#F7C66B', '#E6E8F5'].map(c => new THREE.Color(c));
  for (let i = 0; i < CN; i++) {
    const a = Math.random() * Math.PI * 2, r = 2.6 + Math.random() * 1.6;
    bStart.push(new THREE.Vector3(Math.cos(a) * r, 0.6 + Math.random() * 2.8, Math.sin(a) * r * 0.6 + 1.2));
    bEnd.push(new THREE.Vector3(-1.05 + (i % 4) * 0.48 + ((i * 13) % 3) * 0.06, 1.95 - Math.floor(i / 4) * 0.17, 0.12));
    blocks.setColorAt(i, pal[i % pal.length]);
  }
  blocks.frustumCulled = false; scene.add(blocks);

  // 4: жетоны проверки
  const mkToken = (ok) => {
    const t = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 40), new THREE.MeshStandardMaterial({ color: ok ? '#2BB673' : '#E5484D', roughness: 0.3, metalness: 0.2 }));
    disc.rotation.x = Math.PI / 2; t.add(disc);
    const m = new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.4 });
    if (ok) {
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.05), m); a.position.set(-0.07, -0.02, 0.06); a.rotation.z = 0.8;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.05), m); b.position.set(0.07, 0.04, 0.06); b.rotation.z = -0.65; t.add(a, b);
    } else {
      [0.78, -0.78].forEach(z => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.05), m); b.position.z = 0.06; b.rotation.z = z; t.add(b); });
    }
    return t;
  };
  addSat(mkToken(true), 4, [-0.86, 0.55], [-0.72, 0.84], 4.2, { size: .5, spin: .4 });
  addSat(mkToken(true), 4, [-0.9, 0.08], [0.72, 0.84], 4.2, { size: .5, spin: .4 });
  addSat(mkToken(false), 4, [-0.85, -0.4], [0.75, 0.42], 4.2, { size: .5, spin: .4 });

  // 5: карточка файла index.html
  const fc = document.createElement('canvas'); fc.width = 360; fc.height = 460;
  const fg = fc.getContext('2d');
  const drawFile = () => {
    fg.fillStyle = '#F3F2F8'; fg.fillRect(0, 0, 360, 460);
    fg.fillStyle = '#FF8A65'; rr(fg, 40, 40, 280, 240, 24); fg.fill();
    fg.fillStyle = '#fff'; fg.font = '700 80px "JetBrains Mono"'; fg.textAlign = 'center'; fg.fillText('</>', 180, 190);
    fg.fillStyle = '#1B1E33'; fg.font = '700 40px "JetBrains Mono"'; fg.fillText('index.html', 180, 350);
    fg.fillStyle = '#5B6080'; fg.font = '500 24px Inter'; fg.fillText('UTF-8 · 1 файл', 180, 400);
  };
  drawFile();
  const ftex = new THREE.CanvasTexture(fc); ftex.colorSpace = THREE.SRGBColorSpace;
  const fileMat = new THREE.MeshStandardMaterial({ color: '#F3F2F8', roughness: 0.6 });
  const file = new THREE.Mesh(new RoundedBoxGeometry(1.2, 1.53, 0.08, 3, 0.04), [fileMat, fileMat, fileMat, fileMat, new THREE.MeshStandardMaterial({ map: ftex, roughness: 0.6 }), fileMat]);
  addSat(file, 5, [0.72, 0.08], [0.62, 0.62], 4.2, { size: .55, spin: .25 });

  // 6: QR из кубиков
  const qOn = QR.map((v, i) => v ? i : -1).filter(i => i >= 0);
  const qr = new THREE.InstancedMesh(new THREE.BoxGeometry(0.085, 0.085, 0.085), new THREE.MeshStandardMaterial({ color: '#EEF0FA', roughness: 0.4 }), qOn.length);
  const qStart = qOn.map(() => new THREE.Vector3((Math.random() - .5) * 6, Math.random() * 4, (Math.random() - .5) * 4));
  const qEnd = qOn.map(i => new THREE.Vector3(((i % QN) - QN / 2) * 0.09 - 2.6, 2.5 - Math.floor(i / QN) * 0.09, 0.6));
  qr.frustumCulled = false; scene.add(qr);

  // Ключи камеры: [позиция, цель] на каждую главу
  const KEYS = [
    [[0.4, 2.7, 7.4], [0, 1.0, 0]],
    [[2.4, 2.5, 5.8], [1.1, 1.2, 0.3]],
    [[-1.9, 2.3, 5.0], [-0.7, 1.4, 0]],
    [[0.3, 1.7, 3.9], [0, 1.1, 0]],
    [[-0.6, 1.8, 4.8], [-0.4, 1.2, 0.2]],
    [[2.6, 2.2, 5.4], [1.2, 1.3, 0.4]],
    [[-3.2, 3.2, 6.8], [-0.9, 1.4, 0]],
  ].map(([p, t]) => [new THREE.Vector3(...p), new THREE.Vector3(...t)]);
  const sides = sections.map(s => (s.dataset.side === 'r' ? 1 : -1));

  let W = 0, H = 0, mobile = false;
  function resize() {
    W = innerWidth; H = innerHeight; mobile = W <= 820;
    renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  const mouse = { x: 0, y: 0 };
  addEventListener('pointermove', e => { mouse.x = e.clientX / W - 0.5; mouse.y = e.clientY / H - 0.5; }, { passive: true });

  let tTarget = scrollT(), tS = tTarget, lastKey = '';
  addEventListener('scroll', () => { tTarget = scrollT(); }, { passive: true });
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  fontsReady.then(() => { drawPaper(); ptex.needsUpdate = true; drawFile(); ftex.needsUpdate = true; lastKey = ''; });

  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
  const clock = new THREE.Clock(); const t0 = performance.now();
  let offX = sides[0] * 0.17;

  let instant = false;
  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    update();
  }
  function update() {
    const time = clock.getElapsedTime();
    tS += (tTarget - tS) * (reduce || instant ? 1 : 0.07);
    ui(tTarget);

    // Камера
    const i0 = Math.floor(clamp(tS, 0, KEYS.length - 1)), i1 = Math.min(i0 + 1, KEYS.length - 1), f = smooth(clamp(tS - i0));
    camPos.lerpVectors(KEYS[i0][0], KEYS[i1][0], f); camTgt.lerpVectors(KEYS[i0][1], KEYS[i1][1], f);
    const asp = W / H, dist = mobile ? Math.min(1.9, Math.max(1, 1.25 / asp)) : clamp(1.6 / asp, 1, 1.3);
    camPos.sub(camTgt).multiplyScalar(dist).add(camTgt);
    if (!reduce) { camPos.x += mouse.x * 0.5; camPos.y -= mouse.y * 0.3; }
    camera.position.copy(camPos); camera.lookAt(camTgt);
    // Сдвиг кадра: объект напротив карточки
    const side = sides[i0] + (sides[i1] - sides[i0]) * f;
    const wantX = mobile ? 0 : side * (W < 1200 ? 0.26 : 0.21);
    offX += (wantX - offX) * (reduce || instant ? 1 : 0.08);
    if (mobile) camera.setViewOffset(W, H, 0, H * 0.2, W, H); else camera.setViewOffset(W, H, offX * W, 0, W, H);
    camera.updateMatrixWorld();

    // Крышка ноутбука открывается при загрузке
    const open = reduce ? 1 : smooth(clamp((performance.now() - t0) / 1800));
    hinge.rotation.x = Math.PI / 2 * (1 - open) - 0.18 * open;

    // Экран
    const ch = clamp(Math.round(tS), 0, 6);
    const k = reduce ? 1 : clamp((tS - ch + 0.5) / 0.65);
    const keyS = ch + ':' + Math.round(k * 40);
    if (keyS !== lastKey) { lastKey = keyS; drawScreen(sctx, SW, SH, ch, k); stex.needsUpdate = true; }

    // Веса глав
    const w = i => smooth(clamp(1 - Math.abs(tS - i) * 1.25));
    sats.forEach(s => {
      const wt = w(s.ch);
      s.obj.visible = wt > 0.01; if (!s.obj.visible) return;
      s.obj.scale.setScalar(Math.max(wt * (s.size || 1), 0.0001));
      const n = mobile ? s.mndc : s.ndc;
      tmpV.set(n[0], n[1] + (reduce ? 0 : Math.sin(time * 1.2 + s.phase) * 0.02) - (1 - wt) * 0.3, 0.5).unproject(camera).sub(camera.position).normalize();
      s.obj.position.copy(camera.position).addScaledVector(tmpV, s.depth);
      s.obj.quaternion.copy(camera.quaternion);
      s.obj.rotateX(s.tilt[0]); s.obj.rotateY(s.tilt[1] + (reduce ? 0 : Math.sin(time * 0.6 + s.phase) * 0.5 * s.spin + (s.ch === 2 ? time * 0.6 : 0))); s.obj.rotateZ(s.tilt[2]);
    });
    const w3 = w(3);
    for (let i = 0; i < CN; i++) {
      const pi = smooth(clamp(w3 * 1.5 - (i / CN) * 0.5));
      tmpV.lerpVectors(bStart[i], bEnd[i], pi);
      tmpS.setScalar(Math.max(w3, 0.0001)); tmpQ.identity();
      tmpM.compose(tmpV, tmpQ, tmpS); blocks.setMatrixAt(i, tmpM);
    }
    blocks.instanceMatrix.needsUpdate = true; blocks.visible = w3 > 0.01;
    const w6 = w(6);
    for (let i = 0; i < qOn.length; i++) {
      const pi = smooth(clamp(w6 * 1.4 - (i / qOn.length) * 0.4));
      tmpV.lerpVectors(qStart[i], qEnd[i], pi);
      tmpS.setScalar(Math.max(pi, 0.0001)); tmpQ.identity();
      tmpM.compose(tmpV, tmpQ, tmpS); qr.setMatrixAt(i, tmpM);
    }
    qr.instanceMatrix.needsUpdate = true; qr.visible = w6 > 0.01;

    if (!reduce) { stars.rotation.y = time * 0.01; laptop.rotation.y = Math.sin(time * 0.3) * 0.04; }
    renderer.render(scene, camera);
  }
  frame();
  // Для отладки: мгновенно применить текущую прокрутку
  window.__guide = { scene, camera, sats, THREE, step() { instant = true; tTarget = scrollT(); update(); instant = false; } };
}

// Запуск после объявления всех констант
if (!hasWebGL() || location.search.includes('static')) {
  document.documentElement.classList.add('no-webgl');
  addEventListener('scroll', () => ui(scrollT()), { passive: true }); ui(0);
} else {
  init();
}
