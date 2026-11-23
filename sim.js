// Симулятор «Түстерді араластыру»: условная учебная модель по кругу RYB (не физика пигментов)
const PAINTS = [
  { id: 'red', name: 'Қызыл', hex: '#C8323A' },
  { id: 'yellow', name: 'Сары', hex: '#F2C230' },
  { id: 'blue', name: 'Көк', hex: '#2F5DA8' },
  { id: 'white', name: 'Ақ', hex: '#F6F2E8' },
  { id: 'black', name: 'Қара', hex: '#2A2A2A' },
];
const P = Object.fromEntries(PAINTS.map(p => [p.id, p]));
// Результаты пар (ключ — id по алфавиту)
const MIX = {
  'red+yellow': { id: 'orange', name: 'Қызғылт сары', hex: '#E8792F' },
  'blue+yellow': { id: 'green', name: 'Жасыл', hex: '#4E9A47' },
  'blue+red': { id: 'violet', name: 'Күлгін', hex: '#6E3E8E' },
  'red+white': { id: 'pink', name: 'Қызғылт', hex: '#EE9AA6' },
  'white+yellow': { id: 'lightyellow', name: 'Ашық сары', hex: '#F7E08A' },
  'blue+white': { id: 'lightblue', name: 'Көгілдір', hex: '#8FB4E3' },
  'black+red': { id: 'darkred', name: 'Қошқыл қызыл', hex: '#6B1F25' },
  'black+yellow': { id: 'olive', name: 'Зәйтүн түс', hex: '#7A7430' },
  'black+blue': { id: 'navy', name: 'Қою көк', hex: '#1F2F55' },
  'black+white': { id: 'gray', name: 'Сұр', hex: '#8E8E8E' },
};
const ALL = Object.values(MIX);
const mixOf = (a, b) => MIX[[a, b].sort().join('+')];

const WRONG_WHY = [
  'Кез келген екі түс араласса, қара түс шығады.',
  'Ақ түс басқа түсті қоюлатып, күңгірт етеді.',
  'Түс бояудың мөлшеріне ғана байланысты, түстің өзіне емес.',
  'Екінші реттік түс тек үш түсті бірдей араластырғанда шығады.',
];
const TASKS = [
  { target: 'orange', text: 'Апельсин суретіне қызғылт сары түс алыңыз.', why: 'Қызыл мен сары — негізгі түстер. Олар араласқанда екінші реттік түс — қызғылт сары шығады.' },
  { target: 'green', text: 'Жапырақты бояу үшін жасыл түс алыңыз.', why: 'Сары мен көк — негізгі түстер. Олар араласқанда екінші реттік түс — жасыл шығады.' },
  { target: 'violet', text: 'Шегіргүл гүліне күлгін түс алыңыз.', why: 'Қызыл мен көк — негізгі түстер. Олар араласқанда екінші реттік түс — күлгін шығады.' },
  { target: 'pink', text: 'Алма гүлінің күлтесіне қызғылт түс алыңыз.', why: 'Ақ түс қызылды ашықтатады: түстің ашық реңкі шығады.' },
  { target: 'gray', text: 'Бұлттың көлеңкесіне сұр түс алыңыз.', why: 'Ақ пен қара араласқанда ахроматты сұр түс шығады.' },
];
const DESC = ['Бастапқы түстерді дұрыс таңдау', 'Араластыруды орындау', 'Алынған түсті анықтау', 'Нәтижені түсіндіру'];
const KEY = 'atelier:colormix:history';
const pts = n => (n <= 1 ? 2 : n === 2 ? 1 : 0);
const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
const store = {
  get() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } },
  add(r) { try { const h = [r, ...this.get()].slice(0, 10); localStorage.setItem(KEY, JSON.stringify(h)); } catch (e) {} },
};

const root = document.getElementById('simRoot');
const body = root.querySelector('.sim-body');
const stepEls = [...root.querySelectorAll('.sim-steps li')];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let S;

function emit(extra = {}) {
  const r = S.pick.length === 2 ? mixOf(S.pick[0], S.pick[1]) : null;
  window.dispatchEvent(new CustomEvent('colormix', { detail: {
    a: S.pick[0] ? P[S.pick[0]].hex : null, b: S.pick[1] ? P[S.pick[1]].hex : null,
    result: r ? r.hex : null, progress: S.progress, done: S.stage === 4, target: MIX_BY_ID[S.task.target].hex, ...extra } }));
}
const MIX_BY_ID = Object.fromEntries(ALL.map(m => [m.id, m]));

