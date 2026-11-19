// Vygeneruje favicon a ikony PWA zo zdrojových SVG v assets/icons/ (T3-03).
// Spustenie: node scripts/generate-icons.mjs  (z priečinka app/, sharp prichádza s Next.js)
// Výstupy sa commitujú, build ich negeneruje.
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const src = (name) => readFileSync(new URL(`../assets/icons/${name}`, import.meta.url));
const out = (file) => new URL(`../${file}`, import.meta.url);
const png = (svg, size) => sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

// ICO s vloženými PNG (podporujú všetky súčasné prehliadače)
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((img) => img.data)]);
}

const icon = src('icon.svg');
const maskable = src('icon-maskable.svg');

const targets = [
  ['public/icons/icon-192.png', icon, 192],
  ['public/icons/icon-512.png', icon, 512],
  ['public/icons/icon-maskable-192.png', maskable, 192],
  ['public/icons/icon-maskable-512.png', maskable, 512],
  ['src/app/apple-icon.png', maskable, 180],
];
for (const [file, svg, size] of targets) writeFileSync(out(file), await png(svg, size));

const sizes = [16, 32, 48];
writeFileSync(
  out('src/app/favicon.ico'),
  ico(await Promise.all(sizes.map(async (size) => ({ size, data: await png(icon, size) })))),
);
writeFileSync(out('src/app/icon.svg'), icon);
console.log('Ikony vygenerované.');
