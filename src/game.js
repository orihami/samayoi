import * as THREE from 'three';

// =====================================================================
//  彷徨 — SAMAYOI  v2
// =====================================================================
const S = 3, WALL_H = 3.2, CW = 12, CH = 12, GW = CW * 2 + 1, GH = CH * 2 + 1;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const wrapA = (a) => a - Math.PI * 2 * Math.floor((a + Math.PI) / (Math.PI * 2));
const lerpAngle = (a, b, t) => a + wrapA(b - a) * t;

// ===================== MAZE =====================
let grid = [];
function genMaze() {
  grid = [...Array(GH)].map(() => Array(GW).fill(1));
  const stack = [[0, 0]], vis = new Set(['0,0']);
  grid[1][1] = 0;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const nb = DIRS.map(([dx, dy]) => [cx + dx, cy + dy, dx, dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < CW && y < CH && !vis.has(x + ',' + y));
    if (!nb.length) { stack.pop(); continue; }
    const [nx, ny, dx, dy] = pick(nb);
    grid[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = 0; grid[ny * 2 + 1][nx * 2 + 1] = 0;
    vis.add(nx + ',' + ny); stack.push([nx, ny]);
  }
  let made = 0;
  for (let i = 0; i < 4000 && made < CW * CH * 0.1; i++) {
    const x = 1 + ((Math.random() * (GW - 2)) | 0), y = 1 + ((Math.random() * (GH - 2)) | 0);
    if (grid[y][x] === 1 && ((x % 2 === 0 && y % 2 === 1) || (x % 2 === 1 && y % 2 === 0))) { grid[y][x] = 0; made++; }
  }
}
let SX = 1, SY = 1;
function pickStart() {
  const cx = (GW - 1) / 2, cy = (GH - 1) / 2, a = rand(0, Math.PI * 2), r = rand(3, 5.5);
  SX = clamp(Math.round(cx + Math.cos(a) * r) | 1, 3, GW - 4); SY = clamp(Math.round(cy + Math.sin(a) * r) | 1, 3, GH - 4);
  // 柱のある小部屋＋四方に出口
  for (let y = SY - 2; y <= SY + 2; y++) for (let x = SX - 2; x <= SX + 2; x++) grid[y][x] = 0;
  for (const [px, py] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) grid[SY + py][SX + px] = 1;
  for (const [dx, dy] of DIRS) { const x = SX + dx * 3, y = SY + dy * 3; if (x > 0 && y > 0 && x < GW - 1 && y < GH - 1) grid[y][x] = 0; }
}
function braid(p) {
  for (let y = 1; y < GH - 1; y += 2) for (let x = 1; x < GW - 1; x += 2) {
    if (grid[y][x] !== 0) continue;
    const walls = DIRS.filter(([dx, dy]) => grid[y + dy][x + dx] === 1 && x + dx * 2 > 0 && y + dy * 2 > 0 && x + dx * 2 < GW - 1 && y + dy * 2 < GH - 1);
    if (DIRS.filter(([dx, dy]) => grid[y + dy][x + dx] === 1).length === 3 && walls.length && Math.random() < p) { const [dx, dy] = pick(walls); grid[y + dy][x + dx] = 0; }
  }
}
const halls = [];
function carveHalls(n) {
  let tries = 0;
  while (halls.length < n && tries++ < 400) {
    const x0 = 1 + 2 * ((Math.random() * (CW - 2)) | 0), y0 = 1 + 2 * ((Math.random() * (CH - 2)) | 0);
    if (x0 + 4 > GW - 2 || y0 + 4 > GH - 2) continue;
    if (Math.abs(x0 + 2 - SX) < 8 && Math.abs(y0 + 2 - SY) < 8) continue;
    if (halls.some((h) => Math.abs(h.x - x0) < 9 && Math.abs(h.y - y0) < 9)) continue;
    for (let y = y0; y <= y0 + 4; y++) for (let x = x0; x <= x0 + 4; x++) grid[y][x] = 0;
    for (const [px, py] of [[1, 1], [3, 1], [1, 3], [3, 3]]) grid[y0 + py][x0 + px] = 1;
    halls.push({ x: x0, y: y0, wx: (x0 + 2) * S, wz: (y0 + 2) * S });
  }
}
const wallAt = (x, y) => x < 0 || y < 0 || x >= GW || y >= GH || grid[y][x] === 1;
const isWallW = (wx, wz) => wallAt(Math.round(wx / S), Math.round(wz / S));
const toCell = (p) => [Math.round(p.x / S), Math.round(p.z / S)];

function bfs(sx, sy) {
  const dist = new Int16Array(GW * GH).fill(-1), prev = new Int16Array(GW * GH).fill(-1);
  const q = [sy * GW + sx]; dist[q[0]] = 0; let h = 0;
  while (h < q.length) {
    const i = q[h++], x = i % GW, y = (i / GW) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (wallAt(nx, ny)) continue;
      const j = ny * GW + nx;
      if (dist[j] >= 0) continue;
      dist[j] = dist[i] + 1; prev[j] = i; q.push(j);
    }
  }
  return { dist, prev };
}
function pathTo(sx, sy, tx, ty) {
  if (wallAt(tx, ty)) return [];
  const { prev, dist } = bfs(sx, sy);
  let j = ty * GW + tx;
  if (dist[j] < 0) return [];
  const p = [], start = sy * GW + sx;
  while (j !== start && j >= 0) { p.push([j % GW, (j / GW) | 0]); j = prev[j]; }
  return p.reverse();
}
function lineClear(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), n = Math.ceil(L / 0.3);
  for (let i = 1; i < n; i++) { const t = i / n; if (isWallW(a.x + dx * t, a.z + dz * t)) return false; }
  return true;
}
const solids = [];
function pushOut(p, r, minx, maxx, minz, maxz) {
  const cx = clamp(p.x, minx, maxx), cz = clamp(p.z, minz, maxz);
  const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
  if (d2 < r * r && d2 > 0) { const d = Math.sqrt(d2); p.x += (dx / d) * (r - d); p.z += (dz / d) * (r - d); }
}
function collide(p, r, withSolids) {
  const gx = Math.round(p.x / S), gz = Math.round(p.z / S);
  for (let y = gz - 1; y <= gz + 1; y++) for (let x = gx - 1; x <= gx + 1; x++) if (wallAt(x, y)) pushOut(p, r, x * S - S / 2, x * S + S / 2, y * S - S / 2, y * S + S / 2);
  if (withSolids) for (const b of solids) if (Math.abs(b.cx - p.x) < 2.5 && Math.abs(b.cz - p.z) < 2.5) pushOut(p, r, b.minx, b.maxx, b.minz, b.maxz);
}
function addSolid(obj, hx, hz) {
  const p = new THREE.Vector3(); obj.getWorldPosition(p);
  const rot = Math.round(obj.rotation.y / (Math.PI / 2)) % 2 !== 0;
  const ax = rot ? hz : hx, az = rot ? hx : hz;
  solids.push({ cx: p.x, cz: p.z, minx: p.x - ax, maxx: p.x + ax, minz: p.z - az, maxz: p.z + az });
}