function fresh(taskIdx) {
  const t = taskIdx ?? Math.floor(Math.random() * TASKS.length);
  S = { ti: t, task: TASKS[t], stage: 0, pick: [], progress: 0, tries: [0, 0, 0, 0], rushed: 0, saved: false };
}
function setStage(n) {
  S.stage = n;
  stepEls.forEach((li, i) => { li.classList.toggle('on', i === n); li.classList.toggle('done', i < n); });
  render();
  if (window.gsap && !reduce) gsap.fromTo(body, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .45, ease: 'power2.out' });
}
const taskCard = () => { const tg = MIX_BY_ID[S.task.target]; return `<div class="task"><i style="background:${tg.hex}"></i><div><b>Тапсырма</b>${S.task.text}</div></div>`; };

function render() {
  const st = S.stage;
  if (st === 0) {
    body.innerHTML = `${taskCard()}
      <p>Палитраға салу үшін <b>екі түрлі</b> бояуды таңдаңыз.</p>
      <div class="jars">${PAINTS.map(p => `<button class="jar" type="button" data-id="${p.id}" aria-pressed="${S.pick.includes(p.id)}"><i style="background:${p.hex}"></i>${p.name}</button>`).join('')}</div>
      <div class="fb-slot">${S.msg || ''}</div>
      <div class="row"><button class="btn" type="button" data-act="put" ${S.pick.length === 2 ? '' : 'disabled'}>Палитраға салу</button></div>`;
    body.querySelectorAll('.jar').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.id, i = S.pick.indexOf(id);
      if (i >= 0) S.pick.splice(i, 1); else { if (S.pick.length === 2) S.pick.shift(); S.pick.push(id); }
      S.msg = ''; render(); emit();
    }));
    body.querySelector('[data-act=put]').addEventListener('click', () => { S.tries[0]++; S.progress = 0; S.msg = ''; setStage(1); emit(); });
  } else if (st === 1) {
    const [a, b] = S.pick.map(id => P[id]); const r = mixOf(a.id, b.id);
    body.innerHTML = `${taskCard()}
      <div class="mixer">
        <div class="well" tabindex="0" role="slider" aria-label="Бояуды араластыру: тінтуірмен айналдырыңыз немесе бос орынды басыңыз" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(S.progress)}">
          <div class="swirl" style="background:conic-gradient(${a.hex} 0 25%,${b.hex} 0 50%,${a.hex} 0 75%,${b.hex} 0)"></div><div class="res" style="background:${r.hex}"></div>
        </div>
        <div><p><b>${a.name} + ${b.name}</b>. Бояуды ұяшықта шеңбер бойымен айналдырып араластырыңыз.</p>
          <div class="meter"><i></i></div><p class="pct" style="font-size:14px;color:var(--mute)">0%</p>
          <div class="row"><button class="btn ghost sm" type="button" data-act="stir">Араластыру +25%</button></div></div>
      </div>
      <div class="fb-slot">${S.msg || ''}</div>
      <div class="row"><button class="btn ghost sm" type="button" data-act="back">← Басқа түс</button><button class="btn" type="button" data-act="check">Дайын</button></div>`;
    const well = body.querySelector('.well'), swirl = body.querySelector('.swirl'), res = body.querySelector('.res'), bar = body.querySelector('.meter i'), pct = body.querySelector('.pct');
    const paint = () => {
      const p = S.progress / 100;
      res.style.opacity = Math.min(1, p * 1.1); swirl.style.opacity = 1 - p * .85; swirl.style.transform = `rotate(${p * 900}deg)`;
      bar.style.width = S.progress + '%'; pct.textContent = Math.round(S.progress) + '%'; well.setAttribute('aria-valuenow', Math.round(S.progress)); emit();
    };
    const add = d => { S.progress = Math.min(100, S.progress + d); paint(); };
    let last = null;
    well.addEventListener('pointerdown', e => { well.setPointerCapture(e.pointerId); last = [e.clientX, e.clientY]; });
    well.addEventListener('pointermove', e => { if (!last) return; add(Math.hypot(e.clientX - last[0], e.clientY - last[1]) / 18); last = [e.clientX, e.clientY]; });
    ['pointerup', 'pointercancel'].forEach(ev => well.addEventListener(ev, () => (last = null)));
    well.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); add(10); } });
    body.querySelector('[data-act=stir]').addEventListener('click', () => add(25));
    body.querySelector('[data-act=back]').addEventListener('click', () => { S.pick = []; S.msg = ''; setStage(0); emit(); });
    body.querySelector('[data-act=check]').addEventListener('click', () => {
      if (S.progress < 100) { S.rushed++; body.querySelector('.fb-slot').innerHTML = `<p class="fb err">Бояу толық араласпаған: ұяшықта дақтар қалды. Тағы араластырыңыз.</p>`; return; }
      S.msg = ''; S.opts = null; setStage(2);
    });
    paint();
  } else if (st === 2) {
    const r = mixOf(S.pick[0], S.pick[1]); const tg = MIX_BY_ID[S.task.target];
    if (!S.opts) S.opts = shuffle([r, ...shuffle(ALL.filter(m => m.id !== r.id)).slice(0, 3)]);
    body.innerHTML = `${taskCard()}
      <div class="cmp"><div><i style="background:${r.hex}"></i>Сіздің түсіңіз</div><div><i style="background:${tg.hex}"></i>Тапсырма</div></div>
      <p><b>Қандай түс шықты?</b></p>
      <div class="opts">${S.opts.map(o => `<button class="opt" type="button" data-id="${o.id}">${o.name}</button>`).join('')}</div>
      <div class="fb-slot"></div>`;
    body.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
      S.tries[2]++;
      const slot = body.querySelector('.fb-slot');
      if (b.dataset.id !== r.id) { b.classList.add('bad'); slot.innerHTML = `<p class="fb err">Жоқ, бұл басқа түс. Үлгіге қарап, қайта таңдаңыз.</p>`; return; }
      b.classList.add('good');
      if (r.id === S.task.target) {
        slot.innerHTML = `<p class="fb ok">Дұрыс: ${r.name}. Тапсырмадағы түс алынды!</p><button class="btn" type="button" data-act="next">Түсіндіруге өту →</button>`;
        slot.querySelector('[data-act=next]').addEventListener('click', () => { S.why = null; setStage(3); });
      } else {
        slot.innerHTML = `<p class="fb info">Түсті дұрыс анықтадыңыз: ${r.name}. Бірақ тапсырма — <b>${tg.name}</b>. Қай екі түс ${tg.name.toLowerCase()} береді? Тәжірибені қайталаңыз.</p><button class="btn" type="button" data-act="again">Қайта таңдау</button>`;
        slot.querySelector('[data-act=again]').addEventListener('click', () => { S.pick = []; S.opts = null; S.tries[2] = 0; setStage(0); emit(); });
      }
    }));
  } else if (st === 3) {
    if (!S.why) S.why = shuffle([{ t: S.task.why, ok: true }, ...shuffle(WRONG_WHY).slice(0, 2).map(t => ({ t, ok: false }))]);
    body.innerHTML = `${taskCard()}
      <p><b>Неге осы түс шықты?</b> Дұрыс түсіндірмені таңдаңыз.</p>
      <div class="opts">${S.why.map((o, i) => `<button class="opt" type="button" data-i="${i}">${o.t}</button>`).join('')}</div>
      <div class="fb-slot"></div>`;
    body.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
      S.tries[3]++;
      if (!S.why[b.dataset.i].ok) { b.classList.add('bad'); body.querySelector('.fb-slot').innerHTML = `<p class="fb err">Бұл түсіндірме қате. Түс шеңберін еске түсіріңіз.</p>`; return; }
      setStage(4); emit();
    }));
  } else {
    const d = [pts(S.tries[0]), S.rushed === 0 ? 2 : S.rushed === 1 ? 1 : 0, pts(S.tries[2]), pts(S.tries[3])];
    const total = d.reduce((a, b) => a + b, 0);
    const lvl = total >= 7 ? 'Жоғары деңгей' : total >= 5 ? 'Орта деңгей' : 'Қайталау қажет';
    const rec = [];
    if (d[0] < 2) rec.push('Түс шеңберін қайталаңыз: қай түстер негізгі, қайсысы екінші реттік.');
    if (d[1] < 2) rec.push('Бояуды біркелкі түске дейін араластырыңыз, асықпаңыз.');
    if (d[2] < 2) rec.push('Алынған түсті үлгімен салыстырып атаңыз.');
    if (d[3] < 2) rec.push('Нәтижені «неге?» деген сұрақпен түсіндіріп үйреніңіз.');
    if (!S.saved) { store.add({ task: MIX_BY_ID[S.task.target].name, total, at: new Date().toISOString() }); S.saved = true; window.dispatchEvent(new Event('colormix-saved')); }
    const hist = store.get().slice(0, 5).map(h => `${h.task}: ${h.total}/8`).join(' · ');
    body.innerHTML = `<div class="score"><strong>${total}/8</strong><span>${lvl}</span></div>
      <ul class="desc">${DESC.map((n, i) => `<li><span>${n}</span><b>${d[i]}/2</b></li>`).join('')}</ul>
      ${rec.length ? `<p class="fb info">${rec.join(' ')}</p>` : `<p class="fb ok">Барлық дескриптор орындалды. Жарайсыз!</p>`}
      <div class="row"><button class="btn" type="button" data-act="new">Жаңа тапсырма</button><button class="btn ghost sm" type="button" data-act="same">Осы тапсырманы қайталау</button></div>
      <p class="hist">Соңғы нәтижелер (осы браузерде сақталады): ${hist}</p>`;
    body.querySelector('[data-act=new]').addEventListener('click', () => { let n; do { n = Math.floor(Math.random() * TASKS.length); } while (n === S.ti && TASKS.length > 1); fresh(n); setStage(0); emit(); });
    body.querySelector('[data-act=same]').addEventListener('click', () => { fresh(S.ti); setStage(0); emit(); });
  }
}

fresh(0); setStage(0); emit();
export const simState = () => S;
