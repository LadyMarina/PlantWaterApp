/* ====================================================================
   PlantCare — Generador de iconos PNG (Node, sin dependencias)
   --------------------------------------------------------------------
   Rasteriza el mismo motivo que icon.svg / generate-icons.html
   (gota de agua blanca + hojita sobre fondo verde) y escribe los PNG
   en la carpeta /icons. Útil para regenerar los iconos sin navegador.

   Uso:  node scripts/generate-icons.js

   Nota: generate-icons.html hace lo mismo en el navegador con <canvas>.
   Este script existe solo como alternativa de línea de comandos y NO
   forma parte del tiempo de ejecución de la app.
   ==================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT_DIR = path.join(__dirname, "..", "icons");

/* ---------- Paleta (coherente con la app) ---------- */
const GREEN_TOP = [76, 175, 80];   // #4CAF50
const GREEN_BOT = [56, 142, 60];   // #388E3C
const WHITE = [255, 255, 255];

/* ---------- Geometría del motivo (sobre una rejilla de 512) ---------- */
const GRID = 512;

// Gota: semicírculo inferior + cono hacia el vértice superior.
const DROP = { cx: 256, cy: 318, r: 106, apexY: 104 };

// Hojita: elipse rotada situada en el hombro de la gota.
const LEAF = { cx: 305, cy: 150, a: 60, b: 27, angle: -0.7 }; // rad

/** ¿Está el punto (x,y) en coordenadas de rejilla dentro de la gota? */
function inDrop(x, y) {
  const dx = x - DROP.cx;
  if (y >= DROP.cy) {
    return dx * dx + (y - DROP.cy) * (y - DROP.cy) <= DROP.r * DROP.r;
  }
  if (y < DROP.apexY) return false;
  const t = DROP.cy - y;                 // altura sobre el centro
  const h = DROP.cy - DROP.apexY;        // altura total del cono
  // Lado ligeramente curvado para que parezca una gota y no un triángulo.
  const half = DROP.r * Math.sqrt(Math.max(0, 1 - t / h));
  return Math.abs(dx) <= half;
}

/** ¿Está el punto dentro de la hojita (elipse rotada)? */
function inLeaf(x, y) {
  const dx = x - LEAF.cx;
  const dy = y - LEAF.cy;
  const cos = Math.cos(-LEAF.angle);
  const sin = Math.sin(-LEAF.angle);
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  return (rx * rx) / (LEAF.a * LEAF.a) + (ry * ry) / (LEAF.b * LEAF.b) <= 1;
}

/** Distancia con esquinas redondeadas: ¿está (x,y) dentro del rect redondeado? */
function inRoundedRect(x, y, size, radius) {
  const rx = Math.min(x, size - x);
  const ry = Math.min(y, size - y);
  if (rx >= radius || ry >= radius) return true; // zona recta
  const dx = radius - rx;
  const dy = radius - ry;
  return dx * dx + dy * dy <= radius * radius;    // esquina
}

/** Color del fondo (degradado vertical) en la fila y de un icono de lado size. */
function bgColor(y, size) {
  const t = y / size;
  return [
    Math.round(GREEN_TOP[0] + (GREEN_BOT[0] - GREEN_TOP[0]) * t),
    Math.round(GREEN_TOP[1] + (GREEN_BOT[1] - GREEN_TOP[1]) * t),
    Math.round(GREEN_TOP[2] + (GREEN_BOT[2] - GREEN_TOP[2]) * t),
  ];
}

/**
 * Genera el buffer RGBA de un icono.
 * @param {number} size  lado en px
 * @param {boolean} maskable  fondo a sangre + contenido en zona segura
 */
function renderIcon(size, maskable) {
  const SS = 4; // supermuestreo para suavizar bordes (antialias)
  const data = Buffer.alloc(size * size * 4);
  const radius = size * 0.22;
  const scale = maskable ? 0.78 : 1; // reducir contenido en maskable

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = px + (sx + 0.5) / SS;
          const fy = py + (sy + 0.5) / SS;

          // ¿Dentro del fondo?
          const insideBg = maskable ? true : inRoundedRect(fx, fy, size, radius);
          if (!insideBg) continue; // subpíxel transparente

          // Coordenada en la rejilla de diseño (512), con escala del contenido.
          const nx = ((fx / size) * GRID - GRID / 2) / scale + GRID / 2;
          const ny = ((fy / size) * GRID - GRID / 2) / scale + GRID / 2;

          let col;
          if (inLeaf(nx, ny)) col = GREEN_TOP;       // hoja (encima)
          else if (inDrop(nx, ny)) col = WHITE;      // gota
          else col = bgColor(fy, size);              // fondo degradado

          r += col[0]; g += col[1]; b += col[2]; a += 255;
        }
      }

      const n = SS * SS;
      const idx = (py * size + px) * 4;
      data[idx] = Math.round(r / n);
      data[idx + 1] = Math.round(g / n);
      data[idx + 2] = Math.round(b / n);
      data[idx + 3] = Math.round(a / n);
    }
  }
  return data;
}

/* ---------- Codificación PNG (RGBA, 8 bits) ---------- */
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(rgba, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // profundidad de bits
  ihdr[9] = 6;   // color type 6 = RGBA
  ihdr[10] = 0;  // compresión
  ihdr[11] = 0;  // filtro
  ihdr[12] = 0;  // sin entrelazado

  // Datos sin filtrar: un byte de filtro (0) por fila + píxeles RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------- Generación ---------- */
const ICONS = [
  { file: "apple-touch-icon.png", size: 180, maskable: true },  // iOS rellena transparencias
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "icon-512-maskable.png", size: 512, maskable: true },
];

fs.mkdirSync(OUT_DIR, { recursive: true });
ICONS.forEach(({ file, size, maskable }) => {
  const rgba = renderIcon(size, maskable);
  const png = encodePNG(rgba, size);
  fs.writeFileSync(path.join(OUT_DIR, file), png);
  console.log(`✓ ${file} (${size}x${size}) — ${png.length} bytes`);
});
console.log("Iconos generados en /icons");