// ===================== TEXTURES =====================
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function grain(ctx, w, h, amt) {
  const id = ctx.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  ctx.putImageData(id, 0, 0);
}
function stain(ctx, x, y, r, col) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}
function tex(c, rep) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  if (rep) t.repeat.set(rep[0], rep[1]);
  return t;
}
function scrawl(ctx, w, h, words, col, n) {
  for (let i = 0; i < n; i++) {
    ctx.save(); ctx.translate(rand(20, w - 140), rand(60, h * 0.75)); ctx.rotate(rand(-0.3, 0.3));
    ctx.font = `bold ${rand(26, 66) | 0}px serif`; ctx.fillStyle = col.replace('A', rand(0.5, 0.85).toFixed(2));
    ctx.fillText(pick(words), 0, 0); ctx.restore();
  }
}
function handprints(ctx, w, h, n) {
  for (let i = 0; i < n; i++) {
    const x = rand(40, w - 40), y = rand(120, h * 0.75);
    ctx.fillStyle = 'rgba(85,6,4,0.7)'; ctx.beginPath(); ctx.ellipse(x, y, 16, 20, 0, 0, 7); ctx.fill();
    for (let f = 0; f < 5; f++) { const a = -2.4 + f * 0.42; ctx.save(); ctx.translate(x + Math.cos(a) * 18, y + Math.sin(a) * 20); ctx.rotate(a + Math.PI / 2); ctx.fillRect(-3.5, -24, 7, 26); ctx.restore(); }
    ctx.fillRect(x - 3, y + 15, 5, rand(30, 140));
  }
}
function scratches(ctx, w, h, n) {
  for (let g = 0; g < n; g++) {
    const x = rand(30, w - 80), y = rand(60, h * 0.7);
    ctx.strokeStyle = 'rgba(15,10,6,0.55)'; ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + k * 9, y); ctx.lineTo(x + k * 11 + rand(-6, 6), y + rand(60, 140)); ctx.stroke(); }
  }
}
// 区画0：旧家（壁紙）
function wall0(sc) {
  const w = 512, h = 512, c = mkCanvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = '#4b4d42'; ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 32) {
    ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.fillRect(x, 0, 12, h);
    ctx.fillStyle = 'rgba(255,240,200,0.035)'; ctx.fillRect(x + 18, 0, 3, h);
    for (let y = 10; y < h * 0.7; y += 46) { ctx.fillStyle = 'rgba(0,0,0,0.07)'; ctx.beginPath(); ctx.ellipse(x + 24, y + (x % 64 ? 23 : 0), 5, 9, 0, 0, 7); ctx.fill(); }
  }
  // 剥がれた壁紙
  for (let i = 0; i < 4; i++) { const x = rand(0, w), y = rand(0, h * 0.6); ctx.fillStyle = '#3a3a30'; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 7; k++) ctx.lineTo(x + rand(-60, 60), y + rand(-50, 70)); ctx.fill(); }
  ctx.fillStyle = '#2b2720'; ctx.fillRect(0, h * 0.72, w, h * 0.28);
  ctx.fillStyle = '#16130e'; ctx.fillRect(0, h * 0.72, w, 7);
  for (let i = 0; i < 16; i++) stain(ctx, rand(0, w), rand(0, h), rand(20, 130), `rgba(${rand(30, 50) | 0},${rand(22, 35) | 0},8,${rand(0.2, 0.45)})`);
  for (let i = 0; i < 26; i++) { ctx.fillStyle = `rgba(25,18,8,${rand(0.15, 0.35)})`; ctx.fillRect(rand(0, w), 0, rand(1, 4), rand(40, 300)); }
  scratches(ctx, w, h, 3);
  if (sc) { scrawl(ctx, w, h, ['たすけて', 'でられない', 'うしろ', 'みてる', 'くる', 'ごめんなさい'], 'rgba(95,8,6,A)', 7); handprints(ctx, w, h, 3); }
  grain(ctx, w, h, 34);
  return c;
}
// 区画1：病棟（タイル）
function wall1(sc) {
  const w = 512, h = 512, c = mkCanvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = '#5c6458'; ctx.fillRect(0, 0, w, h);
  const T = 64;
  for (let y = 0; y < h; y += T) for (let x = 0; x < w; x += T) {
    const miss = Math.random() < 0.07;
    ctx.fillStyle = miss ? '#22231d' : `rgb(${rand(150, 175) | 0},${rand(160, 180) | 0},${rand(148, 165) | 0})`;
    ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
    if (!miss && Math.random() < 0.2) { ctx.strokeStyle = 'rgba(30,30,25,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + rand(0, T), y); ctx.lineTo(x + rand(0, T), y + T); ctx.stroke(); }
  }
  ctx.fillStyle = 'rgba(40,60,50,0.35)'; ctx.fillRect(0, h * 0.62, w, h * 0.38);
  ctx.fillStyle = 'rgba(20,30,25,0.6)'; ctx.fillRect(0, h * 0.62, w, 6);
  for (let i = 0; i < 18; i++) stain(ctx, rand(0, w), rand(0, h), rand(20, 110), `rgba(60,45,15,${rand(0.2, 0.5)})`);
  for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(90,50,20,${rand(0.1, 0.35)})`; ctx.fillRect(rand(0, w), rand(0, 100), rand(1, 3), rand(60, 380)); }
  if (sc) { scrawl(ctx, w, h, ['面会謝絶', 'たすけて', 'いたい', 'かえりたい', 'みられてる'], 'rgba(110,8,6,A)', 6); handprints(ctx, w, h, 4); }
  grain(ctx, w, h, 30);
  return c;
}
// 区画2：最深部（赤黒いコンクリ）
function wall2(sc) {
  const w = 512, h = 512, c = mkCanvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = '#3a2420'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) stain(ctx, rand(0, w), rand(0, h), rand(20, 120), `rgba(${rand(10, 70) | 0},${rand(5, 20) | 0},${rand(5, 15) | 0},${rand(0.25, 0.6)})`);
  // 血管のような筋
  for (let i = 0; i < 30; i++) {
    let x = rand(0, w), y = rand(0, h); ctx.strokeStyle = `rgba(${rand(60, 110) | 0},10,10,${rand(0.2, 0.5)})`; ctx.lineWidth = rand(1, 4); ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 12; k++) { x += rand(-20, 20); y += rand(-5, 25); ctx.lineTo(x, y); } ctx.stroke();
  }
  // 正の字
  ctx.strokeStyle = 'rgba(15,5,3,0.75)'; ctx.lineWidth = 3;
  for (let g = 0; g < (sc ? 14 : 3); g++) { const x = rand(20, w - 60), y = rand(40, h - 80); for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + k * 9, y); ctx.lineTo(x + k * 9, y + 40); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(x - 5, y + 30); ctx.lineTo(x + 36, y + 8); ctx.stroke(); }
  if (sc) { scrawl(ctx, w, h, ['かえして', 'ここ', 'ずっといる', 'あけないで', 'わたしのばん'], 'rgba(10,2,2,A)', 8); handprints(ctx, w, h, 5); }
  scratches(ctx, w, h, 6);
  grain(ctx, w, h, 44);
  return c;
}
function floor0() {
  const w = 256, h = 256, c = mkCanvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = '#2d2318'; ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) { ctx.fillStyle = `rgba(${rand(40, 60) | 0},${rand(28, 40) | 0},15,0.6)`; ctx.fillRect(0, y + 1, w, 30); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, y, w, 2); ctx.fillRect(rand(0, w), y, 2, 32); }
  for (let i = 0; i < 6; i++) stain(ctx, rand(0, w), rand(0, h), rand(15, 60), 'rgba(5,4,2,0.5)');
  grain(ctx, w, h, 36); return c;
}
function floor1() {
  const w = 256, h = 256, c = mkCanvas(w, h), ctx = c.getContext('2d');
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { ctx.fillStyle = (x + y) % 2 ? '#5d6056' : '#34362f'; ctx.fillRect(x * 64, y * 64, 64, 64); }
  for (let i = 0; i < 10; i++) stain(ctx, rand(0, w), rand(0, h), rand(15, 80), `rgba(20,15,5,${rand(0.3, 0.6)})`);
  grain(ctx, w, h, 36); return c;
}
function floor2() {
  const w = 256, h = 256, c = mkCanvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = '#231816'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 14; i++) stain(ctx, rand(0, w), rand(0, h), rand(15, 80), `rgba(${rand(0, 40) | 0},2,2,${rand(0.3, 0.7)})`);
  grain(ctx, w, h, 46); return c;
}
function ceilC(base) {
  const w = 256, h = 256, c = mkCanvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) stain(ctx, rand(0, w), rand(0, h), rand(20, 80), 'rgba(50,40,15,0.35)');
  grain(ctx, w, h, 30); return c;
}
function charmCanvas() {
  const c = mkCanvas(64, 180), ctx = c.getContext('2d');
  ctx.fillStyle = '#d9cfab'; ctx.fillRect(0, 0, 64, 180);
  ctx.strokeStyle = '#8a1212'; ctx.lineWidth = 3; ctx.strokeRect(5, 5, 54, 170);
  ctx.fillStyle = '#7d0d0d'; ctx.font = 'bold 34px serif'; ctx.textAlign = 'center';
  ['封', '鎮', '魂'].forEach((k, i) => ctx.fillText(k, 32, 48 + i * 48));
  stain(ctx, 20, 140, 30, 'rgba(90,40,10,0.4)');
  grain(ctx, 64, 180, 30); return c;
}
function doorCanvas() {
  const c = mkCanvas(256, 360), ctx = c.getContext('2d');
  ctx.fillStyle = '#3a2620'; ctx.fillRect(0, 0, 256, 360);
  for (let i = 0; i < 20; i++) stain(ctx, rand(0, 256), rand(0, 360), rand(20, 80), 'rgba(110,50,20,0.35)');
  ctx.fillStyle = '#1c120e';
  for (let y = 20; y < 360; y += 40) for (const x of [16, 240]) { ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); }
  ctx.fillRect(0, 175, 256, 10);
  ctx.fillStyle = 'rgba(140,10,10,0.75)'; ctx.font = 'bold 70px serif'; ctx.textAlign = 'center'; ctx.fillText('出', 128, 120);
  grain(ctx, 256, 360, 40); return c;
}
function lockerCanvas(withSlits, num) {
  const c = mkCanvas(256, 512), ctx = c.getContext('2d');
  ctx.fillStyle = '#4c5649'; ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 16; i++) stain(ctx, rand(0, 256), rand(0, 512), rand(15, 70), `rgba(${rand(80, 120) | 0},${rand(40, 60) | 0},15,${rand(0.2, 0.5)})`);
  for (let i = 0; i < 20; i++) { ctx.strokeStyle = `rgba(200,200,180,${rand(0.05, 0.18)})`; ctx.lineWidth = 1; ctx.beginPath(); const x = rand(0, 256), y = rand(0, 512); ctx.moveTo(x, y); ctx.lineTo(x + rand(-40, 40), y + rand(-20, 20)); ctx.stroke(); }
  if (withSlits) {
    for (let i = 0; i < 6; i++) { ctx.fillStyle = '#050505'; ctx.fillRect(48, 70 + i * 14, 160, 6); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(48, 76 + i * 14, 160, 2); }
    for (let i = 0; i < 4; i++) { ctx.fillStyle = '#080808'; ctx.fillRect(70, 440 + i * 12, 116, 5); }
    ctx.fillStyle = '#222'; ctx.fillRect(210, 250, 14, 50);
    ctx.fillStyle = 'rgba(220,210,180,0.55)'; ctx.font = 'bold 30px sans-serif'; ctx.fillText(num, 100, 200);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, 252, 508);
  grain(ctx, 256, 512, 34); return c;
}
function decalCanvas(kind) {
  const c = mkCanvas(256, 256), ctx = c.getContext('2d');
  if (kind === 0) { // 引きずった跡
    for (let i = 0; i < 6; i++) { ctx.strokeStyle = `rgba(${rand(50, 80) | 0},4,3,${rand(0.3, 0.6)})`; ctx.lineWidth = rand(6, 22); ctx.beginPath(); ctx.moveTo(rand(90, 166), 0); ctx.bezierCurveTo(rand(60, 196), 80, rand(60, 196), 170, rand(90, 166), 256); ctx.stroke(); }
    stain(ctx, 128, 230, 50, 'rgba(60,3,2,0.8)');
  } else if (kind === 1) { // 裸足の足跡
    for (let i = 0; i < 4; i++) {
      const x = 128 + (i % 2 ? 24 : -24), y = 220 - i * 58;
      ctx.fillStyle = 'rgba(40,6,4,0.75)'; ctx.beginPath(); ctx.ellipse(x, y, 10, 20, 0, 0, 7); ctx.fill();
      for (let t = 0; t < 5; t++) { ctx.beginPath(); ctx.arc(x - 9 + t * 4.5, y - 25 - (t === 0 ? 3 : 0), 3, 0, 7); ctx.fill(); }
    }
  } else { // 水たまり
    stain(ctx, 128, 128, 120, 'rgba(8,6,4,0.85)'); stain(ctx, 100, 150, 60, 'rgba(30,2,2,0.5)');
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowCanvas(r, g, b) {
  const c = mkCanvas(64, 64), ctx = c.getContext('2d');
  const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(0.3, `rgba(${r},${g},${b},0.35)`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 64); return c;
}
function dollFaceCanvas() {
  const c = mkCanvas(128, 128), ctx = c.getContext('2d');
  ctx.fillStyle = '#e8e2d6'; ctx.fillRect(0, 0, 128, 128);
  stain(ctx, 40, 75, 16, 'rgba(220,120,120,0.35)'); stain(ctx, 88, 75, 16, 'rgba(220,120,120,0.35)');
  for (const x of [44, 84]) { ctx.fillStyle = '#050505'; ctx.beginPath(); ctx.ellipse(x, 58, 9, 11, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 3, 54, 2, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#7a0a0a'; ctx.beginPath(); ctx.ellipse(64, 90, 5, 3, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(40,30,20,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(84, 20); ctx.lineTo(78, 45); ctx.lineTo(86, 60); ctx.lineTo(80, 80); ctx.stroke();
  ctx.fillStyle = 'rgba(10,0,0,0.85)'; ctx.fillRect(43, 66, 2, 26);
  grain(ctx, 128, 128, 20); return c;
}

// ---- 顔 ----
function drawFace(c, open, opts = {}) {
  const ctx = c.getContext('2d'), W = c.width, H = c.height;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.5, rx = W * 0.3, ry = H * 0.4;
  for (let i = 0; i < 260; i++) {
    const a = rand(-Math.PI, 0), sx = cx + Math.cos(a) * rx * rand(0.6, 1.1), sy = cy + Math.sin(a) * ry * 1.05;
    ctx.strokeStyle = `rgba(${rand(4, 16) | 0},${rand(4, 14) | 0},${rand(4, 14) | 0},0.9)`; ctx.lineWidth = rand(1, 4) * W / 512;
    ctx.beginPath(); ctx.moveTo(sx, sy);
    const side = sx < cx ? -1 : 1;
    ctx.bezierCurveTo(sx + side * rand(10, 60) * W / 512, sy + H * 0.2, sx + side * rand(0, 40) * W / 512, sy + H * 0.5, sx + side * rand(-20, 30) * W / 512, H);
    ctx.stroke();
  }
  const sk = ctx.createRadialGradient(cx, cy - ry * 0.1, rx * 0.1, cx, cy, ry * 1.05);
  sk.addColorStop(0, '#d8d4c4'); sk.addColorStop(0.6, '#a6a292'); sk.addColorStop(1, '#3f3d36');
  ctx.fillStyle = sk; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 7); ctx.clip();
  for (let i = 0; i < 26; i++) {
    let x = cx + rand(-rx, rx), y = cy + rand(-ry, ry);
    ctx.strokeStyle = `rgba(60,70,90,${rand(0.15, 0.4)})`; ctx.lineWidth = rand(0.6, 2) * W / 512; ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += rand(-14, 14) * W / 512; y += rand(-14, 14) * W / 512; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  for (const s of [-1, 1]) stain(ctx, cx + s * rx * 0.62, cy + ry * 0.12, rx * 0.4, 'rgba(30,28,22,0.55)');
  ctx.restore();
  const eyeY = cy - ry * 0.16;
  for (const s of [-1, 1]) {
    const ex = cx + s * rx * 0.42, erx = rx * 0.25, ery = ry * 0.16 * (s === 1 ? 1.15 : 0.95);
    const g = ctx.createRadialGradient(ex, eyeY, 0, ex, eyeY, erx * 1.5);
    g.addColorStop(0, '#000'); g.addColorStop(0.55, '#000'); g.addColorStop(0.8, 'rgba(40,10,20,0.8)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(ex, eyeY, erx * 1.5, ery * 1.6, s * 0.15, 0, 7); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(ex, eyeY, erx, ery, s * 0.15, 0, 7); ctx.fill();
    for (let k = 0; k < 4; k++) {
      const tx = ex + rand(-erx * 0.6, erx * 0.6), len = rand(ry * 0.2, ry * 0.9), wd = rand(2, 7) * W / 512;
      ctx.fillStyle = 'rgba(8,0,0,0.92)'; ctx.beginPath(); ctx.moveTo(tx - wd, eyeY + ery * 0.6); ctx.lineTo(tx + wd, eyeY + ery * 0.6); ctx.lineTo(tx + wd * 0.3, eyeY + len); ctx.lineTo(tx - wd * 0.3, eyeY + len); ctx.fill();
      ctx.beginPath(); ctx.arc(tx, eyeY + len, wd * 0.8, 0, 7); ctx.fill();
    }
    const px = ex + s * erx * (s === 1 ? 0.15 : -0.25), py = eyeY + ery * (s === 1 ? -0.1 : 0.15);
    const pg = ctx.createRadialGradient(px, py, 0, px, py, erx * 0.35);
    pg.addColorStop(0, 'rgba(255,255,240,1)'); pg.addColorStop(0.25, 'rgba(255,250,220,0.8)'); pg.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, erx * 0.35, 0, 7); ctx.fill();
  }
  ctx.fillStyle = 'rgba(10,6,4,0.85)';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * rx * 0.08, cy + ry * 0.14, rx * 0.03, ry * 0.035, s * 0.5, 0, 7); ctx.fill(); }
  const my = cy + ry * 0.42, mw = rx * 0.98, mh = ry * (0.08 + 0.36 * open);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - mw, my - ry * 0.18);
  ctx.quadraticCurveTo(cx, my - mh * 0.55, cx + mw, my - ry * 0.18);
  ctx.quadraticCurveTo(cx + mw * 0.6, my + mh, cx, my + mh * 1.05);
  ctx.quadraticCurveTo(cx - mw * 0.6, my + mh, cx - mw, my - ry * 0.18);
  ctx.closePath();
  const mg = ctx.createRadialGradient(cx, my + mh * 0.3, 0, cx, my, mw);
  mg.addColorStop(0, '#000'); mg.addColorStop(0.7, '#1a0202'); mg.addColorStop(1, '#4a0505');
  ctx.fillStyle = mg; ctx.fill(); ctx.clip();
  const nT = 22;
  for (let i = 0; i < nT; i++) {
    const t = i / (nT - 1), x = cx - mw + t * mw * 2, w = (mw * 2) / nT;
    const topY = my - ry * 0.18 + (my - mh * 0.55 - (my - ry * 0.18)) * (1 - Math.pow(2 * t - 1, 2)) - 4;
    const len = rand(0.6, 1.4) * (mh * 0.38 + ry * 0.05);
    ctx.fillStyle = `rgb(${rand(180, 215) | 0},${rand(170, 195) | 0},${rand(120, 150) | 0})`;
    ctx.beginPath(); ctx.moveTo(x - w * 0.45, topY); ctx.lineTo(x + w * 0.45, topY); ctx.lineTo(x + rand(-w * 0.2, w * 0.2), topY + len); ctx.fill();
    const botY = my + mh * 1.05 * (1 - Math.pow(2 * t - 1, 2) * 0.9) + 4;
    ctx.beginPath(); ctx.moveTo(x - w * 0.45, botY); ctx.lineTo(x + w * 0.45, botY); ctx.lineTo(x + rand(-w * 0.2, w * 0.2), botY - len * 0.85); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(90,5,5,0.9)'; ctx.lineWidth = 3 * W / 512;
  for (const s of [-1, 1]) {
    let x = cx + s * mw, y = my - ry * 0.18; ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += s * rand(4, 12) * W / 512; y -= rand(4, 12) * W / 512; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  for (let i = 0; i < 40; i++) {
    const s = Math.random() < 0.5 ? -1 : 1, sx = cx + s * rx * rand(0.5, 0.95);
    ctx.strokeStyle = 'rgba(5,4,4,0.95)'; ctx.lineWidth = rand(1, 3) * W / 512;
    ctx.beginPath(); ctx.moveTo(cx + s * rx * 0.2, cy - ry * 1.0);
    ctx.quadraticCurveTo(sx, cy - ry * 0.2, sx + s * rand(-20, 30) * W / 512, cy + ry * rand(0.4, 1.2)); ctx.stroke();
  }
  const vg = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.25, cx, cy, Math.max(W, H) * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.95)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 26);
  if (opts.mask) { ctx.globalCompositeOperation = 'destination-in'; const m2 = ctx.createRadialGradient(cx, cy, rx * 0.9, cx, cy, ry * 1.08); m2.addColorStop(0, '#000'); m2.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = m2; ctx.beginPath(); ctx.ellipse(cx, cy, rx * 1.12, ry * 1.08, 0, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
}
function tinted(src, color) {
  const c = mkCanvas(src.width, src.height), ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = color; ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

// ===================== RENDERER / SCENE =====================
const renderer = new THREE.WebGLRenderer({ antialias: !isTouch, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.25 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
$('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x010101, 0.07);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 80);
camera.rotation.order = 'YXZ';
scene.add(camera);

const hemi = new THREE.HemisphereLight(0x3a4258, 0x0c0906, 0.7);
scene.add(hemi);

const flash = new THREE.SpotLight(0xfff0d2, 0, 26, 0.46, 0.6, 1.5);
flash.castShadow = true;
flash.shadow.mapSize.set(isTouch ? 512 : 1024, isTouch ? 512 : 1024);
flash.shadow.camera.near = 0.2; flash.shadow.camera.far = 26; flash.shadow.bias = -0.0006;
flash.position.set(0.22, -0.18, 0.05);
camera.add(flash); camera.add(flash.target);
flash.target.position.set(0.04, -0.12, -6);
const FLASH_BASE = 75;

// 疑似ボリュームライト（光の筋）
const beamMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uI: { value: 0 } },
  vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = position.y; vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
  fragmentShader: 'uniform float uI; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float t = clamp((vY+4.0)/8.0,0.0,1.0); float edge = pow(abs(dot(vN,vV)),2.0); gl_FragColor = vec4(vec3(1.0,0.94,0.82)*uI*t*t*t*edge*0.04,1.0); }',
});
const beamGeo = new THREE.ConeGeometry(3.4, 8, 24, 1, true);
const beam = new THREE.Mesh(beamGeo, beamMat);
beam.rotation.x = Math.PI / 2; beam.position.set(0.22, -0.3, -4.0);
camera.add(beam);

// 埃
const dustN = 260, dustGeo = new THREE.BufferGeometry(), dustPos = new Float32Array(dustN * 3), dustVel = [];
const dustSpawn = (i) => { const z = rand(-5, -0.8), r = Math.sqrt(Math.random()) * Math.abs(z) * 0.42, a = rand(0, 7); dustPos[i * 3] = 0.2 + Math.cos(a) * r; dustPos[i * 3 + 1] = -0.15 + Math.sin(a) * r; dustPos[i * 3 + 2] = z; };
for (let i = 0; i < dustN; i++) { dustSpawn(i); dustVel.push([rand(-0.03, 0.03), rand(-0.05, 0.02), rand(-0.03, 0.03)]); }
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dustMat = new THREE.PointsMaterial({ color: 0xfff0d0, size: 0.018, map: new THREE.CanvasTexture(glowCanvas(255, 255, 255)), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
const dust = new THREE.Points(dustGeo, dustMat); camera.add(dust);

// ===================== WORLD BUILD =====================
genMaze();
braid(0.45);
pickStart();
carveHalls(3);
const openCells = [];
for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (!wallAt(x, y)) openCells.push([x, y]);
const startDist = bfs(SX, SY).dist;
const SD = (x, y) => startDist[y * GW + x];
const EXITC = [[1, 1], [GW - 2, 1], [1, GH - 2], [GW - 2, GH - 2]].sort((a, b) => SD(b[0], b[1]) - SD(a[0], a[1]))[0];

let maxDist = 0; for (const v of startDist) maxDist = Math.max(maxDist, v);
const zoneOf = (x, y) => { const d = startDist[y * GW + x]; if (d < 0) return 0; const r = d / maxDist; return r < 0.34 ? 0 : r < 0.67 ? 1 : 2; };
const zoneW = (wx, wz) => { const [x, y] = [Math.round(wx / S), Math.round(wz / S)]; if (!wallAt(x, y)) return zoneOf(x, y); for (const [dx, dy] of DIRS) if (!wallAt(x + dx, y + dy)) return zoneOf(x + dx, y + dy); return 0; };
halls.forEach((h) => (h.zone = zoneOf(h.x + 2, h.y)));

const ZONE = [
  { name: '旧家', walls: [wall0(false), wall0(true)], floor: floor0(), ceil: ceilC('#21190f'), fog: 0.066, fogC: 0x010101 },
  { name: '病棟', walls: [wall1(false), wall1(true)], floor: floor1(), ceil: ceilC('#2a2c28'), fog: 0.072, fogC: 0x010202 },
  { name: '最深部', walls: [wall2(false), wall2(true)], floor: floor2(), ceil: ceilC('#170e0c'), fog: 0.09, fogC: 0x070101 },
];
{
  const m = new THREE.Matrix4();
  const wallGeo = new THREE.BoxGeometry(S, WALL_H, S);
  const lists = [...Array(6)].map(() => []);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    if (!wallAt(x, y)) continue;
    const nb = DIRS.find(([dx, dy]) => !wallAt(x + dx, y + dy));
    if (!nb) continue;
    const z = zoneOf(x + nb[0], y + nb[1]);
    lists[z * 2 + (Math.random() < 0.15 ? 1 : 0)].push([x, y]);
  }
  lists.forEach((list, i) => {
    if (!list.length) return;
    const mat = new THREE.MeshStandardMaterial({ map: tex(ZONE[i >> 1].walls[i & 1]), roughness: 0.92 });
    const im = new THREE.InstancedMesh(wallGeo, mat, list.length);
    list.forEach(([x, y], k) => im.setMatrixAt(k, m.makeTranslation(x * S, WALL_H / 2, y * S)));
    im.castShadow = im.receiveShadow = true; scene.add(im);
  });
  const fGeo = new THREE.PlaneGeometry(S, S); fGeo.rotateX(-Math.PI / 2);
  const cGeo = new THREE.PlaneGeometry(S, S); cGeo.rotateX(Math.PI / 2);
  for (let z = 0; z < 3; z++) {
    const cells = openCells.filter(([x, y]) => zoneOf(x, y) === z);
    if (!cells.length) continue;
    const fm = new THREE.InstancedMesh(fGeo, new THREE.MeshStandardMaterial({ map: tex(ZONE[z].floor), roughness: z === 2 ? 0.45 : 0.85, metalness: z === 2 ? 0.2 : 0 }), cells.length);
    const cm = new THREE.InstancedMesh(cGeo, new THREE.MeshStandardMaterial({ map: tex(ZONE[z].ceil), roughness: 1 }), cells.length);
    cells.forEach(([x, y], k) => { fm.setMatrixAt(k, m.makeTranslation(x * S, 0, y * S)); cm.setMatrixAt(k, m.makeTranslation(x * S, WALL_H, y * S)); });
    fm.receiveShadow = cm.receiveShadow = true; scene.add(fm, cm);
  }
  // 配管（病棟・最深部の廊下）
  const pipeCells = openCells.filter(([x, y]) => zoneOf(x, y) >= 1 && ((wallAt(x - 1, y) && wallAt(x + 1, y)) || (wallAt(x, y - 1) && wallAt(x, y + 1))));
  const pGeo = new THREE.CylinderGeometry(0.09, 0.09, S, 8);
  const pm = new THREE.InstancedMesh(pGeo, new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 0.5, metalness: 0.6 }), pipeCells.length * 2);
  const q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(1, 1, 1), pv = new THREE.Vector3();
  let pk = 0;
  for (const [x, y] of pipeCells) {
    const vertical = wallAt(x - 1, y) && wallAt(x + 1, y); // 通路はz方向
    for (const k of [0, 1]) {
      const off = (k ? 1.15 : 1.32) * (vertical ? 1 : 1);
      e.set(vertical ? Math.PI / 2 : 0, 0, vertical ? 0 : Math.PI / 2); q.setFromEuler(e);
      pv.set(x * S + (vertical ? off : 0), WALL_H - 0.18 - k * 0.22, y * S + (vertical ? 0 : off));
      pm.setMatrixAt(pk++, m.compose(pv, q, sc));
    }
  }
  pm.count = pk; pm.castShadow = true; scene.add(pm);
  // 床の痕跡
  const decalTex = [decalCanvas(0), decalCanvas(1), decalCanvas(2)];
  const decalMats = decalTex.map((t) => new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 0.4 }));
  for (let i = 0; i < 38; i++) {
    const [x, y] = pick(openCells); const k = zoneOf(x, y) === 2 ? pick([0, 0, 1, 2]) : pick([0, 1, 2, 2]);
    const d = new THREE.Mesh(new THREE.PlaneGeometry(k === 1 ? 1.2 : 2.2, k === 1 ? 1.2 : 2.2), decalMats[k]);
    d.rotation.x = -Math.PI / 2; d.rotation.z = rand(0, 7); d.position.set(x * S + rand(-0.5, 0.5), 0.005 + i * 0.0003, y * S + rand(-0.5, 0.5)); d.receiveShadow = true;
    scene.add(d);
  }
}

// 裸電球
const bulbs = [];
{
  const cand = openCells.filter(([x, y]) => SD(x, y) > 5 && x % 2 === 1 && y % 2 === 1);
  for (let i = 0; i < 7 && cand.length; i++) {
    const [x, y] = cand.splice((Math.random() * cand.length) | 0, 1)[0];
    const z = zoneOf(x, y);
    const light = new THREE.PointLight(z === 1 ? 0xb8d0c0 : z === 2 ? 0xff5030 : 0xffa25a, 3, 9, 1.8);
    light.position.set(x * S, WALL_H - 0.75, y * S); scene.add(light);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffc080 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat); bulb.position.copy(light.position); scene.add(bulb);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.68), new THREE.MeshBasicMaterial({ color: 0x050505 }));
    cord.position.set(x * S, WALL_H - 0.36, y * S); scene.add(cord);
    bulbs.push({ light, mat, base: z === 2 ? 4 : 3, phase: rand(0, 100), x: x * S, z: y * S, col: light.color.clone() });
  }
}

// ---- 小道具 ----
const propMat = {
  wood: new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.8 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x585c58, roughness: 0.45, metalness: 0.7 }),
  rust: new THREE.MeshStandardMaterial({ color: 0x4a2a1a, roughness: 0.7, metalness: 0.5 }),
  sheet: new THREE.MeshStandardMaterial({ color: 0xa8a49a, roughness: 1 }),
  stainSheet: new THREE.MeshStandardMaterial({ color: 0x8a7e70, roughness: 1 }),
  card: new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 1 }),
  cloth: new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 1 }),
};
const box = (w, h, d, mat, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; return b; };
function chair() {
  const g = new THREE.Group();
  g.add(box(0.45, 0.05, 0.45, propMat.wood, 0, 0.45, 0));
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) g.add(box(0.04, 0.45, 0.04, propMat.wood, x, 0.225, z));
  g.add(box(0.45, 0.5, 0.04, propMat.wood, 0, 0.72, -0.21));
  return g;
}
function table() {
  const g = new THREE.Group();
  g.add(box(1.3, 0.06, 0.75, propMat.wood, 0, 0.74, 0));
  for (const [x, z] of [[-0.6, -0.33], [0.6, -0.33], [-0.6, 0.33], [0.6, 0.33]]) g.add(box(0.05, 0.74, 0.05, propMat.wood, x, 0.37, z));
  return g;
}
function bed(covered) {
  const g = new THREE.Group();
  g.add(box(0.95, 0.06, 2.0, propMat.metal, 0, 0.55, 0));
  for (const [x, z] of [[-0.45, -0.95], [0.45, -0.95], [-0.45, 0.95], [0.45, 0.95]]) g.add(box(0.04, 0.55, 0.04, propMat.metal, x, 0.275, z));
  g.add(box(0.95, 0.5, 0.04, propMat.metal, 0, 0.9, -0.98));
  g.add(box(0.88, 0.12, 1.9, propMat.stainSheet, 0, 0.64, 0));
  if (covered) {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), propMat.sheet); body.scale.set(0.55, 0.28, 1.7); body.position.set(0, 0.78, 0.05); body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), propMat.sheet); head.position.set(0, 0.8, -0.72); g.add(head);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.55, 6), new THREE.MeshStandardMaterial({ color: 0x6f6b61 })); arm.position.set(0.5, 0.45, 0.1); arm.rotation.z = 0.2; g.add(arm);
  }
  return g;
}
function ivStand() {
  const g = new THREE.Group();
  g.add(box(0.03, 1.9, 0.03, propMat.metal, 0, 0.95, 0));
  g.add(box(0.5, 0.03, 0.03, propMat.metal, 0, 1.85, 0));
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.04), new THREE.MeshStandardMaterial({ color: 0x5a0a0a, transparent: true, opacity: 0.75, roughness: 0.2 })); bag.position.set(0.2, 1.68, 0); g.add(bag);
  return g;
}
function crates() {
  const g = new THREE.Group();
  g.add(box(0.7, 0.55, 0.6, propMat.card, 0, 0.275, 0));
  g.add(box(0.6, 0.45, 0.5, propMat.card, 0.05, 0.775, 0.02));
  g.add(box(0.5, 0.4, 0.5, propMat.card, 0.75, 0.2, 0.1));
  return g;
}
const swingers = [];
function chains() {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const len = rand(1.0, 2.2), pivot = new THREE.Group(); pivot.position.set(rand(-0.8, 0.8), WALL_H, rand(-0.8, 0.8));
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 5), propMat.rust); c.position.y = -len / 2; c.castShadow = true; pivot.add(c);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 5, 10, 4.5), propMat.rust); hook.position.y = -len - 0.06; pivot.add(hook);
    g.add(pivot); swingers.push({ o: pivot, ph: rand(0, 7), amp: rand(0.02, 0.06) });
  }
  return g;
}
const candleLights = [];
function altar() {
  const g = new THREE.Group();
  g.add(box(1.1, 0.4, 0.55, propMat.wood, 0, 0.2, 0));
  for (let i = 0; i < 5; i++) {
    const h = rand(0.1, 0.25), c = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, h, 6), new THREE.MeshStandardMaterial({ color: 0xd8d0b8, emissive: 0x332211 }));
    c.position.set(rand(-0.45, 0.45), 0.4 + h / 2, rand(-0.18, 0.18)); g.add(c);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffb060 })); fl.position.set(c.position.x, 0.4 + h + 0.02, c.position.z); g.add(fl);
  }
  const ch = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.5), new THREE.MeshStandardMaterial({ map: tex(charmCanvas()), side: THREE.DoubleSide })); ch.position.set(0, 0.68, -0.25); g.add(ch);
  const light = new THREE.PointLight(0xff9a40, 2, 6, 1.8); light.position.set(0, 0.8, 0); g.add(light); candleLights.push(light);
  return g;
}
let radioPos = null;
function radioProp() {
  const g = table();
  const r = box(0.36, 0.22, 0.16, propMat.rust, 0, 0.88, 0); g.add(r);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), new THREE.MeshBasicMaterial({ color: 0xffaa55 })); dial.position.set(0.1, 0.89, 0.081); g.add(dial);
  return g;
}
function place(obj, x, z, ry, hx, hz) {
  obj.position.set(x, 0, z); obj.rotation.y = ry; scene.add(obj); obj.updateMatrixWorld(true);
  if (hx) addSolid(obj, hx, hz);
  return obj;
}
// 広間の小道具
halls.forEach((h, i) => {
  const cx = h.wx, cz = h.wz;
  const spots = [[0, 0], [-S, 0], [S, 0], [0, -S], [0, S], [-S * 2, -S * 2], [S * 2, S * 2], [-S * 2, S * 2], [S * 2, -S * 2]];
  if (h.zone === 0) {
    place(altar(), cx, cz - 0.8, 0, 0.55, 0.28);
    for (let k = 0; k < 6; k++) { const c = chair(); const [ox, oz] = pick(spots.slice(1)); const o = place(c, cx + ox + rand(-0.8, 0.8), cz + oz + rand(-0.8, 0.8), rand(0, 7)); if (Math.random() < 0.4) { o.rotation.z = Math.PI / 2; o.position.y = 0.22; } }
    if (!radioPos) { const r = place(radioProp(), cx + S * 2, cz + S * 2 - 0.6, Math.PI, 0.65, 0.38); radioPos = new THREE.Vector3(cx + S * 2, 0.9, cz + S * 2 - 0.6); }
  } else if (h.zone === 1) {
    for (const [ox, oz] of [[-S * 2, -S], [S * 2, -S], [-S * 2, S], [S * 2, S]]) place(bed(Math.random() < 0.5), cx + ox, cz + oz, 0, 0.48, 1.0);
    place(ivStand(), cx + 0.6, cz - 0.4, 0);
    place(ivStand(), cx - S * 2 + 0.7, cz - S + 1.3, 0);
    if (!radioPos) { place(radioProp(), cx, cz + S * 2, 0, 0.65, 0.38); radioPos = new THREE.Vector3(cx, 0.9, cz + S * 2); }
  } else {
    place(chains(), cx, cz, 0); place(chains(), cx + S * 2, cz - S * 2, 0); place(chains(), cx - S * 2, cz + S * 2, 0);
    place(crates(), cx - S * 2, cz - S * 2, rand(0, 7), 0.6, 0.6);
    place(bed(true), cx + S * 2, cz + S * 2 - 0.3, Math.PI / 2, 0.48, 1.0);
  }
});
if (!radioPos) { const [x, y] = pick(openCells.filter(([x, y]) => SD(x, y) > 10)); place(radioProp(), x * S, y * S, 0, 0.65, 0.38); radioPos = new THREE.Vector3(x * S, 0.9, y * S); }
// 廊下の段ボールなど
for (let i = 0; i < 10; i++) {
  const [x, y] = pick(openCells); if (SD(x, y) < 4) continue;
  const side = DIRS.find(([dx, dy]) => wallAt(x + dx, y + dy)); if (!side) continue;
  const z = zoneOf(x, y);
  const obj = z === 1 ? ivStand() : z === 2 ? crates() : chair();
  place(obj, x * S + side[0] * 1.05, y * S + side[1] * 1.05, rand(0, 7), z === 2 ? 0.55 : 0, z === 2 ? 0.55 : 0);
}

// ---- 人形（見ていないときだけ動く）----
const dollFaceTex = tex(dollFaceCanvas());
const dolls = [];
function makeDoll() {
  const g = new THREE.Group();
  const dress = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 10), new THREE.MeshStandardMaterial({ color: pick([0x5a1018, 0x2a2a3a, 0x6a6050]), roughness: 1 }));
  dress.position.y = 0.16; dress.castShadow = true; g.add(dress);
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 6), new THREE.MeshStandardMaterial({ color: 0xd8d0c0 })); leg.rotation.x = Math.PI / 2; leg.position.set(s * 0.06, 0.03, 0.12); g.add(leg); }
  const head = new THREE.Group(); head.position.y = 0.42; g.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), new THREE.MeshStandardMaterial({ color: 0xe0dace, roughness: 0.4 })); head.add(skull);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.095, 16), new THREE.MeshStandardMaterial({ map: dollFaceTex, emissive: 0x222222, emissiveMap: dollFaceTex, roughness: 0.4 })); face.position.z = 0.075; head.add(face);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), new THREE.MeshStandardMaterial({ color: 0x0c0806, roughness: 0.7, side: THREE.DoubleSide }));
  hair.rotation.x = -0.5; hair.position.set(0, 0.01, -0.02); head.add(hair);
  return { g, head };
}
for (let i = 0; i < 9; i++) {
  const cand = pick(openCells); const [x, y] = cand;
  if (SD(x, y) < 6 || zoneOf(x, y) === 2) continue;
  const side = DIRS.find(([dx, dy]) => wallAt(x + dx, y + dy)); if (!side) continue;
  const d = makeDoll();
  d.g.position.set(x * S + side[0] * 1.25, 0, y * S + side[1] * 1.25);
  d.g.rotation.y = Math.atan2(-side[0], -side[1]);
  scene.add(d.g); d.yaw = rand(-1.5, 1.5); d.head.rotation.y = d.yaw; d.head.rotation.z = rand(-0.4, 0.4);
  dolls.push(d);
}

// アイテム
const charmTex = tex(charmCanvas());
const glowRed = new THREE.CanvasTexture(glowCanvas(255, 90, 70));
const glowWhite = new THREE.CanvasTexture(glowCanvas(200, 255, 210));
const items = [];
function addItem(type, x, y) {
  const g = new THREE.Group();
  g.position.set(x * S, 1.15, y * S);
  if (type === 'charm') {
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.56), new THREE.MeshStandardMaterial({ map: charmTex, side: THREE.DoubleSide, emissive: 0x442a1a, emissiveMap: charmTex })));
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowRed, color: 0xff5040, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 })); sp.scale.set(1.3, 1.3, 1); g.add(sp);
  } else {
    g.position.y = 0.25;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.17, 10), new THREE.MeshStandardMaterial({ color: 0x2a6a3a, emissive: 0x0a2a10, metalness: 0.4, roughness: 0.4 })); m.rotation.z = Math.PI / 2; g.add(m);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowWhite, color: 0x90ffb0, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.35 })); sp.scale.set(0.6, 0.6, 1); g.add(sp);
  }
  scene.add(g);
  items.push({ type, g, x: x * S, z: y * S, phase: rand(0, 6) });
}
{
  const dist = startDist;
  const dead = openCells.filter(([x, y]) => x % 2 === 1 && y % 2 === 1 && DIRS.filter(([dx, dy]) => wallAt(x + dx, y + dy)).length === 3 && !(x === EXITC[0] && y === EXITC[1]) && dist[y * GW + x] > 8);
  dead.sort((a, b) => dist[b[1] * GW + b[0]] - dist[a[1] * GW + a[0]]);
  const chosen = [];
  for (const c of dead) { if (chosen.every((o) => Math.abs(o[0] - c[0]) + Math.abs(o[1] - c[1]) > 8)) chosen.push(c); if (chosen.length === 5) break; }
  for (const c of openCells) { if (chosen.length >= 5) break; if (dist[c[1] * GW + c[0]] > 10 && chosen.every((o) => Math.abs(o[0] - c[0]) + Math.abs(o[1] - c[1]) > 6)) chosen.push(c); }
  chosen.forEach(([x, y]) => addItem('charm', x, y));
  const odd = openCells.filter(([x, y]) => dist[y * GW + x] > 5 && !chosen.some((c) => c[0] === x && c[1] === y));
  for (let i = 0; i < 5; i++) { const [x, y] = odd.splice((Math.random() * odd.length) | 0, 1)[0]; addItem('battery', x, y); }
}

// 出口の扉（スタートから一番遠い角）
const EXSIDE = EXITC[0] === 1 ? -1 : 1;
const EXIT = { x: EXSIDE > 0 ? (GW - 1) * S - S / 2 : S / 2, z: EXITC[1] * S };
const door = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.6), new THREE.MeshStandardMaterial({ map: tex(doorCanvas()), roughness: 0.7, metalness: 0.3 }));
door.position.set(EXIT.x - EXSIDE * 0.02, 1.3, EXIT.z); door.rotation.y = -EXSIDE * Math.PI / 2; scene.add(door);
const exitLight = new THREE.PointLight(0xa8c0ff, 0, 7, 1.6);
exitLight.position.set(EXIT.x - EXSIDE * 1.0, 2.4, EXIT.z); scene.add(exitLight);

// ===================== LOCKERS =====================
const lockerBodyTex = tex(lockerCanvas(false));
const lockers = [];
const lockerBodyMat = new THREE.MeshStandardMaterial({ map: lockerBodyTex, roughness: 0.7, metalness: 0.35, side: THREE.DoubleSide });
const lockerInMat = new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 0.8, side: THREE.DoubleSide });
function makeLocker(num) {
  const g = new THREE.Group();
  const W = 0.86, H = 2.1, D = 0.62;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), lockerInMat); back.position.set(0, H / 2, -D / 2); g.add(back);
  for (const s of [-1, 1]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(D, H), lockerBodyMat); side.rotation.y = Math.PI / 2; side.position.set((s * W) / 2, H / 2, 0); side.castShadow = true; g.add(side); }
  const top = new THREE.Mesh(new THREE.PlaneGeometry(W, D), lockerBodyMat); top.rotation.x = Math.PI / 2; top.position.set(0, H, 0); g.add(top);
  const pivot = new THREE.Group(); pivot.position.set(-W / 2, 0, D / 2); g.add(pivot);
  const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, H - 0.04, 0.025), new THREE.MeshStandardMaterial({ map: tex(lockerCanvas(true, num)), roughness: 0.7, metalness: 0.35, color: 0xb8b8b0 }));
  doorMesh.position.set(W / 2, H / 2, 0.0125); doorMesh.castShadow = doorMesh.receiveShadow = true; pivot.add(doorMesh);
  return { g, pivot, open: 0, target: 0 };
}
{
  const cand = openCells.filter(([x, y]) => SD(x, y) > 3 && !(x === EXITC[0] && y === EXITC[1]) && !items.some((it) => Math.round(it.x / S) === x && Math.round(it.z / S) === y));
  let groups = 0, num = 1;
  const used = new Set();
  for (let tries = 0; tries < 600 && groups < 11; tries++) {
    const [x, y] = pick(cand);
    if (used.has(x + ',' + y)) continue;
    const side = DIRS.filter(([dx, dy]) => wallAt(x + dx, y + dy));
    if (!side.length) continue;
    const [dx, dy] = pick(side);
    // 通路を完全にふさがないよう、壁が1面以上の場所に寄せる
    if ([...used].some((u) => { const [ux, uy] = u.split(',').map(Number); return Math.abs(ux - x) + Math.abs(uy - y) < 4; })) continue;
    used.add(x + ',' + y);
    const n = pick([1, 1, 2, 2, 3]);
    const facing = new THREE.Vector3(-dx, 0, -dy);
    const along = new THREE.Vector3(-dy, 0, dx);
    for (let k = 0; k < n; k++) {
      const L = makeLocker(String(num++).padStart(2, '0'));
      const off = (k - (n - 1) / 2) * 0.9;
      L.g.position.set(x * S + dx * (S / 2 - 0.32) + along.x * off, 0, y * S + dy * (S / 2 - 0.32) + along.z * off);
      L.g.rotation.y = Math.atan2(facing.x, facing.z);
      scene.add(L.g); L.g.updateMatrixWorld(true);
      L.facing = facing.clone();
      L.center = L.g.position.clone();
      L.front = L.center.clone().addScaledVector(facing, 1.0);
      L.inspect = L.center.clone().addScaledVector(facing, 0.78);
      L.inside = L.center.clone().addScaledVector(facing, 0.12); L.inside.y = 1.6;
      L.yaw = Math.atan2(-facing.x, -facing.z);
      L.zone = zoneOf(x, y);
      addSolid(L.g, 0.43, 0.31);
      lockers.push(L);
    }
    groups++;
  }
  // 先客
  const far = lockers.filter((l) => l.zone >= 1);
  if (far.length) pick(far).corpse = true;
}

// ===================== STALKER MODEL =====================
const faceSmall = mkCanvas(256, 256); drawFace(faceSmall, 0.35, { mask: true });
const faceTex = tex(faceSmall);
function limb(len, r, mat) { const g = new THREE.CylinderGeometry(r * 0.75, r, len, 6); g.translate(0, -len / 2, 0); const m = new THREE.Mesh(g, mat); m.castShadow = true; return m; }
function makeStalker(dark) {
  const skin = new THREE.MeshStandardMaterial({ color: dark ? 0x4a4640 : 0x6f6b61, roughness: 0.9 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x0c0b0a, roughness: 1, side: THREE.DoubleSide });
  const hairM = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.6, side: THREE.DoubleSide });
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.55; root.add(hips);
  const legs = [];
  for (const s of [-1, 1]) {
    const L = limb(0.55, 0.045, skin); L.position.set(s * 0.1, 0, 0); hips.add(L); legs.push(L);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.24), skin); foot.position.set(0, -0.55, 0.07); L.add(foot);
  }
  const torso = new THREE.Group(); hips.add(torso);
  const robeGeo = new THREE.CylinderGeometry(0.2, 0.42, 1.85, 14, 6, true);
  const pos = robeGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) { if (pos.getY(i) < -0.8) pos.setY(i, pos.getY(i) + rand(0, 0.35)); pos.setX(i, pos.getX(i) * rand(0.92, 1.08)); }
  robeGeo.computeVertexNormals();
  const robe = new THREE.Mesh(robeGeo, cloth); robe.position.y = 0.62; robe.castShadow = true; torso.add(robe);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), cloth); chest.scale.set(1.35, 0.8, 0.85); chest.position.y = 1.5; chest.castShadow = true; torso.add(chest);
  const neck = limb(0.42, 0.055, skin); neck.rotation.x = Math.PI; neck.position.set(0, 1.55, 0.03); torso.add(neck);
  const head = new THREE.Group(); head.position.set(0, 1.98, 0.08); torso.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 12), skin); skull.scale.set(0.85, 1.3, 0.9); skull.castShadow = true; head.add(skull);
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, emissiveMap: faceTex, emissive: 0x6a6a6a, roughness: 0.8, transparent: true, alphaTest: 0.05 });
  const fc = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.56), faceMat); fc.position.z = 0.17; head.add(fc);
  for (let i = 0; i < 34; i++) {
    const a = rand(0.75, Math.PI * 2 - 0.75) + Math.PI / 2, len = rand(0.5, 1.0);
    const hg = new THREE.PlaneGeometry(rand(0.03, 0.07), len); hg.translate(0, -len / 2, 0);
    const h = new THREE.Mesh(hg, hairM);
    h.position.set(Math.cos(a) * 0.16, 0.2, -Math.sin(a) * 0.17); h.rotation.y = -a; h.rotation.x = rand(-0.15, 0.1);
    head.add(h);
  }
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const len = rand(0.5, 0.8); const hg = new THREE.PlaneGeometry(0.035, len); hg.translate(0, -len / 2, 0); const h = new THREE.Mesh(hg, hairM); h.position.set(s * rand(0.12, 0.18), 0.2, 0.15); h.rotation.x = -0.12; head.add(h); }
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.36, 1.5, 0); torso.add(sh);
    const up = limb(0.9, 0.05, skin); up.rotation.z = s * 0.06; sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.9; up.add(el);
    const fo = limb(0.85, 0.042, skin); el.add(fo);
    const hand = new THREE.Group(); hand.position.y = -0.85; fo.add(hand);
    for (let f = 0; f < 4; f++) { const fi = limb(0.3, 0.012, skin); fi.position.x = (f - 1.5) * 0.025; fi.rotation.z = (f - 1.5) * 0.12; fi.rotation.x = -0.25; hand.add(fi); }
    arms.push({ sh, el, hand });
  }
  return { root, hips, torso, head, arms, legs, faceMat };
}
const M = makeStalker(); scene.add(M.root);
const PH = makeStalker(); PH.root.visible = false; scene.add(PH.root);
// 先客（ロッカーから倒れてくるもの）
const CORPSE = makeStalker(true); CORPSE.root.visible = false; scene.add(CORPSE.root);
CORPSE.faceMat.emissive.setHex(0x111111);

// ===================== AUDIO =====================
let AC = null; const A = {};
function makeNoise(type) {
  const len = AC.sampleRate * 3, b = AC.createBuffer(1, len, AC.sampleRate), d = b.getChannelData(0); let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
  return b;
}
const osc = (type, f) => { const o = AC.createOscillator(); o.type = type; o.frequency.value = f; o.start(); return o; };
const gainN = (v) => { const g = AC.createGain(); g.gain.value = v; return g; };
const biq = (type, f, q = 1) => { const b = AC.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
const loopSrc = (buf) => { const s = AC.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * 2); return s; };
function mkPanner(ref = 2, roll = 1.25) { const p = AC.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = roll; p.maxDistance = 80; return p; }
function setPos(p, x, y, z) { if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z); }
function distCurve(k) { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = Math.tanh(x * k); } return c; }
function now() { return AC.currentTime; }

const drips = [];
function initAudio() {
  AC = new (window.AudioContext || window.webkitAudioContext)();
  A.white = makeNoise('white'); A.brown = makeNoise('brown');
  A.comp = AC.createDynamicsCompressor(); A.comp.threshold.value = -12; A.comp.ratio.value = 5; A.comp.connect(AC.destination);
  A.out = gainN(1); A.out.connect(A.comp);
  // 隠れている間、外の音はこもる
  A.muffle = biq('lowpass', 20000, 0.5); A.muffle.connect(A.out);
  A.master = gainN(1); A.master.connect(A.muffle);
  A.self = gainN(1); A.self.connect(A.out);
  A.scare = gainN(1); A.scare.connect(A.comp);
  A.amb = gainN(0.55); A.amb.connect(A.master);
  loopSrc(A.brown).connect(biq('lowpass', 170)).connect(gainN(0.55)).connect(A.amb);
  for (const f of [41.2, 41.9, 61.7]) osc('sine', f).connect(gainN(0.05)).connect(A.amb);
  A.windBP = biq('bandpass', 900, 0.7); loopSrc(A.white).connect(A.windBP).connect(gainN(0.014)).connect(A.amb);
  A.deep = gainN(0); A.deep.connect(A.amb); // 最深部の唸り
  osc('sawtooth', 32.7).connect(biq('lowpass', 90)).connect(A.deep); osc('sine', 65.4 * 1.06).connect(gainN(0.3)).connect(A.deep);
  A.dread = gainN(0); A.dread.connect(A.master);
  const dl = biq('lowpass', 650);
  for (const f of [110, 116.5, 155.6, 233.1, 311.1]) osc('sawtooth', f * (1 + rand(-0.004, 0.004))).connect(dl);
  dl.connect(A.dread);
  A.high = gainN(0); A.high.connect(A.master);
  for (const f of [1760, 1865, 2489]) { const o = osc('sine', f); const vib = osc('sine', rand(4, 7)); vib.connect(gainN(f * 0.006)).connect(o.frequency); o.connect(A.high); }
  // 追跡者
  A.pan = mkPanner(); A.stLP = biq('lowpass', 500); A.stIn = gainN(1);
  A.stIn.connect(A.stLP).connect(A.pan).connect(A.master);
  A.brBP = biq('bandpass', 600, 1.3); A.brG = gainN(0); loopSrc(A.white).connect(A.brBP).connect(A.brG).connect(A.stIn);
  A.grLP = biq('lowpass', 240, 5); A.trem = gainN(0.5); A.grG = gainN(0);
  osc('sawtooth', 46).connect(A.grLP); osc('sawtooth', 49.3).connect(A.grLP); osc('square', 23.5).connect(gainN(0.3)).connect(A.grLP);
  osc('sine', 6.5).connect(gainN(0.5)).connect(A.trem.gain);
  A.grLP.connect(A.trem).connect(A.grG).connect(A.stIn);
  A.breathT = 0;
  // 自分の息
  A.myBP = biq('bandpass', 700, 1.1); A.myG = gainN(0); loopSrc(A.white).connect(A.myBP).connect(A.myG).connect(A.self); A.myT = 0;
  // ラジオ
  A.radioPan = mkPanner(1.5, 1.1); A.radioLP = biq('lowpass', 3000); A.radioIn = gainN(1);
  A.radioIn.connect(A.radioLP).connect(A.radioPan).connect(A.master);
  setPos(A.radioPan, radioPos.x, radioPos.y, radioPos.z);
  A.radioStatic = gainN(0.02); loopSrc(A.white).connect(biq('bandpass', 2800, 0.8)).connect(A.radioStatic).connect(A.radioIn);
  // 水滴
  for (let i = 0; i < 7; i++) {
    const [x, y] = pick(openCells.filter(([x, y]) => zoneOf(x, y) >= 1));
    const p = mkPanner(1, 1.6); setPos(p, x * S + rand(-1, 1), 2.6, y * S + rand(-1, 1)); p.connect(A.master);
    drips.push({ p, t: rand(0, 3), x: x * S, z: y * S });
  }
}
function thump(dest, vol, freq = 70, dur = 0.25, when = 0) {
  const t = now() + when;
  const o = AC.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq * 1.7, t); o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
  const n = AC.createBufferSource(); n.buffer = A.white; const f = biq('bandpass', rand(250, 800), 0.9);
  const ng = AC.createGain(); ng.gain.setValueAtTime(vol * 0.5, t); ng.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.6);
  n.connect(f).connect(ng).connect(dest); n.start(t, Math.random() * 2); n.stop(t + dur);
}
function scrape(dest, vol, dur = 0.5, when = 0, hi = 1) {
  const t = now() + when;
  const n = AC.createBufferSource(); n.buffer = A.white; const f = biq('bandpass', 1200 * hi, 2);
  f.frequency.setValueAtTime(rand(600, 1400) * hi, t); f.frequency.linearRampToValueAtTime(rand(300, 700) * hi, t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  n.connect(f).connect(g).connect(dest); n.start(t, Math.random() * 2); n.stop(t + dur + 0.05);
}
function moan(dest, vol) {
  const t = now(), dur = rand(2.4, 3.6);
  const out = AC.createGain(); out.gain.setValueAtTime(0.001, t); out.gain.linearRampToValueAtTime(vol, t + 0.6); out.gain.linearRampToValueAtTime(vol * 0.7, t + dur * 0.7); out.gain.exponentialRampToValueAtTime(0.001, t + dur);
  const f0 = rand(150, 210);
  for (const det of [0, 0.7]) {
    const o = AC.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0 + det, t); o.frequency.linearRampToValueAtTime(f0 * 1.15, t + dur * 0.3); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + dur);
    const vib = AC.createOscillator(); vib.frequency.value = 5.5; vib.connect(gainN(4)).connect(o.frequency); vib.start(t); vib.stop(t + dur);
    for (const [ff, q] of [[700, 6], [1150, 7], [2600, 8]]) o.connect(biq('bandpass', ff, q)).connect(out);
    o.start(t); o.stop(t + dur);
  }
  out.connect(dest);
}
function stinger(vol = 0.55) {
  const t = now(), out = AC.createGain();
  out.gain.setValueAtTime(0.001, t); out.gain.linearRampToValueAtTime(vol, t + 0.03); out.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
  const hp = biq('highpass', 500); hp.connect(out); out.connect(A.out);
  for (let i = 0; i < 7; i++) {
    const o = AC.createOscillator(); o.type = 'sawtooth'; const f = rand(900, 2100);
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * rand(1.2, 1.6), t + 2.0);
    o.connect(gainN(0.12)).connect(hp); o.start(t); o.stop(t + 2.3);
  }
  thump(A.out, vol * 1.6, 45, 1.6);
}
function scream(vol = 1.5) {
  const t = now(), out = AC.createGain();
  out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(vol, t + 0.012); out.gain.setValueAtTime(vol, t + 1.1); out.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
  const ws = AC.createWaveShaper(); ws.curve = distCurve(6); ws.connect(out); out.connect(A.scare);
  for (let i = 0; i < 9; i++) {
    const o = AC.createOscillator(); o.type = i % 2 ? 'sawtooth' : 'square'; const f = rand(180, 1300);
    o.frequency.setValueAtTime(f * 0.7, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08); o.frequency.exponentialRampToValueAtTime(f * 0.8, t + 1.9);
    const j = AC.createOscillator(); j.type = 'square'; j.frequency.value = rand(18, 45); j.connect(gainN(f * 0.12)).connect(o.frequency); j.start(t); j.stop(t + 2);
    o.connect(gainN(0.09)).connect(ws); o.start(t); o.stop(t + 2.05);
  }
  const n = AC.createBufferSource(); n.buffer = A.white; n.connect(biq('highpass', 1500)).connect(gainN(0.6)).connect(ws); n.start(t); n.stop(t + 2);
  thump(A.scare, 1.4, 38, 1.4);
}
function closeBreath(dest) {
  const t = now(), n = AC.createBufferSource(); n.buffer = A.white;
  const b = biq('bandpass', 450, 1.4); b.frequency.setValueAtTime(350, t); b.frequency.linearRampToValueAtTime(800, t + 0.45);
  const g = AC.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.7, t + 0.3); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  n.connect(b).connect(g).connect(dest || A.scare); n.start(t); n.stop(t + 0.55);
}
function sniff(dest) {
  for (let i = 0; i < 3; i++) {
    const t = now() + i * 0.16, n = AC.createBufferSource(); n.buffer = A.white;
    const g = AC.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.9, t + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    n.connect(biq('bandpass', 2400, 1.5)).connect(g).connect(dest); n.start(t, Math.random()); n.stop(t + 0.14);
  }
}
function gasp() {
  const t = now(), n = AC.createBufferSource(); n.buffer = A.white;
  const b = biq('bandpass', 500, 1.2); b.frequency.setValueAtTime(400, t); b.frequency.linearRampToValueAtTime(1400, t + 0.35);
  const g = AC.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.9, t + 0.08); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  n.connect(b).connect(g).connect(A.self); n.start(t); n.stop(t + 0.65);
}
function positional(x, y, z, fn, lp = 1800) { const p = mkPanner(); setPos(p, x, y, z); const f = biq('lowpass', lp); f.connect(p).connect(A.master); fn(f); }
function whisper(x, z) {
  positional(x, 1.6, z, (dest) => {
    const t = now(), dur = rand(1.2, 2.2), n = AC.createBufferSource(); n.buffer = A.white;
    const g = AC.createGain(); g.gain.setValueAtTime(0.001, t);
    for (let k = 0; k < 7; k++) { const tt = t + (k / 7) * dur; g.gain.linearRampToValueAtTime(rand(0.05, 0.22), tt + 0.05); g.gain.linearRampToValueAtTime(0.02, tt + dur / 7); }
    g.gain.linearRampToValueAtTime(0.001, t + dur);
    const f1 = biq('bandpass', 2500, 4), f2 = biq('bandpass', 1200, 5);
    for (let k = 0; k < 8; k++) { f1.frequency.setValueAtTime(rand(1800, 4200), t + (k / 8) * dur); f2.frequency.setValueAtTime(rand(700, 1600), t + (k / 8) * dur); }
    n.connect(f1).connect(g); n.connect(f2).connect(g); g.connect(dest); n.start(t, Math.random()); n.stop(t + dur);
  });
}
function bell() {
  const t = now();
  for (const [f, v] of [[660, 0.12], [990.5, 0.07], [1484, 0.05], [523, 0.08]]) {
    const o = AC.createOscillator(); o.frequency.value = f; const g = AC.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 3);
    o.connect(g).connect(A.master); o.start(t); o.stop(t + 3);
  }
}
function clank(dest, vol, dur = 2.5) {
  const t = now();
  for (const f of [180, 271, 413, 690, 1130]) { const o = AC.createOscillator(); o.type = 'triangle'; o.frequency.value = f * rand(0.97, 1.03); const g = AC.createGain(); g.gain.setValueAtTime(vol * 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.1); }
  thump(dest, vol * 0.8, 90, 0.2);
}
function creak(dest, vol) {
  const t = now(), o = AC.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(rand(180, 260), t); o.frequency.linearRampToValueAtTime(rand(380, 520), t + 0.5);
  const am = AC.createOscillator(); am.frequency.value = 28; const amg = gainN(0.5); am.connect(amg); const g = AC.createGain(); g.gain.value = 0.5; amg.connect(g.gain);
  const out = AC.createGain(); out.gain.setValueAtTime(0.001, t); out.gain.linearRampToValueAtTime(vol, t + 0.08); out.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  o.connect(biq('bandpass', 1500, 3)).connect(g).connect(out).connect(dest); o.start(t); am.start(t); o.stop(t + 0.65); am.stop(t + 0.65);
}
function powerDown() {
  const t = now(), o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(20, t + 1.6);
  const g = AC.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.7);
  o.connect(biq('lowpass', 500)).connect(g).connect(A.master); o.start(t); o.stop(t + 1.8);
  for (let i = 0; i < 6; i++) { const n = AC.createBufferSource(); n.buffer = A.white; const gg = AC.createGain(); const tt = t + rand(0, 0.8); gg.gain.setValueAtTime(0.25, tt); gg.gain.exponentialRampToValueAtTime(0.001, tt + 0.04); n.connect(biq('highpass', 3000)).connect(gg).connect(A.master); n.start(tt, Math.random()); n.stop(tt + 0.05); }
}
function heartbeat(vol) { thump(A.self, vol, 55, 0.18); thump(A.self, vol * 0.7, 50, 0.18, 0.22); }
function drip(p) {
  const t = now(), o = AC.createOscillator(); o.frequency.setValueAtTime(rand(1400, 2200), t); o.frequency.exponentialRampToValueAtTime(rand(500, 700), t + 0.07);
  const g = AC.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  o.connect(g).connect(p); o.start(t); o.stop(t + 0.15);
}
// オルゴール（その場で作るオリジナルの旋律）
const SCALE = [0, 2, 3, 5, 7, 8, 11, 12, 14, 15];
const melody = []; { let k = 4; for (let i = 0; i < 16; i++) { k = clamp(k + pick([-2, -1, -1, 1, 1, 2, 0, 3, -3]), 0, SCALE.length - 1); melody.push(k); } melody[15] = 0; }
const radio = { i: 0, t: 2, silentT: 0, warble: 1 };
function musicNote(semi) {
  const t = now(), f = 523.25 * Math.pow(2, semi / 12) * radio.warble;
  for (const [mult, v, dec] of [[1, 0.13, 1.8], [2.76, 0.04, 0.6], [5.4, 0.02, 0.3]]) {
    const o = AC.createOscillator(); o.frequency.setValueAtTime(f * mult, t); o.frequency.linearRampToValueAtTime(f * mult * rand(0.985, 1.0), t + dec);
    const g = AC.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dec);
    o.connect(g).connect(A.radioIn); o.start(t); o.stop(t + dec + 0.05);
  }
}

// ===================== PLAYER =====================
const player = { pos: new THREE.Vector3(SX * S, 0, SY * S), yaw: 0, pitch: 0, stamina: 1, exhausted: false, battery: 1, light: true, keys: 0, stepAcc: 0, sprinting: false, moving: false, bob: 0, eye: 1.62,
  hidden: null, hideT: 0, hideAnim: 0, hideDir: 0, air: 1, holding: false, peek: 0, lightWas: true, baseYaw: 0, fromPos: new THREE.Vector3(), fromYaw: 0, choking: false };
player.yaw = pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
const input = { f: 0, r: 0, sprint: false, breath: false, peek: false };
const keys = {};

// ===================== STALKER STATE =====================
const st = { pos: new THREE.Vector3(), state: 'wander', path: [], repath: 0, lastKnown: new THREE.Vector3(), stareT: 0, lostT: 0, stepAcc: 0, side: 0, unseenT: 0, anim: 0, twitch: 0, twitchT: 1, moveYaw: 0, speed: 0, d: 99, los: false, lpf: 500,
  silent: false, knows: null, list: [], locker: null, timer: 0, second: false, goal: new THREE.Vector3(), lean: 0, sniffT: 0, knockT: 0, checkedLong: false, urgent: false };
{
  const far = openCells.filter(([x, y]) => startDist[y * GW + x] > maxDist * 0.7);
  const [x, y] = pick(far); st.pos.set(x * S, 0, y * S);
}

// ===================== GAME =====================
const game = { state: 'title', t: 0, paused: false, firstSeen: false, stingCD: 0, moanT: 5, whisperT: rand(25, 45), knockT: rand(35, 55), phantomT: rand(50, 80), scareT: 0, scareKind: '', unlocked: false, timers: [], fear: 0, shake: 0, hbT: 0, phantomVis: 0, lightsOut: false, screamed: false, winT: 0, ended: false, blackout: 0,
  susp: 0, zone: 0, zoneSeen: [true, false, false], dollT: rand(30, 50), corpse: null };
function later(sec, fn) { game.timers.push({ t: game.t + sec, fn }); }
let msgTO = 0, guideTO = 0;
const guideSeen = {};
function showGuide(text, dur) {
  const g = $('guide'); g.textContent = text; g.style.opacity = 1;
  clearTimeout(guideTO); guideTO = setTimeout(() => (g.style.opacity = 0), dur * 1000);
}
// 場面に応じた操作ガイド（cd 秒は同じものを出さない）
function G(key, pc, touch, dur = 4, cd = Infinity) {
  const t = game.t; if (guideSeen[key] !== undefined && t - guideSeen[key] < cd) return;
  guideSeen[key] = t; showGuide(isTouch ? touch : pc, dur);
}
function showMsg(text, dur = 3, red = false) {
  const m = $('msg'); m.textContent = text; m.className = red ? 'red' : ''; m.style.opacity = 1;
  clearTimeout(msgTO); msgTO = setTimeout(() => (m.style.opacity = 0), dur * 1000);
}

function relocate(minD, maxD, mustHide = true, behind = false) {
  const [px, py] = toCell(player.pos), { dist } = bfs(px, py);
  const fwd = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  let cand = openCells.filter(([x, y]) => { const d = dist[y * GW + x]; return d >= minD && d <= maxD; });
  if (behind) {
    const b = cand.filter(([x, y]) => (x * S - player.pos.x) * fwd.x + (y * S - player.pos.z) * fwd.z < -1);
    const bl = b.filter(([x, y]) => lineClear(player.pos, { x: x * S, z: y * S }));
    cand = bl.length ? bl : b.length ? b : cand;
  } else if (mustHide) {
    const h = cand.filter(([x, y]) => !lineClear(player.pos, { x: x * S, z: y * S }));
    if (h.length) cand = h;
  }
  if (!cand.length) return false;
  const [x, y] = pick(cand);
  st.pos.set(x * S, 0, y * S); st.path = []; st.repath = 0;
  return true;
}
function startStare(t) {
  st.state = 'stare'; st.stareT = t; st.path = []; st.silent = false;
  if (game.stingCD <= 0) { stinger(); game.stingCD = 9; game.shake = Math.max(game.shake, 0.5); }
  game.firstSeen = true;
}
function navTo(tx, tz, speed, dt) {
  const [cx, cy] = toCell(st.pos), gx = Math.round(tx / S), gy = Math.round(tz / S);
  let mx, mz;
  const L = Math.hypot(tx - st.pos.x, tz - st.pos.z);
  if ((cx === gx && cy === gy) || (L < 5 && lineClear(st.pos, { x: tx, z: tz }))) { mx = tx; mz = tz; }
  else {
    st.repath -= dt;
    if (st.repath <= 0 || !st.path.length) { st.repath = 0.5; st.path = pathTo(cx, cy, gx, gy); }
    if (st.path.length) { const n = st.path[0]; mx = n[0] * S; mz = n[1] * S; if (Math.hypot(mx - st.pos.x, mz - st.pos.z) < 0.25) st.path.shift(); }
  }
  if (mx !== undefined) {
    const dx = mx - st.pos.x, dz = mz - st.pos.z, l = Math.hypot(dx, dz);
    if (l > 0.01) { const m = Math.min(l, speed * dt); st.pos.x += (dx / l) * m; st.pos.z += (dz / l) * m; st.moveYaw = Math.atan2(dx, dz); st.stepAcc += m; }
    collide(st.pos, 0.28, false);
  }
  return L < 0.3;
}
function wanderGoal() {
  const [px, py] = toCell(player.pos);
  if (game.t < 45) { for (let i = 0; i < 60; i++) { const c = pick(openCells); if (Math.abs(c[0] - px) + Math.abs(c[1] - py) > 14) return new THREE.Vector3(c[0] * S, 0, c[1] * S); } }
  for (let i = 0; i < 40; i++) { const c = pick(openCells); if (Math.abs(c[0] - px) + Math.abs(c[1] - py) < 12 || i > 35) return new THREE.Vector3(c[0] * S, 0, c[1] * S); }
  return st.pos.clone();
}
function lockerSearch(list, urgent = false) {
  st.state = 'toLocker'; st.list = list.slice(0, 4); st.locker = st.list.shift(); st.urgent = urgent; st.path = []; st.repath = 0; st.second = false;
}
function nearbyLockers(p, r) { return lockers.filter((l) => !l.corpse && l.center.distanceTo(p) < r).sort((a, b) => a.center.distanceTo(p) - b.center.distanceTo(p)); }
function toWander() { st.state = 'wander'; st.silent = false; st.goal.copy(wanderGoal()); st.path = []; st.repath = 0; }

function updateStalker(dt) {
  const pp = player.pos, d = Math.hypot(pp.x - st.pos.x, pp.z - st.pos.z);
  const los = d < 26 && lineClear(st.pos, pp);
  st.d = d; st.los = los;
  const hid = player.hidden;
  const sees = !hid && los && (d < 13 || (player.light && d < 24));
  const k = player.keys;
  const chaseSpeed = Math.min(3.55 + 0.2 * k, 4.6);
  if ((st.state === 'wander' || st.state === 'hunt') && !hid) {
    const loud = (player.sprinting ? 17 : player.moving ? 4.5 : 0) * (game.t < 30 ? 0.5 : 1);
    if (d < loud) { st.lastKnown.copy(pp); if (st.state === 'wander') { st.state = 'hunt'; st.repath = 0; st.path = []; } }
  }
  // 隠れているときの音
  if (hid && !player.holding && d < 4.5) game.susp += dt * (0.1 + game.fear * 0.08);
  if (hid && d < 9 && (st.state === 'wander' || st.state === 'hunt') && game.susp > 0.35) { lockerSearch([hid, ...nearbyLockers(hid.center, 6).filter((l) => l !== hid)].slice(0, 2)); }
  let speed = 0;
  switch (st.state) {
    case 'wander':
      speed = 1.35; st.speed = speed;
      if (sees) { startStare(game.firstSeen ? 0.8 : 1.9); break; }
      if (hid && player.hideT > 38 && !st.checkedLong) { st.checkedLong = true; lockerSearch(nearbyLockers(hid.center, 10)); break; }
      if (navTo(st.goal.x, st.goal.z, speed, dt)) st.goal.copy(wanderGoal());
      break;
    case 'hunt':
      speed = 2.5 + 0.15 * k;
      if (sees) { startStare(0.4); break; }
      if (navTo(st.lastKnown.x, st.lastKnown.z, speed, dt)) {
        if (hid) { const list = nearbyLockers(st.lastKnown, 9); if (list.length) { lockerSearch(list); break; } }
        toWander();
      }
      break;
    case 'stare': st.stareT -= dt; if (st.stareT <= 0) { st.state = 'chase'; st.repath = 0; st.lostT = 0; } break;
    case 'chase':
      speed = chaseSpeed;
      if (hid) {
        if (st.knows === hid) { lockerSearch([hid], true); break; }
        st.lostT += dt; if (st.lostT > 1.2) { st.state = 'hunt'; st.path = []; }
      } else if (sees) { st.lastKnown.copy(pp); st.lostT = 0; } else { st.lostT += dt; if (st.lostT > 1.6) { st.state = 'hunt'; st.repath = 0; st.path = []; } }
      if (st.state === 'chase') {
        if (los && d < 6 && !hid) { const dx = pp.x - st.pos.x, dz = pp.z - st.pos.z, l = Math.hypot(dx, dz); const m = Math.min(l, speed * dt); st.pos.x += (dx / l) * m; st.pos.z += (dz / l) * m; st.moveYaw = Math.atan2(dx, dz); st.stepAcc += m; collide(st.pos, 0.28, false); }
        else navTo(st.lastKnown.x, st.lastKnown.z, speed, dt);
      }
      break;
    case 'toLocker': {
      const L = st.locker;
      if (!L) { toWander(); break; }
      if (sees) { startStare(0.3); break; }
      speed = st.urgent ? chaseSpeed : 2.3;
      if (navTo(L.inspect.x, L.inspect.z, speed, dt)) {
        if (L === hid) { st.state = 'inspect'; st.timer = st.second ? rand(2.5, 4) : rand(5, 8.5); st.lean = 0; st.sniffT = 1; st.knockT = rand(1.5, 3.5); st.silent = false; }
        else { st.state = 'rip'; st.timer = 1.3; L.target = 1; positional(L.center.x, 1.2, L.center.z, (dst) => { clank(dst, 1.6, 1.5); }, 6000); game.shake = Math.max(game.shake, 0.3); }
      }
      break;
    }
    case 'rip':
      st.timer -= dt;
      if (sees) { startStare(0.3); break; }
      if (st.timer <= 0) { st.locker = st.list.shift(); if (st.locker) st.state = 'toLocker'; else toWander(); }
      break;
    case 'inspect': {
      const L = st.locker;
      st.timer -= dt; st.lean = Math.min(1, st.lean + dt * 0.5);
      if (!hid) { st.state = 'chase'; st.lastKnown.copy(pp); break; }
      if (player.peek > 0.5 && st.lean > 0.6) game.susp += dt * 0.35; // 目が合う
      st.sniffT -= dt; if (st.sniffT <= 0) { st.sniffT = rand(1.0, 2.2); sniff(A.stIn); }
      st.knockT -= dt; if (st.knockT <= 0) { st.knockT = 99; if (Math.random() < 0.6) { for (let i = 0; i < 3; i++) { thump(A.master, 0.7, 140, 0.1, i * 0.55); } later(0.05, () => (game.shake = 0.4)); later(0.6, () => (game.shake = 0.4)); later(1.15, () => (game.shake = 0.4)); } else scrape(A.master, 0.55, 1.6, 0, 1.6); }
      if (st.timer <= 0) {
        const thr = st.second ? 0.55 : 1;
        if ((st.knows === L && Math.random() < 0.85) || game.susp >= thr) {
          // ── 見つかった
          st.state = 'grabWait'; st.timer = rand(1.4, 2.4); st.silent = true;
          A.amb.gain.setTargetAtTime(0, now(), 0.3);
          for (let i = 0; i < 2; i++) thump(A.stIn, 0.5 - i * 0.2, 50, 0.3, 0.3 + i * 0.7);
        } else if (st.second) { st.knows = null; toWander(); }
        else {
          const r = Math.random();
          if (r < 0.45) { st.knows = null; toWander(); }
          else if (r < 0.72) { // 去ったふり
            st.state = 'fakeLeave'; st.second = true; st.timer = rand(5, 10); st.reached = false;
            const [lx, ly] = toCell(L.inspect), { dist } = bfs(lx, ly);
            const c = openCells.filter(([x, y]) => dist[y * GW + x] >= 3 && dist[y * GW + x] <= 5);
            const g = c.length ? pick(c) : [lx, ly]; st.goal.set(g[0] * S, 0, g[1] * S);
          } else { // 待ち伏せ
            st.state = 'lurkGo'; st.timer = rand(35, 55);
            const [lx, ly] = toCell(L.front), { dist } = bfs(lx, ly);
            const c = openCells.filter(([x, y]) => dist[y * GW + x] >= 2 && dist[y * GW + x] <= 3 && !lineClear(L.front, { x: x * S, z: y * S }));
            const g = c.length ? pick(c) : pick(openCells); st.goal.set(g[0] * S, 0, g[1] * S);
          }
        }
      }
      break;
    }
    case 'fakeLeave':
      if (!st.reached) { if (navTo(st.goal.x, st.goal.z, 1.6, dt)) { st.reached = true; st.silent = true; } }
      else { st.timer -= dt; if (st.timer <= 0) { st.silent = false; lockerSearch([st.locker], true); st.second = true; } }
      if (sees) startStare(0.25);
      break;
    case 'lurkGo':
      if (navTo(st.goal.x, st.goal.z, 1.6, dt)) { st.state = 'lurk'; st.silent = true; }
      break;
    case 'lurk':
      st.timer -= dt;
      if (!hid && los && d < 16) { st.silent = false; startStare(0.45); break; }
      if (st.timer <= 0) toWander();
      break;
    case 'grabWait':
      st.timer -= dt;
      if (st.timer <= 0) startScare('locker');
      break;
  }
  st.speed = speed;
  // 足音
  const stride = st.state === 'chase' || st.urgent ? 1.15 : 0.85;
  if (st.stepAcc > stride) {
    st.stepAcc = 0; st.side ^= 1;
    if (AC && !st.silent) {
      const v = st.state === 'chase' ? 1.1 : 0.75;
      thump(A.stIn, v, st.state === 'chase' ? 60 : 50, 0.32);
      if (st.state !== 'chase' && st.side) scrape(A.stIn, 0.35, 0.55, 0.12);
    }
    if (d < 9 && !st.silent) game.shake = Math.max(game.shake, (1 - d / 9) * (st.state === 'chase' ? 0.5 : 0.25));
  }
  if (!los) st.unseenT += dt; else st.unseenT = 0;
  if (st.state === 'wander' && st.unseenT > 20 && d > 26 && !hid && game.t > 70) { relocate(7, 11, true); st.unseenT = 0; st.goal.copy(wanderGoal()); }
  if (d < 0.95 && game.state === 'play' && !hid) startScare('caught');
}

const _fogC = new THREE.Color();
const _v = new THREE.Vector3(), _f = new THREE.Vector3(), _u = new THREE.Vector3(), _w = new THREE.Vector3();
function placeHead(tx, ty, tz, k) {
  M.root.updateMatrixWorld(true); M.head.getWorldPosition(_w);
  M.root.position.x += (tx - _w.x) * k; M.root.position.z += (tz - _w.z) * k; M.root.position.y += (ty - _w.y) * k;
  M.root.updateMatrixWorld(true);
}
function animStalker(dt) {
  const r = M.root, pp = player.pos;
  r.position.set(st.pos.x, 0, st.pos.z);
  const toP = Math.atan2(pp.x - st.pos.x, pp.z - st.pos.z);
  const atLocker = (st.state === 'inspect' || st.state === 'grabWait' || (game.state === 'scare' && game.scareKind === 'locker')) && st.locker;
  const facing = st.state === 'stare' || st.state === 'chase' || game.state === 'scare';
  const yawT = atLocker ? Math.atan2(-st.locker.facing.x, -st.locker.facing.z) : st.state === 'lurk' ? toP : facing ? toP : st.moveYaw;
  r.rotation.y = lerpAngle(r.rotation.y, yawT, 1 - Math.exp(-dt * 7));
  const chase = st.state === 'chase' || (game.state === 'scare' && game.scareKind === 'caught');
  const moving = st.speed > 0 && !['lurk', 'inspect', 'rip', 'grabWait', 'stare'].includes(st.state) && !(st.state === 'fakeLeave' && st.reached);
  st.anim += dt * (chase ? 7.5 : moving ? 3.0 : 0);
  const a = st.anim;
  M.torso.rotation.x = chase ? 0.42 : 0.2 + Math.sin(a * 0.5) * 0.04;
  M.torso.rotation.z = Math.sin(a) * (chase ? 0.12 : 0.07);
  M.hips.position.y = 0.55 + Math.abs(Math.sin(a)) * 0.06;
  M.legs[0].rotation.x = Math.sin(a) * 0.55; M.legs[1].rotation.x = -Math.sin(a) * 0.55;
  M.arms.forEach((arm, i) => {
    const s = i ? 1 : -1;
    if (chase) { arm.sh.rotation.x = -1.25 + Math.sin(a * 2 + i) * 0.25; arm.sh.rotation.z = s * 0.15; arm.el.rotation.x = -0.25; }
    else if (atLocker) { arm.sh.rotation.x = -0.9 - (i ? 0.2 : 0); arm.sh.rotation.z = s * 0.25; arm.el.rotation.x = -0.6; }
    else if (st.state === 'stare' || st.state === 'lurk') { arm.sh.rotation.x = Math.sin(game.t * 9 + i) * 0.02; arm.sh.rotation.z = s * 0.03; arm.el.rotation.x = -0.05; }
    else { arm.sh.rotation.x = Math.sin(a + i * Math.PI) * 0.35; arm.sh.rotation.z = s * 0.05; arm.el.rotation.x = -0.25 - Math.max(0, Math.sin(a + i * 3)) * 0.4; }
    arm.hand.children.forEach((f, j) => (f.rotation.x = -0.25 - Math.max(0, Math.sin(game.t * (st.state === 'stare' || atLocker ? 14 : 3) + j)) * 0.5));
  });
  st.twitchT -= dt;
  if (st.twitchT <= 0) { st.twitch = rand(-0.6, 0.6) * (st.state === 'stare' || atLocker ? 1.5 : 0.6); st.twitchT = rand(0.06, 1.1); }
  if (atLocker) {
    // 隙間に顔を押し当てる
    const L = st.locker, lean = game.state === 'scare' ? 1 : st.lean;
    M.torso.rotation.x = 0.2 + lean * 0.45;
    const dist = 0.95 - lean * 0.5;
    placeHead(L.center.x + L.facing.x * (0.31 + dist), 1.6 + (1 - lean) * 0.5, L.center.z + L.facing.z * (0.31 + dist), 1);
    M.head.lookAt(L.inside.x, 1.6, L.inside.z); M.head.rotateZ(st.twitch * 0.5);
    return;
  }
  M.head.lookAt(camera.position);
  M.head.rotateZ(st.twitch);
}

// ===================== FX =====================
const grainC = $('grain'), gctx = grainC.getContext('2d');
const grainFrames = [];
for (let i = 0; i < 8; i++) { const c = mkCanvas(240, 135), x = c.getContext('2d'), id = x.createImageData(240, 135); for (let j = 0; j < id.data.length; j += 4) { const v = Math.random() * 255; id.data[j] = id.data[j + 1] = id.data[j + 2] = v; id.data[j + 3] = 255; } x.putImageData(id, 0, 0); grainFrames.push(c); }
grainC.width = 240; grainC.height = 135;

const scareC = $('scare'), sctx = scareC.getContext('2d');
const faceA = mkCanvas(768, 768), faceB = mkCanvas(768, 768);
const faceRed = [], faceCyan = [];
function prepScareFaces() {
  drawFace(faceA, 0.9); drawFace(faceB, 1.0);
  for (const f of [faceA, faceB]) { faceRed.push(tinted(f, '#ff0000')); faceCyan.push(tinted(f, '#00ffff')); }
}
function drawScare(t) {
  const W = (scareC.width = innerWidth), H = (scareC.height = innerHeight);
  const fr = (t * 30) | 0;
  sctx.fillStyle = fr % 5 === 0 ? '#5a0000' : fr % 11 === 0 ? '#fff' : '#000';
  sctx.fillRect(0, 0, W, H);
  const idx = (fr >> 1) & 1, src = idx ? faceB : faceA;
  const lunge = 0.75 + Math.min(t * 6, 1) * 0.5 + Math.max(0, t - 0.2) * 0.12;
  const s = H * lunge * (1 + Math.sin(t * 95) * 0.035);
  const x = W / 2 - s / 2 + rand(-1, 1) * 30, y = H / 2 - s / 2 + rand(-1, 1) * 30 + s * 0.04;
  sctx.drawImage(src, x, y, s, s);
  sctx.globalCompositeOperation = 'lighter'; sctx.globalAlpha = 0.55;
  const o = 8 + Math.random() * 26;
  sctx.drawImage(faceRed[idx], x - o, y, s, s); sctx.drawImage(faceCyan[idx], x + o, y, s, s);
  sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 7; i++) { const sy = rand(0, H), sh = rand(4, 60); sctx.drawImage(scareC, 0, sy, W, sh, rand(-80, 80), sy, W, sh); }
  scareC.style.filter = Math.random() < 0.12 ? 'invert(1) contrast(2)' : Math.random() < 0.15 ? 'contrast(3) saturate(2)' : 'none';
  scareC.style.transform = `translate(${rand(-14, 14)}px,${rand(-14, 14)}px)`;
}

// ===================== LOCKER: PLAYER =====================
function nearLocker() {
  if (player.hidden) return null;
  const fwd = _f.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  let best = null, bd = 1.45;
  for (const L of lockers) {
    if (L.used) continue;
    const d = Math.hypot(L.front.x - player.pos.x, L.front.z - player.pos.z);
    if (d > bd) continue;
    const tx = L.center.x - player.pos.x, tz = L.center.z - player.pos.z, tl = Math.hypot(tx, tz);
    if ((tx * fwd.x + tz * fwd.z) / tl < 0.45) continue;
    best = L; bd = d;
  }
  return best;
}
function enterLocker(L) {
  if (L.corpse) return corpseEvent(L);
  player.hidden = L; player.hideT = 0; player.hideAnim = 0; player.hideDir = 1; player.air = 1; player.peek = 0;
  player.fromPos.copy(player.pos); player.fromYaw = player.yaw; player.lightWas = player.light; player.light = false;
  L.target = 1; creak(A.master, 0.25);
  // 入るところを見られていたか
  st.knows = st.los && (st.state === 'chase' || st.state === 'stare') && st.d < 18 ? L : null;
  game.susp = st.knows ? 0.6 : 0;
  later(0.55, () => { if (player.hidden === L) { L.target = 0; clank(A.master, 0.35, 0.8); A.muffle.frequency.setTargetAtTime(1300, now(), 0.1); } });
}
function exitLocker() {
  const L = player.hidden; if (!L || player.hideDir !== 1 || player.hideAnim < 1) return;
  player.hideDir = -1; L.target = 1; creak(A.master, 0.35);
  A.muffle.frequency.setTargetAtTime(20000, now(), 0.1);
}
function corpseEvent(L) {
  L.used = true; L.target = 1;
  clank(A.master, 1.2, 1.8); stinger(0.6); game.shake = 1;
  const C = CORPSE;
  C.root.visible = true; C.root.position.copy(L.center).addScaledVector(L.facing, 0.05);
  C.root.rotation.set(0, Math.atan2(L.facing.x, L.facing.z), 0);
  C.torso.rotation.x = 0.5; C.head.rotation.set(0.6, 0, 0.5);
  C.arms.forEach((a) => { a.sh.rotation.x = -0.2; a.el.rotation.x = -0.1; });
  game.corpse = { t: 0, L };
  later(0.75, () => thump(A.master, 0.9, 60, 0.4));
  later(3, () => showMsg('先客がいた', 2.5));
}

// ===================== SCARE / END =====================
function startScare(kind) {
  game.state = 'scare'; game.scareKind = kind; game.scareT = 0; game.screamed = false; game.breathed = false;
  if (document.pointerLockElement) document.exitPointerLock();
  if (AC) { A.master.gain.cancelScheduledValues(now()); A.master.gain.setValueAtTime(0, now()); A.myG.gain.setValueAtTime(0, now()); }
  if (kind === 'locker') {
    const L = player.hidden; L.target = 1; L.open = 1;
    clank(A.scare, 2.2, 1.2);
    $('slits').style.display = 'none';
    st.lean = 1;
  }
}
function showEnd(kind) {
  const e = $('end'); e.style.display = 'flex';
  const sec = game.t | 0, mm = String((sec / 60) | 0).padStart(2, '0'), ss = String(sec % 60).padStart(2, '0');
  if (kind === 'dead') {
    $('endT').textContent = '見つかった'; $('endT').style.color = '#a00';
    $('endS').textContent = `お札 ${player.keys} / 5　・　彷徨った時間 ${mm}:${ss}`;
  } else if (kind === 'win') {
    $('endT').textContent = '脱出した'; $('endT').style.color = '#cfc8b8';
    $('endS').textContent = `彷徨った時間 ${mm}:${ss}`; $('retry').style.display = 'none';
  } else {
    $('endT').textContent = '……まだ、ここにいる'; $('endT').style.color = '#a00';
    $('endS').textContent = 'ここは まだ 迷宮の中。'; $('retry').style.display = '';
  }
}

function pickup(it) {
  scene.remove(it.g); items.splice(items.indexOf(it), 1);
  if (it.type === 'battery') { player.battery = Math.min(1, player.battery + 0.45); thump(A.master, 0.12, 400, 0.08); showMsg('電池', 1.5); return; }
  player.keys++; bell(); scrape(A.master, 0.12, 0.6);
  if (st.state === 'wander' || st.state === 'hunt' || st.state === 'lurk') { st.lastKnown.copy(player.pos); st.state = 'hunt'; st.path = []; st.repath = 0; st.silent = false; }
  if (player.keys < 5) { showMsg(`お札　${player.keys} / 5`, 2.5); later(1.2, () => moan(A.stIn, 1.0)); }
  else ambush();
}
function ambush() {
  showMsg('五枚目……', 2);
  later(1.0, () => { positional(EXIT.x, 1.5, EXIT.z, (dst) => clank(dst, 1.4)); showMsg('どこかで、扉が開いた', 3); game.unlocked = true; game.unlockAt = game.t; });
  later(4.0, () => { powerDown(); game.lightsOut = true; game.blackout = 1.4; A.amb.gain.setTargetAtTime(0, now(), 0.1); });
  later(5.6, () => {
    if (game.state !== 'play') return;
    if (player.hidden) { lockerSearch([player.hidden], true); st.knows = player.hidden; return; }
    relocate(1, 3, false, true);
    st.state = 'stare'; st.stareT = 1.5; st.path = []; st.silent = false;
    A.brG.gain.setTargetAtTime(1.2, now(), 0.05);
    closeBreath(A.master);
  });
  later(6.4, () => { if (game.state === 'play' && !player.hidden) showMsg('うしろ', 1.6, true); });
  later(7.1, () => { if (game.state === 'play') { stinger(0.75); game.shake = 0.9; } A.amb.gain.setTargetAtTime(0.55, now(), 2); });
}

// ===================== MAIN UPDATE =====================
function update(dt) {
  game.t += dt;
  player.yaw = wrapA(player.yaw);
  for (let i = game.timers.length - 1; i >= 0; i--) if (game.timers[i].t <= game.t) { const tm = game.timers.splice(i, 1)[0]; tm.fn(); }
  const hid = player.hidden;

  if (game.state === 'play') {
    if (!hid) {
      let ix = input.r, iz = input.f;
      if (keys.KeyW || keys.ArrowUp) iz += 1; if (keys.KeyS || keys.ArrowDown) iz -= 1;
      if (keys.KeyD || keys.ArrowRight) ix += 1; if (keys.KeyA || keys.ArrowLeft) ix -= 1;
      const len = Math.hypot(ix, iz); if (len > 1) { ix /= len; iz /= len; }
      player.moving = len > 0.15;
      const wantSprint = (keys.ShiftLeft || keys.ShiftRight || input.sprint) && player.moving && iz > 0.2;
      player.sprinting = wantSprint && !player.exhausted;
      if (player.sprinting) { player.stamina -= dt / 5; if (player.stamina <= 0) { player.stamina = 0; player.exhausted = true; } }
      else { player.stamina = Math.min(1, player.stamina + dt / 7); if (player.exhausted && player.stamina > 0.35) player.exhausted = false; }
      const speed = player.sprinting ? 5.2 : player.exhausted ? 1.6 : 2.4;
      const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
      player.pos.x += (-sy * iz + cy * ix) * speed * dt;
      player.pos.z += (-cy * iz - sy * ix) * speed * dt;
      collide(player.pos, 0.3, true);
      if (player.moving) {
        player.bob += dt * speed * 2.3; player.stepAcc += speed * dt;
        if (player.stepAcc > (player.sprinting ? 1.6 : 1.15)) { player.stepAcc = 0; thump(A.self, player.sprinting ? 0.14 : 0.07, 95, 0.12); }
      }
      if (player.light) { player.battery -= dt / 200; if (player.battery <= 0) { player.battery = 0; player.light = false; showMsg('電池が切れた', 2); } }
      for (const it of [...items]) {
        it.g.rotation.y += dt * 0.8; it.g.position.y = (it.type === 'charm' ? 1.15 : 0.25) + Math.sin(game.t * 1.5 + it.phase) * 0.05;
        if (Math.hypot(it.x - player.pos.x, it.z - player.pos.z) < 0.9) pickup(it);
      }
      if (Math.hypot(EXIT.x - player.pos.x, EXIT.z - player.pos.z) < 1.4) {
        if (game.unlocked) { game.state = 'win'; game.winT = 0; if (document.pointerLockElement) document.exitPointerLock(); A.master.gain.setTargetAtTime(0, now(), 0.4); showEnd('win'); $('end').style.opacity = 0; }
        else if (!game.doorMsg) { game.doorMsg = true; showMsg('開かない。お札が足りない', 2.5); thump(A.master, 0.3, 120, 0.15); setTimeout(() => (game.doorMsg = false), 4000); }
      }
      // 区画
      const z = zoneW(player.pos.x, player.pos.z);
      if (z !== game.zone) { game.zone = z; if (!game.zoneSeen[z]) { game.zoneSeen[z] = true; showMsg(`── ${ZONE[z].name} ──`, 3); } }
    } else {
      // ===== ロッカーの中 =====
      player.moving = false; player.sprinting = false;
      player.hideT += dt;
      player.stamina = Math.min(1, player.stamina + dt / 5);
      player.holding = (keys.Space || input.breath) && player.air > 0 && !player.choking;
      if (player.holding) { player.air -= dt / 7; if (player.air <= 0) { player.air = 0; player.choking = true; gasp(); game.susp += 1.2; if (st.d < 12) { st.lastKnown.copy(hid.inspect); if (st.state === 'wander' || st.state === 'hunt') lockerSearch([hid], true); } } }
      else { player.air = Math.min(1, player.air + dt / 3); if (player.choking && player.air > 0.5) player.choking = false; }
      const wantPeek = (keys.KeyQ || keys.mouseR || input.peek) ? 1 : 0;
      player.peek += (wantPeek - player.peek) * (1 - Math.exp(-dt * 6));
      player.pitch = clamp(player.pitch, -0.3, 0.3);
      player.yaw = player.baseYaw + clamp(wrapA(player.yaw - player.baseYaw), -0.4, 0.4);
    }
    if (hid) {
      // 入る/出るアニメーション
      if (player.hideDir === 1 && player.hideAnim < 1) {
        player.hideAnim = Math.min(1, player.hideAnim + dt / 0.6);
        const k = player.hideAnim, e = k * k * (3 - 2 * k);
        player.pos.lerpVectors(player.fromPos, hid.inside, e); player.pos.y = 0;
        player.yaw = lerpAngle(player.fromYaw, hid.yaw, e); player.baseYaw = hid.yaw;
        if (k >= 1) player.yaw = player.baseYaw;
      } else if (player.hideDir === -1) {
        player.hideAnim = Math.max(0, player.hideAnim - dt / 0.5);
        const k = 1 - player.hideAnim;
        player.pos.lerpVectors(hid.inside, hid.front, k); player.pos.y = 0;
        if (player.hideAnim <= 0) { player.hidden = null; player.light = player.lightWas && player.battery > 0; later(0.4, () => { hid.target = 0; clank(A.master, 0.25, 0.6); }); }
      }
    }
    updateStalker(dt);
    // 気配イベント
    game.stingCD -= dt;
    game.moanT -= dt;
    if (game.moanT <= 0) { game.moanT = rand(16, 32); if (st.state === 'wander' && st.d > 8) moan(A.stIn, 1.1); }
    game.whisperT -= dt;
    if (game.whisperT <= 0) { game.whisperT = rand(25, 50); const a = player.yaw + Math.PI + rand(-1, 1); whisper(player.pos.x - Math.sin(a) * 1.2, player.pos.z - Math.cos(a) * 1.2); }
    game.knockT -= dt;
    if (game.knockT <= 0) { game.knockT = rand(30, 55); if (st.d > 6 && st.d < 20 && st.state === 'wander') for (let i = 0; i < 3; i++) thump(A.stIn, 1.0, 110, 0.12, i * 0.42 + rand(0, 0.05)); }
    if (st.d < 8 && !st.los && !st.silent && Math.random() < dt * 0.25) scrape(A.stIn, 0.6, 0.8);
    // 幻影
    game.phantomT -= dt;
    if (!hid && game.phantomT <= 0 && st.d > 14 && player.light && st.state === 'wander') {
      game.phantomT = rand(60, 110);
      const fwd = _f.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
      for (const dd of [12, 11, 10, 9, 8]) {
        const p = { x: player.pos.x + fwd.x * dd, z: player.pos.z + fwd.z * dd };
        if (!isWallW(p.x, p.z) && lineClear(player.pos, p)) {
          PH.root.position.set(p.x, 0, p.z); PH.root.rotation.y = Math.atan2(player.pos.x - p.x, player.pos.z - p.z);
          PH.torso.rotation.x = 0.25; PH.head.lookAt(camera.position); PH.head.rotateZ(0.5);
          PH.root.visible = true; game.phantomVis = 0.28; stinger(0.35); break;
        }
      }
    }
    if (game.phantomVis > 0) { game.phantomVis -= dt; if (game.phantomVis <= 0) { PH.root.visible = false; game.blackout = 0.25; } }
    // 人形
    const cf = _f.set(0, 0, -1).applyQuaternion(camera.quaternion);
    for (const dl of dolls) {
      dl.g.getWorldPosition(_v);
      const tx = _v.x - camera.position.x, tz = _v.z - camera.position.z, tl = Math.hypot(tx, tz);
      const seen = (tx * cf.x + tz * cf.z) / tl > 0.55 && tl < 16 && lineClear(camera.position, _v);
      if (!seen) {
        const want = Math.atan2(camera.position.x - _v.x, camera.position.z - _v.z) - dl.g.rotation.y;
        dl.head.rotation.y = clamp(wrapA(want), -2.6, 2.6);
        dl.head.rotation.z = 0.35;
      }
      dl.seen = seen;
    }
    game.dollT -= dt;
    if (game.dollT <= 0 && !hid) {
      game.dollT = rand(40, 70);
      const dl = pick(dolls);
      if (dl && !dl.seen) {
        const back = _v.set(Math.sin(player.yaw), 0, Math.cos(player.yaw));
        const p = { x: player.pos.x + back.x * 2.2, z: player.pos.z + back.z * 2.2 };
        if (!isWallW(p.x, p.z)) { dl.g.position.set(p.x, 0, p.z); dl.g.rotation.y = rand(0, 7); later(rand(0.5, 2), () => thump(A.master, 0.12, 300, 0.05)); }
      }
    }
  } else if (game.state === 'scare') {
    game.scareT += dt; const t = game.scareT;
    if (game.scareKind === 'caught') {
      const dx = st.pos.x - player.pos.x, dz = st.pos.z - player.pos.z;
      player.yaw = lerpAngle(player.yaw, Math.atan2(-dx, -dz), 1 - Math.exp(-dt * 20));
      player.pitch += (0.02 - player.pitch) * (1 - Math.exp(-dt * 20));
      game.shake = 1;
      if (t > 0.5 && !game.breathed) { game.breathed = true; closeBreath(); }
      if (t > 0.95 && !game.screamed) { game.screamed = true; scream(); scareC.style.display = 'block'; }
      if (t > 2.75 && !game.ended) { game.ended = true; scareC.style.display = 'none'; showEnd('dead'); }
    } else if (game.scareKind === 'locker') {
      player.pitch += (0.0 - player.pitch) * (1 - Math.exp(-dt * 20));
      game.shake = 1.2;
      if (t > 0.22 && !game.screamed) { game.screamed = true; scream(); scareC.style.display = 'block'; }
      if (t > 2.1 && !game.ended) { game.ended = true; scareC.style.display = 'none'; showEnd('dead'); }
    }
  } else if (game.state === 'win') {
    game.winT += dt;
    $('end').style.opacity = Math.min(1, game.winT / 1.5);
    if (game.winT > 5.2 && !game.screamed) { game.screamed = true; A.master.gain.setValueAtTime(0, now()); scream(1.6); scareC.style.display = 'block'; game.fakeT = 0; }
    if (game.screamed) { game.fakeT += dt; if (game.fakeT > 1.6 && !game.ended) { game.ended = true; scareC.style.display = 'none'; showEnd('fake'); } }
  }

  if (game.state === 'play' || game.state === 'scare') animStalker(dt);
  if (game.state === 'scare' && game.scareKind === 'caught') {
    M.torso.rotation.x = 0.55;
    const dx = st.pos.x - player.pos.x, dz = st.pos.z - player.pos.z, L = Math.hypot(dx, dz) || 1;
    const k = Math.min(1, game.scareT / 0.35), near = 0.85 + (1 - k) * 0.6;
    placeHead(player.pos.x + (dx / L) * near, player.eye + 0.02, player.pos.z + (dz / L) * near, 1);
    M.head.lookAt(camera.position); M.head.rotateZ(Math.sin(game.t * 40) * 0.08 + st.twitch * 0.5);
  }
  if (game.state === 'scare' && game.scareKind === 'locker') {
    M.torso.rotation.x = 0.6;
    const L = player.hidden;
    placeHead(L.inside.x + L.facing.x * 0.55, 1.62, L.inside.z + L.facing.z * 0.55, 1);
    M.head.lookAt(camera.position); M.head.rotateZ(Math.sin(game.t * 40) * 0.1);
  }

  // ロッカー扉
  for (const L of lockers) L.pivot.visible = !(L === player.hidden && game.state === 'play' && ((player.hideDir === 1 && player.hideAnim > 0.8) || (player.hideDir === -1 && player.hideAnim > 0.3)));
  if (game.state === 'scare' && game.scareKind === 'locker' && player.hidden) player.hidden.pivot.visible = true;
  for (const L of lockers) { L.open += (L.target - L.open) * (1 - Math.exp(-dt * (L.target > L.open ? 14 : 9))); L.pivot.rotation.y = -L.open * 1.85; }
  // 先客
  if (game.corpse) {
    const c = game.corpse; c.t += dt;
    const k = Math.min(1, c.t / 0.75), e = k * k;
    CORPSE.root.rotation.x = e * 1.45;
    CORPSE.root.position.copy(c.L.center).addScaledVector(c.L.facing, 0.05 + e * 0.35);
    CORPSE.root.position.y = -e * 0.05;
    if (c.t > 0.75 && !c.landed) { c.landed = true; }
    if (c.t > 8 && !c.turned && !dolls.length) c.turned = true;
    if (c.t > 6 && !c.turned) {
      // 見ていない間に、首だけこちらを向く
      CORPSE.head.getWorldPosition(_v); const cf = _f.set(0, 0, -1).applyQuaternion(camera.quaternion);
      const tx = _v.x - camera.position.x, tz = _v.z - camera.position.z, tl = Math.hypot(tx, tz);
      if ((tx * cf.x + tz * cf.z) / tl < 0.3) { c.turned = true; CORPSE.head.lookAt(camera.position); CORPSE.head.rotateZ(1.2); }
    }
  }
  for (const s of swingers) s.o.rotation.z = Math.sin(game.t * 0.9 + s.ph) * s.amp;

  // --- 恐怖値
  const d = st.d;
  let fear = clamp(1 - (d - 2) / 18, 0, 1);
  if (st.state === 'chase') fear = Math.max(fear, 0.65); else if (st.state === 'stare') fear = Math.max(fear, 0.8);
  if (st.state === 'inspect' || st.state === 'grabWait') fear = 1;
  if (st.silent && st.state !== 'grabWait') fear *= 0.5;
  if (game.state === 'scare') fear = 1;
  game.fear += (fear - game.fear) * (1 - Math.exp(-dt * (fear > game.fear ? 4 : 0.6)));
  const F = game.fear;

  // --- 懐中電灯
  let fi = player.light ? FLASH_BASE * (0.35 + 0.65 * Math.min(1, player.battery * 3)) : 0;
  if (player.light && player.battery < 0.15 && Math.random() < 0.08) fi *= rand(0, 0.4);
  if (d < 10 && st.state !== 'wander' && !st.silent && Math.random() < (1 - d / 10) * 0.25) fi *= rand(0, 0.5);
  if (game.blackout > 0) { game.blackout -= dt; fi = 0; }
  if (game.state === 'scare' && game.scareKind === 'caught') fi = game.scareT < 0.5 ? (Math.random() < 0.55 ? FLASH_BASE * 1.4 : 0) : 0;
  if (game.state === 'scare' && game.scareKind === 'locker') fi = Math.random() < 0.5 ? FLASH_BASE * 1.2 : 0;
  if (hid && game.state === 'play') { flash.color.setHex(0x8a9ac0); fi = (game.lightsOut ? 9 : 16) * (0.9 + Math.sin(game.t * 1.3) * 0.1); beamMat.uniforms.uI.value = 0; dustMat.opacity = 0; }
  else { flash.color.setHex(0xfff0d2); beamMat.uniforms.uI.value = fi / FLASH_BASE; dustMat.opacity = 0.45 * (fi / FLASH_BASE); }
  flash.intensity = fi;
  for (let i = 0; i < dustN; i++) {
    const v = dustVel[i]; dustPos[i * 3] += v[0] * dt; dustPos[i * 3 + 1] += v[1] * dt; dustPos[i * 3 + 2] += v[2] * dt;
    const zz = dustPos[i * 3 + 2]; if (Math.hypot(dustPos[i * 3] - 0.2, dustPos[i * 3 + 1] + 0.15) > Math.abs(zz) * 0.45 || zz > -0.8 || zz < -5) dustSpawn(i);
  }
  dustGeo.attributes.position.needsUpdate = true;
  const zf = ZONE[game.zone];
  scene.fog.density += (zf.fog + (game.lightsOut ? 0.01 : 0) - scene.fog.density) * (1 - Math.exp(-dt * 0.8));
  scene.fog.color.lerp(_fogC.setHex(zf.fogC), 1 - Math.exp(-dt));
  hemi.intensity = game.state === 'scare' && (game.scareT > 0.5 || game.scareKind === 'locker') ? 0 : hid ? (game.lightsOut ? 1.2 : 2.0) : game.lightsOut ? 0.35 : 0.7;
  renderer.toneMappingExposure = (hid ? 1.7 : 1.35) * (Math.random() < 0.015 ? 0.85 : 1);

  // --- 電球・蝋燭
  for (const b of bulbs) {
    if (game.lightsOut) { b.light.intensity = 0; b.mat.color.setHex(0x110805); continue; }
    const sd = Math.hypot(b.x - st.pos.x, b.z - st.pos.z);
    let v = b.base * (0.85 + 0.15 * Math.sin(game.t * 23 + b.phase) * Math.sin(game.t * 3.1 + b.phase));
    if (Math.random() < 0.01) v *= 0.1;
    if (sd < 8 && !st.silent) v *= Math.random() < (1 - sd / 8) ? rand(0, 0.3) : 1;
    b.light.intensity = v; b.mat.color.copy(b.col).multiplyScalar(v / 3);
  }
  for (const c of candleLights) c.intensity = game.lightsOut ? 0 : 1.6 + Math.sin(game.t * 13) * 0.25 + Math.sin(game.t * 31) * 0.2 + (Math.random() < 0.02 ? -1 : 0);
  if (game.unlocked) exitLight.intensity = 2.2 * (0.8 + 0.2 * Math.sin(game.t * 17) * Math.sin(game.t * 2.3));

  // --- カメラ
  game.shake *= Math.exp(-dt * 4);
  const sh = game.shake * 0.04 + F * 0.004;
  const bobY = player.moving && game.state === 'play' ? Math.sin(player.bob) * (player.sprinting ? 0.07 : 0.04) : 0;
  const peekF = hid ? player.peek * 0.12 : 0;
  const breathY = hid && !player.holding ? Math.sin(game.t * (2 + F * 3)) * 0.006 : 0;
  camera.position.set(player.pos.x - Math.sin(player.yaw) * peekF + rand(-sh, sh), (hid ? 1.6 : player.eye) + bobY + breathY + rand(-sh, sh), player.pos.z - Math.cos(player.yaw) * peekF + rand(-sh, sh));
  camera.rotation.set(player.pitch + rand(-sh, sh) * 0.5, player.yaw, Math.sin(player.bob * 0.5) * (player.moving ? 0.008 : 0) + rand(-sh, sh) * 0.6);
  const fovT = 72 + (player.sprinting ? 7 : 0) + (st.state === 'chase' ? F * 6 : 0) - (game.state === 'scare' ? 14 : 0) - (hid ? 6 + player.peek * 10 : 0);
  camera.fov += (fovT - camera.fov) * (1 - Math.exp(-dt * 5)); camera.updateProjectionMatrix();

  // --- スリット
  const sl = $('slits');
  if (hid && game.state === 'play') {
    const vis = player.hideDir === 1 ? clamp((player.hideAnim - 0.75) * 4, 0, 1) : player.hideAnim;
    sl.style.display = 'block'; sl.style.opacity = vis;
    const bar = 15 - player.peek * 6;
    sl.style.setProperty('--bar', bar + 'px');
    sl.style.setProperty('--win', 48 + player.peek * 14 + 'vw');
  } else if (game.state !== 'scare') sl.style.display = 'none';

  // --- オーディオ
  if (AC) {
    const L = AC.listener, p = camera.position;
    _f.set(0, 0, -1).applyQuaternion(camera.quaternion); _u.set(0, 1, 0).applyQuaternion(camera.quaternion);
    if (L.positionX) { L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z; L.forwardX.value = _f.x; L.forwardY.value = _f.y; L.forwardZ.value = _f.z; L.upX.value = _u.x; L.upY.value = _u.y; L.upZ.value = _u.z; }
    else { L.setPosition(p.x, p.y, p.z); L.setOrientation(_f.x, _f.y, _f.z, _u.x, _u.y, _u.z); }
    setPos(A.pan, st.pos.x, 1.7, st.pos.z);
    st.lpf += ((st.los || st.state === 'inspect' ? 7000 : 520) - st.lpf) * (1 - Math.exp(-dt * 5));
    A.stLP.frequency.value = st.lpf;
    A.radioLP.frequency.value = lineClear(player.pos, radioPos) ? 4000 : 700;
    if (game.state === 'play') {
      A.dread.gain.setTargetAtTime(F * F * 0.055, now(), 0.2);
      A.high.gain.setTargetAtTime(st.state === 'stare' || st.state === 'inspect' ? 0.05 : st.state === 'chase' ? F * 0.015 : 0, now(), 0.3);
      A.grG.gain.setTargetAtTime(st.state === 'chase' ? 0.55 : st.state === 'stare' ? 0.9 : st.state === 'inspect' ? 0.35 : 0, now(), 0.25);
      A.deep.gain.setTargetAtTime(game.zone === 2 ? 0.12 : 0, now(), 1.5);
      A.windBP.frequency.value = 700 + Math.sin(game.t * 0.13) * 300;
      A.breathT -= dt;
      if (A.breathT <= 0) {
        const insp = st.state === 'inspect';
        const len = st.state === 'chase' ? 0.85 : st.state === 'stare' || insp ? 1.5 : 2.6, v = st.silent ? 0 : st.state === 'chase' ? 0.9 : st.state === 'stare' ? 1.1 : insp ? 1.4 : 0.4, t = now();
        A.breathT = len;
        A.brG.gain.cancelScheduledValues(t); A.brG.gain.setValueAtTime(0.001, t);
        A.brG.gain.linearRampToValueAtTime(v * 0.55, t + len * 0.35); A.brG.gain.linearRampToValueAtTime(0.02, t + len * 0.45);
        A.brG.gain.linearRampToValueAtTime(v, t + len * 0.6); A.brG.gain.linearRampToValueAtTime(0.001, t + len * 0.98);
        A.brBP.frequency.setValueAtTime(380, t); A.brBP.frequency.linearRampToValueAtTime(900, t + len * 0.4); A.brBP.frequency.linearRampToValueAtTime(520, t + len);
      }
      // 自分の息（隠れているときだけ聞こえる）
      A.myT -= dt;
      if (A.myT <= 0) {
        const len = 2.4 - F * 1.4, t = now(), v = hid && !player.holding ? 0.05 + F * 0.1 : 0;
        A.myT = len; A.myG.gain.cancelScheduledValues(t); A.myG.gain.setValueAtTime(0.001, t);
        A.myG.gain.linearRampToValueAtTime(v * 0.6, t + len * 0.4); A.myG.gain.linearRampToValueAtTime(v, t + len * 0.7); A.myG.gain.linearRampToValueAtTime(0.001, t + len * 0.98);
      }
      if (player.holding) A.myG.gain.setTargetAtTime(0, now(), 0.05);
      game.hbT -= dt;
      if (game.hbT <= 0 && (F > 0.15 || hid)) { game.hbT = 60 / (62 + F * 110); heartbeat((0.15 + F * 0.55) * (hid && player.holding ? 1.5 : 1)); }
      // ラジオ
      const rd = Math.hypot(radioPos.x - player.pos.x, radioPos.z - player.pos.z);
      if (rd < 2.6 && radio.silentT <= 0 && !hid) { radio.silentT = 25; A.radioStatic.gain.setValueAtTime(0.25, now()); A.radioStatic.gain.setTargetAtTime(0, now() + 0.15, 0.05); }
      if (radio.silentT > 0) { radio.silentT -= dt; if (radio.silentT <= 0) A.radioStatic.gain.setTargetAtTime(0.02, now(), 1); }
      else {
        radio.t -= dt; radio.warble = 1 + Math.sin(game.t * 0.7) * 0.012 - (Math.sin(game.t * 0.11) > 0.8 ? 0.06 : 0);
        if (radio.t <= 0) { musicNote(SCALE[melody[radio.i]] - 12 * (radio.i % 16 > 11 ? 1 : 0)); radio.i = (radio.i + 1) % melody.length; radio.t = 0.42 * (radio.i % 8 === 0 ? 2.2 : 1) / radio.warble; }
      }
      for (const dr of drips) { dr.t -= dt; if (dr.t <= 0) { dr.t = rand(1.2, 4.5); if (Math.hypot(dr.x - player.pos.x, dr.z - player.pos.z) < 22) drip(dr.p); } }
    } else {
      for (const g of [A.dread, A.high, A.grG, A.brG, A.myG]) g.gain.setTargetAtTime(0, now(), 0.05);
    }
  }

  // --- 画面効果
  $('keysHud').style.display = $('bars').style.display = game.state === 'play' ? '' : 'none';
  $('vig').style.opacity = hid ? 0.35 : 0.75 + F * 0.25;
  const pulse = Math.max(0, Math.sin(game.t * (2 + F * 7)));
  $('blood').style.opacity = st.state === 'chase' || st.state === 'stare' ? F * 0.35 * (0.6 + 0.4 * pulse) : F * 0.12;
  grainC.style.opacity = 0.1 + F * 0.22;
  gctx.drawImage(pick(grainFrames), 0, 0);
  $('stam').style.width = player.stamina * 100 + '%';
  $('stam').style.background = player.exhausted ? '#7a1a1a' : '#d8d2c0';
  $('batt').style.width = player.battery * 100 + '%';
  $('airB').style.display = hid ? '' : 'none';
  $('air').style.width = player.air * 100 + '%';
  $('air').style.background = player.choking ? '#7a1a1a' : '#8fb0c8';
  $('keysHud').textContent = '札　' + '■'.repeat(player.keys) + '□'.repeat(5 - player.keys);
  // 操作ヒント
  const near = game.state === 'play' && !hid ? nearLocker() : null;
  const pr = $('prompt');
  const chased = st.state === 'chase' || st.state === 'stare';
  if (near) pr.textContent = isTouch ? '' : '［E］ 隠れる';
  else if (hid && player.hideAnim >= 1 && player.hideDir === 1) pr.textContent = isTouch ? '' : '［E］出る　［Space］息　［Q］覗く';
  else pr.textContent = '';
  pr.classList.toggle('hot', !!near && chased);
  if (game.state === 'play') {
    if (game.t > 2 && game.t < 30 && !player.moved) G('move', 'WASD で移動　マウスで見回す', '左で移動　右で見回す', 5);
    if (player.moving) player.moved = true;
    if (game.t > 12 && player.moved && !guideSeen.goal) G('goal', '赤く光る お札を探せ　近づけば剥がせる', '赤く光る お札を探せ　近づけば剥がせる', 4);
    if (!hid && chased) G('run', 'Shift で走れ', '「走」を押しっぱなしで走れ', 3, 40);
    if (!hid && chased && near) G('hidenow', '［E］でロッカーに隠れろ', '「隠」でロッカーに隠れろ', 3, 30);
    if (!hid && player.exhausted && st.state === 'chase') G('tired', '息が切れた ── 隠れる場所を探せ', '息が切れた ── 隠れる場所を探せ', 3, 40);
    if (hid && player.hideAnim >= 1 && player.hideDir === 1) G('inlocker', 'Space 長押しで息を止める　Q / 右クリックで覗く　E で出る', '「息」長押しで息を止める　「覗」で覗く　「出」で出る', 6);
    if (hid && st.d < 7 && !player.holding && !player.choking) G('hold', '近い…… 息を止めろ（Space）', '近い…… 「息」で息を止めろ', 2.5, 15);
    if (hid && player.holding && player.air < 0.3) G('air', 'もう、限界……', 'もう、限界……', 1.5, 12);
    if (hid && st.d > 18 && player.hideT > 25) G('leave', '……遠ざかった気がする　E で出る', '……遠ざかった気がする　「出」で出る', 3, 60);
    if (!hid && player.light && player.battery < 0.25) G('batt', '電池が少ない　F で消して節約できる', '電池が少ない　「灯」で消して節約できる', 4, 90);
    if (!hid && !player.light && player.battery > 0 && game.t > 10 && !chased) G('lightoff', 'F で懐中電灯', '「灯」で懐中電灯', 3, 60);
    if (!hid && near && !chased) G('locker', '［E］ロッカーに隠れられる', '「隠」でロッカーに隠れられる', 3);
    if (game.unlocked && !hid && !chased && game.t - (game.unlockAt || game.t) > 12) G('exit', '出口の扉が開いている　急げ', '出口の扉が開いている　急げ', 4);
  }
  if (isTouch) {
    $('bHide').style.display = near || (hid && player.hideDir === 1) ? 'flex' : 'none';
    $('bHide').textContent = hid ? '出' : '隠';
    $('bBreath').style.display = $('bPeek').style.display = hid ? 'flex' : 'none';
    $('bRun').style.display = hid ? 'none' : 'flex';
  }
  if (scareC.style.display === 'block') drawScare(game.state === 'win' ? game.fakeT : game.scareKind === 'locker' ? game.scareT - 0.22 : game.scareT - 0.95);
}

// ===================== INPUT =====================
function toggleHide() {
  if (game.state !== 'play') return;
  if (player.hidden) exitLocker();
  else { const L = nearLocker(); if (L && !(st.d < 1.6 && st.state === 'chase')) enterLocker(L); }
}
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
  if (e.code === 'KeyF' && game.state === 'play' && player.battery > 0 && !player.hidden) { player.light = !player.light; thump(A.self, 0.08, 800, 0.03); }
  if (e.code === 'KeyE' && !e.repeat) toggleHide();
});
addEventListener('keyup', (e) => (keys[e.code] = false));
let mouseDown = false;
addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('mousedown', (e) => {
  if (e.button === 2) { keys.mouseR = true; return; }
  mouseDown = true;
  if (game.state === 'play' && !document.pointerLockElement && !isTouch && !game.paused) tryLock();
});
addEventListener('mouseup', (e) => { if (e.button === 2) keys.mouseR = false; else mouseDown = false; });
function tryLock() {
  const fail = () => { if (!game.noLock) { game.noLock = true; showMsg('ドラッグで視点を動かせます', 3); } };
  const plain = () => { try { const r = renderer.domElement.requestPointerLock(); if (r && r.catch) r.catch(fail); } catch (e) { fail(); } };
  try {
    // OSのマウス加速を通さない生の値を使う（Chromeの視点飛びを防ぐ）
    const r = renderer.domElement.requestPointerLock({ unadjustedMovement: true });
    if (r && r.catch) r.catch(plain); else if (!r) {}
  } catch (e) { plain(); }
}
let lockAt = 0;
addEventListener('mousemove', (e) => {
  if (game.state !== 'play' || !(document.pointerLockElement || (game.noLock && mouseDown))) return;
  let mx = e.movementX || 0, my = e.movementY || 0;
  // ロック直後の1発目と、明らかに異常な跳ね値は捨てる
  if (performance.now() - lockAt < 120) return;
  if (Math.abs(mx) > 250 || Math.abs(my) > 250) return;
  player.yaw = wrapA(player.yaw - mx * 0.0022); player.pitch = clamp(player.pitch - my * 0.0022, -1.3, 1.3);
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement) { game.hadLock = true; lockAt = performance.now(); return; }
  if (game.hadLock && game.state === 'play' && !isTouch) { game.paused = true; $('pause').style.display = 'flex'; AC && AC.suspend(); }
});
$('pause').addEventListener('click', () => { tryLock(); game.paused = false; $('pause').style.display = 'none'; AC && AC.resume(); });

if (isTouch) {
  const layer = $('touch'), knob = $('knob');
  layer.style.display = 'block';
  const joy = { id: null, ox: 0, oy: 0 }, look = { id: null, lx: 0, ly: 0 };
  layer.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) {
      if (t.target.closest('.tbtn')) continue;
      if (t.clientX < innerWidth * 0.45 && joy.id === null && !player.hidden) { joy.id = t.identifier; joy.ox = t.clientX; joy.oy = t.clientY; knob.style.display = 'block'; knob.style.left = t.clientX - 55 + 'px'; knob.style.top = t.clientY - 55 + 'px'; }
      else if (look.id === null) { look.id = t.identifier; look.lx = t.clientX; look.ly = t.clientY; }
    }
    e.preventDefault();
  }, { passive: false });
  layer.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === joy.id) {
        const dx = clamp((t.clientX - joy.ox) / 50, -1, 1), dy = clamp((t.clientY - joy.oy) / 50, -1, 1);
        input.r = dx; input.f = -dy; knob.firstElementChild.style.transform = `translate(${dx * 35}px,${dy * 35}px)`;
      } else if (t.identifier === look.id && game.state === 'play') {
        const tdx = t.clientX - look.lx, tdy = t.clientY - look.ly;
        if (Math.abs(tdx) < 160 && Math.abs(tdy) < 160) { player.yaw = wrapA(player.yaw - tdx * 0.006); player.pitch = clamp(player.pitch - tdy * 0.006, -1.3, 1.3); }
        look.lx = t.clientX; look.ly = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });
  const end = (e) => { for (const t of e.changedTouches) { if (t.identifier === joy.id) { joy.id = null; input.r = input.f = 0; knob.style.display = 'none'; knob.firstElementChild.style.transform = ''; } if (t.identifier === look.id) look.id = null; } };
  layer.addEventListener('touchend', end); layer.addEventListener('touchcancel', end);
  const hold = (id, key) => { const b = $(id); b.addEventListener('touchstart', (e) => { input[key] = true; e.preventDefault(); }, { passive: false }); b.addEventListener('touchend', () => (input[key] = false)); b.addEventListener('touchcancel', () => (input[key] = false)); };
  hold('bRun', 'sprint'); hold('bBreath', 'breath'); hold('bPeek', 'peek');
  $('bLight').addEventListener('touchstart', (e) => { if (game.state === 'play' && player.battery > 0 && !player.hidden) player.light = !player.light; e.preventDefault(); }, { passive: false });
  $('bHide').addEventListener('touchstart', (e) => { toggleHide(); e.preventDefault(); }, { passive: false });
}

$('start').addEventListener('click', () => {
  initAudio();
  prepScareFaces();
  $('title').style.display = 'none';
  if (isTouch) { document.documentElement.requestFullscreen?.().catch(() => {}); }
  else tryLock();
  game.state = 'play'; game.t = 0;
  later(1.5, () => showMsg('お札を五枚集め、出口の扉へ', 4));
  later(7, () => moan(A.stIn, 1.3));
  st.goal.copy(wanderGoal());
});
$('retry').addEventListener('click', () => location.reload());
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// ===================== LOOP =====================
const clock = new THREE.Clock();
camera.position.set(player.pos.x, player.eye, player.pos.z);
camera.rotation.set(0, player.yaw, 0);
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!game.paused && game.state !== 'title') update(dt);
  else if (game.state === 'title') { camera.rotation.set(Math.sin(performance.now() / 3000) * 0.05, player.yaw + Math.sin(performance.now() / 5000) * 0.2, 0); flash.intensity = FLASH_BASE * 0.6 * (Math.random() < 0.04 ? 0.2 : 1); beamMat.uniforms.uI.value = 0.6; }
  renderer.render(scene, camera);
}
loop();
window.__dbg = { game, st, player, startScare, M, items, lockers, enterLocker, exitLocker, dolls, halls };
