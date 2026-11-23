// Digital Art Atelier: 3D-мастерская по прокрутке + интерфейс страницы
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sections = [...document.querySelectorAll('[data-ch]')];
const barFill = document.getElementById('barFill');
const header = document.getElementById('top');
const navLinks = [...document.querySelectorAll('.menu a')];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = x => x * x * (3 - 2 * x);

// ---------- Интерфейс ----------
document.querySelectorAll('.copy').forEach(b => b.addEventListener('click', async () => {
  const el = document.getElementById(b.dataset.copy);
  try { await navigator.clipboard.writeText(el.textContent.trim()); b.textContent = 'Көшірілді ✓'; }
  catch (e) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Ctrl+C басыңыз'; }
  setTimeout(() => (b.textContent = 'Көшіру'), 2000);
}));
const burger = document.querySelector('.burger'), menu = document.getElementById('menu');
burger.addEventListener('click', () => { const o = burger.getAttribute('aria-expanded') !== 'true'; burger.setAttribute('aria-expanded', o); menu.classList.toggle('open', o); });
navLinks.forEach(a => a.addEventListener('click', () => { burger.setAttribute('aria-expanded', 'false'); menu.classList.remove('open'); }));

// Модальное окно
let lastFocus = null;
function openModal(id) {
  const m = document.getElementById(id); lastFocus = document.activeElement; m.hidden = false;
  if (window.gsap && !reduce) { gsap.fromTo(m, { opacity: 0 }, { opacity: 1, duration: .25 }); gsap.fromTo(m.querySelector('.modal-box'), { y: 30, scale: .97 }, { y: 0, scale: 1, duration: .4, ease: 'power3.out' }); }
  m.querySelector('[data-close]').focus(); document.body.style.overflow = 'hidden';
}
function closeModal(m) { m.hidden = true; document.body.style.overflow = ''; lastFocus && lastFocus.focus(); }
document.querySelectorAll('[data-modal]').forEach(b => b.addEventListener('click', () => openModal(b.dataset.modal)));
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) closeModal(m); });
  m.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(m); });
});

// Последний результат симулятора
function showLast() {
  let h = []; try { h = JSON.parse(localStorage.getItem('atelier:colormix:history')) || []; } catch (e) {}
  const el = document.getElementById('lastResult');
  if (h.length) el.innerHTML = `<b>Сіздің соңғы нәтижеңіз</b><strong>${h[0].total}/8</strong><span>Тапсырма: ${h[0].task} · барлығы ${h.length} тәжірибе</span>`;
}
showLast(); addEventListener('colormix-saved', showLast);

// Прогресс прокрутки: t = дробный номер сцены
function scrollT() {
  const vc = innerHeight * 0.5;
  const c = sections.map(s => { const r = s.getBoundingClientRect(); return r.top + r.height / 2; });
  if (vc <= c[0]) return 0;
  for (let i = 0; i < c.length - 1; i++) if (vc <= c[i + 1]) return i + (vc - c[i]) / (c[i + 1] - c[i]);
  return c.length - 1;
}
const navTargets = navLinks.map(a => document.getElementById(a.dataset.nav));
function ui() {
  const max = document.documentElement.scrollHeight - innerHeight;
  barFill.style.width = (max > 0 ? scrollY / max * 100 : 0) + '%';
  header.classList.toggle('solid', scrollY > 40);
  let on = -1; navTargets.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * 0.45) on = i; });
  navLinks.forEach((a, i) => a.classList.toggle('on', i === on));
}
addEventListener('scroll', ui, { passive: true }); ui();

// ---------- GSAP: появление, параллакс, схема ----------
function initGsap() {
  const g = window.gsap;
  if (!g || !window.ScrollTrigger || reduce) { document.documentElement.classList.remove('js-anim'); return; }
  g.registerPlugin(ScrollTrigger);
  g.timeline({ delay: .15 })
    .to('.hero .reveal', { opacity: 1, y: 0, duration: .9, stagger: .09, ease: 'power3.out' })
    .from('.artist', { y: 60, opacity: 0, duration: 1.2, ease: 'power3.out' }, 0)
    .from('.halo', { scale: .85, opacity: 0, duration: 1.2, ease: 'power2.out' }, 0)
    .from('.tag', { scale: .6, opacity: 0, duration: .6, stagger: .12, ease: 'back.out(2)' }, .5);
  const sp = document.querySelector('.stroke path'), len = sp.getTotalLength();
  g.fromTo(sp, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.8, delay: .4, ease: 'power2.inOut' });
  document.querySelectorAll('.idea .reveal, .author .reveal').forEach((el, i) => g.to(el, { opacity: 1, y: 0, duration: .8, delay: (i % 3) * .08, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' } }));
  document.querySelectorAll('.sec .panel').forEach(p => {
    g.from(p.children, { opacity: 0, y: 22, duration: .6, stagger: .06, ease: 'power2.out',
      scrollTrigger: { trigger: p, start: 'top 80%', toggleActions: 'play none none reverse' } });
  });
  // Схема «традиция → интерактив» рисуется по прокрутке
  document.querySelectorAll('.arrow path').forEach(p => { const l = p.getTotalLength(); g.set(p, { strokeDasharray: l, strokeDashoffset: l }); });
  g.timeline({ scrollTrigger: { trigger: '#problem .scheme', start: 'top 75%', end: 'bottom 45%', scrub: .6 } })
    .from('#problem .lane.old span', { opacity: 0, x: -20, stagger: .2 })
    .to('#problem .arrow path', { strokeDashoffset: 0, stagger: .1 })
    .from('#problem .lane.new span', { opacity: 0, x: 20, stagger: .2 });
  g.from('.pipe li', { opacity: 0, x: -24, stagger: .15, scrollTrigger: { trigger: '.pipe', start: 'top 80%', end: 'bottom 55%', scrub: .6 } });
  // Параллакс портрета: мышь и прокрутка
  const qx = g.quickTo('.artist', 'x', { duration: .8, ease: 'power3' }), qr = g.quickTo('.artist', 'rotation', { duration: .8, ease: 'power3' });
  const hx = g.quickTo('.halo', 'x', { duration: 1.2, ease: 'power3' });
  addEventListener('pointermove', e => { const nx = e.clientX / innerWidth - .5; qx(nx * 14); qr(nx * 1.2); hx(nx * -20); }, { passive: true });
  // Вход в сцену: герой уходит, подпись появляется и растворяется
  g.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to('.hero-art', { scale: 1.18, yPercent: -6, opacity: 0, ease: 'power1.in' }, 0)
    .to('.hero-text', { y: -90, opacity: 0, ease: 'power1.in' }, 0);
  g.timeline({ scrollTrigger: { trigger: '#enter', start: 'top bottom', end: 'bottom top', scrub: true } })
    .fromTo('.enter-cap', { opacity: 0, scale: .9, letterSpacing: '.02em' }, { opacity: 1, scale: 1, duration: .35 })
    .to('.enter-cap', { opacity: 1, duration: .3 })
    .to('.enter-cap', { opacity: 0, scale: 1.25, duration: .35 });
  g.to('.tag', { y: i => (i % 2 ? -10 : 10), duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
}

// ---------- Canvas-рисование ----------
const C = { ivory: '#F7F3EB', paper: '#FFFDF8', burg: '#722F3E', forest: '#273F36', gold: '#C6A675', char: '#242424', mute: '#6B6560' };
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function wrap(g, text, x, y, maxW, lh, maxLines = 99) {
  const words = text.split(' '); let line = '', n = 0;
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y + n * lh); line = w; if (++n >= maxLines) return; } else line = t; }
  if (line) g.fillText(line, x, y + n * lh);
}
const QN = 21;
const QR = (() => { const m = []; let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < QN; y++) for (let x = 0; x < QN; x++) { const f = (fx, fy) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7; let v;
    if (f(0, 0) || f(14, 0) || f(0, 14)) { const lx = x < 7 ? x : x - 14, ly = y < 7 ? y : y - 14; v = lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4); }
    else if ((x === 7 || y === 7 || x === 13 || y === 13) && (x < 8 || y < 8) && (x < 15 || y < 15)) v = false; else v = rnd() > 0.52; m.push(v); }
  return m; })();
