// Watercolor-style leaves, blossoms and open book for the Bible Study page (drawn in SVG, no image files).
const f = (n) => Number(n.toFixed(1));
const leaf = (x, y, ang, L) => {
  const w = L * 0.28;
  const d = `M0 0C${f(L * .3)} ${f(-w)} ${f(L * .72)} ${f(-w)} ${f(L)} 0C${f(L * .72)} ${f(w)} ${f(L * .3)} ${f(w)} 0 0Z`;
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)})"><path d="${d}" fill="url(#bs-lf)"/><path d="M2 0L${f(L * .92)} 0" stroke="#fff" stroke-opacity=".35" stroke-width=".8" fill="none"/></g>`;
};
const bez = (p0, p1, p2, t) => [0, 1].map((i) => (1 - t) ** 2 * p0[i] + 2 * (1 - t) * t * p1[i] + t * t * p2[i]);
const tang = (p0, p1, p2, t) => Math.atan2(2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]), 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])) * 180 / Math.PI;
const stem = "#8b9777";
function sprig() {
  const p0 = [12, 192], p1 = [70, 70], p2 = [190, 18];
  let s = `<path d="M12 192Q70 70 190 18" stroke="${stem}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < 7; i++) {
    const t = 0.14 + i * (0.8 / 6), [x, y] = bez(p0, p1, p2, t), a = tang(p0, p1, p2, t), L = 44 - i * 3.6;
    s += leaf(x, y, a - 48, L) + leaf(x, y, a + 48, L * 0.95);
  }
  const [x, y] = bez(p0, p1, p2, 1);
  return s + leaf(x - 6, y + 2, tang(p0, p1, p2, 1), 26);
}
const petal = (rx, ry, extra = "") => `<ellipse ${extra} rx="${f(rx)}" ry="${f(ry)}" fill="url(#bs-pt)" stroke="#e4d2cb" stroke-width=".8"/>`;
function blossom(cx, cy, r) {
  let s = `<g transform="translate(${cx} ${cy})">`;
  for (let k = 0; k < 5; k++) s += petal(r * .44, r * .62, `cx="0" cy="${f(-r * .55)}" transform="rotate(${k * 72 + 12})"`);
  s += `<circle r="${f(r * .2)}" fill="#f0cfc2"/>`;
  for (let k = 0; k < 9; k++) { const a = k * 40 * Math.PI / 180; s += `<circle cx="${f(Math.cos(a) * r * .2)}" cy="${f(Math.sin(a) * r * .2)}" r="${f(r * .045)}" fill="#d98f8a"/>`; }
  return s + "</g>";
}
const branch = () => `<path d="M8 10Q60 40 100 80T196 192" stroke="${stem}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M70 52Q74 80 60 100" stroke="${stem}" stroke-width="1.8" fill="none"/>`
  + [leaf(30, 26, 40, 34), leaf(58, 48, -20, 30), leaf(120, 108, 100, 34), leaf(150, 150, -10, 30), leaf(172, 170, 70, 26), blossom(88, 76, 36), blossom(158, 140, 31)].join("")
  + petal(7, 10, 'cx="58" cy="104"') + petal(6, 9, 'cx="196" cy="188"');
const book = `<path d="M10 44C60 30 100 34 130 52L130 118C100 102 60 100 10 112Z" fill="#fbf6ea" stroke="#e1d3b6" stroke-width="1.5"/><path d="M250 44C200 30 160 34 130 52L130 118C160 102 200 100 250 112Z" fill="#fdf9ee" stroke="#e1d3b6" stroke-width="1.5"/><path d="M10 112C60 100 100 102 130 118C160 102 200 100 250 112L250 124C200 112 160 114 130 130C100 114 60 112 10 124Z" fill="#e9dcc0" stroke="#d6c6a3" stroke-width="1.2"/><path d="M10 124C60 112 100 114 130 130C160 114 200 112 250 124L250 132C200 120 160 122 130 138C100 122 60 120 10 132Z" fill="#dfaaa4"/><path d="M130 52V130" stroke="#d6c6a3" stroke-width="1.5"/><g stroke="#e9e0c9" stroke-width="1" fill="none"><path d="M26 56C60 50 90 54 120 66"/><path d="M26 68C60 62 90 66 120 78"/><path d="M26 80C60 74 90 78 120 90"/><path d="M234 56C200 50 170 54 140 66"/><path d="M234 68C200 62 170 66 140 78"/><path d="M234 80C200 74 170 78 140 90"/></g>`;
const defs = `<defs><linearGradient id="bs-lf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a7b592"/><stop offset="1" stop-color="#7d8f69"/></linearGradient><radialGradient id="bs-pt" cx=".5" cy=".7" r=".8"><stop offset="0" stop-color="#f6e2dc"/><stop offset=".6" stop-color="#fffaf5"/><stop offset="1" stop-color="#fffdf9"/></radialGradient></defs>`;
const svg = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${defs}<symbol id="art-sprig" viewBox="0 0 210 210">${sprig()}</symbol><symbol id="art-branch" viewBox="0 0 210 210">${branch()}</symbol><symbol id="art-book" viewBox="0 0 260 150">${book}</symbol></svg>`;
document.body.insertAdjacentHTML("afterbegin", svg);
document.querySelectorAll("[data-until]").forEach((el) => { if (Date.now() > Date.parse(`${el.dataset.until}T00:00:00-07:00`)) el.hidden = true; });
