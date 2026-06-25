/* Stepper: the 3-step flow, Simple/Advanced toggle, stance picker, and expiration selector.
   Owns which expiration is active, reads the drawn view from the canvas, asks the engine to
   rank, and renders Step 3. The only DOM-heavy UI module. */
import { MKT } from './data.js';
import { draw, applyStance, getView, setActiveExp } from './canvas.js';
import { rankTop, payoffSVG, money } from './engine.js';

const app = document.getElementById('app');
const cur = { n: 1 }, max = 3;
let stance = 'up', activeExp = 'aug';
const steps = [].slice.call(app.querySelectorAll('.step'));
const dots = [].slice.call(app.querySelectorAll('.dot'));

function show(n) {
  cur.n = Math.min(max, Math.max(1, n));
  steps.forEach(function (s) { s.style.display = (+s.dataset.step === cur.n) ? '' : 'none'; });
  dots.forEach(function (d) { d.classList.toggle('on', +d.dataset.go === cur.n); });
  document.getElementById('back').style.visibility = cur.n === 1 ? 'hidden' : 'visible';
  document.getElementById('next').textContent = cur.n === max ? 'Start over' : 'Next →';
  if (cur.n === 2) draw();
  if (cur.n === 3) renderResults();
}

function renderResults() {
  const rows = rankTop(getView(), activeExp, 4);
  document.getElementById('results').innerHTML = rows.map(function (r, i) {
    const s = r.s, m = r.m, tier = s.cap < 2000 ? 'Low' : s.cap < 8000 ? 'Medium' : 'High';
    const roi = m.ev / s.cap * 100;
    return '<div class="row' + (i === 0 ? ' top' : '') + '">' +
      '<div style="flex:0 0 auto"><div class="rk">' + (i + 1) + '</div></div>' +
      '<div style="flex:0 0 178px"><span class="badge">' + tier + ' capital</span><p style="font-weight:500;margin:7px 0 0">' + s.n + (i === 0 ? ' <span style="font-size:11px;color:var(--tinfo)">top pick</span>' : '') + '</p><p class="tiny" style="margin:0">' + s.t + '</p>' + payoffSVG(s.f) + '</div>' +
      '<div style="flex:1;min-width:190px"><div style="display:flex;gap:18px;flex-wrap:wrap">' +
        '<div><p class="stat">Prob. of profit<b>' + Math.round(m.pop * 100) + '%</b></p></div>' +
        '<div><p class="stat">Expected P/L<b style="color:' + (m.ev >= 0 ? 'var(--tsuccess)' : 'var(--tdanger)') + '">' + money(m.ev) + '</b></p></div>' +
        '<div><p class="stat">Worst 5%<b style="color:var(--tdanger)">' + money(-m.cvar) + '</b></p></div>' +
        '<div><p class="stat">Capital<b>' + money(s.cap) + '</b></p></div>' +
        '<div><p class="stat">Est. ROI<b style="color:' + (roi >= 0 ? 'var(--tsuccess)' : 'var(--tdanger)') + '">' + (roi >= 0 ? '+' : '') + Math.round(roi) + '%</b></p></div>' +
      '</div><p class="stat adv-only" style="margin-top:8px">' + s.g + '</p></div>' +
    '</div>';
  }).join('');
}

export function initStepper() {
  /* surface the live snapshot's provenance from the data module (single source of truth) */
  const hp = document.getElementById('hdrPrice'); if (hp) hp.textContent = '$' + MKT.spot.toFixed(2);
  const ct = document.getElementById('chainTag'); if (ct) ct.textContent = 'Live chain · TSLA $' + MKT.spot.toFixed(2) + ' · ' + MKT.asof.split(',')[0];

  dots.forEach(function (d) { d.onclick = function () { show(+d.dataset.go); }; });
  document.getElementById('back').onclick = function () { show(cur.n - 1); };
  document.getElementById('next').onclick = function () { cur.n === max ? show(1) : show(cur.n + 1); };
  app.querySelectorAll('.stance').forEach(function (b) {
    b.onclick = function () { app.querySelectorAll('.stance').forEach(function (x) { x.classList.remove('sel'); }); b.classList.add('sel'); stance = b.dataset.stance; applyStance(stance); };
  });
  const segS = document.getElementById('segS'), segA = document.getElementById('segA');
  segS.onclick = function () { app.classList.remove('show-adv'); segS.classList.add('on'); segA.classList.remove('on'); if (cur.n === 3) renderResults(); };
  segA.onclick = function () { app.classList.add('show-adv'); segA.classList.add('on'); segS.classList.remove('on'); if (cur.n === 3) renderResults(); };
  app.querySelectorAll('[data-exp]').forEach(function (b) {
    b.onclick = function () {
      app.querySelectorAll('[data-exp]').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
      activeExp = b.dataset.exp; setActiveExp(activeExp); renderResults();
    };
  });
}