function drawQR(g, x, y, size, k = 1) { const c = size / QN; g.fillStyle = '#fff'; rr(g, x - c, y - c, size + 2 * c, size + 2 * c, c); g.fill(); g.fillStyle = C.char; QR.forEach((v, i) => { if (v && i / QR.length <= k) g.fillRect(x + (i % QN) * c, y + Math.floor(i / QN) * c, c + .5, c + .5); }); }
const CODE = Array.from({ length: 30 }, (_, i) => ({ ind: [0, 1, 1, 2, 2, 2, 1, 2, 3, 3, 2, 1, 0, 0, 1, 2, 2, 3, 2, 1, 1, 2, 2, 1, 0, 1, 2, 1, 0, 0][i], toks: Array.from({ length: 1 + ((i * 7) % 4) }, (_, j) => ({ w: 40 + ((i * 31 + j * 57) % 120), c: ['#E08A6B', '#9FB2E0', '#8CC7A5', '#E6E1D6', '#E7C77B'][(i + j * 2) % 5] })) }));
const SCEN = [['1. Материал', 'Фанера', 'МДФ → себебі'], ['2. Өлшеу', '130–160 мм', 'Қай өлшем қате'], ['3. Белгілеу', '60 ±2 мм', 'Сызық қызыл'], ['4. Өңдеу', 'Қысқыш → ара', 'Кесік қисық'], ['5. Құрастыру', '60–70°', 'Телефон құлайды'], ['6. Нәтиже', '10 ұпай', 'Ұсыныстар']];
const GPT_ASK = 'Мына сценарий бойынша Gemini Canvas-қа толық промпт жаз: тақырып, кезеңдер, рубрика 0–2 ұпай, бір index.html файлы, мәтін қазақша.';
const GPT_ANS = 'Сен тәжірибелі веб-әзірлеуші және әдіскерсің. Canvas-та көркем еңбек сабағына арналған интерактивті симулятор жаса. Бастапқы экран — оқушыға нұсқаулық. Кезеңдер: 1. Материал 2. Өлшеу 3. Белгілеу 4. Өңдеу 5. Құрастыру 6. Бағалау…';
let MIXV = { a: '#C8323A', b: '#F2C230', result: '#E8792F', progress: 0, done: false, target: '#E8792F' };

function bar(g, W, title, dark = false) {
  g.fillStyle = dark ? '#2B2B2B' : '#EDE6D9'; g.fillRect(0, 0, W, 60);
  ['#D9776B', '#E7C77B', '#8CC7A5'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(32 + i * 24, 30, 7, 0, 7); g.fill(); });
  g.fillStyle = dark ? '#EEE' : C.char; g.font = '600 24px Inter'; g.textAlign = 'center'; g.fillText(title, W / 2, 39); g.textAlign = 'left';
}
function spark(g, x, y, r, c1 = C.gold, c2 = C.burg) { const gr = g.createLinearGradient(x - r, y - r, x + r, y + r); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, d = i % 2 ? r * .22 : r; g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); } g.closePath(); g.fill(); }
function chatBubble(g, x, y, w, text, me, k) {
  g.font = '500 24px Inter';
  const t = text.slice(0, Math.floor(k * text.length)) + (k < 1 ? '▌' : '');
  const lines = Math.max(1, Math.ceil(g.measureText(text).width / (w - 60)));
  const h = 40 + lines * 34;
  g.fillStyle = me ? '#EFE7D8' : '#fff'; rr(g, x, y, w, h, 22); g.fill();
  if (!me) { g.strokeStyle = '#E4DCCB'; g.lineWidth = 2; g.stroke(); }
  g.fillStyle = C.char; wrap(g, t, x + 28, y + 44, w - 56, 34); return h;
}

