import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const OUT = join(process.cwd(), "public", "icons");
mkdirSync(OUT, { recursive: true });

// Brand colors: brilliant blue square + white "P".
const blue = "#2563eb";

function svgFlat(size: number): Buffer {
  const fontSize = Math.round(size * 0.62);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.12)}" fill="${blue}"/>
  <text x="50%" y="50%" font-family="Helvetica,Arial,sans-serif" font-size="${fontSize}" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="central">P</text>
</svg>`);
}

// Maskable: safe zone is roughly the inner 80% (Android crops the corners).
// Fill the whole canvas, keep the P inside the safe zone by using a smaller font.
function svgMaskable(size: number): Buffer {
  const fontSize = Math.round(size * 0.42);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${blue}"/>
  <text x="50%" y="50%" font-family="Helvetica,Arial,sans-serif" font-size="${fontSize}" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="central">P</text>
</svg>`);
}

async function render(svg: Buffer, name: string) {
  const buf = await sharp(svg).png().toBuffer();
  writeFileSync(join(OUT, name), buf);
  console.log("wrote", name);
}

async function main() {
  await render(svgFlat(192), "icon-192.png");
  await render(svgFlat(512), "icon-512.png");
  await render(svgMaskable(512), "icon-512-maskable.png");
  await render(svgFlat(180), "apple-touch-icon.png");
}

main();
