// Generates placeholder PNG icons (no dependencies). Run with: node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TOP = [0x7b, 0x5b, 0xf3];
const BOTTOM = [0x36, 0x1b, 0x9e];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const clamp = (value) => Math.min(1, Math.max(0, value));

function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** A knowledge-graph glyph: one hub node linked to three satellites. Coordinates are in 0..1 space. */
function glyphCoverage(u, v, scale, pixel) {
  const cx = 0.5;
  const cy = 0.5;
  const at = (x, y) => [cx + (x - cx) * scale, cy + (y - cy) * scale];
  const nodes = [
    { p: at(0.5, 0.5), r: 0.115 * scale },
    { p: at(0.5, 0.2), r: 0.065 * scale },
    { p: at(0.76, 0.65), r: 0.065 * scale },
    { p: at(0.24, 0.65), r: 0.065 * scale },
  ];
  let coverage = 0;
  for (const node of nodes) {
    coverage = Math.max(coverage, clamp(0.5 - (Math.hypot(u - node.p[0], v - node.p[1]) - node.r) / pixel));
  }
  for (const satellite of nodes.slice(1)) {
    const d = segmentDistance(u, v, nodes[0].p[0], nodes[0].p[1], satellite.p[0], satellite.p[1]);
    coverage = Math.max(coverage, clamp(0.5 - (d - 0.017 * scale) / pixel));
  }
  return coverage;
}

function roundedRectCoverage(u, v, radius, pixel) {
  const qx = Math.abs(u - 0.5) - (0.5 - radius);
  const qy = Math.abs(v - 0.5) - (0.5 - radius);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
  return clamp(0.5 - outside / pixel);
}

function render(size, { maskable }) {
  const out = Buffer.alloc(size * size * 4);
  const samples = 3;
  const pixel = 1 / size;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const u = (x + (sx + 0.5) / samples) / size;
          const v = (y + (sy + 0.5) / samples) / size;
          const shape = maskable ? 1 : roundedRectCoverage(u, v, 0.22, pixel / samples);
          const mix = clamp((u + v) / 2);
          const bg = TOP.map((c, i) => c + (BOTTOM[i] - c) * mix);
          const glyph = glyphCoverage(u, v, maskable ? 0.72 : 0.9, pixel / samples);
          const color = bg.map((c) => c + (255 - c) * glyph);
          r += color[0] * shape;
          g += color[1] * shape;
          b += color[2] * shape;
          a += shape;
        }
      }
      const index = (y * size + x) * 4;
      const total = samples * samples;
      out[index] = a > 0 ? Math.round(r / a) : 0;
      out[index + 1] = a > 0 ? Math.round(g / a) : 0;
      out[index + 2] = a > 0 ? Math.round(b / a) : 0;
      out[index + 3] = Math.round((a / total) * 255);
    }
  }
  return encodePng(size, out);
}

const targets = [
  { path: "public/icons/icon-192.png", size: 192 },
  { path: "public/icons/icon-512.png", size: 512 },
  { path: "public/icons/icon-maskable-512.png", size: 512, maskable: true },
  { path: "public/icons/apple-touch-icon-180.png", size: 180, maskable: true },
  { path: "extension/icons/icon-16.png", size: 16 },
  { path: "extension/icons/icon-32.png", size: 32 },
  { path: "extension/icons/icon-48.png", size: 48 },
  { path: "extension/icons/icon-128.png", size: 128 },
];

for (const target of targets) {
  const file = resolve(root, target.path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, render(target.size, { maskable: Boolean(target.maskable) }));
  console.log(`wrote ${target.path}`);
}
