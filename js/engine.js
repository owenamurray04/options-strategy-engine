/* Engine: builds each strategy from the real chain, integrates its payoff against the
   user's view distribution, and ranks by reward-vs-worst-case-risk per dollar of capital.
   Pure module — no DOM. Inputs come in as plain numbers; outputs are data + small SVG/text helpers. */
import { MKT, STRATS } from './data.js';

function intr(type, k, S) { return type === 'c' ? Math.max(S - k, 0) : type === 'p' ? Math.max(k - S, 0) : S; }

/* Build one concrete strategy (payoff fn, capital-at-risk, net-Greeks string) for a given expiration. */
export function makeStrat(def, expKey) {
  const e = MKT.exp[expKey];
  const legs = def.legs.map(function (l) {
    const arr = l[0] === 'stock' ? null : (l[0] === 'c' ? e.c : e.p)[l[1]];
    return { type: l[0], k: l[1], sign: l[2], prem: l[0] === 'stock' ? MKT.spot : arr[0], arr: arr };
  });
  const net = legs.reduce(function (a, l) { return a + l.sign * l.prem; }, 0); /* >0 = net debit paid */
  function f(S) { let pl = 0; legs.forEach(function (l) { pl += l.sign * intr(l.type, l.k, S); }); return 100 * (pl - net); }
  /* capital at risk = worst-case loss; payoff is piecewise-linear so the min sits at a breakpoint */
  const bps = [0, 1000]; legs.forEach(function (l) { if (l.type !== 'stock') bps.push(l.k); });
  let minpl = Infinity; bps.forEach(function (S) { minpl = Math.min(minpl, f(S)); });
  const cap = Math.max(1, -minpl);
  let nd = 0, nt = 0, nv = 0;
  legs.forEach(function (l) { if (l.type === 'stock') { nd += l.sign; } else { nd += l.sign * l.arr[1]; nt += l.sign * l.arr[2]; nv += l.sign * l.arr[3]; } });
  const g = 'Δ ' + (nd >= 0 ? '+' : '−') + Math.abs(nd).toFixed(2) +
    ' · Θ ' + (nt * 100 >= 0 ? '+' : '−') + '$' + Math.abs(nt * 100).toFixed(0) + '/day' +
    ' · ν ' + (nv >= 0 ? '+' : '−') + '$' + Math.abs(nv).toFixed(2) + '/vol-pt';
  return { n: def.n, t: def.t, f: f, cap: cap, g: g };
}

/* User's view as a split-normal over price at expiration. modePrice/sigUp/sigDn are in dollars. */
export function priceDist(modePrice, sigUp, sigDn) {
  const grid = [], pr = []; let sum = 0;
  for (let S = 150; S <= 600; S++) { const sig = S >= modePrice ? sigUp : sigDn, w = Math.exp(-0.5 * ((S - modePrice) / sig) * ((S - modePrice) / sig)); grid.push(S); pr.push(w); sum += w; }
  for (let i = 0; i < pr.length; i++) pr[i] /= sum;
  return { grid: grid, pr: pr };
}

function evalS(s, D) {
  let ev = 0, pop = 0;
  for (let i = 0; i < D.grid.length; i++) { const pl = s.f(D.grid[i]); ev += pl * D.pr[i]; if (pl > 0) pop += D.pr[i]; }
  const arr = D.grid.map(function (S, i) { return { pl: s.f(S), p: D.pr[i] }; }).sort(function (a, b) { return a.pl - b.pl; });
  let acc = 0, tl = 0, tp = 0;
  for (let k = 0; k < arr.length && acc < 0.05; k++) { const t = Math.min(arr[k].p, 0.05 - acc); tl += arr[k].pl * t; tp += t; acc += t; }
  const cvar = tp > 0 ? Math.max(0, -(tl / tp)) : 0;
  return { ev: ev, pop: pop, cvar: cvar, score: (ev - cvar) / s.cap };
}

/* Rank the whole library for a view + expiration; returns the top n {s, m} rows. */
export function rankTop(view, expKey, n) {
  const D = priceDist(view.modePrice, view.sigUp, view.sigDn);
  return STRATS.map(function (def) { const s = makeStrat(def, expKey); return { s: s, m: evalS(s, D) }; })
    .sort(function (a, b) { return b.m.score - a.m.score; })
    .slice(0, n || 4);
}

/* Tiny payoff sparkline (green above zero, red below). */
export function payoffSVG(f) {
  const w = 170, h = 52, n = 64, Smin = 280, Smax = 470, zero = h / 2, P = []; let mx = 1;
  for (let k = 0; k <= n; k++) { const S = Smin + (Smax - Smin) * k / n, pl = f(S); P.push(pl); mx = Math.max(mx, Math.abs(pl)); }
  function X(k) { return 5 + k / n * (w - 10); } function Y(pl) { return zero - pl / mx * (h / 2 - 5); }
  let gd = '', rd = '';
  for (let k = 0; k < n; k++) {
    const x1 = X(k), y1 = Y(P[k]), v1 = P[k], x2 = X(k + 1), y2 = Y(P[k + 1]), v2 = P[k + 1];
    if (v1 >= 0 && v2 >= 0) { gd += 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'L' + x2.toFixed(1) + ' ' + y2.toFixed(1); }
    else if (v1 <= 0 && v2 <= 0) { rd += 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'L' + x2.toFixed(1) + ' ' + y2.toFixed(1); }
    else { const tc = v1 / (v1 - v2), xc = x1 + (x2 - x1) * tc; if (v1 >= 0) { gd += 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'L' + xc.toFixed(1) + ' ' + zero; rd += 'M' + xc.toFixed(1) + ' ' + zero + 'L' + x2.toFixed(1) + ' ' + y2.toFixed(1); } else { rd += 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'L' + xc.toFixed(1) + ' ' + zero; gd += 'M' + xc.toFixed(1) + ' ' + zero + 'L' + x2.toFixed(1) + ' ' + y2.toFixed(1); } }
  }
  return '<svg width="' + w + '" height="' + h + '"><line x1="5" y1="' + zero + '" x2="' + (w - 5) + '" y2="' + zero + '" stroke="#dcdcd5" stroke-dasharray="3 3"/><path d="' + rd + '" fill="none" stroke="#b3261e" stroke-width="2"/><path d="' + gd + '" fill="none" stroke="#0f6e56" stroke-width="2"/></svg>';
}

export function money(x) { return (x < 0 ? '−$' : '$') + Math.abs(Math.round(x)).toLocaleString(); }
