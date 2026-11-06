// Generates assets/scene.svg — the painted-look London-at-night backdrop.
// Original, procedural artwork (seeded, so the output is reproducible).
//   node tools/build-scene.js
const fs = require('fs'), path = require('path');

let seed = 20261106;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const R = (a, b) => a + rnd() * (b - a);
const RI = (a, b) => Math.floor(R(a, b + 1));
const f = n => Math.round(n * 10) / 10;

const W = 1920, H = 1080, HORIZON = 800;
const out = [];
const add = s => out.push(s);

add(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">`);
add(`<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#050813"/><stop offset=".35" stop-color="#0d1c33"/>
    <stop offset=".62" stop-color="#1f4254"/><stop offset=".8" stop-color="#5a5a4c"/><stop offset="1" stop-color="#a5703a"/>
  </linearGradient>
  <radialGradient id="moonGlow"><stop offset="0" stop-color="#f4ead0" stop-opacity=".55"/><stop offset=".35" stop-color="#9fc0cc" stop-opacity=".18"/><stop offset="1" stop-color="#9fc0cc" stop-opacity="0"/></radialGradient>
  <radialGradient id="lampGlow"><stop offset="0" stop-color="#ffd98a" stop-opacity=".95"/><stop offset=".18" stop-color="#e9a948" stop-opacity=".55"/><stop offset=".55" stop-color="#c4602b" stop-opacity=".16"/><stop offset="1" stop-color="#c4602b" stop-opacity="0"/></radialGradient>
  <radialGradient id="haze" cx=".5" cy="1" r=".9"><stop offset="0" stop-color="#d79a52" stop-opacity=".55"/><stop offset="1" stop-color="#d79a52" stop-opacity="0"/></radialGradient>
  <linearGradient id="street" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#27323a"/><stop offset=".4" stop-color="#131a22"/><stop offset="1" stop-color="#06080d"/></linearGradient>
  <linearGradient id="reflect" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd07a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd07a" stop-opacity="0"/></linearGradient>
  <linearGradient id="towerShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a2f42"/><stop offset="1" stop-color="#0d1927"/></linearGradient>
  <filter id="rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".018 .03" numOctaves="3" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="rough2"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="blur4"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="blur10"><feGaussianBlur stdDeviation="10"/></filter>
  <filter id="blur30" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="30"/></filter>
  <filter id="cloud" x="-20%" y="-50%" width="140%" height="200%"><feTurbulence type="fractalNoise" baseFrequency=".008 .02" numOctaves="4" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="60" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="14"/></filter>
</defs>`);

// ---- sky ----
add(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);
// brushy cloud strokes
add(`<g filter="url(#cloud)">`);
for (let i = 0; i < 14; i++) {
  const y = R(60, 560), x = R(-200, W - 200), w = R(380, 900), h = R(26, 70);
  const col = rnd() < .45 ? '#5f8798' : '#1b3350';
  add(`<ellipse cx="${f(x + w / 2)}" cy="${f(y)}" rx="${f(w / 2)}" ry="${f(h / 2)}" fill="${col}" opacity="${f(R(.18, .42))}" transform="rotate(${f(R(-4, 5))} ${f(x)} ${f(y)})"/>`);
}
add(`</g>`);
// moon
add(`<circle cx="1500" cy="200" r="340" fill="url(#moonGlow)"/>`);
add(`<circle cx="1500" cy="200" r="64" fill="#f1e7cb"/>`);
add(`<circle cx="1480" cy="188" r="14" fill="#d7cba8" opacity=".6"/><circle cx="1522" cy="222" r="10" fill="#d7cba8" opacity=".5"/><circle cx="1514" cy="176" r="7" fill="#d7cba8" opacity=".45"/>`);
// a thin cloud across the moon
add(`<ellipse cx="1500" cy="215" rx="260" ry="20" fill="#27425a" opacity=".55" filter="url(#blur10)"/>`);
// stars
for (let i = 0; i < 70; i++) add(`<circle cx="${f(R(0, W))}" cy="${f(R(0, 420))}" r="${f(R(.6, 1.7))}" fill="#fff" opacity="${f(R(.15, .65))}"/>`);
// horizon haze
add(`<rect x="0" y="${HORIZON - 300}" width="${W}" height="420" fill="url(#haze)"/>`);

// ---- far skyline (hazy, blue) ----
function skyline(baseY, color, opacity, minH, maxH, step, filterId, skip) {
  let g = `<g fill="${color}" opacity="${opacity}" ${filterId ? `filter="url(#${filterId})"` : ''}>`;
  let x = -40;
  while (x < W + 40) {
    const w = R(step * .6, step * 1.5), h = R(minH, maxH);
    if (!(skip && x > skip[0] && x < skip[1])) {
      g += `<rect x="${f(x)}" y="${f(baseY - h)}" width="${f(w)}" height="${f(h + 60)}"/>`;
      const r = rnd();
      if (r < .3) g += `<polygon points="${f(x - 3)},${f(baseY - h)} ${f(x + w / 2)},${f(baseY - h - R(18, 46))} ${f(x + w + 3)},${f(baseY - h)}"/>`;
      else if (r < .6) g += `<rect x="${f(x + w * .2)}" y="${f(baseY - h - R(14, 34))}" width="${f(R(6, 12))}" height="${f(R(16, 36))}"/>`;
    }
    x += w + R(0, step * .3);
  }
  return g + `</g>`;
}
add(skyline(HORIZON + 10, '#27475c', .8, 50, 150, 70, 'blur4', [250, 640]));

// Tower-Bridge-ish landmark (left-centre)
add(`<g filter="url(#rough2)">`);
[[330], [580]].forEach(([x]) => {
  add(`<rect x="${x - 38}" y="${HORIZON - 300}" width="76" height="330" fill="url(#towerShade)"/>`);
  add(`<polygon points="${x - 44},${HORIZON - 300} ${x},${HORIZON - 380} ${x + 44},${HORIZON - 300}" fill="#16293a"/>`);
  [[-34, -300], [28, -300]].forEach(([dx, dy]) => add(`<polygon points="${x + dx},${HORIZON + dy} ${x + dx + 6},${HORIZON + dy - 44} ${x + dx + 12},${HORIZON + dy}" fill="#16293a"/>`));
  for (let r = 0; r < 4; r++) add(`<rect x="${x - 6}" y="${HORIZON - 270 + r * 52}" width="12" height="26" rx="6" fill="#e9a948" opacity="${f(R(.45, .9))}"/>`);
});
add(`<rect x="${330 + 38}" y="${HORIZON - 190}" width="${580 - 330 - 76}" height="16" fill="#142536"/>`);
add(`<rect x="${330 + 38}" y="${HORIZON - 70}" width="${580 - 330 - 76}" height="14" fill="#142536"/>`);
add(`<path d="M${330 - 38} ${HORIZON - 40} Q ${150} ${HORIZON - 120} -20 ${HORIZON - 20} M${580 + 38} ${HORIZON - 40} Q ${760} ${HORIZON - 120} 900 ${HORIZON - 20}" stroke="#1a3044" stroke-width="7" fill="none"/>`);
add(`</g>`);

// Clock tower landmark (right-centre)
const TX = 1180;
add(`<g filter="url(#rough2)">`);
add(`<rect x="${TX - 46}" y="${HORIZON - 440}" width="92" height="480" fill="url(#towerShade)"/>`);
add(`<rect x="${TX - 56}" y="${HORIZON - 470}" width="112" height="42" fill="#16293a"/>`);
add(`<polygon points="${TX - 52},${HORIZON - 470} ${TX},${HORIZON - 640} ${TX + 52},${HORIZON - 470}" fill="#15283a"/>`);
add(`<rect x="${TX - 2}" y="${HORIZON - 690}" width="4" height="52" fill="#15283a"/>`);
[-52, 52].forEach(dx => add(`<polygon points="${TX + dx - 9},${HORIZON - 470} ${TX + dx},${HORIZON - 520} ${TX + dx + 9},${HORIZON - 470}" fill="#15283a"/>`));
for (let i = 0; i < 5; i++) add(`<rect x="${TX - 10}" y="${HORIZON - 250 + i * 50}" width="20" height="30" rx="10" fill="#e9a948" opacity="${f(R(.3, .8))}"/>`);
add(`</g>`);
add(`<circle cx="${TX}" cy="${HORIZON - 385}" r="120" fill="url(#lampGlow)" opacity=".5"/>`);
add(`<circle cx="${TX}" cy="${HORIZON - 385}" r="34" fill="#ffe0a0"/><circle cx="${TX}" cy="${HORIZON - 385}" r="34" fill="none" stroke="#3a2a14" stroke-width="4"/>`);
add(`<path d="M${TX} ${HORIZON - 385} L${TX} ${HORIZON - 408} M${TX} ${HORIZON - 385} L${TX + 15} ${HORIZON - 378}" stroke="#2a1d0c" stroke-width="4" stroke-linecap="round"/>`);

// ---- mid skyline: terraces with lit windows ----
function terraces(baseY, color, minH, maxH, step, skip, litChance) {
  let g = `<g filter="url(#rough)">`, wins = '';
  let x = -30;
  while (x < W + 30) {
    const w = R(step * .7, step * 1.4), h = R(minH, maxH);
    if (!(skip && x + w > skip[0] && x < skip[1])) {
      g += `<rect x="${f(x)}" y="${f(baseY - h)}" width="${f(w)}" height="${f(h + 40)}" fill="${color}"/>`;
      if (rnd() < .6) g += `<polygon points="${f(x - 4)},${f(baseY - h)} ${f(x + w / 2)},${f(baseY - h - R(26, 60))} ${f(x + w + 4)},${f(baseY - h)}" fill="${color}"/>`;
      const chim = RI(0, 2);
      for (let c = 0; c < chim; c++) g += `<rect x="${f(x + R(6, w - 16))}" y="${f(baseY - h - R(30, 70))}" width="${f(R(9, 15))}" height="${f(R(24, 50))}" fill="${color}"/>`;
      const cols = Math.max(1, Math.floor(w / 30)), rows = Math.max(1, Math.floor(h / 42));
      for (let cx = 0; cx < cols; cx++) for (let ry = 0; ry < rows; ry++) {
        const wx = x + 10 + cx * (w - 20) / cols + 3, wy = baseY - h + 14 + ry * 42;
        const lit = rnd() < litChance;
        wins += `<rect x="${f(wx)}" y="${f(wy)}" width="14" height="22" rx="1.5" fill="${lit ? (rnd() < .7 ? '#f2b556' : '#d8763a') : '#0a1019'}" opacity="${lit ? f(R(.55, 1)) : .55}"/>`;
      }
    }
    x += w + R(2, step * .25);
  }
  return g + `</g><g>${wins}</g>`;
}
add(terraces(HORIZON + 60, '#0e1a29', 110, 250, 120, [700, 1090], .16));

// ---- street ----
add(`<rect x="0" y="${HORIZON + 40}" width="${W}" height="${H - HORIZON}" fill="url(#street)"/>`);
// perspective lines + cobbles
const VPX = 960, VPY = HORIZON + 40;
let rows = 0, y = VPY + 6, gap = 6;
add(`<g filter="url(#rough2)" opacity=".85">`);
while (y < H + 20) {
  const depth = (y - VPY) / (H - VPY);
  const sw = 14 + depth * 130, sh = 5 + depth * 30;
  let x = -((rows % 2) * sw / 2) - R(0, sw);
  while (x < W + sw) {
    const shade = RI(16, 40);
    add(`<rect x="${f(x)}" y="${f(y)}" width="${f(sw - 3)}" height="${f(sh - 2)}" rx="${f(sh * .3)}" fill="rgb(${shade},${shade + 8},${shade + 14})" opacity="${f(R(.45, .95))}"/>`);
    x += sw;
  }
  y += sh; rows++;
}
add(`</g>`);
// wet reflections of lit windows + lamps
add(`<g filter="url(#blur4)">`);
for (let i = 0; i < 46; i++) {
  const x = R(0, W), h = R(60, 240);
  add(`<rect x="${f(x)}" y="${VPY + 10}" width="${f(R(5, 16))}" height="${f(h)}" fill="url(#reflect)" opacity="${f(R(.15, .42))}"/>`);
}
add(`</g>`);
add(`<ellipse cx="960" cy="${VPY + 30}" rx="900" ry="46" fill="#d79a52" opacity=".12" filter="url(#blur30)"/>`);

// ---- gas lamps ----
function lamp(x, topY, scale, glowR) {
  const pw = 16 * scale, hgt = H - topY;
  add(`<circle cx="${x}" cy="${topY + 20 * scale}" r="${glowR}" fill="url(#lampGlow)"/>`);
  add(`<g filter="url(#rough2)">`);
  add(`<rect x="${f(x - pw / 2)}" y="${topY + 70 * scale}" width="${f(pw)}" height="${hgt}" fill="#04060a"/>`);
  add(`<rect x="${f(x - pw)}" y="${topY + 150 * scale}" width="${f(pw * 2)}" height="${f(12 * scale)}" fill="#04060a"/>`);
  add(`<rect x="${f(x - pw * 1.6)}" y="${H - 60 * scale}" width="${f(pw * 3.2)}" height="${f(60 * scale)}" fill="#04060a"/>`);
  add(`<polygon points="${f(x - 36 * scale)},${f(topY + 70 * scale)} ${f(x + 36 * scale)},${f(topY + 70 * scale)} ${f(x + 24 * scale)},${f(topY - 30 * scale)} ${f(x - 24 * scale)},${f(topY - 30 * scale)}" fill="#ffd98a"/>`);
  add(`<polygon points="${f(x - 44 * scale)},${f(topY - 28 * scale)} ${f(x)},${f(topY - 70 * scale)} ${f(x + 44 * scale)},${f(topY - 28 * scale)}" fill="#04060a"/>`);
  add(`<rect x="${f(x - 5 * scale)}" y="${f(topY - 84 * scale)}" width="${f(10 * scale)}" height="${f(16 * scale)}" fill="#04060a"/>`);
  add(`<path d="M${f(x - 24 * scale)} ${f(topY - 30 * scale)} L${f(x - 24 * scale)} ${f(topY + 70 * scale)} M${f(x + 24 * scale)} ${f(topY - 30 * scale)} L${f(x + 24 * scale)} ${f(topY + 70 * scale)} M${x} ${f(topY - 30 * scale)} L${x} ${f(topY + 70 * scale)}" stroke="#4b3414" stroke-width="${f(3 * scale)}"/>`);
  add(`</g>`);
  // street reflection
  add(`<rect x="${f(x - 14 * scale)}" y="${H - 220 * scale - 30}" width="${f(28 * scale)}" height="${f(220 * scale)}" fill="url(#reflect)" opacity=".5" filter="url(#blur4)"/>`);
}
lamp(1010, 560, .32, 150);
lamp(1450, 440, .55, 260);
lamp(260, 150, 1.15, 560);

// ---- right-hand wall / doorway ----
add(`<g filter="url(#rough)"><polygon points="1710,${H} 1710,420 1920,300 1920,${H}" fill="#06090f"/></g>`);
for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) add(`<rect x="${1745 + c * 90}" y="${470 + r * 130}" width="48" height="84" rx="3" fill="${(r + c) % 3 === 0 ? '#f2b556' : '#0c131c'}" opacity="${(r + c) % 3 === 0 ? .85 : .9}"/>`);
add(`<path d="M1710 ${H} L1710 420" stroke="#2a3a48" stroke-width="3" opacity=".6"/>`);

// ---- brush streaks over everything (painterly) ----
add(`<g opacity=".1" filter="url(#blur4)">`);
for (let i = 0; i < 90; i++) {
  const x = R(-100, W), yy = R(0, H), len = R(120, 520);
  add(`<line x1="${f(x)}" y1="${f(yy)}" x2="${f(x + len)}" y2="${f(yy + R(-12, 12))}" stroke="${rnd() < .5 ? '#d9a441' : '#7fb0bd'}" stroke-width="${f(R(3, 14))}" stroke-linecap="round"/>`);
}
add(`</g>`);
add(`</svg>`);

const file = path.join(__dirname, '..', 'assets', 'scene.svg');
fs.writeFileSync(file, out.join('\n'));
console.log('wrote', file, (fs.statSync(file).size / 1024).toFixed(0) + ' KB');
