import * as THREE from 'three';

// Procedural surface textures (color + bump) generated on a canvas.
// Avoids any external image assets while still giving PBR-style detail.

function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

function drawBlotches(ctx, size, base, count, contrast) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = size * (0.04 + Math.random() * 0.16);
    const d = (Math.random() - 0.5) * contrast;
    const c = base.map(v => clamp255(v + d));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0.55)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function addGrain(ctx, size, amount) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] = clamp255(d[i] + n);
    d[i + 1] = clamp255(d[i + 1] + n);
    d[i + 2] = clamp255(d[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);
}

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

/**
 * Build a tileable concrete/painted surface.
 * @returns {{ map: THREE.CanvasTexture, bumpMap: THREE.CanvasTexture }}
 */
export function makeSurface({
  size = 512,
  color = [150, 140, 120],
  blotches = 60,
  contrast = 50,
  grain = 28,
  grid = false,
  gridDivs = 4,
  gridColor = 'rgba(40,38,32,0.55)',
  repeat = [1, 1],
  bumpScale = 1,
} = {}) {
  // ── Color canvas ──
  const cc = makeCanvas(size);
  const cx = cc.getContext('2d');
  cx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
  cx.fillRect(0, 0, size, size);
  drawBlotches(cx, size, color, blotches, contrast);

  // ── Bump canvas (grayscale heightfield) ──
  const bc = makeCanvas(size);
  const bx = bc.getContext('2d');
  bx.fillStyle = 'rgb(128,128,128)';
  bx.fillRect(0, 0, size, size);
  drawBlotches(bx, size, [128, 128, 128], blotches, 60);

  if (grid) {
    const step = size / gridDivs;
    cx.strokeStyle = gridColor;
    cx.lineWidth = Math.max(2, size / 220);
    bx.strokeStyle = 'rgba(20,20,20,0.9)';
    bx.lineWidth = cx.lineWidth;
    for (let i = 0; i <= gridDivs; i++) {
      const p = i * step;
      cx.beginPath(); cx.moveTo(p, 0); cx.lineTo(p, size); cx.stroke();
      cx.beginPath(); cx.moveTo(0, p); cx.lineTo(size, p); cx.stroke();
      bx.beginPath(); bx.moveTo(p, 0); bx.lineTo(p, size); bx.stroke();
      bx.beginPath(); bx.moveTo(0, p); bx.lineTo(size, p); bx.stroke();
    }
  }

  addGrain(cx, size, grain);
  addGrain(bx, size, 40);

  const map = new THREE.CanvasTexture(cc);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeat[0], repeat[1]);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const bumpMap = new THREE.CanvasTexture(bc);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(repeat[0], repeat[1]);

  return { map, bumpMap, bumpScale };
}

// Convenience presets, cached so we only generate each once.
let _cache = null;
export function getMapTextures() {
  if (_cache) return _cache;
  _cache = {
    floor: makeSurface({
      color: [128, 120, 104], blotches: 90, contrast: 38, grain: 22,
      grid: true, gridDivs: 4, repeat: [30, 30], bumpScale: 0.04,
    }),
    wall: makeSurface({
      color: [176, 165, 142], blotches: 70, contrast: 34, grain: 18,
      repeat: [4, 2], bumpScale: 0.03,
    }),
    wallAlt: makeSurface({
      color: [150, 140, 120], blotches: 80, contrast: 40, grain: 22,
      repeat: [4, 2], bumpScale: 0.04,
    }),
    crate: makeSurface({
      color: [120, 100, 76], blotches: 30, contrast: 46, grain: 26,
      grid: true, gridDivs: 2, gridColor: 'rgba(30,22,12,0.7)', repeat: [1, 1], bumpScale: 0.05,
    }),
    metal: makeSurface({
      color: [95, 98, 105], blotches: 40, contrast: 30, grain: 14,
      repeat: [2, 2], bumpScale: 0.02,
    }),
  };
  return _cache;
}
