/* Service worker registration */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* Tabs */
document.querySelectorAll('#tabs button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('#tabs button').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.view').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById(b.dataset.view).classList.add('active');
    if (b.dataset.view === 'records') renderRecords();
  };
});

/* Device / install notices */
const isIPhone = /iPhone/i.test(navigator.userAgent);
const isNative = typeof window !== 'undefined' && !!window.Capacitor;
const isStandalone = window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

function showNotices() {
  if (isNative) return;
  if (!isIPhone) document.getElementById('noticeDevice').style.display = 'block';
  if (isIPhone && !isStandalone && localStorage.getItem('sc_install_dismissed') !== '1') {
    document.getElementById('noticeInstall').style.display = 'block';
  }
}
function dismissInstall() {
  document.getElementById('noticeInstall').style.display = 'none';
  localStorage.setItem('sc_install_dismissed', '1');
}

/* native haptics via Capacitor, no-op in the browser */
function haptic(style) {
  const p = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
  if (p) p.impact({ style }).catch(() => {});
}
function hapticNotify(kind) {
  const p = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
  if (p) p.notification({ type: kind }).catch(() => {});
}

/* ===== Audio engine (unified, cancellable) ===== */
let ctx = null;
let master = null;
let analyser = null;
let nodes = [];
let timers = [];
let token = 0;
let tickId = null;
let rafId = null;
let activeCanvas = null;
let wakeLock = null;
let hapticId = null;

function getCtx() {
  if (!ctx || ctx.state === 'closed') {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    ctx = new Ctx();
  }
  if (ctx.state === 'suspended') return ctx.resume().then(() => ctx);
  return Promise.resolve(ctx);
}

/* iOS WKWebView: unlock the AudioContext inside a real touch gesture */
function unlockAudioOnTouch() {
  document.addEventListener('touchstart', () => { getCtx(); }, { once: true, passive: true });
  document.addEventListener('click', () => { getCtx(); }, { once: true, passive: true });
}

function startHapticLoop() {
  if (!isNative || hapticId) return;
  const tick = () => { haptic('soft'); hapticId = setTimeout(tick, 1200); };
  hapticId = setTimeout(tick, 600);
}

function stopHapticLoop() {
  if (hapticId) { clearTimeout(hapticId); hapticId = null; }
}

function vol() {
  return Math.max(0.1, parseInt(localStorage.getItem('sc_vol') || '90', 10) / 100);
}

function setVol(v) {
  localStorage.setItem('sc_vol', v);
  document.getElementById('volVal').innerText = v;
  if (master && ctx) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(vol(), ctx.currentTime);
  }
}

function killNodes() {
  nodes.forEach((n) => { try { n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} });
  nodes = [];
  if (master) { try { master.disconnect(); } catch (e) {} master = null; }
}

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function later(fn, ms) {
  const id = setTimeout(fn, ms);
  timers.push(id);
  return id;
}

async function keepScreenAwake() {
  if (!('wakeLock' in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { wakeLock = null; }
}

function releaseScreenLock() {
  if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && activeCanvas) keepScreenAwake();
});

function stopAll() {
  token++;
  clearTimers();
  killNodes();
  stopMetro();
  releaseScreenLock();
  stopHapticLoop();
  haptic('light');
  if (tickId) { clearInterval(tickId); tickId = null; }
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  document.getElementById('nowbar').classList.remove('on');
  if (activeCanvas) {
    const c = activeCanvas.getContext('2d');
    c.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
  }
}

function draw() {
  if (!analyser || !activeCanvas) return;
  const cv = activeCanvas;
  const cc = cv.getContext('2d');
  cv.width = cv.clientWidth;
  cv.height = cv.clientHeight;
  const arr = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(arr);
  cc.fillStyle = '#000';
  cc.fillRect(0, 0, cv.width, cv.height);
  cc.lineWidth = 2;
  cc.strokeStyle = '#30d158';
  cc.beginPath();
  const sl = cv.width / arr.length;
  let x = 0;
  for (let i = 0; i < arr.length; i++) {
    const y = (arr[i] / 128) * cv.height / 2;
    if (i) cc.lineTo(x, y); else cc.moveTo(x, y);
    x += sl;
  }
  cc.stroke();
  rafId = requestAnimationFrame(draw);
}