function drawScreen(g, W, H, ch, k) {
  g.save(); g.textAlign = 'left';
  if (ch === -1) {
    g.fillStyle = C.paper; g.fillRect(0, 0, W, H); spark(g, W / 2, H / 2, 140 + k * 60);
  } else if (ch <= 1) {
    g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(198,166,117,.5)'; g.lineWidth = 3; rr(g, 40, 40, W - 80, H - 80, 30); g.stroke();
    spark(g, W / 2, 230, 90);
    g.fillStyle = C.forest; g.textAlign = 'center'; g.font = '700 70px "Playfair Display"'; g.fillText(ch === 0 ? 'Сабақ симуляторы' : 'Түсіндіру → Әрекет', W / 2, 430);
    g.fillStyle = C.burg; g.font = 'italic 600 36px "Playfair Display"'; g.fillText(ch === 0 ? 'ChatGPT · Gemini · index.html' : 'оқушы өзі жасап көреді', W / 2, 500);
  } else if (ch === 2) {
    g.fillStyle = C.ivory; g.fillRect(0, 0, W, H);
    const boxes = [['Мұғалім', 'сценарий', C.forest], ['ChatGPT', 'промпт', C.gold], ['Gemini', 'index.html', C.burg], ['Оқушы', 'QR-код', C.forest]];
    const n = 1 + Math.floor(k * 3.99);
    boxes.forEach(([t, s, c], i) => {
      const x = 70 + i * 290, y = 300, on = i < n;
      g.globalAlpha = on ? 1 : .25; g.fillStyle = '#fff'; rr(g, x, y, 240, 200, 24); g.fill(); g.strokeStyle = c; g.lineWidth = 4; g.stroke();
      g.fillStyle = c; g.beginPath(); g.arc(x + 120, y - 10, 34, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '700 30px "Playfair Display"'; g.textAlign = 'center'; g.fillText(i + 1, x + 120, y);
      g.fillStyle = C.char; g.font = '700 32px Inter'; g.fillText(t, x + 120, y + 100); g.fillStyle = C.mute; g.font = '500 24px Inter'; g.fillText(s, x + 120, y + 145); g.textAlign = 'left';
      if (i < 3) { g.strokeStyle = C.gold; g.lineWidth = 5; g.beginPath(); g.moveTo(x + 248, y + 100); g.lineTo(x + 282, y + 100); g.stroke(); }
      g.globalAlpha = 1;
    });
    g.fillStyle = C.forest; g.font = '700 48px "Playfair Display"'; g.textAlign = 'center'; g.fillText('ChatGPT жазады — Gemini жасайды', W / 2, 160);
  } else if (ch === 3) {
    bar(g, W, 'Сценарий.docx'); g.fillStyle = '#fff'; g.fillRect(110, 90, W - 220, H - 90);
    g.fillStyle = C.forest; g.font = '700 38px "Playfair Display"'; g.fillText('Телефон тұғыры · 6-сынып', 160, 160);
    const cols = [160, 460, 750]; g.font = '700 23px Inter'; g.fillStyle = C.burg; ['Кезең', 'Дұрыс жауап', 'Қате болса'].forEach((h, i) => g.fillText(h, cols[i], 225));
    const rows = Math.ceil(k * SCEN.length); g.font = '500 24px Inter';
    for (let r = 0; r < rows; r++) { const y = 280 + r * 72; g.fillStyle = r % 2 ? '#FBF8F1' : '#F3ECDF'; g.fillRect(140, y - 40, W - 280, 66); g.fillStyle = C.char; SCEN[r].forEach((c, i) => g.fillText(c, cols[i], y)); }
  } else if (ch === 4) {
    bar(g, W, 'ChatGPT'); g.fillStyle = '#FAF7F0'; g.fillRect(0, 60, W, H - 60);
    const k1 = clamp(k * 2.2), k2 = clamp(k * 1.8 - .8);
    const h1 = chatBubble(g, W - 760, 100, 680, GPT_ASK, true, k1);
    if (k2 > 0) { g.fillStyle = C.forest; g.beginPath(); g.arc(80, 140 + h1, 26, 0, 7); g.fill(); chatBubble(g, 120, 120 + h1, W - 220, GPT_ANS, false, k2); }
    g.fillStyle = '#fff'; rr(g, 60, H - 110, W - 120, 74, 37); g.fill(); g.strokeStyle = '#E4DCCB'; g.lineWidth = 2; g.stroke();
    g.fillStyle = C.mute; g.font = '500 22px Inter'; g.fillText(k2 >= 1 ? '✓ Промпт дайын — көшіріп, Gemini-ге қойыңыз' : 'Хабарлама жазу…', 100, H - 64);
  } else if (ch === 5) {
    bar(g, W, 'Gemini · Canvas', true); g.fillStyle = '#1F2421'; g.fillRect(0, 60, W, H - 60);
    g.fillStyle = '#2A302C'; g.fillRect(0, 60, 380, H - 60);
    spark(g, 60, 110, 22, '#9FB2E0', '#E08A6B');
    g.fillStyle = '#3A423D'; rr(g, 24, 150, 330, 190, 18); g.fill(); g.fillStyle = '#E6E1D6'; g.font = '500 21px Inter'; wrap(g, 'Промпт қойылды. Жоспар: нұсқаулық, 5 кезең, бағалау. Код жазылуда…', 46, 192, 290, 31);
    g.fillStyle = C.gold; rr(g, 410, 80, 110, 42, 12); g.fill(); g.fillStyle = C.char; g.font = '600 21px Inter'; g.fillText('Код', 442, 108); g.fillStyle = '#9A9A9A'; g.fillText('Алдын ала қарау', 550, 108);
    const lines = Math.floor(k * CODE.length);
    for (let i = 0; i < lines; i++) { const y = 152 + i * 21; if (y > H - 20) break; g.fillStyle = '#5D665F'; g.font = '14px "JetBrains Mono"'; g.fillText(String(i + 1).padStart(2, ' '), 412, y + 9); let x = 460 + CODE[i].ind * 28; for (const t of CODE[i].toks) { g.fillStyle = t.c; rr(g, x, y, t.w, 11, 5); g.fill(); x += t.w + 14; } }
  } else if (ch === 6) {
    bar(g, W, 'Алдын ала қарау'); g.fillStyle = C.ivory; g.fillRect(0, 60, W, H - 60);
    g.fillStyle = C.forest; g.font = '700 34px "Playfair Display"'; g.fillText('Телефон тұғыры', 70, 128);
    const ok = k >= 0.55;
    g.fillStyle = '#F3E3E6'; rr(g, W - 250, 96, 180, 44, 22); g.fill(); g.fillStyle = C.burg; g.font = '700 21px Inter'; g.fillText(ok ? 'Ұпай: 8/10' : 'Ұпай: 6/10', W - 220, 126);
    for (let i = 0; i < 6; i++) { const x = 90 + i * 110, done = i < 2 || (i === 2 && ok); g.fillStyle = done ? C.forest : i === 2 ? C.burg : '#DCD3C3'; g.beginPath(); g.arc(x, 190, 21, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '700 19px Inter'; g.textAlign = 'center'; g.fillText(done ? '✓' : String(i + 1), x, 197); g.textAlign = 'left'; if (i < 5) { g.fillStyle = '#DCD3C3'; g.fillRect(x + 25, 188, 60, 4); } }
    g.fillStyle = '#fff'; rr(g, 60, 240, W - 120, 390, 24); g.fill();
    g.fillStyle = C.char; g.font = '700 27px Inter'; g.fillText('3-кезең: белгілеу. Сызықты 60 мм-ге қойыңыз', 100, 295);
    g.fillStyle = '#EED9B4'; g.fillRect(100, 335, W - 200, 80); g.strokeStyle = '#8B6A3E'; g.lineWidth = 2;
    for (let mm = 0; mm <= 100; mm += 5) { const x = 120 + mm * ((W - 240) / 100); g.beginPath(); g.moveTo(x, 335); g.lineTo(x, mm % 10 ? 355 : 370); g.stroke(); if (!(mm % 20)) { g.fillStyle = '#8B6A3E'; g.font = '18px Inter'; g.fillText(mm, x - 8, 397); } }
    const mx = 120 + (ok ? 60 : 54) * ((W - 240) / 100); g.strokeStyle = ok ? '#2E7D57' : '#C0392B'; g.lineWidth = 5; g.beginPath(); g.moveTo(mx, 325); g.lineTo(mx, 425); g.stroke();
    g.fillStyle = ok ? '#E5F2EA' : '#FBE7E4'; rr(g, 100, 445, W - 200, 70, 16); g.fill();
    g.fillStyle = ok ? '#1F5E40' : '#9B2C20'; g.font = '600 23px Inter'; g.fillText(ok ? '✓ Дұрыс! Белгі 60 мм-де.' : '✗ Белгі 54 мм-де. Қажет: 60 ±2 мм.', 124, 488);
    g.fillStyle = C.burg; rr(g, W - 290, 545, 190, 56, 28); g.fill(); g.fillStyle = '#fff'; g.font = '600 22px Inter'; g.fillText('Тексеру', W - 236, 581);
  } else if (ch === 7) {
    bar(g, W, 'Блокнот'); g.fillStyle = '#fff'; g.fillRect(0, 60, W, H - 60);
    g.fillStyle = '#C9C2B4'; g.font = '20px "JetBrains Mono"'; ['<!doctype html>', '<html lang="kk">', '<head><meta charset="utf-8">', '<title>Түстер</title>', '<style> … </style>', '<script> … </script>'].forEach((l, i) => g.fillText(l, 40, 106 + i * 32));
    g.fillStyle = 'rgba(36,36,36,.28)'; g.fillRect(0, 60, W, H - 60);
    g.fillStyle = C.paper; rr(g, 200, 140, W - 400, 480, 22); g.fill();
    g.fillStyle = C.forest; g.font = '700 32px "Playfair Display"'; g.fillText('Басқаша сақтау', 240, 200);
    [['Файл аты', 'index.html'], ['Файл түрі', 'Барлық файлдар (*.*)'], ['Кодтау', 'UTF-8']].forEach(([l, v], i) => { const y = 252 + i * 92, sh = k > i * .25 + .05; g.fillStyle = C.mute; g.font = '600 20px Inter'; g.fillText(l, 240, y); g.fillStyle = sh ? '#F3ECDF' : '#F5F2EC'; rr(g, 240, y + 12, W - 480, 50, 12); g.fill(); if (sh) { g.fillStyle = C.char; g.font = '600 24px "JetBrains Mono"'; g.fillText(v, 260, y + 46); } });
    g.fillStyle = k > .8 ? C.forest : C.burg; rr(g, W - 420, 540, 180, 54, 27); g.fill(); g.fillStyle = '#fff'; g.font = '700 22px Inter'; g.fillText(k > .8 ? 'Сақталды ✓' : 'Сақтау', W - 392, 575);
  } else if (ch === 8) {
    g.fillStyle = C.forest; g.fillRect(0, 0, W, H);
    g.fillStyle = C.ivory; g.font = '700 52px "Playfair Display"'; g.fillText('Педагогикалық оқулар', 80, 130);
    g.fillStyle = C.gold; g.font = 'italic 600 30px "Playfair Display"'; g.fillText('5 минуттық көрсетілім', 80, 180);
    const st = ['Мәселе', 'Сценарий', 'ChatGPT + Gemini', 'Симулятор', 'Түзету', 'QR-код'], n = Math.ceil(k * st.length);
    st.forEach((s, i) => { const y = 260 + i * 74, on = i < n; g.fillStyle = on ? C.gold : '#4A5F55'; g.beginPath(); g.arc(100, y, 14, 0, 7); g.fill(); if (i < 5) { g.fillStyle = '#4A5F55'; g.fillRect(98, y + 16, 4, 42); } g.fillStyle = on ? C.ivory : '#7E9087'; g.font = '600 30px Inter'; g.fillText(s, 140, y + 10); });
    drawQR(g, W - 430, 250, 330, k);
  } else if (ch === 9) {
    bar(g, W, 'Түстерді араластыру · index.html'); g.fillStyle = C.ivory; g.fillRect(0, 60, W, H - 60);
    g.fillStyle = C.forest; g.font = '700 40px "Playfair Display"'; g.fillText('Түстерді араластыру', 70, 140);
    const blob = (x, c, l) => { g.fillStyle = c || '#E5DED0'; g.beginPath(); g.arc(x, 380, 90, 0, 7); g.fill(); g.fillStyle = C.mute; g.font = '600 24px Inter'; g.textAlign = 'center'; g.fillText(l, x, 510); g.textAlign = 'left'; };
    blob(220, MIXV.a, 'Бояу 1'); blob(480, MIXV.b, 'Бояу 2');
    g.fillStyle = C.gold; g.font = '700 70px Inter'; g.fillText('+', 330, 405); g.fillText('=', 600, 405);
    g.fillStyle = MIXV.result && MIXV.progress > 0 ? MIXV.result : '#E5DED0'; g.globalAlpha = .3 + .7 * (MIXV.progress / 100); g.beginPath(); g.arc(830, 380, 120, 0, 7); g.fill(); g.globalAlpha = 1;
    g.fillStyle = C.mute; g.font = '600 24px Inter'; g.textAlign = 'center'; g.fillText(`Араласу: ${Math.round(MIXV.progress)}%`, 830, 545); g.textAlign = 'left';
  } else {
    g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
    g.fillStyle = C.forest; g.font = '700 44px "Playfair Display"'; g.fillText('Бағалау дескрипторлары', 80, 120);
    ['Бастапқы түстерді таңдау', 'Араластыруды орындау', 'Алынған түсті анықтау', 'Нәтижені түсіндіру'].forEach((d, i) => { const y = 200 + i * 120, f = clamp(k * 4 - i); g.fillStyle = '#F3ECDF'; rr(g, 80, y, W - 160, 90, 18); g.fill(); g.fillStyle = C.char; g.font = '600 28px Inter'; g.fillText(d, 110, y + 56); g.fillStyle = C.burg; g.font = '700 34px "Playfair Display"'; g.fillText(`${f >= 1 ? 2 : Math.round(f * 2)}/2`, W - 200, y + 58); });
  }
  g.restore();
}

// ---------- 3D ----------
function hasWebGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }

function woodTexture(base = '#B98552', dark = '#8A5A31') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 70; i++) { const y = Math.random() * 256; g.strokeStyle = `rgba(${i % 2 ? '90,55,25' : '230,190,140'},${.08 + Math.random() * .12})`; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 4); g.stroke(); }
  g.fillStyle = dark; g.globalAlpha = .25; g.beginPath(); g.ellipse(340, 120, 18, 8, 0, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function blobShadow() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(60,35,20,.45)'); r.addColorStop(1, 'rgba(60,35,20,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
}

function init() {
  const low = innerWidth <= 820 || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 || location.search.includes('lite');
  const canvas = document.getElementById('bg');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, powerPreference: 'high-performance' });
  renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (!low) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.ivory); scene.fog = new THREE.Fog(C.ivory, 8, 20);
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight('#FFF6E8', '#C9B89A', 0.7));
  const key = new THREE.DirectionalLight('#FFF1DC', 1.6); key.position.set(4, 8, 5);
  if (!low) { key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); key.shadow.radius = 6; key.shadow.bias = -0.0005; }
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  const shadowMat = blobShadow();
  const addShadow = (x, z, sx, sz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), shadowMat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.012, z); scene.add(m); return m; };

  // Стол мастерской
  const wt = woodTexture('#C99A68', '#8A5A31'); wt.repeat.set(12, 9);
  const table = new THREE.Mesh(new THREE.PlaneGeometry(70, 50), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.7 }));
  table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);

  // Ноутбук
  const laptop = new THREE.Group(); scene.add(laptop);
  const shell = new THREE.MeshStandardMaterial({ color: '#D9CBB2', metalness: 0.6, roughness: 0.35 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.14, 2.1, 4, 0.06), shell); base.position.y = 0.07; base.castShadow = true; laptop.add(base);
  const kb = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.1), new THREE.MeshStandardMaterial({ color: '#3A3632', roughness: 0.8 })); kb.rotation.x = -Math.PI / 2; kb.position.set(0, 0.142, -0.25); laptop.add(kb);
  const hinge = new THREE.Group(); hinge.position.set(0, 0.14, -1.03); laptop.add(hinge);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(3.2, 2.05, 0.08, 4, 0.04), shell); lid.position.y = 1.025; lid.castShadow = true; hinge.add(lid);
  const SW = 1280, SH = 800, sc = document.createElement('canvas'); sc.width = SW; sc.height = SH; const sctx = sc.getContext('2d');
  const stex = new THREE.CanvasTexture(sc); stex.colorSpace = THREE.SRGBColorSpace; stex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.875), new THREE.MeshBasicMaterial({ map: stex, toneMapped: false })); screen.position.set(0, 1.025, 0.042); hinge.add(screen);
  addShadow(0, 0, 4.4, 3.2);

  // Дверной проём мастерской: камера пролетает сквозь него при прокрутке
  const door = new THREE.Group(); door.position.set(0.2, 0, 7.2); scene.add(door);
  const doorMat = new THREE.MeshStandardMaterial({ map: woodTexture('#8A5A36', '#5E3B22'), roughness: 0.6 });
  [-4.1, 4.1].forEach(x => { const p = new THREE.Mesh(new RoundedBoxGeometry(0.34, 4.8, 0.34, 3, 0.04), doorMat); p.position.set(x, 2.7, 0); p.scale.y = 1.13; p.castShadow = true; door.add(p); });
  const lintel = new THREE.Mesh(new RoundedBoxGeometry(8.7, 0.4, 0.4, 3, 0.05), doorMat); lintel.position.y = 5.4; door.add(lintel);
  const sgc = document.createElement('canvas'); sgc.width = 1024; sgc.height = 220; const sgg = sgc.getContext('2d');
  const drawSign = () => { sgg.fillStyle = C.forest; sgg.fillRect(0, 0, 1024, 220); sgg.strokeStyle = C.gold; sgg.lineWidth = 6; sgg.strokeRect(14, 14, 996, 192); sgg.fillStyle = C.ivory; sgg.font = '700 96px \"Playfair Display\"'; sgg.textAlign = 'center'; sgg.fillText('Шеберхана', 512, 140); };
  drawSign(); const sgt = new THREE.CanvasTexture(sgc); sgt.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.52), new THREE.MeshStandardMaterial({ map: sgt, roughness: 0.6 })); sign.position.set(0, 4.75, 0.22); door.add(sign);
  [-0.9, 0.9].forEach(x => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 6), new THREE.MeshStandardMaterial({ color: C.gold, metalness: 1, roughness: 0.3 })); r.position.set(x, 5.1, 0.22); door.add(r); });

  // Палитра художника
  function makePalette(colors) {
    const s = new THREE.Shape(); s.absellipse(0, 0, 0.95, 0.68, 0, Math.PI * 2, false, 0);
    const hole = new THREE.Path(); hole.absellipse(-0.55, -0.22, 0.12, 0.09, 0, Math.PI * 2, true, 0); s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.02, bevelSegments: 2, curveSegments: low ? 24 : 48 });
    const pal = new THREE.Group();
    const board = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: woodTexture('#D8B07E', '#9C6B3C'), roughness: 0.55 })); board.rotation.x = -Math.PI / 2; board.castShadow = true; pal.add(board);
    const blobs = colors.map((c, i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 12), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.25, clearcoat: 0.8 }));
      const a = -0.2 + i * (Math.PI * 1.15 / Math.max(1, colors.length - 1)); m.position.set(Math.cos(a) * 0.62 + 0.05, 0.06, -Math.sin(a) * 0.42); m.scale.set(1, 0.38, 1); pal.add(m); return m;
    });
    return { pal, blobs };
  }
  // Кисть
  function makeBrush(handle = C.burg, tip = '#E8792F', len = 1.3) {
    const b = new THREE.Group();
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, len, 16), new THREE.MeshPhysicalMaterial({ color: handle, roughness: 0.3, clearcoat: 1 })); h.position.y = -len / 2; b.add(h);
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.18, 16), new THREE.MeshStandardMaterial({ color: '#CFC6B8', metalness: 1, roughness: 0.25 })); f.position.y = 0.09; b.add(f);
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 16), new THREE.MeshStandardMaterial({ color: tip, roughness: 0.8 })); t.position.y = 0.28; b.add(t);
    b.traverse(o => { if (o.isMesh) o.castShadow = true; }); return b;
  }

  // Предметы на столе: заготовка и кисти (сцена «проблема»)
  const blank = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.18, 0.62, 3, 0.03), new THREE.MeshStandardMaterial({ map: woodTexture('#E2C394', '#A9784A'), roughness: 0.6 }));
  blank.position.set(-2.5, 0.09, 0.7); blank.rotation.y = 0.35; blank.castShadow = true; scene.add(blank); addShadow(-2.5, 0.75, 2.2, 1.1);
  const tb1 = makeBrush(C.forest, '#2F5DA8', 1.2); tb1.rotation.set(0, 0.6, Math.PI / 2); tb1.position.set(-2.2, 0.05, 1.55); scene.add(tb1);
  const tb2 = makeBrush(C.burg, '#F2C230', 1.1); tb2.rotation.set(0, -0.2, Math.PI / 2); tb2.position.set(-1.6, 0.05, 1.85); scene.add(tb2);

  // Рабочее место симулятора: палитра + изделие (разделочная доска с орнаментом)
  const station = new THREE.Group(); station.position.set(2.7, 0, 1.0); scene.add(station);
  const simPal = makePalette(['#C8323A', '#F2C230']); simPal.pal.position.set(-0.55, 0.03, 0.35); simPal.pal.rotation.y = 0.25; station.add(simPal.pal);
  const well = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 32), new THREE.MeshPhysicalMaterial({ color: '#E5DED0', roughness: 0.3, clearcoat: 0.7 }));
  well.position.set(-0.1, 0.07, 0.05); simPal.pal.add(well);
  addShadow(2.15, 1.35, 2.4, 1.8);
  const product = new THREE.Group(); product.position.set(0.75, 0.06, -0.45); station.add(product);
  {
    const s = new THREE.Shape(); s.moveTo(-0.6, -0.4); s.lineTo(0.45, -0.4); s.quadraticCurveTo(0.6, -0.4, 0.6, -0.25); s.lineTo(0.6, -0.12); s.lineTo(0.95, -0.1); s.quadraticCurveTo(1.05, 0, 0.95, 0.1); s.lineTo(0.6, 0.12); s.lineTo(0.6, 0.25); s.quadraticCurveTo(0.6, 0.4, 0.45, 0.4); s.lineTo(-0.45, 0.4); s.quadraticCurveTo(-0.6, 0.4, -0.6, 0.25); s.lineTo(-0.6, -0.4);
    const hole = new THREE.Path(); hole.absarc(0.86, 0, 0.04, 0, Math.PI * 2, true); s.holes.push(hole);
    const board = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 }), new THREE.MeshStandardMaterial({ map: woodTexture('#D9AE78', '#9C6B3C'), roughness: 0.55 }));
    board.rotation.x = -Math.PI / 2; board.castShadow = true; product.add(board);
  }
  const ornMat = new THREE.MeshPhysicalMaterial({ color: '#E5DED0', roughness: 0.35, clearcoat: 0.6 });
  const orn = new THREE.Group(); orn.position.set(-0.05, 0.095, 0); product.add(orn);
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10), ornMat); const a = i * Math.PI / 3; p.position.set(Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15); p.scale.set(1.25, 0.12, 0.62); p.rotation.y = -a; orn.add(p); }
  orn.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 20), new THREE.MeshStandardMaterial({ color: C.gold, metalness: 0.6, roughness: 0.3 })));
  addShadow(3.5, 0.6, 2.2, 1.3);

  let lastKey = '';
  // Связь с симулятором
  const colA = new THREE.Color(), colR = new THREE.Color(), base0 = new THREE.Color('#E5DED0');
  addEventListener('colormix', e => {
    const d = e.detail; MIXV = { ...MIXV, ...d };
    if (d.a) simPal.blobs[0].material.color.set(d.a);
    if (d.b) simPal.blobs[1].material.color.set(d.b);
    colA.set(d.a || '#E5DED0'); colR.set(d.result || '#E5DED0');
    well.material.color.copy(colA).lerp(colR, clamp(d.progress / 100));
    ornMat.color.copy(d.done && d.result ? colR : base0); lastKey = '';
  });

  // Спутники в свободной половине кадра (ndc для компьютера, mndc для телефона)
  const sats = [];
  const addSat = (obj, ch, ndc, mndc, depth, extra = {}) => { scene.add(obj); sats.push({ obj, ch, ndc, mndc, depth, phase: Math.random() * 6, spin: 0, tilt: [0, 0, 0], size: 1, ...extra }); return obj; };
  // Hero: вращающаяся палитра и кисти рядом с портретом
  const heroPal = makePalette(['#C8323A', '#E8792F', '#F2C230', '#4E9A47', '#2F5DA8', '#6E3E8E']);
  addSat(heroPal.pal, 0, [0.14, -0.66], null, 4.4, { tilt: [1.0, 0, 0.2], spin: 1, size: 0.42, turn: true });
  addSat(makeBrush(C.burg, '#E8792F'), 0, [-0.05, 0.62], null, 4.6, { tilt: [0, 0, -0.5], spin: 0.4, size: 0.45 });
  addSat(makeBrush(C.forest, '#2F5DA8', 1.1), 0, [0.94, -0.5], null, 4.6, { tilt: [0, 0, 0.6], spin: 0.4, size: 0.45 });
  // 01: лист сценария
  const pc = document.createElement('canvas'); pc.width = 512; pc.height = 660; const pg = pc.getContext('2d');
  const drawPaper = () => { pg.fillStyle = '#FFFDF8'; pg.fillRect(0, 0, 512, 660); pg.fillStyle = C.forest; pg.font = '700 36px "Playfair Display"'; pg.fillText('Сценарий', 40, 72); pg.font = '500 22px Inter'; SCEN.forEach((r, i) => { pg.fillStyle = C.burg; pg.fillText(r[0], 40, 130 + i * 70); pg.fillStyle = C.mute; pg.fillText('✓ ' + r[1], 60, 160 + i * 70); }); pg.strokeStyle = '#EAE2D2'; for (let y = 100; y < 640; y += 35) { pg.beginPath(); pg.moveTo(30, y); pg.lineTo(482, y); pg.stroke(); } };
  drawPaper(); const ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace;
  const paper = new THREE.Group(); paper.add(new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.06), new THREE.MeshStandardMaterial({ map: ptex, roughness: 0.9, side: THREE.DoubleSide })));
  const pen = makeBrush('#3A3632', '#242424', 1.1); pen.rotation.z = 0.7; pen.position.set(0.7, -0.5, 0.1); paper.add(pen);
  addSat(paper, 3, [0.7, 0.05], [0.6, 0.6], 4.2, { tilt: [-0.15, -0.5, -0.06], spin: .2, size: .55 });
  // 04: жетоны проверки
  const mkToken = ok => { const t = new THREE.Group(); const d = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 40), new THREE.MeshStandardMaterial({ color: ok ? C.forest : C.burg, roughness: 0.3, metalness: 0.2 })); d.rotation.x = Math.PI / 2; t.add(d); const m = new THREE.MeshStandardMaterial({ color: C.ivory });
    if (ok) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.05), m); a.position.set(-0.07, -0.02, 0.06); a.rotation.z = 0.8; const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.05), m); b.position.set(0.07, 0.04, 0.06); b.rotation.z = -0.65; t.add(a, b); }
    else [0.78, -0.78].forEach(z => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.05), m); b.position.z = 0.06; b.rotation.z = z; t.add(b); }); return t; };
  addSat(mkToken(true), 6, [-0.86, 0.55], [-0.72, 0.84], 4.2, { spin: .4, size: .5 });
  addSat(mkToken(true), 6, [-0.9, 0.08], [0.72, 0.84], 4.2, { spin: .4, size: .5 });
  addSat(mkToken(false), 6, [-0.85, -0.4], [0.75, 0.42], 4.2, { spin: .4, size: .5 });
  // 05: карточка файла
  const fc = document.createElement('canvas'); fc.width = 360; fc.height = 460; const fg = fc.getContext('2d');
  const drawFile = () => { fg.fillStyle = C.paper; fg.fillRect(0, 0, 360, 460); fg.fillStyle = C.burg; rr(fg, 40, 40, 280, 240, 24); fg.fill(); fg.fillStyle = '#fff'; fg.font = '700 80px "JetBrains Mono"'; fg.textAlign = 'center'; fg.fillText('</>', 180, 190); fg.fillStyle = C.forest; fg.font = '700 40px "JetBrains Mono"'; fg.fillText('index.html', 180, 350); fg.fillStyle = C.mute; fg.font = '500 24px Inter'; fg.fillText('UTF-8 · 1 файл', 180, 400); };
  drawFile(); const ftex = new THREE.CanvasTexture(fc); ftex.colorSpace = THREE.SRGBColorSpace;
  const fm = new THREE.MeshStandardMaterial({ color: C.paper, roughness: 0.6 });
  addSat(new THREE.Mesh(new RoundedBoxGeometry(1.2, 1.53, 0.08, 3, 0.04), [fm, fm, fm, fm, new THREE.MeshStandardMaterial({ map: ftex, roughness: 0.6 }), fm]), 7, [0.72, 0.08], [0.62, 0.62], 4.2, { spin: .25, size: .55 });

  // 03: блоки кода влетают в экран
  const CN = low ? 20 : 36;
  const blocks = new THREE.InstancedMesh(new RoundedBoxGeometry(0.42, 0.1, 0.1, 2, 0.04), new THREE.MeshStandardMaterial({ roughness: 0.4 }), CN);
  const bStart = [], bEnd = [], M = new THREE.Matrix4(), V = new THREE.Vector3(), Q = new THREE.Quaternion(), Sv = new THREE.Vector3();
  const pal5 = ['#722F3E', '#C6A675', '#273F36', '#E8792F', '#2F5DA8'].map(c => new THREE.Color(c));
  for (let i = 0; i < CN; i++) { const a = Math.random() * Math.PI * 2, r = 2.6 + Math.random() * 1.6; bStart.push(new THREE.Vector3(Math.cos(a) * r, 0.6 + Math.random() * 2.8, Math.sin(a) * r * 0.6 + 1.2)); bEnd.push(new THREE.Vector3(-1.05 + (i % 4) * 0.48, 1.95 - Math.floor(i / 4) * 0.17, 0.12)); blocks.setColorAt(i, pal5[i % 5]); }
  blocks.frustumCulled = false; scene.add(blocks);
  // 06: QR из кубиков
  const qOn = QR.map((v, i) => (v ? i : -1)).filter(i => i >= 0);
  const qr = new THREE.InstancedMesh(new THREE.BoxGeometry(0.085, 0.085, 0.085), new THREE.MeshStandardMaterial({ color: C.forest, roughness: 0.5 }), qOn.length);
  const qStart = qOn.map(() => new THREE.Vector3((Math.random() - .5) * 6, Math.random() * 4, (Math.random() - .5) * 4));
  const qEnd = qOn.map(i => new THREE.Vector3(((i % QN) - QN / 2) * 0.09 - 2.6, 2.5 - Math.floor(i / QN) * 0.09, 0.6));
  qr.frustumCulled = false; scene.add(qr);

  // Ключи камеры по сценам: [позиция, цель]
  const KEYS = [
    [[0.8, 3.3, 10.8], [0.2, 1.0, 0]],
    [[0.1, 1.6, 4.3], [0, 1.1, 0]],
    [[-1.2, 2.3, 4.8], [-2.1, 0.4, 0.9]],
    [[1.2, 2.4, 5.6], [0.3, 1.1, 0]],
    [[-0.3, 2.4, 5.4], [0, 1.1, 0]],
    [[0.5, 1.7, 3.9], [0, 1.1, 0]],
    [[-0.3, 1.7, 3.9], [0, 1.1, 0]],
    [[-0.6, 1.8, 4.8], [-0.4, 1.2, 0.2]],
    [[2.0, 2.2, 5.4], [0.8, 1.2, 0.3]],
    [[-2.8, 3.0, 6.6], [-0.7, 1.3, 0]],
    [[1.9, 3.1, 5.6], [2.6, 0.2, 0.9]],
    [[3.6, 1.6, 3.5], [3.1, 0.35, 0.6]],
  ].map(([p, t]) => [new THREE.Vector3(...p), new THREE.Vector3(...t)]);
  const sides = sections.map(s => (s.dataset.side === 'r' ? 1 : s.dataset.side === 'l' ? -1 : 0));

  let W = 0, H = 0, mobile = false;
  function resize() { W = innerWidth; H = innerHeight; mobile = W <= 820; door.visible = !mobile; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  const mouse = { x: 0, y: 0 };
  addEventListener('pointermove', e => { mouse.x = e.clientX / W - .5; mouse.y = e.clientY / H - .5; }, { passive: true });

  // Вращение изделия на сцене симулятора (мышь и касание)
  const stage = document.getElementById('simStage'); let spinY = 0, spinV = 0, drag = null;
  stage.addEventListener('pointerdown', e => { drag = e.clientX; stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', e => { if (drag === null) return; const d = (e.clientX - drag) / 120; spinY += d; spinV = d; drag = e.clientX; });
  ['pointerup', 'pointercancel'].forEach(ev => stage.addEventListener(ev, () => (drag = null)));

  let tTarget = scrollT(), tS = tTarget, instant = false, offX = sides[0] * 0.2;
  addEventListener('scroll', () => { tTarget = scrollT(); }, { passive: true });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { drawPaper(); ptex.needsUpdate = true; drawFile(); ftex.needsUpdate = true; drawSign(); sgt.needsUpdate = true; lastKey = ''; });
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(); const clock = new THREE.Clock(); const t0 = performance.now();

  function update() {
    const time = clock.getElapsedTime();
    tS += (tTarget - tS) * (reduce || instant ? 1 : 0.07);
    const i0 = Math.floor(clamp(tS, 0, KEYS.length - 1)), i1 = Math.min(i0 + 1, KEYS.length - 1), f = smooth(clamp(tS - i0));
    camPos.lerpVectors(KEYS[i0][0], KEYS[i1][0], f); camTgt.lerpVectors(KEYS[i0][1], KEYS[i1][1], f);
    const asp = W / H, dist = mobile ? Math.min(1.9, Math.max(1, 1.25 / asp)) : clamp(1.6 / asp, 1, 1.3);
    camPos.sub(camTgt).multiplyScalar(dist).add(camTgt);
    if (!reduce) { camPos.x += mouse.x * 0.35; camPos.y -= mouse.y * 0.2; }
    camera.position.copy(camPos); camera.lookAt(camTgt);
    const side = sides[i0] + (sides[i1] - sides[i0]) * f;
    const wantX = mobile ? 0 : side * (W < 1200 ? 0.26 : 0.21);
    offX += (wantX - offX) * (reduce || instant ? 1 : 0.08);
    if (mobile) camera.setViewOffset(W, H, 0, H * 0.2, W, H); else camera.setViewOffset(W, H, offX * W, 0, W, H);
    camera.updateMatrixWorld();

    const open = reduce ? 1 : smooth(clamp((performance.now() - t0) / 1800));
    hinge.rotation.x = Math.PI / 2 * (1 - open) - 0.18 * open;

    // Сцена 1 — пролёт входа; контентные главы смещены на 1
    const chS = clamp(Math.round(tS), 0, KEYS.length - 1), ch = chS === 0 ? 0 : chS === 1 ? -1 : chS - 1, k = reduce ? 1 : clamp((tS - chS + 0.5) / 0.65);
    const keyS = ch + ':' + Math.round(k * 40);
    if (keyS !== lastKey) { lastKey = keyS; drawScreen(sctx, SW, SH, ch, k); stex.needsUpdate = true; }

    const w = i => smooth(clamp(1 - Math.abs(tS - (i === 0 ? 0 : i + 1)) * 1.25));
    sats.forEach(s => {
      const n = mobile ? s.mndc : s.ndc;
      const wt = n ? w(s.ch) : 0; s.obj.visible = wt > 0.01; if (!s.obj.visible) return;
      s.obj.scale.setScalar(Math.max(wt * s.size, 0.0001));
      V.set(n[0], n[1] + (reduce ? 0 : Math.sin(time * 1.2 + s.phase) * 0.02) - (1 - wt) * 0.3, 0.5).unproject(camera).sub(camera.position).normalize();
      s.obj.position.copy(camera.position).addScaledVector(V, s.depth);
      s.obj.quaternion.copy(camera.quaternion);
      s.obj.rotateX(s.tilt[0]); s.obj.rotateY(s.tilt[1] + (reduce ? 0 : Math.sin(time * 0.6 + s.phase) * 0.5 * s.spin + (s.turn ? time * 0.35 : 0))); s.obj.rotateZ(s.tilt[2]);
    });
    const w5 = w(5);
    for (let i = 0; i < CN; i++) { const pi = smooth(clamp(w5 * 1.5 - (i / CN) * 0.5)); V.lerpVectors(bStart[i], bEnd[i], pi); Sv.setScalar(Math.max(w5, 0.0001)); Q.identity(); M.compose(V, Q, Sv); blocks.setMatrixAt(i, M); }
    blocks.instanceMatrix.needsUpdate = true; blocks.visible = w5 > 0.01;
    const w8 = w(8);
    for (let i = 0; i < qOn.length; i++) { const pi = smooth(clamp(w8 * 1.4 - (i / qOn.length) * 0.4)); V.lerpVectors(qStart[i], qEnd[i], pi); Sv.setScalar(Math.max(pi, 0.0001)); Q.identity(); M.compose(V, Q, Sv); qr.setMatrixAt(i, M); }
    qr.instanceMatrix.needsUpdate = true; qr.visible = w8 > 0.01;

    // Изделие: инерция вращения, на сцене результата — медленный показ
    if (drag === null) { spinV *= 0.94; spinY += spinV; if (!reduce) spinY += w(10) * 0.004; }
    product.rotation.y = spinY; simPal.pal.rotation.y = 0.25 + spinY * 0.25;
    product.position.y = 0.06 + w(10) * 0.25; product.rotation.x = -w(10) * 0.35;
    renderer.render(scene, camera);
  }
  function frame() { requestAnimationFrame(frame); if (!document.hidden) update(); }
  frame();
  window.__atelier = { scene, camera, sats, step() { instant = true; tTarget = scrollT(); update(); instant = false; } };
}

// Запуск
function start() {
  initGsap();
  if (!hasWebGL() || location.search.includes('static')) document.documentElement.classList.add('no-webgl');
  else init();
}
if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
