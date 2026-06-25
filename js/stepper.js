/* Stepper: 2-step flow — (1) pick a stock via search, (2) one workspace where you draw the
   prediction and watch strategies re-rank LIVE as you drag. Owns the active symbol + expiration,
   reads the drawn view from the canvas, asks the engine to rank, and renders results. */
import { searchSymbols, getChain } from './data.js';
import { draw, getView, setChain, setActiveExp, setOnChange } from './canvas.js';
import { rankTop, payoffSVG, money } from './engine.js';

const app = document.getElementById('app');
const cur = { n: 1 }, max = 2;
let activeSymbol = null, activeExp = 'aug';
const steps = [].slice.call(app.querySelectorAll('.step'));
const dots = [].slice.call(app.querySelectorAll('.dot'));

function show(n) {
  cur.n = Math.min(max, Math.max(1, n));
  steps.forEach(function (s) { s.style.display = (+s.dataset.step === cur.n) ? '' : 'none'; });
  dots.forEach(function (d) { d.classList.toggle('on', +d.dataset.go === cur.n); });
  document.getElementById('back').style.visibility = cur.n === 1 ? 'hidden' : 'visible';
  document.getElementById('next').style.visibility = cur.n === 1 ? 'hidden' : 'visible';
  document.getElementById('next').textContent = 'Start over';
  if (cur.n === 1) { const si = document.getElementById('search'); if (si) si.focus(); }
  if (cur.n === 2 && activeSymbol) { draw(); renderResults(); }
}

function renderSearch() {
  const res = searchSymbols(document.getElementById('search').value);
  const box = document.getElementById('searchResults');
  if (!res.length) { box.innerHTML = '<p class="tiny" style="padding:10px 2px">No loaded tickers match — more unlock once the live data backend is wired.</p>'; return; }
  box.innerHTML = res.map(function (r) {
    return '<button class="sres" data-sym="' + r.sym + '"><b>' + r.sym + '</b><span class="muted" style="margin-left:8px">' + r.name + '</span><span style="margin-left:auto;font-weight:500">$' + r.spot.toFixed(2) + '</span></button>';
  }).join('');
  box.querySelectorAll('[data-sym]').forEach(function (b) { b.onclick = function () { selectStock(b.dataset.sym); }; });
}

function selectStock(sym) {
  activeSymbol = sym;
  const chain = getChain(sym);
  setChain(chain);
  document.getElementById('stockPill').innerHTML = '🔍 ' + sym + ' · ' + chain.name + ' <span class="muted">$' + chain.spot.toFixed(2) + '</span> ▾';
  const ct = document.getElementById('chainTag'); if (ct) ct.textContent = 'Live chain · ' + sym + ' $' + chain.spot.toFixed(2) + ' · ' + chain.asof.split(',')[0];
  show(2);
}

function renderResults() {
  if (!activeSymbol) return;
  const chain = getChain(activeSymbol);
  const rows = rankTop(getView(), chain, activeExp, 4);
  document.getElementById('results').innerHTML = rows.map(function (r, i) {
    const s = r.s, m = r.m, tier = s.cap < 2000 ? 'Low' : s.cap < 8000 ? 'Medium' : 'High';
    const roi = m.ev / s.cap * 100;
    return '<div class="row' + (i === 0 ? ' top' : '') + '">' +
      '<div style="flex:0 0 auto"><div class="rk">' + (i + 1) + '</div></div>' +
      '<div style="flex:0 0 178px"><span class="badge">' + tier + ' capital</span><p style="font-weight:500;margin:7px 0 0">' + s.n + (i === 0 ? ' <span style="font-size:11px;color:var(--tinfo)">top pick</span>' : '') + '</p><p class="tiny" style="margin:0">' + s.desc + '</p>' + payoffSVG(s.f, chain.spot) + '</div>' +
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
  const si = document.getElementById('search');
  si.addEventListener('input', renderSearch);
  renderSearch();
  dots.forEach(function (d) { d.onclick = function () { if (+d.dataset.go === 2 && !activeSymbol) return; show(+d.dataset.go); }; });
  document.getElementById('back').onclick = function () { show(cur.n - 1); };
  document.getElementById('next').onclick = function () { show(1); };
  const segS = document.getElementById('segS'), segA = document.getElementById('segA');
  segS.onclick = function () { app.classList.remove('show-adv'); segS.classList.add('on'); segA.classList.remove('on'); if (cur.n === 2) renderResults(); };
  segA.onclick = function () { app.classList.add('show-adv'); segA.classList.add('on'); segS.classList.remove('on'); if (cur.n === 2) renderResults(); };
  app.querySelectorAll('[data-exp]').forEach(function (b) {
    b.onclick = function () { app.querySelectorAll('[data-exp]').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); activeExp = b.dataset.exp; setActiveExp(activeExp); };
  });
  const sp = document.getElementById('stockPill'); if (sp) sp.onclick = function () { show(1); };
  setOnChange(function () { if (cur.n === 2) renderResults(); });
  show(1);
}