async function startGraph(duration, label, build, canvasId) {
  const c = await getCtx();
  killNodes();
  if (tickId) { clearInterval(tickId); tickId = null; }
  master = c.createGain();
  analyser = c.createAnalyser();
  analyser.fftSize = 1024;
  const t = c.currentTime;
  const v = vol();
  const fade = Math.min(0.4, duration / 4);
  master.gain.setValueAtTime(0.0001, t);
  master.gain.exponentialRampToValueAtTime(v, t + fade);
  master.gain.setValueAtTime(v, Math.max(t + fade, t + duration - fade));
  master.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  master.connect(analyser);
  analyser.connect(c.destination);
  build(c, master);
  later(() => { killNodes(); releaseScreenLock(); stopHapticLoop(); }, (duration * 1000) + 60);
  activeCanvas = document.getElementById(canvasId || 'vizHome');
  showBar(label, duration);
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  draw();
  keepScreenAwake();
  haptic('medium');
  startHapticLoop();
}

/* node builders: create the audio graph without touching token or timers */
function buildTone(freq, type, pan) {
  return (c, d) => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    const p = c.createStereoPanner();
    p.pan.setValueAtTime(pan || 0, c.currentTime);
    o.connect(p).connect(d);
    o.start();
    nodes.push(o);
  };
}

