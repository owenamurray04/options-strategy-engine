/* Prediction canvas: the probability cloud over price × time, drawn on ONE <canvas> in a single
   coordinate system (density + grid + axes + history + dot + expiry marker + confidence bands).
   Owns the view state and all interaction. The price axis re-centers on the active stock's spot.
   Exposes getView() for the engine, setChain()/setActiveExp() to point at a ticker+expiry, and
   setOnChange() so the stepper can re-rank strategies live while the user drags. */

const c = document.getElementById('dens'), ctx = c.getContext('2d');
const b2 = document.getElementById('b2'), b3 = document.getElementById('b3'), hint = document.getElementById('hint');
const W = 600, H = 380, BX0 = 46, BX1 = 586, BY0 = 48, BY1 = 300, SX = BX1 - BX0, SY = BY1 - BY0, ox = (BX0 + BX1) / 2, oy = (BY0 + BY1) / 2, Hw = 0.5, PHMAX = 0.85, PSMAX = 0.2;
let uM = 0.70, vM = 0.482, sR = 0.12, sL = 0.10, sU = 0.10, sD = 0.10, t3d = 0, animating = false, yawM = 0, pitchM = 0;
let curChain = null, curExp = 'aug', onChange = null;
let spot = 100, axLo = 67.9, axHi = 134.5, GL = [80, 100, 120];
const dMin = -60, dMax = 95, dTot = dMax - dMin, fNow = (0 - dMin) / dTot;
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function price(v) { return axLo + v * (axHi - axLo); }
function pv(P) { return (P - axLo) / (axHi - axLo); }
function dayAt(u) { return dMin + u * dTot; }
function fmt(d) { const dt = new Date(2026, 5, 24); dt.setDate(dt.getDate() + Math.round(d)); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function niceStep(raw) { const mag = Math.pow(10, Math.floor(Math.log10(raw))); const n = raw / mag; const cands = [1, 2, 2.5, 5, 10]; let best = cands[0]; for (const cc of cands) if (Math.abs(cc - n) < Math.abs(best - n)) best = cc; return best * mag; }
function niceTicks(lo, hi) { const s = niceStep((hi - lo) / 5); const out = []; let t = Math.ceil(lo / s) * s; for (; t < hi; t += s) out.push(+t.toFixed(2)); return out; }
function setAxis(s) { spot = s; axLo = s * 0.679; axHi = s * 1.345; GL = niceTicks(axLo, axHi); }
function dens(u, v) { const du = u - uM, dv = v - vM; const st = du >= 0 ? sR : sL, sp = dv >= 0 ? sU : sD; return Math.exp(-0.5 * ((du * du) / (st * st) + (dv * dv) / (sp * sp))); }
function proj(u, v, w, cf, sf, cy, sy) { const X = u - 0.5, Y = v - 0.5, Z = w * Hw; const x1 = X * cy - Y * sy, y1 = X * sy + Y * cy, z1 = Z; const y2 = y1 * cf + z1 * sf, z2 = -y1 * sf + z1 * cf; return { x: ox + x1 * SX, y: oy - y2 * SY, d: z2 }; }
const hb = document.createElement('canvas'); hb.width = 216; hb.height = 128; const hbx = hb.getContext('2d'); const hi = hbx.createImageData(216, 128); const hd = hi.data;
function drawHeat() { for (let j = 0; j < 128; j++) { const v = 1 - (j + 0.5) / 128; for (let i = 0; i < 216; i++) { const u = (i + 0.5) / 216; const d = dens(u, v); const a = 0.03 + 0.8 * Math.pow(d, 1.7); const k = (j * 216 + i) * 4; hd[k] = 29; hd[k + 1] = 158; hd[k + 2] = 117; hd[k + 3] = Math.round(a * 255); } } hbx.putImageData(hi, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(hb, BX0, BY0, SX, SY); }
function drawPlane(cf, sf, cy, sy) {
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(150,150,150,0.28)';
  for (let g = 0; g < GL.length; g++) { const v = pv(GL[g]); const a = proj(0, v, 0, cf, sf, cy, sy), b = proj(1, v, 0, cf, sf, cy, sy); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  const n1 = proj(fNow, 0, 0, cf, sf, cy, sy), n2 = proj(fNow, 1, 0, cf, sf, cy, sy); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(120,120,120,0.5)'; ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y); ctx.stroke(); ctx.setLineDash([]);
  const hp = [[0, 0.30], [0.043, 0.33], [0.086, 0.31], [0.13, 0.37], [0.17, 0.39], [0.215, 0.42], [0.26, 0.45], [0.30, 0.46], [0.345, 0.47], [fNow, 0.482]];
  ctx.strokeStyle = 'rgba(110,110,110,0.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let p = 0; p < hp.length; p++) { const q = proj(hp[p][0], hp[p][1], 0, cf, sf, cy, sy); if (p === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); } ctx.stroke();
  const cd = proj(fNow, 0.482, 0, cf, sf, cy, sy); ctx.fillStyle = 'rgba(110,110,110,0.95)'; ctx.beginPath(); ctx.arc(cd.x, cd.y, 4, 0, 7); ctx.fill();
}
function drawMesh(cf, sf, cy, sy) {
  const Nu = 80, Nv = 48, L = [0.4, -0.55, 0.73], ll = Math.sqrt(L[0] * L[0] + L[1] * L[1] + L[2] * L[2]); L[0] /= ll; L[1] /= ll; L[2] /= ll;
  const q = [];
  for (let i = 0; i < Nu; i++) {
    const u0 = i / Nu, u1 = (i + 1) / Nu; for (let j = 0; j < Nv; j++) {
      const v0 = j / Nv, v1 = (j + 1) / Nv;
      const w00 = dens(u0, v0), w10 = dens(u1, v0), w11 = dens(u1, v1), w01 = dens(u0, v1);
      const A = proj(u0, v0, w00, cf, sf, cy, sy), B = proj(u1, v0, w10, cf, sf, cy, sy), C = proj(u1, v1, w11, cf, sf, cy, sy), Dp = proj(u0, v1, w01, cf, sf, cy, sy);
      const dzu = (w10 - w00) * Nu * Hw, dzv = (w01 - w00) * Nv * Hw, nl = Math.sqrt(dzu * dzu + dzv * dzv + 1);
      const lit = Math.max(0, ((-dzu) * L[0] + (-dzv) * L[1] + L[2]) / nl);
      q.push({ A: A, B: B, C: C, D: Dp, dep: (A.d + B.d + C.d + Dp.d) / 4, w: (w00 + w10 + w11 + w01) / 4, sh: (1 - t3d) + t3d * (0.45 + 0.55 * lit) });
    }
  }
  q.sort(function (a, b) { return a.dep - b.dep; });
  const st = t3d * 0.25;
  for (let n = 0; n < q.length; n++) { const Q = q[n], a = 0.03 + 0.8 * Math.pow(Q.w, 1.7), s = Q.sh; ctx.beginPath(); ctx.moveTo(Q.A.x, Q.A.y); ctx.lineTo(Q.B.x, Q.B.y); ctx.lineTo(Q.C.x, Q.C.y); ctx.lineTo(Q.D.x, Q.D.y); ctx.closePath(); ctx.fillStyle = 'rgba(' + Math.round(29 * s) + ',' + Math.round(158 * s) + ',' + Math.round(117 * s) + ',' + a.toFixed(3) + ')'; ctx.fill(); if (st > 0.01) { ctx.strokeStyle = 'rgba(12,80,62,' + (st * (0.3 + 0.7 * Q.w)).toFixed(3) + ')'; ctx.lineWidth = 0.5; ctx.stroke(); } }
}
function drawTop(cf, sf, cy, sy) {
  const md = proj(uM, vM, 1, cf, sf, cy, sy);
  if (t3d > 0.05) { const base = proj(uM, vM, 0, cf, sf, cy, sy); ctx.strokeStyle = 'rgba(15,110,86,' + (t3d * 0.5).toFixed(2) + ')'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(md.x, md.y); ctx.stroke(); ctx.setLineDash([]); }
  ctx.fillStyle = '#0f6e56'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(md.x, md.y, 5.5, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(140,140,140,0.95)'; ctx.font = '12px ' + getComputedStyle(document.body).fontFamily; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let g = 0; g < GL.length; g++) { const v = pv(GL[g]); const pp = proj(0, v, 0, cf, sf, cy, sy); ctx.fillText('$' + GL[g], pp.x - 6, pp.y); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const tk = [[fNow, 'Now'], [(7 + 60) / dTot, 'Jul'], [(38 + 60) / dTot, 'Aug'], [(69 + 60) / dTot, 'Sep']];
  for (let k = 0; k < tk.length; k++) { const p2 = proj(tk[k][0], 0, 0, cf, sf, cy, sy); ctx.fillText(tk[k][1], p2.x, p2.y + 8); }
  /* selected-expiration marker + calibrated confidence bands (pull-to-edge = 1σ ⇒ 68% / 95%) */
  const ue = clamp((curChain.exp[curExp].dte + 60) / dTot, 0, 1);
  const e1 = proj(ue, 0, 0, cf, sf, cy, sy), e2 = proj(ue, 1, 0, cf, sf, cy, sy);
  ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(24,95,165,0.32)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(e1.x, e1.y); ctx.lineTo(e2.x, e2.y); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(24,95,165,0.95)'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('Exp ' + curChain.exp[curExp].label, e2.x, e2.y - 3);
  const bp = function (v) { return proj(ue, clamp(v, 0, 1), 0, cf, sf, cy, sy); };
  const hi95 = bp(vM + 2 * sU), lo95 = bp(vM - 2 * sD), hi68 = bp(vM + sU), lo68 = bp(vM - sD), mid = bp(vM);
  ctx.strokeStyle = 'rgba(24,95,165,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(hi95.x, hi95.y); ctx.lineTo(lo95.x, lo95.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(hi95.x - 5, hi95.y); ctx.lineTo(hi95.x + 5, hi95.y); ctx.moveTo(lo95.x - 5, lo95.y); ctx.lineTo(lo95.x + 5, lo95.y); ctx.stroke();
  ctx.strokeStyle = 'rgba(24,95,165,0.85)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hi68.x, hi68.y); ctx.lineTo(lo68.x, lo68.y); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = '#185fa5'; ctx.beginPath(); ctx.arc(mid.x, mid.y, 3, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(24,95,165,0.95)'; ctx.font = '10px ' + getComputedStyle(document.body).fontFamily; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('95%', hi95.x + 8, hi95.y); ctx.fillText('68%', hi68.x + 8, hi68.y);
}
function readouts() {
  const ml = price(vM), pu = price(clamp(vM + sU, 0, 1)), pd = price(clamp(vM - sD, 0, 1)), dml = dayAt(uM), de = dayAt(clamp(uM - sL, 0, 1)), dl = dayAt(clamp(uM + sR, 0, 1));
  const pu95 = price(clamp(vM + 2 * sU, 0, 1)), pd95 = price(clamp(vM - 2 * sD, 0, 1));
  document.getElementById('cMl').textContent = '$' + Math.round(ml) + ' · ' + fmt(dml);
  document.getElementById('cPr').textContent = '$' + Math.round(pd) + ' – $' + Math.round(pu);
  document.getElementById('cSk').textContent = '$' + Math.round(pd95) + ' – $' + Math.round(pu95);
  document.getElementById('cDt').textContent = fmt(de) + ' – ' + fmt(dl);
  const upg = pu - ml, dng = ml - pd, ps = upg > dng * 1.15 ? 'upside' : dng > upg * 1.15 ? 'downside' : 'balanced';
  const lg = dl - dml, eg = dml - de, ts = lg > eg * 1.15 ? 'later' : eg > lg * 1.15 ? 'sooner' : 'on-time';
  const imp = ps === 'upside' ? 'favors call-side convexity (calls, call spreads)' : ps === 'downside' ? 'favors put-side / protective structures' : 'favors range / defined-risk structures';
  document.getElementById('cImp').textContent = 'Reads as: by ' + curChain.exp[curExp].label + ' you’re ~68% sure of the inner band, ~95% of the outer. Leaning ' + ps + ', ' + ts + ' — ' + imp + '.';
}
export function draw() {
  if (!curChain) return;
  ctx.clearRect(0, 0, W, H);
  const f = t3d * PHMAX + pitchM, ps = t3d * PSMAX + yawM, cf = Math.cos(f), sf = Math.sin(f), cyv = Math.cos(ps), syv = Math.sin(ps);
  drawPlane(cf, sf, cyv, syv);
  if (t3d === 0 && !animating) drawHeat(); else drawMesh(cf, sf, cyv, syv);
  drawTop(cf, sf, cyv, syv);
  readouts();
}
let pend = false; function reqDraw() { if (pend) return; pend = true; requestAnimationFrame(function () { pend = false; draw(); if (onChange) onChange(); }); }
let a0 = 0, at = 0, as = 0, ym0 = 0, pm0 = 0;
function atick(now) { const k = Math.min(1, (now - as) / 650); const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; t3d = a0 + (at - a0) * e; if (at === 0) { yawM = ym0 * (1 - e); pitchM = pm0 * (1 - e); } draw(); if (k < 1) requestAnimationFrame(atick); else { t3d = at; if (at === 0) { yawM = 0; pitchM = 0; } animating = false; draw(); } }
function animTo(tt) { a0 = t3d; at = tt; as = performance.now(); ym0 = yawM; pm0 = pitchM; animating = true; requestAnimationFrame(atick); }
function toC(e) { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
function toUV(p) { return { u: (p.x - ox) / SX + 0.5, v: 0.5 + (oy - p.y) / SY }; }
let mode = null, spec = null, rx0 = 0, ry0 = 0, yw0 = 0, pt0 = 0;
function move(e) {
  if (mode === 'rot') { yawM = clamp(yw0 + (e.clientX - rx0) * 0.01, -0.9, 0.9); pitchM = clamp(pt0 - (e.clientY - ry0) * 0.008, -0.45, 0.45); reqDraw(); return; }
  const uv = toUV(toC(e));
  if (mode === 'move') { uM = clamp(uv.u, fNow + 0.04, 0.97); vM = clamp(uv.v, 0.05, 0.95); }
  else if (mode === 'spread') { if (spec.h === 'R') sR = clamp(spec.s.R + (uv.u - spec.u0), 0.03, 0.45); if (spec.h === 'L') sL = clamp(spec.s.L + (spec.u0 - uv.u), 0.03, 0.45); if (spec.v === 'U') sU = clamp(spec.s.U + (uv.v - spec.v0), 0.03, 0.45); if (spec.v === 'D') sD = clamp(spec.s.D + (spec.v0 - uv.v), 0.03, 0.45); }
  reqDraw();
}
function up() { mode = null; spec = null; c.style.cursor = t3d > 0.5 ? 'grab' : 'crosshair'; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); }
function down(e) {
  if (animating || !curChain) return; e.preventDefault();
  if (t3d > 0.98) { mode = 'rot'; rx0 = e.clientX; ry0 = e.clientY; yw0 = yawM; pt0 = pitchM; c.style.cursor = 'grabbing'; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); return; }
  if (t3d > 0.02) return;
  const p = toC(e), md = proj(uM, vM, 1, 1, 0, 1, 0);
  if (Math.hypot(p.x - md.x, p.y - md.y) < 16) { mode = 'move'; c.style.cursor = 'grabbing'; }
  else { const uv = toUV(p); const du = uv.u - uM, dv = uv.v - vM; const h = Math.abs(du) > 0.02 ? (du > 0 ? 'R' : 'L') : null; const v = Math.abs(dv) > 0.02 ? (dv > 0 ? 'U' : 'D') : null; if (!h && !v) return; mode = 'spread'; c.style.cursor = 'grabbing'; spec = { h: h, v: v, u0: uv.u, v0: uv.v, s: { R: sR, L: sL, U: sU, D: sD } }; }
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
}
function setMode(td) {
  b2.classList.toggle('on', !td); b3.classList.toggle('on', td); c.style.cursor = td ? 'grab' : 'crosshair';
  hint.innerHTML = td ? '🔄 Tilted into 3D — drag to rotate. The peak is your most-likely point. Flip to 2D to adjust.' : '✋ Drag the dot to set your most-likely point. Grab anywhere else and pull to spread — pull one side further for skew.';
  animTo(td ? 1 : 0);
}

/* ---- public API ---- */
function resetView() { uM = 0.70; vM = 0.482; sR = 0.12; sL = 0.10; sU = 0.10; sD = 0.10; t3d = 0; yawM = 0; pitchM = 0; animating = false; b2.classList.add('on'); b3.classList.remove('on'); }
export function setChain(chain) { curChain = chain; setAxis(chain.spot); resetView(); draw(); }
export function setActiveExp(key) { curExp = key; draw(); if (onChange) onChange(); }
export function setOnChange(cb) { onChange = cb; }
/* The user's drawn view, handed to the engine in dollar units. */
export function getView() { const span = axHi - axLo; return { modePrice: price(vM), sigUp: Math.max(spot * 0.02, sU * span), sigDn: Math.max(spot * 0.02, sD * span) }; }
export function initCanvas() {
  c.addEventListener('pointerdown', down);
  b2.onclick = function () { setMode(false); };
  b3.onclick = function () { setMode(true); };
}
