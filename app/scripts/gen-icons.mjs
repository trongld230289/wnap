import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(path.join(root, '../public/favicon.svg'));
const out = (f) => path.join(root, '../public', f);
const BG = '#0f9d60'; // primary emerald (Calm Fintech)

async function plain(size, file) {
  await sharp(svg, { density: 384 }).resize(size, size, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' }).png().toFile(out(file));
}

// maskable: icon thu nhỏ ~70% trên nền emerald (an toàn safe-zone)
async function maskable(size, file) {
  const inner = Math.round(size * 0.7);
  const icon = await sharp(svg, { density: 384 }).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: icon, gravity: 'center' }]).png().toFile(out(file));
}

await plain(192, 'pwa-192.png');
await plain(512, 'pwa-512.png');
await maskable(512, 'pwa-maskable-512.png');
console.log('icons generated');