function buildSweep(from, to, duration) {
  return (c, d) => {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(from, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(to, c.currentTime + duration);
    o.connect(d);
    o.start();
    nodes.push(o);
  };
}

function buildNoise(c, kind) {
  const size = 2 * c.sampleRate;
  const buf = c.createBuffer(1, size, c.sampleRate);
  const o = buf.getChannelData(0);
  if (kind === 'white') {
    for (let i = 0; i < size; i++) o[i] = Math.random() * 2 - 1;
  } else if (kind === 'brown') {
    let last = 0;
    for (let i = 0; i < size; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      o[i] = last * 3.5;
    }
  } else {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < size; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      o[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }
  return buf;
}

function buildNoiseSource(kind) {
  return (c, d) => {
    const n = c.createBufferSource();
    n.buffer = buildNoise(c, kind);
    n.loop = true;
    n.connect(d);
    n.start();
    nodes.push(n);
  };
}

/* one-shot entry points: stop everything, then play a single graph */
function tone(freq, type, duration, pan, label) {
  stopAll();
  startGraph(duration, label, buildTone(freq, type, pan));
}

function sweep(from, to, duration, label) {
  stopAll();
  startGraph(duration, label, buildSweep(from, to, duration));
}

function noise(kind, duration, label) {
  stopAll();
  startGraph(duration, label, buildNoiseSource(kind));
}

function pulse(freq, duration, label) {
  stopAll();
  startGraph(duration, label, (c, d) => {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    const g = c.createGain();
    for (let s = 0; s < duration; s++) {
      g.gain.setValueAtTime(1, c.currentTime + s);
      g.gain.setValueAtTime(0.0001, c.currentTime + s + 0.5);
    }
    o.connect(g).connect(d);
    o.start();
    nodes.push(o);
  });
}

/* sequences: a single stopAll at start, phases built directly via startGraph */
function altLR() {
  stopAll();
  const my = token;
  let side = -1;
  let n = 0;
  const step = () => {
    if (my !== token) return;
    startGraph(1, side < 0 ? 'Alternato — Sinistro' : 'Alternato — Destro', buildTone(1000, 'sine', side));
    side *= -1;
    n++;
    if (n < 8) later(step, 1000);
  };
  step();
}

function deepClean() {
  stopAll();
  const my = token;
  logHistory();
  startGraph(20, 'Deep Clean 1/3 — Water', buildTone(165, 'sine', 0));
  later(() => { if (my !== token) return; startGraph(20, 'Deep Clean 2/3 — Dust', buildSweep(100, 1000, 20)); }, 20500);
  later(() => { if (my !== token) return; startGraph(19, 'Deep Clean 3/3 — Pink Noise', buildNoiseSource('pink')); }, 41000);
}

function playCustom() {
  const f = +document.getElementById('fSlider').value;
  const w = document.getElementById('wave').value;
  const d = +document.getElementById('dSlider').value;
  doClean(() => tone(f, w, d, 0, `Custom ${f} Hz`));
}

/* Lab */
function labTone() {
  const f = +document.getElementById('gf').value;
  const w = document.getElementById('gw').value;
  tone(f, w, 3600, 0, `Generatore ${f} Hz`);
}

function labSweep() {
  const a = +document.getElementById('s1').value;
  const b = +document.getElementById('s2').value;
  const d = +document.getElementById('sd').value;
  sweep(a, b, d, `Sweep ${a}→${b} Hz`);
}

/* now-playing bar */
function showBar(label, duration) {
  const bar = document.getElementById('nowbar');
  const txt = document.getElementById('nowtxt');
  bar.classList.add('on');
  const end = Date.now() + duration * 1000;
  const r = () => {
    const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    txt.innerHTML = `<b>${label}</b><br>Tempo residuo: ${s > 3000 ? '∞' : s + 's'}`;
  };
  r();
  if (tickId) clearInterval(tickId);
  tickId = setInterval(() => {
    r();
    if (Date.now() >= end) { clearInterval(tickId); tickId = null; }
  }, 250);
}

/* clean wrapper: logs to history */
function doClean(fn) {
  fn();
  logHistory();
}

function logHistory() {
  const txt = (document.getElementById('nowtxt').textContent || 'Sessione')
    .replace(/Tempo residuo.*$/, '').trim() || 'Sessione';
  const h = JSON.parse(localStorage.getItem('sc_hist') || '[]');
  h.unshift({ t: Date.now(), label: txt });
  localStorage.setItem('sc_hist', JSON.stringify(h.slice(0, 50)));
}

/* mic level (honest) */
async function micLevel() {
  const el = document.getElementById('micDiag');
  try {
    el.innerText = 'Misura in corso (5 s)...';
    const st = await navigator.mediaDevices.getUserMedia({ audio: true });
    const c = await getCtx();
    const src = c.createMediaStreamSource(st);
    const a = c.createAnalyser();
    a.fftSize = 2048;
    src.connect(a);
    const data = new Uint8Array(a.frequencyBinCount);
    let peak = 0;
    let sum = 0;
    let cnt = 0;
    const s0 = Date.now();
    const loop = () => {
      a.getByteTimeDomainData(data);
      let p = 0;
      for (let i = 0; i < data.length; i++) {
        const v = Math.abs(data[i] - 128);
        if (v > p) p = v;
      }
      peak = Math.max(peak, p);
      sum += p;
      cnt++;
      if (Date.now() - s0 < 5000) {
        requestAnimationFrame(loop);
      } else {
        st.getTracks().forEach((t) => t.stop());
        el.innerHTML = `Picco <b>${peak}</b> · Media <b>${(sum / cnt).toFixed(1)}</b> (0–128). Livello ambientale, non stato speaker.`;
      }
    };
    loop();
  } catch (e) {
    el.innerText = 'Permesso microfono negato (Impostazioni > Safari o SpeakerClean).';
  }
}

/* hearing check */
function hc(freq) {
  const ear = +document.getElementById('hcEar').value;
  stopAll();
  startGraph(2, `Hearing ${freq} Hz`, (cc, d) => {
    const o = cc.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const p = cc.createStereoPanner();
    p.pan.value = ear;
    o.connect(p).connect(d);
    o.start();
    nodes.push(o);
  });
}

/* metronome */
let metroOn = false;
let metroId = null;
let bpm = 120;
let nextNote = 0;

function toggleMetro() {
  if (metroOn) stopMetro(); else startMetro();
}

async function startMetro() {
  const c = await getCtx();
  metroOn = true;
  nextNote = c.currentTime + 0.1;
  const b = document.getElementById('metroBtn');
  b.innerText = 'Ferma metronomo';
  b.classList.replace('b-go', 'b-red');
  metroId = setInterval(() => {
    while (nextNote < c.currentTime + 0.1) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.value = 1000;
      g.gain.setValueAtTime(vol(), nextNote);
      g.gain.exponentialRampToValueAtTime(0.0001, nextNote + 0.05);
      o.connect(g).connect(c.destination);
      o.start(nextNote);
      o.stop(nextNote + 0.06);
      nextNote += 60 / bpm;
    }
  }, 25);
}

function stopMetro() {
  if (metroId) { clearInterval(metroId); metroId = null; }
  metroOn = false;
  const b = document.getElementById('metroBtn');
  if (b) { b.innerText = 'Avvia metronomo'; b.classList.replace('b-red', 'b-go'); }
}

/* live analyzer (independent from tone engine) */
let anStream = null;
let anRaf = null;
let anOn = false;

function toggleAnalyzer() {
  if (anOn) stopAnalyzer(); else startAnalyzer();
}

async function startAnalyzer() {
  try {
    anStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const c = await getCtx();
    const src = c.createMediaStreamSource(anStream);
    const a = c.createAnalyser();
    a.fftSize = 2048;
    src.connect(a);
    anOn = true;
    const btn = document.getElementById('anBtn');
    btn.innerText = 'Ferma analisi';
    btn.classList.replace('b-go', 'b-red');
    const scope = document.getElementById('anScope');
    const spec = document.getElementById('anSpec');
    const read = document.getElementById('anRead');
    const td = new Uint8Array(a.fftSize);
    const fd = new Uint8Array(a.frequencyBinCount);
    const ftd = new Float32Array(a.fftSize);
    const loop = () => {
      if (!anOn) return;
      drawAnaScope(scope, td, a);
      drawAnaSpectrum(spec, fd, a);
      const { rms, domHz, maxv } = computeAnaStats(ftd, fd, a, c);
      read.innerHTML = `RMS: <b>${rms} dBFS</b> · Freq. dominante: <b>${maxv > 20 ? domHz + ' Hz' : '—'}</b>`;
      anRaf = requestAnimationFrame(loop);
    };
    loop();
  } catch (e) {
    document.getElementById('anRead').innerText = 'Permesso microfono negato.';
  }
}

function drawAnaScope(scope, td, a) {
  scope.width = scope.clientWidth;
  scope.height = scope.clientHeight;
  const sc = scope.getContext('2d');
  a.getByteTimeDomainData(td);
  sc.fillStyle = '#000';
  sc.fillRect(0, 0, scope.width, scope.height);
  sc.lineWidth = 2;
  sc.strokeStyle = '#0a84ff';
  sc.beginPath();
  let x = 0;
  const sl = scope.width / td.length;
  for (let i = 0; i < td.length; i++) {
    const y = (td[i] / 128) * scope.height / 2;
    if (i) sc.lineTo(x, y); else sc.moveTo(x, y);
    x += sl;
  }
  sc.stroke();
}

function drawAnaSpectrum(spec, fd, a) {
  spec.width = spec.clientWidth;
  spec.height = spec.clientHeight;
  const sp = spec.getContext('2d');
  a.getByteFrequencyData(fd);
  sp.fillStyle = '#000';
  sp.fillRect(0, 0, spec.width, spec.height);
  const bars = 64;
  const bw = spec.width / bars;
  for (let i = 0; i < bars; i++) {
    const val = fd[Math.floor(i / bars * fd.length)];
    const h = val / 255 * spec.height;
    sp.fillStyle = `hsl(${200 - val / 255 * 160},80%,55%)`;
    sp.fillRect(i * bw, spec.height - h, bw - 1, h);
  }
}

function computeAnaStats(ftd, fd, a, c) {
  a.getFloatTimeDomainData(ftd);
  let sum = 0;
  for (let i = 0; i < ftd.length; i++) sum += ftd[i] * ftd[i];
  const rms = (20 * Math.log10(Math.sqrt(sum / ftd.length) || 1e-8)).toFixed(1);
  let maxi = 0;
  let maxv = 0;
  for (let i = 0; i < fd.length; i++) {
    if (fd[i] > maxv) { maxv = fd[i]; maxi = i; }
  }
  const domHz = Math.round(maxi * c.sampleRate / a.fftSize);
  return { rms, domHz, maxv };
}

function stopAnalyzer() {
  anOn = false;
  if (anRaf) cancelAnimationFrame(anRaf);
  if (anStream) anStream.getTracks().forEach((t) => t.stop());
  anStream = null;
  const b = document.getElementById('anBtn');
  b.innerText = 'Avvia analisi';
  b.classList.replace('b-red', 'b-go');
}

/* presets + records */
function savePreset() {
  const f = +document.getElementById('fSlider').value;
  const w = document.getElementById('wave').value;
  const d = +document.getElementById('dSlider').value;
  const name = prompt('Nome del preset:', `${f} Hz ${w}`);
  if (!name) return;
  const p = JSON.parse(localStorage.getItem('sc_presets') || '[]');
  p.push({ name, f, w, d });
  localStorage.setItem('sc_presets', JSON.stringify(p));
  hapticNotify('success');
  alert('Preset salvato');
}

function renderRecords() {
  const pl = document.getElementById('presetList');
  const p = JSON.parse(localStorage.getItem('sc_presets') || '[]');
  pl.innerHTML = p.length ? '' : '<div class="empty">Nessun preset salvato. Creane uno dalla scheda Clean.</div>';
  p.forEach((x, i) => {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<div class="g"><b>${x.name}</b><br>${x.f} Hz · ${x.w} · ${x.d}s</div>`;
    const play = document.createElement('button');
    play.className = 'b-water';
    play.textContent = 'Riproduci';
    play.onclick = () => doClean(() => tone(x.f, x.w, x.d, 0, x.name));
    const del = document.createElement('button');
    del.className = 'b-red';
    del.textContent = 'Elimina';
    del.onclick = () => { p.splice(i, 1); localStorage.setItem('sc_presets', JSON.stringify(p)); renderRecords(); };
    el.appendChild(play);
    el.appendChild(del);
    pl.appendChild(el);
  });
  const hl = document.getElementById('histList');
  const h = JSON.parse(localStorage.getItem('sc_hist') || '[]');
  hl.innerHTML = h.length ? '' : '<div class="empty">Nessuna sessione registrata.</div>';
  h.forEach((x) => {
    const el = document.createElement('div');
    el.className = 'item';
    const dt = new Date(x.t);
    el.innerHTML = `<div class="g">${x.label}<br><span style="color:var(--dim)">${dt.toLocaleString('it-IT')}</span></div>`;
    hl.appendChild(el);
  });
}

function clearHist() {
  if (confirm('Svuotare la cronologia?')) {
    localStorage.removeItem('sc_hist');
    renderRecords();
  }
}

function exportData() {
  const data = {
    presets: JSON.parse(localStorage.getItem('sc_presets') || '[]'),
    hist: JSON.parse(localStorage.getItem('sc_hist') || '[]'),
    vol: localStorage.getItem('sc_vol') || '90'
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'speakerclean-backup.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importData(ev) {
  const f = ev.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (d.presets) localStorage.setItem('sc_presets', JSON.stringify(d.presets));
      if (d.hist) localStorage.setItem('sc_hist', JSON.stringify(d.hist));
      if (d.vol) {
        localStorage.setItem('sc_vol', d.vol);
        document.getElementById('vol').value = d.vol;
        document.getElementById('volVal').innerText = d.vol;
      }
      renderRecords();
      alert('Backup importato');
    } catch (e) {
      alert('File non valido.');
    }
  };
  r.readAsText(f);
}

/* safety modal */
let pending = null;

function guard(fn) {
  pending = fn;
  const c = document.getElementById('chkHead');
  c.checked = false;
  document.getElementById('goBtn').disabled = true;
  document.getElementById('modal').classList.add('on');
}

function modalGo() {
  closeModal();
  if (pending) { const f = pending; pending = null; f(); }
}

function closeModal() {
  document.getElementById('modal').classList.remove('on');
}

/* PWA update */
function updatePWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((rs) => Promise.all(rs.map((r) => r.unregister())))
      .then(() => window.caches ? caches.keys().then((k) => Promise.all(k.map((x) => caches.delete(x)))) : null)
      .then(() => location.reload());
  } else {
    location.reload();
  }
}

/* init */
(function () {
  const v = localStorage.getItem('sc_vol') || '90';
  document.getElementById('vol').value = v;
  document.getElementById('volVal').innerText = v;
  unlockAudioOnTouch();
  showNotices();
})();